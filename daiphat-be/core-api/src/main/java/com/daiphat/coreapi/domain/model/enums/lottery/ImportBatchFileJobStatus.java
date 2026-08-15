package com.daiphat.coreapi.domain.model.enums.lottery;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Lifecycle of one attempt to import a supplier file.
 *
 * <p>Distinct from {@link ImportBatchStatus}: this describes a technical run that
 * lasts seconds, whereas an import batch is a business document that lives for
 * days and drives stock and supplier debt.
 */
@Getter
@RequiredArgsConstructor
public enum ImportBatchFileJobStatus implements LabeledEnum {
    PENDING("Chờ xử lý"),
    PROCESSING("Đang xử lý"),
    COMPLETED("Thành công"),
    PARTIAL_SUCCESS("Thành công một phần"),
    FAILED("Thất bại");

    private final String label;
}
