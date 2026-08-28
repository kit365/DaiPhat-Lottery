package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.OcrConfirmImportRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.OcrConfirmImportTicketRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrConfirmImportBatchResult;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrConfirmImportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScanBatchImportItemResponse;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryScanLogServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrConfirmImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanImportOutcome;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanMethod;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.valueobject.LotteryTicketNumber;
import com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService;
import com.daiphat.coreapi.shared.util.ImportBatchImportModeResolver;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Confirms OCR review into import-batch → lines → tickets (AUTO creates batches;
 * MANUAL maps into a selected parent batch).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OcrConfirmImportService {

    private static final Pattern SERIAL_PATTERN =
            Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z0-9]{4,10}$");

    private final ImportBatchServicePort importBatchServicePort;
    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchDraftExpiryService importBatchDraftExpiryService;
    private final ImportBatchImportModeResolver importBatchImportModeResolver;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final OcrScanResultRepositoryPort ocrScanResultRepositoryPort;
    private final OcrScanResultFieldService ocrScanResultFieldService;
    private final LotteryScanLogServicePort lotteryScanLogServicePort;
    private final Clock clock;
    private final PlatformTransactionManager transactionManager;

    public OcrConfirmImportResponse confirm(OcrConfirmImportRequest request, UUID operatorId) {
        if (request.tickets() == null || request.tickets().isEmpty()) {
            throw new DomainException(ErrorCode.TICKET_SCAN_NO_TICKETS_TO_IMPORT);
        }
        validateTicketPayloads(request.tickets());

        if (request.mode() == OcrConfirmImportMode.AUTO) {
            return confirmAuto(request, operatorId);
        }
        if (request.mode() == OcrConfirmImportMode.MANUAL) {
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            return tx.execute(status -> confirmManual(request, operatorId));
        }
        throw new DomainException(ErrorCode.INVALID_INPUT, "Chế độ nhập OCR không hợp lệ.");
    }

    private OcrConfirmImportResponse confirmAuto(OcrConfirmImportRequest request, UUID operatorId) {
        if (request.supplierId() == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_SUPPLIER_REQUIRED);
        }

        Map<LocalDate, List<OcrConfirmImportTicketRequest>> byDate = request.tickets().stream()
                .collect(Collectors.groupingBy(
                        OcrConfirmImportTicketRequest::drawDate,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<OcrConfirmImportBatchResult> batchResults = new ArrayList<>();
        int success = 0;
        int duplicate = 0;
        int failed = 0;

        LocalDateTime now = LocalDateTime.now(clock);
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        for (Map.Entry<LocalDate, List<OcrConfirmImportTicketRequest>> entry : byDate.entrySet()) {
            LocalDate drawDate = entry.getKey();
            List<OcrConfirmImportTicketRequest> tickets = entry.getValue();
            OcrConfirmImportBatchResult result = tx.execute(status -> importOneDrawDateAuto(
                    request.supplierId(),
                    request.invoiceEvidenceUrl(),
                    request.ticketListImageUrls(),
                    request.forceCreate(),
                    drawDate,
                    tickets,
                    operatorId,
                    now
            ));
            batchResults.add(result);
            success += result.ticketSuccessCount();
            duplicate += result.ticketDuplicateCount();
            failed += result.ticketFailedCount();
        }

        return OcrConfirmImportResponse.builder()
                .mode(OcrConfirmImportMode.AUTO)
                .totalRequested(request.tickets().size())
                .successCount(success)
                .duplicateCount(duplicate)
                .failedCount(failed)
                .batches(batchResults)
                .build();
    }

    /**
     * One TX boundary for a single draw-date group: create batch+lines then tickets.
     * Failure rolls back the whole date group.
     */
    private OcrConfirmImportBatchResult importOneDrawDateAuto(
            Long supplierId,
            String invoiceEvidenceUrl,
            List<String> ticketListImageUrls,
            Boolean forceCreate,
            LocalDate drawDate,
            List<OcrConfirmImportTicketRequest> tickets,
            UUID operatorId,
            LocalDateTime now
    ) {
        var importMode = importBatchImportModeResolver.resolve(drawDate, now);

        Map<Long, Long> stationCounts = tickets.stream()
                .collect(Collectors.groupingBy(OcrConfirmImportTicketRequest::stationId, Collectors.counting()));
        List<CreateImportBatchLineRequest> lines = stationCounts.entrySet().stream()
                .map(e -> CreateImportBatchLineRequest.builder()
                        .lotteryStationId(e.getKey())
                        .declareQuantity(e.getValue().intValue())
                        .build())
                .toList();
        int totalDeclare = tickets.size();

        ImportBatchResponse created = importBatchServicePort.create(
                CreateImportBatchRequest.builder()
                        .drawDate(drawDate)
                        .supplierId(supplierId)
                        .importMode(importMode)
                        .invoiceEvidenceUrl(invoiceEvidenceUrl)
                        .ticketListImageUrls(ticketListImageUrls)
                        .forceCreate(forceCreate)
                        .totalDeclareQuantity(totalDeclare)
                        .lines(lines)
                        .build(),
                operatorId
        );

        Map<Long, Long> stationToLine = created.lines().stream()
                .collect(Collectors.toMap(
                        line -> line.lotteryStationId(),
                        line -> line.id(),
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        TicketImportTally tally = importTickets(tickets, stationToLine, drawDate, operatorId);
        if (tally.failed > 0) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Nhập vé thất bại cho ngày quay " + drawDate
                            + " (" + tally.failed + " vé lỗi). Đã hủy tạo phiếu nhập tự động cho ngày này."
            );
        }
        linkOcrResults(tickets, stationToLine, operatorId);

        return OcrConfirmImportBatchResult.builder()
                .importBatchId(created.id())
                .batchCode(created.batchCode())
                .drawDate(drawDate)
                .ticketSuccessCount(tally.success)
                .ticketDuplicateCount(tally.duplicate)
                .ticketFailedCount(tally.failed)
                .ticketResults(tally.results)
                .build();
    }

    private OcrConfirmImportResponse confirmManual(OcrConfirmImportRequest request, UUID operatorId) {
        if (request.importBatchId() == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_IMPORT_BATCH_REQUIRED);
        }
        ImportBatchModel batch = importBatchRepositoryPort.findById(request.importBatchId())
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));
        importBatchDraftExpiryService.cancelIfOverdue(batch);
        batch = importBatchRepositoryPort.findById(request.importBatchId())
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));

        if (!batch.isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }
        if (batch.getImportedBy() == null || !batch.getImportedBy().equals(operatorId)) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_IMPORT_BATCH_MISMATCH);
        }

        LocalDate batchDrawDate = batch.getDrawDate();
        for (OcrConfirmImportTicketRequest ticket : request.tickets()) {
            if (!batchDrawDate.equals(ticket.drawDate())) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Ngày xổ OCR (" + ticket.drawDate() + ") không khớp phiếu nhập lô ("
                                + batchDrawDate + "). Vui lòng chỉ xác nhận vé cùng ngày quay với phiếu đã chọn."
                );
            }
        }

        Map<Long, Integer> declareByStation = request.tickets().stream()
                .collect(Collectors.groupingBy(
                        OcrConfirmImportTicketRequest::stationId,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));
        Map<Long, Long> stationToLine = importBatchServicePort.ensureOpenLinesByStation(
                batch.getId(),
                declareByStation,
                operatorId
        );

        TicketImportTally tally = importTickets(request.tickets(), stationToLine, batchDrawDate, operatorId);
        linkOcrResults(request.tickets(), stationToLine, operatorId);

        OcrConfirmImportBatchResult batchResult = OcrConfirmImportBatchResult.builder()
                .importBatchId(batch.getId())
                .batchCode(batch.getBatchCode())
                .drawDate(batchDrawDate)
                .ticketSuccessCount(tally.success)
                .ticketDuplicateCount(tally.duplicate)
                .ticketFailedCount(tally.failed)
                .ticketResults(tally.results)
                .build();

        return OcrConfirmImportResponse.builder()
                .mode(OcrConfirmImportMode.MANUAL)
                .totalRequested(request.tickets().size())
                .successCount(tally.success)
                .duplicateCount(tally.duplicate)
                .failedCount(tally.failed)
                .batches(List.of(batchResult))
                .build();
    }

    private TicketImportTally importTickets(
            List<OcrConfirmImportTicketRequest> tickets,
            Map<Long, Long> stationToLine,
            LocalDate drawDate,
            UUID operatorId
    ) {
        List<ScanBatchImportItemResponse> results = new ArrayList<>();
        int success = 0;
        int duplicate = 0;
        int failed = 0;

        for (OcrConfirmImportTicketRequest ticket : tickets) {
            Long lineId = stationToLine.get(ticket.stationId());
            if (lineId == null) {
                failed++;
                results.add(ScanBatchImportItemResponse.builder()
                        .numbers(ticket.numbers())
                        .serialNumber(ticket.serialNumber())
                        .outcome(ScanImportOutcome.FAILED)
                        .message("Không tìm thấy dòng nhập lô cho nhà đài #" + ticket.stationId())
                        .build());
                continue;
            }

            String ticketImg = null;
            if (ticket.ticketImageBase64() != null && !ticket.ticketImageBase64().isBlank()) {
                try {
                    ticketImg = uploadScannedImage(ticket.ticketImageBase64()).url();
                } catch (Exception e) {
                    log.warn("Failed to upload OCR image for serial {}", ticket.serialNumber(), e);
                }
            }

            try {
                LotteryTicketResponse created = lotteryTicketServicePort.create(
                        CreateLotteryTicketRequest.builder()
                                .stationId(ticket.stationId())
                                .importBatchLineId(lineId)
                                .drawDate(drawDate)
                                .numbers(ticket.numbers())
                                .serials(List.of(new CreateLotteryTicketSerialRequest(ticketImg, ticket.serialNumber())))
                                .isAutoSave(false)
                                .build(),
                        operatorId
                );
                Long createdSerialId = created.serials() == null ? null : created.serials().stream()
                        .filter(s -> ticket.serialNumber().equals(s.serialNumber()))
                        .findFirst()
                        .map(LotteryTicketSerialResponse::id)
                        .orElse(null);
                lotteryScanLogServicePort.recordEvent(
                        ScanEventType.TICKET_CREATED,
                        ticket.ocrScanResultId(),
                        createdSerialId,
                        operatorId,
                        ScanMethod.OCR_SCAN,
                        true,
                        null
                );
                success++;
                results.add(ScanBatchImportItemResponse.builder()
                        .numbers(ticket.numbers())
                        .serialNumber(ticket.serialNumber())
                        .outcome(ScanImportOutcome.SUCCESS)
                        .message("Nhập kho thành công.")
                        .ticketId(created.id())
                        .build());
            } catch (DomainException e) {
                if (e.getErrorCode() == ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED) {
                    duplicate++;
                    results.add(ScanBatchImportItemResponse.builder()
                            .numbers(ticket.numbers())
                            .serialNumber(ticket.serialNumber())
                            .outcome(ScanImportOutcome.DUPLICATE)
                            .message(e.getMessage())
                            .build());
                } else {
                    failed++;
                    results.add(ScanBatchImportItemResponse.builder()
                            .numbers(ticket.numbers())
                            .serialNumber(ticket.serialNumber())
                            .outcome(ScanImportOutcome.FAILED)
                            .message(e.getMessage())
                            .build());
                }
            } catch (Exception e) {
                log.error("OCR confirm import failed for serial {}", ticket.serialNumber(), e);
                failed++;
                results.add(ScanBatchImportItemResponse.builder()
                        .numbers(ticket.numbers())
                        .serialNumber(ticket.serialNumber())
                        .outcome(ScanImportOutcome.FAILED)
                        .message("Nhập vé thất bại.")
                        .build());
            }
        }
        return new TicketImportTally(success, duplicate, failed, results);
    }

    private void linkOcrResults(
            List<OcrConfirmImportTicketRequest> tickets,
            Map<Long, Long> stationToLine,
            UUID operatorId
    ) {
        for (OcrConfirmImportTicketRequest ticket : tickets) {
            if (ticket.ocrScanResultId() == null) {
                continue;
            }
            Long lineId = stationToLine.get(ticket.stationId());
            ocrScanResultRepositoryPort.findById(ticket.ocrScanResultId()).ifPresent(model -> {
                model.setImportBatchLineId(lineId);
                model.setStationId(ticket.stationId());
                ocrScanResultRepositoryPort.save(model);
            });

            String stationName = null;
            try {
                stationName = lotteryStationServicePort.getModelById(ticket.stationId()).getName();
            } catch (Exception ignored) {
                // best-effort only for field correction snapshot
            }
            ocrScanResultFieldService.applyConfirmSnapshot(
                    ticket.ocrScanResultId(),
                    ticket.numbers(),
                    ticket.serialNumber(),
                    ticket.drawDate(),
                    ticket.stationId(),
                    stationName,
                    operatorId
            );
        }
    }

    private void validateTicketPayloads(List<OcrConfirmImportTicketRequest> tickets) {
        for (OcrConfirmImportTicketRequest ticket : tickets) {
            if (ticket.stationId() == null) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Vé " + ticket.serialNumber() + " thiếu nhà đài đã xác định. Vui lòng chọn/sửa trước khi nhập."
                );
            }
            if (ticket.drawDate() == null) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Vé " + ticket.serialNumber() + " thiếu ngày xổ. Vui lòng bổ sung trước khi nhập."
                );
            }
            if (ticket.numbers() == null || ticket.numbers().isBlank()
                    || ticket.serialNumber() == null || ticket.serialNumber().isBlank()) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Mỗi vé cần có dãy số và serial trước khi xác nhận nhập."
                );
            }

            String serial = ticket.serialNumber().trim();
            if (!SERIAL_PATTERN.matcher(serial).matches()) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Serial '" + serial + "' không đúng định dạng (4–10 ký tự, gồm chữ và số)."
                );
            }

            LotteryStationModel station = lotteryStationServicePort.getModelById(ticket.stationId());
            if (station == null || station.getDeletedAt() != null || !station.isActive()) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Nhà đài #" + ticket.stationId() + " không tồn tại hoặc không còn hiệu lực."
                );
            }

            List<DayOfWeek> drawDays = station.getDrawDays();
            if (drawDays == null || drawDays.isEmpty()) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Nhà đài " + station.getName() + " chưa cấu hình lịch quay."
                );
            }
            DayOfWeek day = ticket.drawDate().getDayOfWeek();
            if (!drawDays.contains(day)) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Nhà đài " + station.getName() + " không xổ vào " + day
                                + " (ngày vé " + ticket.drawDate() + "). Không thể nhập kho."
                );
            }

            if (station.getRegion() == null) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Nhà đài " + station.getName() + " chưa gắn vùng để kiểm tra dãy số."
                );
            }
            try {
                LotteryTicketNumber.from(
                        ticket.numbers().trim(),
                        station.getRegion().minLength(),
                        station.getRegion().maxLength()
                );
            } catch (DomainException e) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Dãy số '" + ticket.numbers() + "' không hợp lệ cho nhà đài "
                                + station.getName() + ": " + (e.getInternalMessage() != null
                                ? e.getInternalMessage()
                                : e.getMessage())
                );
            } catch (Exception e) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Dãy số '" + ticket.numbers() + "' không hợp lệ cho nhà đài " + station.getName() + "."
                );
            }
        }
    }

    private com.daiphat.coreapi.application.dto.storage.StorageResult uploadScannedImage(String base64Image) {
        String raw = base64Image.trim();
        int commaIndex = raw.indexOf(',');
        if (raw.startsWith("data:") && commaIndex >= 0) {
            raw = raw.substring(commaIndex + 1);
        }
        byte[] imageBytes = Base64.getDecoder().decode(raw);
        UploadRequest uploadRequest = new UploadRequest(
                imageBytes,
                "ticket-scan-" + UUID.randomUUID() + ".jpg",
                "image/jpeg",
                StorageFolderConstants.TICKET_IMAGE_FOLDER
        );
        return lotteryTicketServicePort.uploadAsset(uploadRequest);
    }

    private record TicketImportTally(
            int success,
            int duplicate,
            int failed,
            List<ScanBatchImportItemResponse> results
    ) {
    }
}
