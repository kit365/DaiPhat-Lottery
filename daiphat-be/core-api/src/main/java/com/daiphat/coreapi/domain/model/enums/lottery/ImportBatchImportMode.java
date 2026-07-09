package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ImportBatchImportMode {
    IN_DAY("Nhập vé trong ngày"),
    POST_DRAW_SUPPLEMENT("Nhập vé bổ sung");

    private final String label;
}
