package com.daiphat.coreapi.application.dto.response.base;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
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
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(size, 1);
        long totalRecords = pageResult.getTotalElements();
        int totalPages = pageResult.getTotalPages();
        return PageResponse.<T>builder()
                .recordList(pageResult.getContent())
                .pagination(PaginationMetadata.builder()
                        .totalRecords(totalRecords)
                        .totalPages(totalPages)
                        .currentPage(safePage)
                        .limit(safeSize)
                        // Derive from 1-based request page so flags stay consistent with FE.
                        .isFirst(safePage <= 1)
                        .isLast(totalPages == 0 || safePage >= totalPages)
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
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(size, 1);
        int totalPages = (int) Math.ceil((double) totalRecords / safeSize);
        return PageResponse.<T>builder()
                .recordList(records)
                .pagination(PaginationMetadata.builder()
                        .totalRecords(totalRecords)
                        .totalPages(totalPages)
                        .currentPage(safePage)
                        .limit(safeSize)
                        .isFirst(safePage <= 1)
                        .isLast(totalPages == 0 || safePage >= totalPages)
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

        /**
         * Explicit JSON names: Lombok boolean getters named {@code isFirst}/{@code isLast}
         * would otherwise serialize as {@code first}/{@code last}, breaking the FE.
         */
        @JsonView(Views.Public.class)
        @JsonProperty("isFirst")
        @JsonAlias("first")
        private boolean isFirst;

        @JsonView(Views.Public.class)
        @JsonProperty("isLast")
        @JsonAlias("last")
        private boolean isLast;
    }
}
