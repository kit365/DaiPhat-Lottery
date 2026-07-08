package com.daiphat.coreapi.application.util.chat;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ChatScheduleTexts {

    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("đ", "d")
                .replace("Đ", "D");
        return normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    public static boolean containsAny(String normalizedMessage, List<String> phrases) {
        if (normalizedMessage == null || normalizedMessage.isBlank() || phrases == null || phrases.isEmpty()) {
            return false;
        }
        for (String phrase : phrases) {
            String normalizedPhrase = normalize(phrase);
            if (!normalizedPhrase.isBlank() && normalizedMessage.contains(normalizedPhrase)) {
                return true;
            }
        }
        return false;
    }
}
