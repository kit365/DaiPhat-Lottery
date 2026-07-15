package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TicketSearchMode {
    CONTAINS("Chứa"),
    SUFFIX("Theo đuôi"),
    PREFIX("Theo đầu"),
    EXACT("Khớp chính xác");

    private final String displayName;

    public static TicketSearchMode from(String value) {
        if (value == null || value.isBlank()) {
            return CONTAINS;
        }
        try {
            return TicketSearchMode.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return CONTAINS;
        }
    }
}
