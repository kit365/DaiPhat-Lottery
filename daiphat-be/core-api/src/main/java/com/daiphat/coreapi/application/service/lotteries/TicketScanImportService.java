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
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
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
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
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
import java.util.Map;
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

    @Value("${daiphat.ticket-vision.recognition-engine:gemini}")
    private String ticketVisionRecognitionEngine;

    @Override
    public TicketScanResponse scan(Long importBatchLineId, MultipartFile file, UUID operatorId) {
        if (file == null || file.isEmpty()) {
            throw new DomainException(ErrorCode.TICKET_SCAN_IMAGE_REQUIRED);
        }

        ImportBatchLineModel importBatchLine = null;
        ImportBatchModel importBatch = null;
        LotteryStationModel lineStation = null;
        LocalDate targetDrawDate = null;
        if (importBatchLineId != null) {
            importBatchLine = getDraftImportBatchLineForOperatorOrThrow(importBatchLineId, operatorId);
            importBatch = getImportBatchOrThrow(importBatchLine.getImportBatchId());
            lineStation = lotteryStationServicePort.getModelById(importBatchLine.getLotteryStationId());
            targetDrawDate = importBatch.getDrawDate();
        }

        byte[] imageBytes;
        try {
            imageBytes = file.getBytes();
        } catch (IOException e) {
            throw new DomainException(ErrorCode.TICKET_SCAN_IMAGE_REQUIRED, e.getMessage());
        }

        lotteryScanLogServicePort.recordEvent(
                ScanEventType.SCAN_STARTED, null, null, operatorId, ScanMethod.OCR_SCAN, null,
                importBatchLineId != null
                        ? "Import batch line " + importBatchLineId + " (engine=" + ticketVisionRecognitionEngine + ")"
                        : "OCR scan without import batch (engine=" + ticketVisionRecognitionEngine + ")"
        );

        RemoteScanMetadata metadata = lineStation != null
                ? buildScanMetadata(List.of(lineStation))
                : buildScanMetadata(loadActiveStationsForVision());

        RemoteTicketScanResult remoteResult = ticketVisionPort.scan(
                imageBytes,
                file.getOriginalFilename(),
                metadata
        );

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

    private List<LotteryStationModel> loadActiveStationsForVision() {
        return lotteryStationRepositoryPort.findAll().stream()
                .filter(s -> s.getDeletedAt() == null)
                .filter(s -> s.isActive())
                .toList();
    }

    private RemoteScanMetadata buildScanMetadata(List<LotteryStationModel> stations) {
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
        return new RemoteScanMetadata(
                stationMetadata,
                null,
                null,
                ticketVisionRecognitionEngine
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
            Integer scanImageWidth,
            Integer scanImageHeight
    ) {
        ExtractedTicketFieldsResponse extracted = remote.extracted();
        Integer imageWidth = remote.imageWidth() != null ? remote.imageWidth() : scanImageWidth;
        Integer imageHeight = remote.imageHeight() != null ? remote.imageHeight() : scanImageHeight;

        OcrScanValidationService.ValidationOutcome outcome = ocrScanValidationService.validate(
                extracted,
                remote.fieldConfidences(),
                remote.status(),
                lineStation,
                targetDrawDate
        );

        Map<String, OcrFieldDetailResponse> fields = buildFieldDetails(
                extracted,
                remote.fieldConfidences(),
                remote.fieldBoxes(),
                outcome.fieldValidations()
        );

        Long resolvedStationId = outcome.resolvedStationId() != null
                ? outcome.resolvedStationId()
                : (lineStation != null ? lineStation.getId() : null);
        LocalDate resolvedDrawDate = outcome.resolvedDrawDate() != null
                ? outcome.resolvedDrawDate()
                : targetDrawDate;

        Long ocrScanResultId = persistOcrScanResult(
                remote,
                resolvedStationId,
                scanId,
                importBatchLineId,
                operatorId,
                extracted,
                outcome,
                sourceImageName,
                imageWidth,
                imageHeight
        );
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
                .croppedImageBase64(remote.croppedImageBase64())
                .ocrScanResultId(ocrScanResultId)
                .sourceImageName(sourceImageName)
                .imageWidth(imageWidth)
                .imageHeight(imageHeight)
                .build();
    }
    private ScannedTicketResponse softFailedTicket(
            RemoteScannedTicket remote,
            String scanId,
            String sourceImageName,
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
                    .imageWidth(scanImageWidth)
                    .imageHeight(scanImageHeight)
                    .build();
        }
        Integer imageWidth = remote.imageWidth() != null ? remote.imageWidth() : scanImageWidth;
        Integer imageHeight = remote.imageHeight() != null ? remote.imageHeight() : scanImageHeight;
        boolean hasAnyField = hasAnyExtractedValue(remote.extracted());
        ScannedTicketStatus status = hasAnyField ? ScannedTicketStatus.PARTIAL : ScannedTicketStatus.FAILED;
        return ScannedTicketResponse.builder()
                .ticketIndex(remote.ticketIndex())
                .bbox(remote.bbox())
                .status(status)
                .confidence(remote.confidence())
                .extracted(remote.extracted())
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
                .sourceImageName(sourceImageName)
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
                if (warning != null && !warning.isBlank() && !errors.contains(warning)) {
                    errors.add(warning.trim());
                }
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
    private Long persistOcrScanResult(
            RemoteScannedTicket remote,
            Long stationId,
            String scanId,
            Long importBatchLineId,
            UUID operatorId,
            ExtractedTicketFieldsResponse extracted,
            OcrScanValidationService.ValidationOutcome outcome,
            String sourceImageName,
            Integer imageWidth,
            Integer imageHeight
    ) {
        try {
            OcrScanResultModel saved = ocrScanResultRepositoryPort.save(
                    OcrScanResultModel.builder()
                            .scanId(scanId)
                            .ticketIndex(remote.ticketIndex())
                            .importBatchLineId(importBatchLineId)
                            .stationId(stationId)
                            .sourceImageName(sourceImageName)
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
                            .fieldValidations(
                                    ocrScanResultApplicationMapper.toDomainValidationMap(outcome.fieldValidations())
                            )
                            .overallValidationStatus(outcome.overallValidationStatus())
                            .status(outcome.status())
                            .missingFields(remote.missingFields())
                            .validationErrors(remote.validationErrors())
                            .businessValidationErrors(outcome.businessValidationErrors())
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
