package com.daiphat.coreapi.domain.model.lotteries;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Axis-aligned ticket/field box persisted as JSONB on ocr_scan_results.
 * Plain class (not a record / not an application DTO) for Hibernate JSON mapping.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OcrBoundingBox {

    private int x;
    private int y;
    private int width;
    private int height;

    @Builder.Default
    private List<List<Integer>> corners = new ArrayList<>();
}
