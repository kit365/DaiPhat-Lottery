package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ScannedTicketStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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

    private String extractedStationName;
    private String extractedSerialNumber;
    private String extractedNumbers;
    private LocalDate extractedDrawDate;
    private double confidence;

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
