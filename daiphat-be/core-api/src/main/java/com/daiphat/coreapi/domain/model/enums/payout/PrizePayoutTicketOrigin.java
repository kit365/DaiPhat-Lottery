package com.daiphat.coreapi.domain.model.enums.payout;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PrizePayoutTicketOrigin implements LabeledEnum {
    INTERNAL_ONLINE("Vé mua online (đã lấy về)"),
    INTERNAL_OFFLINE("Vé mua tại quầy");

    private final String displayName;

    @Override
    public String getLabel() {
        return displayName;
    }
}
