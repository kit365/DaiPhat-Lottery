package com.daiphat.coreapi.domain.model.enums.contract;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ContractType implements LabeledEnum {
    STREET_AGENT_SALES("Hợp đồng cộng tác bán vé số"),
    PRIZE_PAYOUT("Hợp đồng nhận thưởng");

    private final String displayName;

    @Override
    public String getLabel() {
        return displayName;
    }
}
