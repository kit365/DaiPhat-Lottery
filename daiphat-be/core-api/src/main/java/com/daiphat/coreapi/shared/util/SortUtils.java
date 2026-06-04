package com.daiphat.coreapi.shared.util;

import org.springframework.data.domain.Sort;

public final class SortUtils {
    private SortUtils() {}

    public static Sort byDisplayOrderAndCreatedAt() {
        return Sort.by("displayOrder").ascending()
                .and(Sort.by("createdAt").descending());
    }

    public static Sort createSort(String sortBy, String direction) {
        String field = (sortBy == null || sortBy.isBlank()) ? SearchConstants.DEFAULT_SORT_BY : sortBy;
        return SearchConstants.SORT_ASC.equalsIgnoreCase(direction)
                ? Sort.by(field).ascending()
                : Sort.by(field).descending();
    }

    public static Sort byCreatedAtDesc() {
        return Sort.by(SearchConstants.DEFAULT_SORT_BY).descending();
    }
}
