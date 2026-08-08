package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.BatchImportScannedTicketsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.ConfirmedScannedTicketRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ExtractedTicketFieldsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScanBatchImportItemResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScanBatchImportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScannedTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketScanResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryScanLogServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.TicketScanImportServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.vision.TicketVisionPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanImportOutcome;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanMethod;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
import com.daiphat.coreapi.domain.valueobject.LotteryTicketNumber;
import com.daiphat.coreapi.infrastructure.dto.request.vision.RemoteScanMetadata;
import com.daiphat.coreapi.infrastructure.dto.request.vision.RemoteStationMetadata;
import com.daiphat.coreapi.infrastructure.dto.response.vision.RemoteScannedTicket;
import com.daiphat.coreapi.infrastructure.dto.response.vision.RemoteTicketScanResult;
import com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Orchestrates the camera ticket-scan feature (DP-269, doc section 4 Flow 4):
 * scan() calls ticket-vision and enriches its result with Layer-2 business
 * validation without persisting anything; batchImport() persists the
 * mobile user's confirmed tickets by delegating to the existing
 * LotteryTicketServicePort#create for every actual business rule
 * (station/draw-date/import-batch-line validation, duplicate merge,
 * quantity limits) -- this service adds only what's specific to the scan
 * workflow (calling ticket-vision, per-ticket success/duplicate/failure
 * isolation, uploading scanned images to Cloudinary).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TicketScanImportService implements TicketScanImportServicePort {

    private final TicketVisionPort ticketVisionPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchDraftExpiryService importBatchDraftExpiryService;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final OcrScanResultRepositoryPort ocrScanResultRepositoryPort;
    private final LotteryScanLogServicePort lotteryScanLogServicePort;

    @Override
    public TicketScanResponse scan(Long importBatchLineId, MultipartFile file, UUID operatorId) {
        if (file == null || file.isEmpty()) {
            throw new DomainException(ErrorCode.TICKET_SCAN_IMAGE_REQUIRED);
        }

        ImportBatchLineModel importBatchLine = getDraftImportBatchLineForOperatorOrThrow(importBatchLineId, operatorId);
        ImportBatchModel importBatch = getImportBatchOrThrow(importBatchLine.getImportBatchId());
        LotteryStationModel station = lotteryStationServicePort.getModelById(importBatchLine.getLotteryStationId());
        LocalDate targetDrawDate = importBatch.getDrawDate();

        byte[] imageBytes;
        try {
            imageBytes = file.getBytes();
        } catch (IOException e) {
            throw new DomainException(ErrorCode.TICKET_SCAN_IMAGE_REQUIRED, e.getMessage());
        }

        lotteryScanLogServicePort.recordEvent(
                ScanEventType.SCAN_STARTED, null, null, operatorId, ScanMethod.OCR_SCAN, null,
                "Import batch line " + importBatchLineId
        );

        RemoteTicketScanResult remoteResult = ticketVisionPort.scan(
                imageBytes,
                file.getOriginalFilename(),
                buildScanMetadata(station)
        );

        List<ScannedTicketResponse> enrichedTickets = remoteResult.tickets().stream()
                .map(remoteTicket -> enrichTicket(
                        remoteTicket, station, targetDrawDate,
                        remoteResult.scanId(), importBatchLineId, operatorId
                ))
                .toList();

        log.info(
                "Scanned {} ticket(s) for import batch line {} (station {})",
                enrichedTickets.size(), importBatchLineId, station.getId()
        );

        lotteryScanLogServicePort.recordEvent(
                ScanEventType.SCAN_COMPLETED, null, null, operatorId, ScanMethod.OCR_SCAN, null,
                enrichedTickets.size() + " ticket(s) detected"
        );

        return TicketScanResponse.builder()
                .scanId(remoteResult.scanId())
                .ticketCount(enrichedTickets.size())
                .tickets(enrichedTickets)
                .warnings(remoteResult.warnings())
                .build();
    }

    @Override
    public ScanBatchImportResponse batchImport(BatchImportScannedTicketsRequest request, UUID importedById) {
        ImportBatchLineModel importBatchLine =
                getDraftImportBatchLineForOperatorOrThrow(request.importBatchLineId(), importedById);
        ImportBatchModel importBatch = getImportBatchOrThrow(importBatchLine.getImportBatchId());

        if (importBatch.getBatchCode() == null || !importBatch.getBatchCode().equals(request.batchCode())) {
            throw new DomainException(ErrorCode.TICKET_SCAN_BATCH_CODE_MISMATCH);
        }
        if (request.tickets() == null || request.tickets().isEmpty()) {
            throw new DomainException(ErrorCode.TICKET_SCAN_NO_TICKETS_TO_IMPORT);
        }

        List<ScanBatchImportItemResponse> results = new ArrayList<>();
        int successCount = 0;
        int duplicateCount = 0;
        int failedCount = 0;

        // Each ticket is its own LotteryTicketServicePort#create call (own
        // transaction), NOT one call wrapped around the whole loop -- so a
        // duplicate/invalid ticket never rolls back tickets that already
        // succeeded (doc mobile UX: "Display individual import results").
        for (ConfirmedScannedTicketRequest ticket : request.tickets()) {
            ScanBatchImportItemResponse result = importOneTicket(
                    ticket, importBatchLine, importBatch.getDrawDate(), importedById, request.isAutoSave()
            );
            results.add(result);
            switch (result.outcome()) {
                case SUCCESS -> successCount++;
                case DUPLICATE -> duplicateCount++;
                case FAILED -> failedCount++;
            }
        }

        log.info(
                "Batch-imported scanned tickets for import batch line {}: {} success, {} duplicate, {} failed",
                importBatchLine.getId(), successCount, duplicateCount, failedCount
        );

        return ScanBatchImportResponse.builder()
                .importBatchLineId(importBatchLine.getId())
                .totalRequested(request.tickets().size())
                .successCount(successCount)
                .duplicateCount(duplicateCount)
                .failedCount(failedCount)
                .results(results)
                .build();
    }

    private ScanBatchImportItemResponse importOneTicket(
            ConfirmedScannedTicketRequest ticket,
            ImportBatchLineModel importBatchLine,
            LocalDate drawDate,
            UUID importedById,
            Boolean isAutoSave
    ) {
        String ticketImg = null;
        if (ticket.ticketImageBase64() != null && !ticket.ticketImageBase64().isBlank()) {
            try {
                ticketImg = uploadScannedImage(ticket.ticketImageBase64()).url();
            } catch (Exception e) {
                log.warn(
                        "Failed to upload scanned image for serial {}, importing without a photo",
                        ticket.serialNumber(), e
                );
            }
        }

        ScanMethod scanMethod = resolveScanMethodAndLogManualInput(ticket, importedById);

        try {
            LotteryTicketResponse created = lotteryTicketServicePort.create(
                    CreateLotteryTicketRequest.builder()
                            .stationId(importBatchLine.getLotteryStationId())
                            .importBatchLineId(importBatchLine.getId())
                            .drawDate(drawDate)
                            .numbers(ticket.numbers())
                            .serials(List.of(new CreateLotteryTicketSerialRequest(ticketImg, ticket.serialNumber())))
                            .isAutoSave(isAutoSave)
                            .build(),
                    importedById
            );
            Long createdSerialId = created.serials() == null ? null : created.serials().stream()
                    .filter(s -> ticket.serialNumber().equals(s.serialNumber()))
                    .findFirst()
                    .map(LotteryTicketSerialResponse::id)
                    .orElse(null);
            lotteryScanLogServicePort.recordEvent(
                    ScanEventType.TICKET_CREATED, ticket.ocrScanResultId(), createdSerialId, importedById,
                    scanMethod, true, null
            );
            return ScanBatchImportItemResponse.builder()
                    .numbers(ticket.numbers())
                    .serialNumber(ticket.serialNumber())
                    .outcome(ScanImportOutcome.SUCCESS)
                    .message("Nhập kho thành công.")
                    .ticketId(created.id())
                    .build();
        } catch (DomainException e) {
            ScanImportOutcome outcome = e.getErrorCode() == ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED
                    ? ScanImportOutcome.DUPLICATE
                    : ScanImportOutcome.FAILED;
            // A duplicate serial IS "found in the system already" -- TICKET_FOUND fits better
            // than a generic failure; anything else genuinely couldn't be imported (INVALID_TICKET).
            lotteryScanLogServicePort.recordEvent(
                    outcome == ScanImportOutcome.DUPLICATE ? ScanEventType.TICKET_FOUND : ScanEventType.INVALID_TICKET,
                    ticket.ocrScanResultId(), null, importedById, scanMethod, false, e.getMessage()
            );
            return ScanBatchImportItemResponse.builder()
                    .numbers(ticket.numbers())
                    .serialNumber(ticket.serialNumber())
                    .outcome(outcome)
                    .message(e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("Unexpected error importing scanned ticket serial {}", ticket.serialNumber(), e);
            lotteryScanLogServicePort.recordEvent(
                    ScanEventType.INVALID_TICKET, ticket.ocrScanResultId(), null, importedById, scanMethod, false,
                    "Lỗi hệ thống khi nhập vé."
            );
            return ScanBatchImportItemResponse.builder()
                    .numbers(ticket.numbers())
                    .serialNumber(ticket.serialNumber())
                    .outcome(ScanImportOutcome.FAILED)
                    .message("Lỗi hệ thống khi nhập vé.")
                    .build();
        }
    }

    /**
     * Logs MANUAL_INPUT when this confirmed ticket has no OCR result behind it
     * at all, or when the operator's confirmed numbers/serialNumber differ
     * from what OCR originally extracted (a correction). Returns the
     * ScanMethod to record on the subsequent create-result event.
     */
    private ScanMethod resolveScanMethodAndLogManualInput(ConfirmedScannedTicketRequest ticket, UUID importedById) {
        OcrScanResultModel ocrResult = ticket.ocrScanResultId() == null
                ? null
                : ocrScanResultRepositoryPort.findById(ticket.ocrScanResultId()).orElse(null);

        boolean manuallyEntered = ocrResult == null;
        boolean manuallyCorrected = ocrResult != null && (
                !ticket.numbers().equals(ocrResult.getExtractedNumbers())
                        || !ticket.serialNumber().equals(ocrResult.getExtractedSerialNumber())
        );

        if (manuallyEntered || manuallyCorrected) {
            lotteryScanLogServicePort.recordEvent(
                    ScanEventType.MANUAL_INPUT, ticket.ocrScanResultId(), null, importedById,
                    ScanMethod.MANUAL_INPUT, null,
                    manuallyEntered ? "Vé nhập tay, không qua OCR." : "Đã chỉnh sửa dữ liệu OCR trước khi xác nhận."
            );
            return ScanMethod.MANUAL_INPUT;
        }
        return ScanMethod.OCR_SCAN;
    }

    private StorageResult uploadScannedImage(String base64Image) {
        byte[] imageBytes = Base64.getDecoder().decode(stripDataUrlPrefix(base64Image.trim()));
        UploadRequest uploadRequest = new UploadRequest(
                imageBytes,
                "ticket-scan-" + UUID.randomUUID() + ".jpg",
                "image/jpeg",
                StorageFolderConstants.TICKET_IMAGE_FOLDER
        );
        return lotteryTicketServicePort.uploadAsset(uploadRequest);
    }

    private String stripDataUrlPrefix(String base64Image) {
        int commaIndex = base64Image.indexOf(',');
        return base64Image.startsWith("data:") && commaIndex >= 0
                ? base64Image.substring(commaIndex + 1)
                : base64Image;
    }

    private RemoteScanMetadata buildScanMetadata(LotteryStationModel station) {
        // Region min/max define an accepted length *range*; ticket-vision's
        // metadata only takes a single exact length, so only send one when
        // the range collapses to a fixed length (true for nearly every
        // Vietnamese lottery product) -- otherwise leave it null and let
        // the parser fall back to its generic plausible-length heuristic.
        Integer expectedNumberLength = null;
        if (station.getRegion() != null) {
            int min = station.getRegion().minLength();
            int max = station.getRegion().maxLength();
            expectedNumberLength = (min == max) ? max : null;
        }

        List<String> aliases = (station.getProvince() != null && !station.getProvince().isBlank())
                ? List.of(station.getProvince())
                : List.of();

        RemoteStationMetadata stationMetadata = new RemoteStationMetadata(
                station.getId(), station.getName(), null, aliases, expectedNumberLength
        );
        return new RemoteScanMetadata(List.of(stationMetadata), null, null);
    }

    private ScannedTicketResponse enrichTicket(
            RemoteScannedTicket remote,
            LotteryStationModel station,
            LocalDate targetDrawDate,
            String scanId,
            Long importBatchLineId,
            UUID operatorId
    ) {
        ExtractedTicketFieldsResponse extracted = remote.extracted();
        String numbers = extracted != null ? trimToNull(extracted.numbers()) : null;
        String serialNumber = extracted != null ? trimToNull(extracted.serialNumber()) : null;
        LocalDate extractedDrawDate = extracted != null ? extracted.drawDate() : null;

        List<String> businessErrors = new ArrayList<>();
        boolean duplicate = false;

        if (numbers != null) {
            try {
                validateNumberFormat(numbers, station);
            } catch (DomainException e) {
                businessErrors.add(e.getMessage());
            }
        }

        if (extractedDrawDate != null && !extractedDrawDate.equals(targetDrawDate)) {
            businessErrors.add(
                    "Ngày quay trên vé (" + extractedDrawDate + ") không khớp với ngày quay của phiếu nhập lô ("
                            + targetDrawDate + ")."
            );
        }

        if (numbers != null) {
            Optional<Long> existingTicketId = lotteryTicketRepositoryPort
                    .findByUniqueFields(station.getId(), numbers, targetDrawDate)
                    .map(LotteryTicketModel::getId);
            if (existingTicketId.isPresent() && serialNumber != null
                    && lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(existingTicketId.get(), serialNumber)) {
                duplicate = true;
                businessErrors.add("Sê-ri " + serialNumber + " đã tồn tại trong hệ thống.");
            }
        }

        ScannedTicketStatus finalStatus = businessErrors.isEmpty() ? remote.status() : ScannedTicketStatus.INCOMPLETE;

        Long ocrScanResultId = persistOcrScanResult(
                remote, station, targetDrawDate, scanId, importBatchLineId, operatorId,
                extracted, finalStatus, businessErrors
        );
        lotteryScanLogServicePort.recordEvent(
                businessErrors.isEmpty() ? ScanEventType.OCR_COMPLETED : ScanEventType.INVALID_TICKET,
                ocrScanResultId, null, operatorId, ScanMethod.OCR_SCAN,
                businessErrors.isEmpty(),
                businessErrors.isEmpty() ? null : String.join("; ", businessErrors)
        );

        return ScannedTicketResponse.builder()
                .ticketIndex(remote.ticketIndex())
                .bbox(remote.bbox())
                .status(finalStatus)
                .confidence(remote.confidence())
                .extracted(extracted)
                .fieldConfidences(remote.fieldConfidences())
                .missingFields(remote.missingFields())
                .validationErrors(remote.validationErrors())
                .businessValidationErrors(businessErrors)
                .duplicate(duplicate)
                .resolvedStationId(station.getId())
                .resolvedDrawDate(targetDrawDate)
                .croppedImageBase64(remote.croppedImageBase64())
                .ocrScanResultId(ocrScanResultId)
                .build();
    }

    /** Best-effort: an OCR_Scan_Result write failure degrades to a null id (no scan-log linkage), never fails the scan. */
    private Long persistOcrScanResult(
            RemoteScannedTicket remote,
            LotteryStationModel station,
            LocalDate targetDrawDate,
            String scanId,
            Long importBatchLineId,
            UUID operatorId,
            ExtractedTicketFieldsResponse extracted,
            ScannedTicketStatus finalStatus,
            List<String> businessErrors
    ) {
        try {
            OcrScanResultModel saved = ocrScanResultRepositoryPort.save(
                    OcrScanResultModel.builder()
                            .scanId(scanId)
                            .ticketIndex(remote.ticketIndex())
                            .importBatchLineId(importBatchLineId)
                            .stationId(station.getId())
                            .extractedStationName(extracted != null ? extracted.stationName() : null)
                            .extractedSerialNumber(extracted != null ? extracted.serialNumber() : null)
                            .extractedNumbers(extracted != null ? extracted.numbers() : null)
                            .extractedDrawDate(extracted != null ? extracted.drawDate() : null)
                            .confidence(remote.confidence())
                            .status(finalStatus)
                            .missingFields(remote.missingFields())
                            .validationErrors(remote.validationErrors())
                            .businessValidationErrors(businessErrors)
                            .croppedImageUrl(null)
                            .scannedBy(operatorId)
                            .scannedAt(LocalDateTime.now())
                            .build()
            );
            return saved.getId();
        } catch (Exception e) {
            log.error("Failed to persist OCR scan result for ticketIndex {} (scanId {})", remote.ticketIndex(), scanId, e);
            return null;
        }
    }

    private void validateNumberFormat(String numbers, LotteryStationModel station) {
        if (station.getRegion() == null) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_SYNC_REGION_REQUIRED);
        }
        // Reuses the same value object create()/createBulk() validate against,
        // so a ticket that passes here is guaranteed to pass at persist time too.
        LotteryTicketNumber.from(numbers, station.getRegion().minLength(), station.getRegion().maxLength());
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Mirrors LotteryTicketService#getDraftImportBatchLineForOperatorOrThrow
     * (private there, so duplicated here rather than refactoring that
     * existing, already-tested method). Keep the two in sync if the
     * import-batch-line eligibility rules change.
     */
    private ImportBatchLineModel getDraftImportBatchLineForOperatorOrThrow(Long importBatchLineId, UUID operatorId) {
        if (importBatchLineId == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_IMPORT_BATCH_REQUIRED);
        }

        ImportBatchLineModel line = importBatchLineRepositoryPort.findById(importBatchLineId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));

        ImportBatchModel importBatch = getImportBatchOrThrow(line.getImportBatchId());
        importBatchDraftExpiryService.cancelIfOverdue(importBatch);
        importBatch = getImportBatchOrThrow(line.getImportBatchId());
        line = importBatchLineRepositoryPort.findById(importBatchLineId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));

        if (line.getStatus() == ImportBatchLineStatus.CANCELLED) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_CANCELLED);
        }
        if (importBatch.getStatus() == ImportBatchStatus.CANCELLED) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_CANCELLED);
        }
        if (!importBatch.isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }
        if (importBatch.getImportedBy() == null || !importBatch.getImportedBy().equals(operatorId)) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_IMPORT_BATCH_MISMATCH);
        }

        return line;
    }

    private ImportBatchModel getImportBatchOrThrow(Long importBatchId) {
        return importBatchRepositoryPort.findById(importBatchId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));
    }
}
