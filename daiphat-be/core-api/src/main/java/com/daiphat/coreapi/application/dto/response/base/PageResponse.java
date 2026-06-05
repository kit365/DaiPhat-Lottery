package com.daiphat.coreapi.application.dto.response.base;

import com.fasterxml.jackson.annotation.JsonView;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
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
