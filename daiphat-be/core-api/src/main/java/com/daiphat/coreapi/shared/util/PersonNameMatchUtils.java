package com.daiphat.coreapi.shared.util;

import java.text.Normalizer;
import java.util.Locale;

public final class PersonNameMatchUtils {

    private PersonNameMatchUtils() {
    }

  /** Vietnamese display order: họ (lastName) trước, tên (firstName) sau — khớp {@code UserModel#getFullName()}. */
    public static String resolveFullName(String firstName, String lastName, String usernameFallback) {
        String last = lastName != null ? lastName.trim() : "";
        String first = firstName != null ? firstName.trim() : "";
        String full = (last + " " + first).trim();
        if (!full.isEmpty()) {
            return full;
        }
        if (usernameFallback != null && !usernameFallback.isBlank()) {
            return usernameFallback.trim();
        }
        return null;
    }

    public static boolean matches(String left, String right) {
        String normalizedLeft = normalize(left);
        String normalizedRight = normalize(right);
        if (normalizedLeft.isEmpty() || normalizedRight.isEmpty()) {
            return false;
        }
        return normalizedLeft.equals(normalizedRight);
    }

    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String collapsed = value.trim().replaceAll("\\s+", " ");
        String decomposed = Normalizer.normalize(collapsed, Normalizer.Form.NFD);
        String withoutMarks = decomposed.replaceAll("\\p{M}+", "");
        return withoutMarks.toLowerCase(Locale.ROOT);
    }
}
