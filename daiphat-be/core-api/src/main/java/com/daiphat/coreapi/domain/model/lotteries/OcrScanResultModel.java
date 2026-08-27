package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrOverallValidationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * OCR_Scan_Result: a persisted snapshot of one ticket-vision-detected
 * ticket from a POST /lottery-tickets/scan call — one row per detected
 * ticket, not per scan batch. Referenced by {@link LotteryScanLogModel#getOcrScanResultId()}.
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OcrScanResultModel {

    private Long id;
    private String scanId;
    private int ticketIndex;

    private Long importBatchLineId;
    private Long stationId;

    private Long templateId;

    private Long aiModelId;

    private String sourceImageName;
    private OcrBoundingBox bbox;
    private Integer imageWidth;
    private Integer imageHeight;

    private String extractedStationName;
    private String extractedSerialNumber;
    private String extractedNumbers;
    private LocalDate extractedDrawDate;
    private String extractedBatchCode;
    private String extractedPrice;

    private double confidence;
    private Double adjustedConfidence;
    private Map<String, Double> fieldConfidences;
    private Map<String, OcrBoundingBox> fieldBoxes;
    /** fieldName -> ocr_field_layouts.id that produced the recognized value. */
    private Map<String, Long> usedFieldLayouts;
    private Map<String, OcrFieldValidation> fieldValidations;
    private OcrOverallValidationStatus overallValidationStatus;

    private ScannedTicketStatus status;
    private List<String> missingFields;
    private List<String> validationErrors;
    private List<String> businessValidationErrors;
    private String croppedImageUrl;

    private UUID scannedBy;
    private LocalDateTime scannedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;
}
