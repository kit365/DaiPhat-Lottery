package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lottery_Scan_Log: history of every ticket scan/verification event. Kept
 * separate from a general Audit_Log — faster reporting queries, scan-specific
 * fields (scanMethod, isValid), no extra weight on Audit_Log.
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryScanLogModel {

    private Long id;
    private ScanEventType eventType;

    /** Nullable — only set for OCR-sourced events (see {@link ScanEventType#OCR_COMPLETED} and friends). */
    private Long ocrScanResultId;

    /** Nullable — not every event resolves to a known physical ticket yet (e.g. SCAN_STARTED, TICKET_NOT_FOUND). */
    private Long lotteryTicketSerialId;

    private UUID scannedBy;
    private ScanMethod scanMethod;
    private Boolean isValid;
    private String note;
    private LocalDateTime scannedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;
}
