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
    VOIDED("Hủy do lỗi nhập liệu");

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

    /** Any non-sellable / terminal condition report (DAMAGED, LOST, VOIDED). */
    public boolean isIncidentReported() {
        return isFaulty() || isVoided();
    }
}
