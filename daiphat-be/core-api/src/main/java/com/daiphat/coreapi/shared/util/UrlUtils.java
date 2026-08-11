package com.daiphat.coreapi.shared.util;

public final class UrlUtils {

    private UrlUtils() {
    }

    public static String normalizeBaseUrl(String baseUrl, String configKey) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "";
        }
        String trimmed = baseUrl.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
