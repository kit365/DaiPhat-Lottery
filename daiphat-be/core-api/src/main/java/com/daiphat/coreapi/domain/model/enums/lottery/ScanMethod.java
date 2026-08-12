package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Lottery_Scan_Log.scanMethod — how the ticket was scanned/entered.
 *
 * <p>OCR_SCAN was added alongside the two the spec named (QR_SCAN,
 * MANUAL_INPUT) so the camera-OCR ticket-scan flow (DP-269) — which drives
 * most of {@link ScanEventType}'s values (OCR_COMPLETED, TICKET_CREATED,
 * SCAN_STARTED/COMPLETED...) — has a coherent method value too.
 */
@Getter
@RequiredArgsConstructor
public enum ScanMethod {
    QR_SCAN("Quét bằng QR Code"),
    OCR_SCAN("Quét bằng AI Vision OCR"),
    MANUAL_INPUT("Nhập tay");

    private final String displayName;
}
