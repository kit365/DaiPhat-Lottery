package com.daiphat.coreapi.application.dto.response.base;

import com.fasterxml.jackson.annotation.JsonView;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    @JsonView(Views.Public.class)
    private List<T> recordList;

    @JsonView(Views.Public.class)
    private PaginationMetadata pagination;

    /** Status counts for tab badges. Keyed by status code (e.g. "published", "draft"). */
    @JsonView(Views.Public.class)
    private Map<String, Long> statusCounts;

    public static <T> PageResponse<T> from(Page<T> pageResult, int page, int size) {
        return from(pageResult, page, size, null);
    }

    public static <T> PageResponse<T> from(
            Page<T> pageResult,
            int page,
            int size,
            Map<String, Long> statusCounts
    ) {
        return PageResponse.<T>builder()
                .recordList(pageResult.getContent())
                .pagination(PaginationMetadata.builder()
                        .totalRecords(pageResult.getTotalElements())
                        .totalPages(pageResult.getTotalPages())
                        .currentPage(page)
                        .limit(size)
                        .isFirst(pageResult.isFirst())
                        .isLast(pageResult.isLast())
                        .build())
                .statusCounts(statusCounts)
                .build();
    }

    public static <T> PageResponse<T> from(
            List<T> records,
            long totalRecords,
            int page,
            int size
    ) {
        int totalPages = size <= 0 ? 0 : (int) Math.ceil((double) totalRecords / size);
        return PageResponse.<T>builder()
                .recordList(records)
                .pagination(PaginationMetadata.builder()
                        .totalRecords(totalRecords)
                        .totalPages(totalPages)
                        .currentPage(page)
                        .limit(size)
                        .isFirst(page <= 1)
                        .isLast(totalPages == 0 || page >= totalPages)
                        .build())
                .build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaginationMetadata {
        @JsonView(Views.Public.class)
        private long totalRecords;

        @JsonView(Views.Public.class)
        private int totalPages;

        @JsonView(Views.Public.class)
        private int currentPage;

        @JsonView(Views.Public.class)
        private int limit;

        @JsonView(Views.Public.class)
        private boolean isFirst;

        @JsonView(Views.Public.class)
        private boolean isLast;
    }
}
