package com.daiphat.coreapi.shared.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class PageableUtils {
    private PageableUtils() {}

    public static Pageable of(int page, int limit) {
        return PageRequest.of(page - 1, limit);
    }

    public static Pageable of(int page, int limit, Sort sort) {
        return PageRequest.of(page - 1, limit, sort);
    }
}
