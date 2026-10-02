package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrSessionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class OcrSessionModel {
    private String sessionCode;
    private UUID adminUserId;
    private String adminUsername;
    private Long importBatchId;
    private Long importBatchLineId;
    private OcrSessionStatus status;
    private String connectedStaffName;
    private String connectedDevice;
    private Instant createdAt;
    private Instant expiresAt;
    private int scannedTicketCount;

    @Builder.Default
    private java.util.List<OcrSessionImage> images = new java.util.concurrent.CopyOnWriteArrayList<>();

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isActive() {
        return (status == OcrSessionStatus.WAITING_FOR_MOBILE || status == OcrSessionStatus.CONNECTED) && !isExpired();
    }
}
