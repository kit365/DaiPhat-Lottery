package com.daiphat.coreapi.application.util.chat;

/**
 * @deprecated Use {@link com.daiphat.coreapi.application.service.chat.schedule.ChatScheduleParser#findRegionCode(String)} instead.
 */
@Deprecated
public final class ChatIntentTextUtils {

    private ChatIntentTextUtils() {
    }

    @Deprecated
    public static String extractRegion(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String normalized = text.toLowerCase();
        if (normalized.contains("miền nam") || normalized.contains("mien nam")) {
            return "MIEN_NAM";
        }
        if (normalized.contains("miền trung") || normalized.contains("mien trung")) {
            return "MIEN_TRUNG";
        }
        if (normalized.contains("miền bắc") || normalized.contains("mien bac")) {
            return "MIEN_BAC";
        }
        return null;
    }
}
