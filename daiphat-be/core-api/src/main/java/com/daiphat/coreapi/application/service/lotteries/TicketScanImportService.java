package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.BatchImportScannedTicketsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.ConfirmedScannedTicketRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ExtractedTicketFieldsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.FieldValidationResult;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.OcrFieldDetailResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScanBatchImportItemResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScanBatchImportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.ScannedTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketBoundingBoxResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TicketScanResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.mapper.lotteries.OcrScanResultApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryScanLogServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.TicketScanImportServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrFieldLayoutRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrTicketTemplateRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.AiModelRegistryRepositoryPort;
import com.daiphat.coreapi.application.port.out.vision.TicketVisionPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrOverallValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanImportOutcome;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanMethod;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldValidation;
import com.daiphat.coreapi.domain.model.lotteries.OcrFieldLayoutModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrNormalizedBoundingBox;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrTicketTemplateModel;
import com.daiphat.coreapi.infrastructure.dto.request.vision.RemoteFieldLayoutMetadata;
import com.daiphat.coreapi.infrastructure.dto.request.vision.RemoteScanMetadata;
import com.daiphat.coreapi.infrastructure.dto.request.vision.RemoteStationMetadata;
import com.daiphat.coreapi.infrastructure.dto.response.vision.RemoteScannedTicket;
import com.daiphat.coreapi.infrastructure.dto.response.vision.RemoteTicketScanResult;
import com.daiphat.coreapi.shared.util.ImportBatchDraftExpiryService;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final OcrScanResultRepositoryPort ocrScanResultRepositoryPort;
    private final LotteryScanLogServicePort lotteryScanLogServicePort;
    private final OcrScanValidationService ocrScanValidationService;
    private final OcrScanResultApplicationMapper ocrScanResultApplicationMapper;
    private final OcrTicketTemplateRepositoryPort ocrTicketTemplateRepositoryPort;
    private final OcrFieldLayoutRepositoryPort ocrFieldLayoutRepositoryPort;
    private final AiModelRegistryRepositoryPort aiModelRegistryRepositoryPort;
    private final OcrScanResultFieldService ocrScanResultFieldService;

    @Value("${daiphat.ticket-vision.recognition-engine:groq}")
    private String ticketVisionRecognitionEngine;

    @Override
    public TicketScanResponse scan(Long importBatchLineId, Long importBatchId, MultipartFile file, UUID operatorId) {
        if (file == null || file.isEmpty()) {
            throw new DomainException(ErrorCode.TICKET_SCAN_IMAGE_REQUIRED);
        }
        if (!ocrTicketTemplateRepositoryPort.existsActiveDefault()) {
            throw new DomainException(ErrorCode.OCR_DEFAULT_TEMPLATE_REQUIRED);
        }

        try {
            return scanInternal(importBatchLineId, importBatchId, file, operatorId);
        } catch (DomainException e) {
            // Validation / business domain errors stay hard failures.
            throw e;
        } catch (Exception e) {
            // Never let a single image's OCR/enrichment crash the Admin scan session
            // or take down Tomcat with an unhandled 500 mid multi-image upload.
            log.error(
                    "OCR scan soft-failed for file={} lineId={} batchId={}",
                    file.getOriginalFilename(),
                    importBatchLineId,
                    importBatchId,
                    e
            );
            String scanId = java.util.UUID.randomUUID().toString();
            List<String> warnings = List.of(
                    "Đã xảy ra lỗi khi xử lý OCR cho ảnh này. "
                            + "Vui lòng quét lại ảnh này; các ảnh khác vẫn có thể tiếp tục."
            );
            ScannedTicketResponse placeholder = unreadableImageTicket(
                    scanId,
                    importBatchLineId,
                    operatorId,
                    file.getOriginalFilename(),
                    null,
                    null,
                    null,
                    warnings
            );
            return TicketScanResponse.builder()
                    .scanId(scanId)
                    .ticketCount(1)
                    .tickets(List.of(placeholder))
                    .warnings(warnings)
                    .imageWidth(null)
                    .imageHeight(null)
                    .sourceImageUrl(null)
                    .build();
        }
    }

    private TicketScanResponse scanInternal(
            Long importBatchLineId,
            Long importBatchId,
            MultipartFile file,
            UUID operatorId
    ) {
        ImportBatchLineModel importBatchLine = null;
        ImportBatchModel importBatch = null;
        LotteryStationModel lineStation = null;
        LocalDate targetDrawDate = null;
        if (importBatchLineId != null) {
            importBatchLine = getDraftImportBatchLineForOperatorOrThrow(importBatchLineId, operatorId);
            importBatch = getImportBatchOrThrow(importBatchLine.getImportBatchId());
            lineStation = lotteryStationServicePort.getModelById(importBatchLine.getLotteryStationId());
            targetDrawDate = importBatch.getDrawDate();
        } else if (importBatchId != null) {
            importBatch = getImportBatchOrThrow(importBatchId);
            targetDrawDate = importBatch.getDrawDate();
        }

        byte[] imageBytes;
        try {
            imageBytes = file.getBytes();
        } catch (IOException e) {
            throw new DomainException(ErrorCode.TICKET_SCAN_IMAGE_REQUIRED, e.getMessage());
        }

        String sourceImageUrl = uploadOriginalScanImage(imageBytes, file.getOriginalFilename(), file.getContentType());

        lotteryScanLogServicePort.recordEvent(
                ScanEventType.SCAN_STARTED, null, null, operatorId, ScanMethod.OCR_SCAN, null,
                importBatchLineId != null
                        ? "Import batch line " + importBatchLineId + " (engine=" + ticketVisionRecognitionEngine + ")"
                        : importBatchId != null
                            ? "OCR scan batch " + importBatchId + " (engine=" + ticketVisionRecognitionEngine + ")"
                            : "OCR scan without import batch (engine=" + ticketVisionRecognitionEngine + ")"
        );

        // Always give the vision model the full active station list so OCR can
        // report the station printed on the ticket. Do not restrict to the
        // import-batch draw schedule (that silently biased recognition).
        List<LotteryStationModel> visionStations = loadActiveStationsForVision();
        // Prefer line station template when scanning a specific import line;
        // otherwise start with the global default template field layouts.
        Long preferredStationId = lineStation != null ? lineStation.getId() : null;

        RemoteScanMetadata metadata = buildScanMetadata(visionStations, preferredStationId, targetDrawDate);
        Long initialTemplateId = metadata.templateId();

        RemoteTicketScanResult remoteResult = ticketVisionPort.scan(
                imageBytes,
                file.getOriginalFilename(),
                metadata
        );

        // When OCR identifies a station with its own template, optionally re-scan
        // once with those field layouts. Skip when the first pass already looks
        // complete or the image has many tickets — a second full LLM pass often
        // exceeds FE/proxy deadlines without improving readable results.
        Long ocrStationId = peekUnanimousOcrStationId(remoteResult, visionStations);
        if (shouldRescanWithStationTemplate(
                remoteResult, preferredStationId, ocrStationId, initialTemplateId, targetDrawDate
        )) {
            Optional<OcrTicketTemplateModel> stationTemplate =
                    ocrTicketTemplateRepositoryPort.resolveForStation(ocrStationId, targetDrawDate);
            log.info(
                    "Re-scanning with station OCR template stationId={} templateId={} (was templateId={})",
                    ocrStationId,
                    stationTemplate.map(OcrTicketTemplateModel::getId).orElse(null),
                    initialTemplateId
            );
            RemoteScanMetadata stationMetadata =
                    buildScanMetadata(visionStations, ocrStationId, targetDrawDate);
            if (stationMetadata.templateId() != null
                    && stationMetadata.fieldLayouts() != null
                    && !stationMetadata.fieldLayouts().isEmpty()) {
                remoteResult = ticketVisionPort.scan(
                        imageBytes,
                        file.getOriginalFilename(),
                        stationMetadata
                );
            }
        }

        List<RemoteScannedTicket> remoteTickets =
                remoteResult.tickets() != null ? remoteResult.tickets() : List.of();
        List<String> warnings = remoteResult.warnings() != null
                ? new ArrayList<>(remoteResult.warnings())
                : new ArrayList<>();

        List<ScannedTicketResponse> enrichedTickets = new ArrayList<>();
        for (RemoteScannedTicket remoteTicket : remoteTickets) {
            try {
                enrichedTickets.add(enrichTicket(
                        remoteTicket,
                        lineStation,
                        targetDrawDate,
                        remoteResult.scanId(),
                        importBatchLineId,
                        operatorId,
                        file.getOriginalFilename(),
                        sourceImageUrl,
                        remoteResult.imageWidth(),
                        remoteResult.imageHeight()
                ));
            } catch (Exception e) {
                log.error(
                        "Failed to enrich OCR ticketIndex {} — keeping soft partial row",
                        remoteTicket != null ? remoteTicket.ticketIndex() : null,
                        e
                );
                warnings.add("Vé #" + (remoteTicket != null ? remoteTicket.ticketIndex() + 1 : "?")
                        + ": không xử lý được đầy đủ, vui lòng kiểm tra thủ công.");
                enrichedTickets.add(softFailedTicket(
                        remoteTicket,
                        remoteResult.scanId(),
                        file.getOriginalFilename(),
                        sourceImageUrl,
                        remoteResult.imageWidth(),
                        remoteResult.imageHeight()
                ));
            }
        }

        if (enrichedTickets.isEmpty()) {
            ScannedTicketResponse placeholder = unreadableImageTicket(
                    remoteResult.scanId(),
                    importBatchLineId,
                    operatorId,
                    file.getOriginalFilename(),
                    sourceImageUrl,
                    remoteResult.imageWidth(),
                    remoteResult.imageHeight(),
                    warnings
            );
            enrichedTickets.add(placeholder);
            warnings.add("Không thể đọc rõ thông tin vé từ ảnh này.");
        }

        log.info(
                "Scanned {} ticket(s) (importBatchLineId={})",
                enrichedTickets.size(), importBatchLineId
        );

        lotteryScanLogServicePort.recordEvent(
                ScanEventType.SCAN_COMPLETED, null, null, operatorId, ScanMethod.OCR_SCAN, null,
                enrichedTickets.size() + " ticket(s) detected"
        );

        return TicketScanResponse.builder()
                .scanId(remoteResult.scanId())
                .ticketCount(enrichedTickets.size())
                .tickets(enrichedTickets)
                .warnings(warnings)
                .imageWidth(remoteResult.imageWidth())
                .imageHeight(remoteResult.imageHeight())
                .sourceImageUrl(sourceImageUrl)
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
        boolean png = isPng(imageBytes);
        UploadRequest uploadRequest = new UploadRequest(
                imageBytes,
                "ticket-scan-" + UUID.randomUUID() + (png ? ".png" : ".jpg"),
                png ? "image/png" : "image/jpeg",
                StorageFolderConstants.TICKET_IMAGE_FOLDER
        );
        return lotteryTicketServicePort.uploadAsset(uploadRequest);
    }

    private static boolean isPng(byte[] imageBytes) {
        return imageBytes != null
                && imageBytes.length >= 8
                && (imageBytes[0] & 0xFF) == 0x89
                && imageBytes[1] == 0x50
                && imageBytes[2] == 0x4E
                && imageBytes[3] == 0x47;
    }

    private String stripDataUrlPrefix(String base64Image) {
        int commaIndex = base64Image.indexOf(',');
        return base64Image.startsWith("data:") && commaIndex >= 0
                ? base64Image.substring(commaIndex + 1)
                : base64Image;
    }

    private List<LotteryStationModel> loadActiveStationsForVision() {
        return lotteryStationRepositoryPort.findAll().stream()
                .filter(s -> s.getDeletedAt() == null)
                .filter(LotteryStationModel::isActive)
                .toList();
    }

    /**
     * Re-scan only when a different station template would likely improve weak
     * fields — not on every multi-ticket photo (that doubles LLM latency and
     * trips the FE/proxy deadline).
     */
    private boolean shouldRescanWithStationTemplate(
            RemoteTicketScanResult remoteResult,
            Long preferredStationId,
            Long ocrStationId,
            Long initialTemplateId,
            LocalDate drawDate
    ) {
        if (ocrStationId == null) {
            return false;
        }
        if (preferredStationId != null && ocrStationId.equals(preferredStationId)) {
            return false;
        }
        if (remoteResult == null || remoteResult.tickets() == null || remoteResult.tickets().isEmpty()) {
            return false;
        }
        // Multi-ticket images already run YOLO crop augmentation; a second full
        // pass rarely finishes before the Admin UI times out.
        if (remoteResult.tickets().size() > 1) {
            return false;
        }
        Optional<OcrTicketTemplateModel> stationTemplate =
                ocrTicketTemplateRepositoryPort.resolveForStation(ocrStationId, drawDate);
        if (stationTemplate.isEmpty()) {
            return false;
        }
        Long stationTemplateId = stationTemplate.get().getId();
        if (initialTemplateId != null && initialTemplateId.equals(stationTemplateId)) {
            return false;
        }
        List<RemoteFieldLayoutMetadata> layouts =
                ocrFieldLayoutRepositoryPort.findByTemplateId(stationTemplateId).stream()
                        .map(this::toRemoteLayout)
                        .filter(java.util.Objects::nonNull)
                        .toList();
        if (layouts.isEmpty()) {
            return false;
        }
        return firstPassNeedsStationTemplateLayouts(remoteResult);
    }

    private static boolean firstPassNeedsStationTemplateLayouts(RemoteTicketScanResult remoteResult) {
        for (RemoteScannedTicket ticket : remoteResult.tickets()) {
            if (ticket == null) {
                return true;
            }
            if (ticket.missingFields() != null && !ticket.missingFields().isEmpty()) {
                return true;
            }
            var extracted = ticket.extracted();
            if (extracted == null) {
                return true;
            }
            boolean weakCore =
                    isBlank(extracted.serialNumber())
                            || isBlank(extracted.numbers())
                            || extracted.drawDate() == null
                            || isBlank(extracted.batchCode());
            if (weakCore) {
                return true;
            }
        }
        return false;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /**
     * If every OCR ticket in the first pass agrees on one station (by code or name),
     * return that station id so we can re-scan with its configured field layouts.
     */
    private Long peekUnanimousOcrStationId(
            RemoteTicketScanResult remoteResult,
            List<LotteryStationModel> stations
    ) {
        if (remoteResult == null || remoteResult.tickets() == null || remoteResult.tickets().isEmpty()) {
            return null;
        }
        if (stations == null || stations.isEmpty()) {
            return null;
        }
        Long agreed = null;
        for (RemoteScannedTicket ticket : remoteResult.tickets()) {
            if (ticket == null || ticket.extracted() == null) {
                continue;
            }
            Long matched = matchStationId(
                    ticket.extracted().stationCode(),
                    ticket.extracted().stationName(),
                    stations
            );
            if (matched == null) {
                return null;
            }
            if (agreed == null) {
                agreed = matched;
            } else if (!agreed.equals(matched)) {
                return null;
            }
        }
        return agreed;
    }

    private static Long matchStationId(
            String stationCode,
            String stationName,
            List<LotteryStationModel> stations
    ) {
        if (stationCode != null && !stationCode.isBlank()) {
            String code = stationCode.trim();
            for (LotteryStationModel station : stations) {
                if (station.getCode() != null && code.equalsIgnoreCase(station.getCode())) {
                    return station.getId();
                }
            }
        }
        if (stationName != null && !stationName.isBlank()) {
            String name = stationName.trim().toLowerCase(Locale.ROOT);
            for (LotteryStationModel station : stations) {
                if (station.getName() != null && station.getName().trim().toLowerCase(Locale.ROOT).equals(name)) {
                    return station.getId();
                }
                if (station.getName() != null
                        && station.getName().toLowerCase(Locale.ROOT).contains(name)) {
                    return station.getId();
                }
                if (station.getName() != null
                        && name.contains(station.getName().trim().toLowerCase(Locale.ROOT))) {
                    return station.getId();
                }
            }
        }
        return null;
    }

    private RemoteScanMetadata buildScanMetadata(
            List<LotteryStationModel> stations,
            Long preferredStationId,
            LocalDate drawDate
    ) {
        List<RemoteStationMetadata> stationMetadata = stations.stream()
                .map(station -> {
                    Integer expectedNumberLength = null;
                    if (station.getRegion() != null) {
                        int min = station.getRegion().minLength();
                        int max = station.getRegion().maxLength();
                        expectedNumberLength = (min == max) ? max : null;
                    }
                    List<String> aliases = (station.getProvince() != null && !station.getProvince().isBlank())
                            ? List.of(station.getProvince())
                            : List.of();
                    return new RemoteStationMetadata(
                            station.getId(),
                            station.getName(),
                            station.getCode(),
                            aliases,
                            expectedNumberLength
                    );
                })
                .toList();

        Long templateId = null;
        List<RemoteFieldLayoutMetadata> fieldLayouts = List.of();
        OcrTicketTemplateModel template = null;
        if (preferredStationId != null) {
            template = ocrTicketTemplateRepositoryPort
                    .resolveForStation(preferredStationId, drawDate)
                    .orElse(null);
        }
        if (template == null) {
            // Batch / free-form scans: still guide OCR with the active default template layouts.
            template = ocrTicketTemplateRepositoryPort.findActiveDefault().orElse(null);
        }
        if (template != null) {
            templateId = template.getId();
            fieldLayouts = ocrFieldLayoutRepositoryPort.findByTemplateId(template.getId()).stream()
                    .map(this::toRemoteLayout)
                    .filter(java.util.Objects::nonNull)
                    .toList();
            log.debug(
                    "OCR scan using templateId={} stationId={} layoutFields={}",
                    templateId,
                    template.getStationId(),
                    fieldLayouts.size()
            );
        }

        return new RemoteScanMetadata(
                stationMetadata,
                15,
                null,
                ticketVisionRecognitionEngine,
                templateId,
                fieldLayouts
        );
    }

    private RemoteFieldLayoutMetadata toRemoteLayout(OcrFieldLayoutModel layout) {
        if (layout == null || layout.getFieldName() == null) {
            return null;
        }
        OcrNormalizedBoundingBox box = layout.getBoundingBox();
        if (box == null) {
            return null;
        }
        return new RemoteFieldLayoutMetadata(
                layout.getId(),
                layout.getFieldName().name(),
                layout.getPriority() > 0 ? layout.getPriority() : 1,
                box.getX(),
                box.getY(),
                box.getWidth(),
                box.getHeight(),
                layout.isRequired()
        );
    }

    private ScannedTicketResponse enrichTicket(
            RemoteScannedTicket remote,
            LotteryStationModel lineStation,
            LocalDate targetDrawDate,
            String scanId,
            Long importBatchLineId,
            UUID operatorId,
            String sourceImageName,
            String sourceImageUrl,
            Integer scanImageWidth,
            Integer scanImageHeight
    ) {
        ExtractedTicketFieldsResponse extracted =
                OcrScanValidationService.reconcileExtractedFields(remote.extracted());
        Integer imageWidth = remote.imageWidth() != null ? remote.imageWidth() : scanImageWidth;
        Integer imageHeight = remote.imageHeight() != null ? remote.imageHeight() : scanImageHeight;

        Long provisionalTemplateId = lineStation != null
                ? ocrTicketTemplateRepositoryPort
                        .resolveForStation(lineStation.getId(), targetDrawDate)
                        .map(t -> t.getId())
                        .orElse(null)
                : null;

        OcrScanValidationService.ValidationOutcome outcome = ocrScanValidationService.validate(
                extracted,
                remote.fieldConfidences(),
                remote.status(),
                lineStation,
                targetDrawDate,
                provisionalTemplateId
        );

        Map<String, OcrFieldDetailResponse> fields = buildFieldDetails(
                extracted,
                remote.fieldConfidences(),
                remote.fieldBoxes(),
                outcome.fieldValidations()
        );

        // Only the station OCR resolved — never substitute the import-batch/line station.
        Long resolvedStationId = outcome.resolvedStationId();
        LocalDate resolvedDrawDate = outcome.resolvedDrawDate() != null
                ? outcome.resolvedDrawDate()
                : targetDrawDate;
        Long templateId = ocrTicketTemplateRepositoryPort
                .resolveForStation(resolvedStationId, resolvedDrawDate)
                .map(t -> t.getId())
                .orElse(null);

        PersistedOcrScanResult persistResult = persistOcrScanResult(
                remote,
                resolvedStationId,
                templateId,
                scanId,
                importBatchLineId,
                operatorId,
                extracted,
                outcome,
                sourceImageName,
                sourceImageUrl,
                imageWidth,
                imageHeight
        );
        Long ocrScanResultId = persistResult.id();
        String croppedImageUrl = persistResult.croppedImageUrl();
        lotteryScanLogServicePort.recordEvent(
                outcome.businessValidationErrors().isEmpty()
                        ? ScanEventType.OCR_COMPLETED
                        : ScanEventType.INVALID_TICKET,
                ocrScanResultId,
                null,
                operatorId,
                ScanMethod.OCR_SCAN,
                outcome.businessValidationErrors().isEmpty(),
                outcome.businessValidationErrors().isEmpty()
                        ? null
                        : String.join("; ", outcome.businessValidationErrors())
        );

        return ScannedTicketResponse.builder()
                .ticketIndex(remote.ticketIndex())
                .bbox(remote.bbox())
                .status(outcome.status())
                .confidence(remote.confidence())
                .adjustedConfidence(outcome.adjustedConfidence())
                .extracted(extracted)
                .fieldConfidences(remote.fieldConfidences())
                .fieldBoxes(remote.fieldBoxes())
                .fieldValidations(outcome.fieldValidations())
                .fields(fields)
                .overallValidationStatus(outcome.overallValidationStatus())
                .missingFields(remote.missingFields())
                .validationErrors(remote.validationErrors())
                .businessValidationErrors(outcome.businessValidationErrors())
                .duplicate(outcome.duplicate())
                .resolvedStationId(resolvedStationId)
                .resolvedDrawDate(resolvedDrawDate)
                // Always return the pristine crop bytes for Admin review (crop-only PNG).
                // CDN URL is a durable fallback; do not drop base64 or the UI may show a
                // re-encoded / transformed delivery URL instead of the original crop.
                .croppedImageBase64(remote.croppedImageBase64())
                .croppedImageUrl(croppedImageUrl)
                .ocrScanResultId(ocrScanResultId)
                .sourceImageName(sourceImageName)
                .sourceImageUrl(sourceImageUrl)
                .imageWidth(imageWidth)
                .imageHeight(imageHeight)
                .build();
    }
    private ScannedTicketResponse softFailedTicket(
            RemoteScannedTicket remote,
            String scanId,
            String sourceImageName,
            String sourceImageUrl,
            Integer scanImageWidth,
            Integer scanImageHeight
    ) {
        if (remote == null) {
            return ScannedTicketResponse.builder()
                    .ticketIndex(0)
                    .status(ScannedTicketStatus.FAILED)
                    .confidence(0)
                    .overallValidationStatus(OcrOverallValidationStatus.NEEDS_REVIEW)
                    .businessValidationErrors(List.of(
                            "Không thể đọc rõ thông tin vé từ ảnh này.",
                            "Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
                    ))
                    .sourceImageName(sourceImageName)
                    .sourceImageUrl(sourceImageUrl)
                    .imageWidth(scanImageWidth)
                    .imageHeight(scanImageHeight)
                    .build();
        }
        Integer imageWidth = remote.imageWidth() != null ? remote.imageWidth() : scanImageWidth;
        Integer imageHeight = remote.imageHeight() != null ? remote.imageHeight() : scanImageHeight;
        ExtractedTicketFieldsResponse extracted =
                OcrScanValidationService.reconcileExtractedFields(remote.extracted());
        boolean hasAnyField = hasAnyExtractedValue(extracted);
        ScannedTicketStatus status = hasAnyField ? ScannedTicketStatus.PARTIAL : ScannedTicketStatus.FAILED;
        String croppedImageUrl = uploadCroppedScanImage(
                remote.croppedImageBase64(),
                remote.ticketIndex(),
                scanId
        );
        return ScannedTicketResponse.builder()
                .ticketIndex(remote.ticketIndex())
                .bbox(remote.bbox())
                .status(status)
                .confidence(remote.confidence())
                .extracted(extracted)
                .fieldConfidences(remote.fieldConfidences())
                .fieldBoxes(remote.fieldBoxes())
                .overallValidationStatus(OcrOverallValidationStatus.NEEDS_REVIEW)
                .missingFields(remote.missingFields())
                .validationErrors(remote.validationErrors())
                .businessValidationErrors(List.of(
                        hasAnyField
                                ? "Một số thông tin trên vé bị che hoặc không đủ rõ để nhận diện."
                                : "Không thể đọc rõ thông tin vé từ ảnh này.",
                        "Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công."
                ))
                .croppedImageBase64(remote.croppedImageBase64())
                .croppedImageUrl(croppedImageUrl)
                .sourceImageName(sourceImageName)
                .sourceImageUrl(sourceImageUrl)
                .imageWidth(imageWidth)
                .imageHeight(imageHeight)
                .build();
    }

    /**
     * When ticket-vision returns zero tickets (blurry/covered/unreadable image),
     * still return one FAILED placeholder so Admin review keeps the image.
     */
    private ScannedTicketResponse unreadableImageTicket(
            String scanId,
            Long importBatchLineId,
            UUID operatorId,
            String sourceImageName,
            String sourceImageUrl,
            Integer imageWidth,
            Integer imageHeight,
            List<String> visionWarnings
    ) {
        List<String> errors = new ArrayList<>();
        errors.add("Không thể đọc rõ thông tin vé từ ảnh này.");
        errors.add("Một số thông tin trên vé bị che hoặc không đủ rõ để nhận diện.");
        errors.add("Vui lòng kiểm tra lại ảnh hoặc nhập thông tin thủ công.");
        if (visionWarnings != null) {
            for (String warning : visionWarnings) {
                if (warning == null || warning.isBlank() || errors.contains(warning.trim())) {
                    continue;
                }
                String trimmed = warning.trim();
                // Never surface Spring/RestTemplate I/O stack text to Admin UI.
                if (looksLikeTechnicalVisionError(trimmed)) {
                    String friendly = ErrorCode.TICKET_SCAN_SERVICE_UNAVAILABLE.getMessage();
                    if (!errors.contains(friendly)) {
                        errors.add(friendly);
                    }
                    continue;
                }
                errors.add(trimmed);
            }
        }

        String unreadableMsg = "OCR không đọc được trường này. Ảnh có thể bị che / mờ / cắt / chồng.";
        Map<String, FieldValidationResult> fieldValidations = new LinkedHashMap<>();
        Map<String, OcrFieldValidation> persistedValidations = new LinkedHashMap<>();
        for (String fieldName : List.of(
                "stationName", "serialNumber", "numbers", "drawDate", "ticketType", "batchCode"
        )) {
            FieldValidationResult result = FieldValidationResult.unreadable(unreadableMsg);
            fieldValidations.put(fieldName, result);
            persistedValidations.put(fieldName, OcrFieldValidation.builder()
                    .status(result.status())
                    .message(result.message())
                    .expectedValue(result.expectedValue())
                    .build());
        }

        TicketBoundingBoxResponse fullImageBox = null;
        if (imageWidth != null && imageWidth > 0 && imageHeight != null && imageHeight > 0) {
            fullImageBox = new TicketBoundingBoxResponse(
                    0, 0, imageWidth, imageHeight, List.of()
            );
        }

        Map<String, OcrFieldDetailResponse> fields = new LinkedHashMap<>();
        for (Map.Entry<String, FieldValidationResult> entry : fieldValidations.entrySet()) {
            fields.put(
                    entry.getKey(),
                    OcrFieldDetailResponse.builder()
                            .fieldName(entry.getKey())
                            .value(null)
                            .confidence(0.0)
                            .boundingBox(null)
                            .validationStatus(entry.getValue().status())
                            .validationMessage(entry.getValue().message())
                            .expectedValue(null)
                            .validationFailures(entry.getValue().ruleFailures())
                            .build()
            );
        }

        Long ocrScanResultId = null;
        try {
            OcrScanResultModel model = OcrScanResultModel.builder()
                    .scanId(scanId)
                    .ticketIndex(0)
                    .importBatchLineId(importBatchLineId)
                    .status(ScannedTicketStatus.FAILED)
                    .confidence(0.0)
                    .adjustedConfidence(0.0)
                    .overallValidationStatus(OcrOverallValidationStatus.NEEDS_REVIEW)
                    .businessValidationErrors(errors)
                    .fieldValidations(persistedValidations)
                    .missingFields(List.of("stationName", "serialNumber", "numbers", "drawDate"))
                    .sourceImageName(sourceImageName)
                    .sourceImageUrl(sourceImageUrl)
                    .imageWidth(imageWidth)
                    .imageHeight(imageHeight)
                    .scannedBy(operatorId)
                    .scannedAt(LocalDateTime.now())
                    .build();
            ocrScanResultId = ocrScanResultRepositoryPort.save(model).getId();
        } catch (Exception e) {
            log.warn("Could not persist FAILED OCR placeholder for scanId={}", scanId, e);
        }

        return ScannedTicketResponse.builder()
                .ticketIndex(0)
                .bbox(fullImageBox)
                .status(ScannedTicketStatus.FAILED)
                .confidence(0)
                .adjustedConfidence(0.0)
                .extracted(new ExtractedTicketFieldsResponse(
                        null, null, null, null, null, null, null
                ))
                .fieldConfidences(Map.of())
                .fieldBoxes(Map.of())
                .fieldValidations(fieldValidations)
                .fields(fields)
                .overallValidationStatus(OcrOverallValidationStatus.NEEDS_REVIEW)
                .missingFields(List.of("stationName", "serialNumber", "numbers", "drawDate"))
                .validationErrors(List.of())
                .businessValidationErrors(errors)
                .duplicate(false)
                .ocrScanResultId(ocrScanResultId)
                .sourceImageName(sourceImageName)
                .sourceImageUrl(sourceImageUrl)
                .imageWidth(imageWidth)
                .imageHeight(imageHeight)
                .build();
    }

    private static boolean hasAnyExtractedValue(ExtractedTicketFieldsResponse extracted) {
        if (extracted == null) {
            return false;
        }
        return notBlank(extracted.stationName())
                || notBlank(extracted.stationCode())
                || notBlank(extracted.serialNumber())
                || notBlank(extracted.numbers())
                || extracted.drawDate() != null
                || notBlank(extracted.ticketType())
                || notBlank(extracted.batchCode());
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private Map<String, OcrFieldDetailResponse> buildFieldDetails(
            ExtractedTicketFieldsResponse extracted,
            Map<String, Double> fieldConfidences,
            Map<String, TicketBoundingBoxResponse> fieldBoxes,
            Map<String, FieldValidationResult> fieldValidations
    ) {
        Map<String, Double> confidences = fieldConfidences != null ? fieldConfidences : Map.of();
        Map<String, TicketBoundingBoxResponse> boxes = fieldBoxes != null ? fieldBoxes : Map.of();
        Map<String, FieldValidationResult> validations =
                fieldValidations != null ? fieldValidations : Map.of();

        LinkedHashMap<String, OcrFieldDetailResponse> details = new LinkedHashMap<>();
        for (String fieldName : List.of(
                "stationName", "batchCode", "numbers", "serialNumber", "drawDate", "ticketType"
        )) {
            FieldValidationResult validation = validations.get(fieldName);
            details.put(
                    fieldName,
                    OcrFieldDetailResponse.builder()
                            .fieldName(fieldName)
                            .value(extractFieldValue(extracted, fieldName))
                            .confidence(confidences.get(fieldName))
                            .boundingBox(boxes.get(fieldName))
                            .validationStatus(validation != null ? validation.status() : null)
                            .validationMessage(validation != null ? validation.message() : null)
                            .expectedValue(validation != null ? validation.expectedValue() : null)
                            .validationFailures(validation != null ? validation.ruleFailures() : null)
                            .build()
            );
        }
        return details;
    }

    private static String extractFieldValue(ExtractedTicketFieldsResponse extracted, String fieldName) {
        if (extracted == null) {
            return null;
        }
        return switch (fieldName) {
            case "stationName" -> extracted.stationName();
            case "batchCode" -> extracted.batchCode();
            case "numbers" -> extracted.numbers();
            case "serialNumber" -> extracted.serialNumber();
            case "drawDate" -> extracted.drawDate() != null ? extracted.drawDate().toString() : null;
            case "ticketType" -> extracted.ticketType();
            default -> null;
        };
    }

    /** Best-effort: an OCR_Scan_Result write failure degrades to a null id (no scan-log linkage), never fails the scan. */
    private PersistedOcrScanResult persistOcrScanResult(
            RemoteScannedTicket remote,
            Long stationId,
            Long templateId,
            String scanId,
            Long importBatchLineId,
            UUID operatorId,
            ExtractedTicketFieldsResponse extracted,
            OcrScanValidationService.ValidationOutcome outcome,
            String sourceImageName,
            String sourceImageUrl,
            Integer imageWidth,
            Integer imageHeight
    ) {
        try {
            String croppedImageUrl = uploadCroppedScanImage(
                    remote.croppedImageBase64(),
                    remote.ticketIndex(),
                    scanId
            );
            OcrScanResultModel saved = ocrScanResultRepositoryPort.save(
                    OcrScanResultModel.builder()
                            .scanId(scanId)
                            .ticketIndex(remote.ticketIndex())
                            .importBatchLineId(importBatchLineId)
                            .stationId(stationId)
                            .templateId(templateId)
                            .aiModelId(resolveAiModelId())
                            .sourceImageName(sourceImageName)
                            .sourceImageUrl(sourceImageUrl)
                            .bbox(ocrScanResultApplicationMapper.toDomainBox(remote.bbox()))
                            .imageWidth(imageWidth)
                            .imageHeight(imageHeight)
                            .extractedStationName(extracted != null ? extracted.stationName() : null)
                            .extractedSerialNumber(extracted != null ? extracted.serialNumber() : null)
                            .extractedNumbers(extracted != null ? extracted.numbers() : null)
                            .extractedDrawDate(extracted != null ? extracted.drawDate() : null)
                            .extractedBatchCode(extracted != null ? extracted.batchCode() : null)
                            .extractedPrice(extracted != null ? extracted.ticketType() : null)
                            .confidence(remote.confidence())
                            .adjustedConfidence(outcome.adjustedConfidence())
                            .fieldConfidences(remote.fieldConfidences())
                            .fieldBoxes(ocrScanResultApplicationMapper.toDomainBoxMap(remote.fieldBoxes()))
                            .usedFieldLayouts(remote.usedFieldLayouts())
                            .fieldValidations(
                                    ocrScanResultApplicationMapper.toDomainValidationMap(outcome.fieldValidations())
                            )
                            .overallValidationStatus(outcome.overallValidationStatus())
                            .status(outcome.status())
                            .missingFields(remote.missingFields())
                            .validationErrors(remote.validationErrors())
                            .businessValidationErrors(outcome.businessValidationErrors())
                            .croppedImageUrl(croppedImageUrl)
                            .scannedBy(operatorId)
                            .scannedAt(LocalDateTime.now())
                            .build()
            );
            ocrScanResultFieldService.dualWriteFromParent(saved);
            return new PersistedOcrScanResult(saved.getId(), croppedImageUrl);
        } catch (Exception e) {
            log.error("Failed to persist OCR scan result for ticketIndex {} (scanId {})", remote.ticketIndex(), scanId, e);
            return new PersistedOcrScanResult(null, null);
        }
    }

    private String uploadCroppedScanImage(String croppedImageBase64, int ticketIndex, String scanId) {
        if (croppedImageBase64 == null || croppedImageBase64.isBlank()) {
            return null;
        }
        try {
            return uploadScannedImage(croppedImageBase64).url();
        } catch (Exception uploadEx) {
            log.warn(
                    "Failed to upload cropped OCR image for ticketIndex {} (scanId {})",
                    ticketIndex,
                    scanId,
                    uploadEx
            );
            return null;
        }
    }

    private record PersistedOcrScanResult(Long id, String croppedImageUrl) {
    }

    private String uploadOriginalScanImage(byte[] imageBytes, String originalFilename, String contentType) {
        try {
            String safeName = (originalFilename != null && !originalFilename.isBlank())
                    ? originalFilename
                    : ("ocr-source-" + UUID.randomUUID() + ".jpg");
            String mime = (contentType != null && !contentType.isBlank())
                    ? contentType
                    : "image/jpeg";
            UploadRequest uploadRequest = new UploadRequest(
                    imageBytes,
                    "ocr-source-" + UUID.randomUUID() + "-" + safeName,
                    mime,
                    StorageFolderConstants.TICKET_IMAGE_FOLDER
            );
            return lotteryTicketServicePort.uploadAsset(uploadRequest).url();
        } catch (Exception e) {
            log.warn("Failed to upload original OCR source image; review resume may lack preview", e);
            return null;
        }
    }

    private Long resolveAiModelId() {
        try {
            String provider = ticketVisionRecognitionEngine != null
                    ? ticketVisionRecognitionEngine.trim().toLowerCase()
                    : "groq";
            return aiModelRegistryRepositoryPort.findDefaultActiveByProvider(provider)
                    .map(m -> m.getId())
                    .orElseGet(() -> aiModelRegistryRepositoryPort.findAnyActiveDefault()
                            .map(m -> m.getId())
                            .orElse(null));
        } catch (Exception e) {
            log.warn("Could not resolve AI model registry id for engine={}", ticketVisionRecognitionEngine, e);
            return null;
        }
    }

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

    private static boolean looksLikeTechnicalVisionError(String message) {
        String lower = message.toLowerCase();
        return lower.contains("i/o error")
                || lower.contains("connection refused")
                || lower.contains("connect to http")
                || lower.contains("resourceaccessexception")
                || lower.contains("localhost:8090")
                || lower.contains("getsockopt");
    }
}
