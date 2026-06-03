package com.daiphat.coreapi.shared.util;

import java.text.Normalizer;
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
                .trim();
    }
}
