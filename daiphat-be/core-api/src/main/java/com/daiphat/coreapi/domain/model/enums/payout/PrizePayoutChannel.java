package com.daiphat.coreapi.domain.model.enums.payout;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PrizePayoutChannel implements LabeledEnum {
    ONLINE("Trả thưởng trực tuyến"),
    IN_PERSON("Đổi thưởng tại đại lý");

    private final String displayName;

    @Override
    public String getLabel() {
        return displayName;
    }
}
