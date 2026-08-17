package com.daiphat.coreapi.domain.model.enums.lottery;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TicketCondition implements LabeledEnum {
    GOOD("Tốt"),
    DAMAGED("Vé hỏng / rách"),
    LOST("Vé thất lạc"),
    VOIDED("Hủy do lỗi nhập liệu"),
    /** Settlement placeholder: tickets received from supplier but not yet recorded in the system. */
    UNDER_IMPORTED("Nhập thiếu");

    private final String displayName;

    @Override
    public String getLabel() {
        return displayName;
    }

    /** Physical damage / loss (not data-entry void). */
    public boolean isFaulty() {
        return this == DAMAGED || this == LOST;
    }

    public boolean isVoided() {
        return this == VOIDED;
    }

    /** Any non-sellable / terminal condition report (DAMAGED, LOST, VOIDED, UNDER_IMPORTED). */
    public boolean isIncidentReported() {
        return isFaulty() || isVoided() || this == UNDER_IMPORTED;
    }
}
