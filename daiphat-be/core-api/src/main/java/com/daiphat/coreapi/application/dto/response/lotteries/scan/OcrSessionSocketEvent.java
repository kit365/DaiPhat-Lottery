package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import java.time.Instant;
import java.util.List;

public record OcrSessionSocketEvent(
        String eventType,
        String sessionCode,
        String staffName,
        String deviceName,
        String scanId,
        List<ScannedTicketResponse> tickets,
        int totalInSession,
        String message,
        Instant timestamp,
        com.daiphat.coreapi.domain.model.lotteries.OcrSessionImage image
) {
    public static OcrSessionSocketEvent connected(String sessionCode, String staffName, String deviceName) {
        return new OcrSessionSocketEvent(
                "SESSION_CONNECTED",
                sessionCode,
                staffName,
                deviceName,
                null,
                null,
                0,
                "Thiết bị Mobile đã kết nối thành công.",
                Instant.now(), null
        );
    }

    public static OcrSessionSocketEvent ticketScanned(String sessionCode, String scanId, List<ScannedTicketResponse> tickets, int totalInSession) {
        return new OcrSessionSocketEvent(
                "TICKET_SCANNED",
                sessionCode,
                null,
                null,
                scanId,
                tickets,
                totalInSession,
                "Đã nhận diện vé từ Mobile.",
                Instant.now(), null
        );
    }

    public static OcrSessionSocketEvent closed(String sessionCode, String message) {
        return new OcrSessionSocketEvent(
                "SESSION_CLOSED",
                sessionCode,
                null,
                null,
                null,
                null,
                0,
                message,
                Instant.now(), null
        );
    }

    public static OcrSessionSocketEvent imageUploaded(String code,
            com.daiphat.coreapi.domain.model.lotteries.OcrSessionImage image, int total) {
        return new OcrSessionSocketEvent("IMAGE_UPLOADED", code, null, null, null, null,
                total, "Ảnh đã gửi sang Web, chờ bắt đầu quét.", Instant.now(), image);
    }
}
