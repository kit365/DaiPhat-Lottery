package com.daiphat.coreapi.shared.util;

import java.text.Normalizer;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.regex.Pattern;

public final class SlugUtils {
    private SlugUtils() {}

    private static final Pattern DIACRITICAL_MARKS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    public static String toSlug(String input) {
        if (input == null) {
            return "";
        }
        String temp = Normalizer.normalize(input, Normalizer.Form.NFD);
        return DIACRITICAL_MARKS.matcher(temp).replaceAll("")
                .toLowerCase()
                .replaceAll("đ", "d")
                .replaceAll("Đ", "d")
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-+|-+$", "")
                .trim();
    }

    /**
     * Produces a URL-safe slug and adds a numeric suffix when the base value is
     * already in use: {@code bai-viet}, {@code bai-viet-2}, ...
     */
    public static String generateUnique(String preferredValue, String fallbackValue, Predicate<String> slugExists) {
        return generateUnique(preferredValue, fallbackValue, Integer.MAX_VALUE, slugExists);
    }

    public static String generateUnique(
            String preferredValue,
            String fallbackValue,
            int maxLength,
            Predicate<String> slugExists) {
        Objects.requireNonNull(slugExists, "slugExists must not be null");
        if (maxLength < 3) {
            throw new IllegalArgumentException("maxLength must be at least 3");
        }

        String source = preferredValue != null && !preferredValue.isBlank() ? preferredValue : fallbackValue;
        String baseSlug = toSlug(source);
        if (baseSlug.isBlank()) {
            throw new IllegalArgumentException("Cannot generate a slug from a blank value");
        }
        baseSlug = trimToLength(baseSlug, maxLength);

        String slug = baseSlug;
        int suffix = 2;
        while (slugExists.test(slug)) {
            String suffixValue = "-" + suffix++;
            slug = trimToLength(baseSlug, maxLength - suffixValue.length()) + suffixValue;
        }
        return slug;
    }

    private static String trimToLength(String value, int maxLength) {
        String trimmed = value.substring(0, Math.min(value.length(), maxLength));
        return trimmed.replaceFirst("-+$", "");
    }
}
