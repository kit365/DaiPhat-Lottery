package com.daiphat.coreapi.domain.model.enums.lottery;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Direction of a physical ticket return. */
@Getter
@RequiredArgsConstructor
public enum ReturnBatchType implements LabeledEnum {
    SUPPLIER_RETURN("Trả vé cho nhà cung cấp"),
    STREET_AGENT_RETURN("Nhận vé trả từ người bán dạo");

    private final String label;
}
