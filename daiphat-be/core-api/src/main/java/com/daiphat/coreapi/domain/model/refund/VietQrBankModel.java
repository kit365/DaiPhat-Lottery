package com.daiphat.coreapi.domain.model.refund;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VietQrBankModel {

    private String code;
    private String bin;
    private String name;
    private String shortName;
    private String logo;
}
