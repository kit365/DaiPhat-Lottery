package com.daiphat.coreapi.domain.model.enums.payout;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PrizePayoutOwnershipVerificationLevel implements LabeledEnum {
    AUTO_MATCHED("Đối chiếu tự động với đơn trực tuyến"),
    CUSTOMER_LINKED("Có khách hàng trên đơn tại quầy"),
    MANUAL_ONLY("Xác minh thủ công giấy tờ + vé gốc");

    private final String displayName;

    @Override
    public String getLabel() {
        return displayName;
    }
}
