package com.daiphat.coreapi.application.dto.response.contract;

import java.util.List;

public record ContractResponse(
        Long id,
        String code,
        String type,
        String typeLabel,
        String title,
        String staffName,
        String subtitle,
        String partyARoleLabel,
        String partyBRoleLabel,
        String partyASignatureLabel,
        String partyBSignatureLabel,
        List<ContractArticleResponse> articles,
        String footerNote,
        Long basedOnId,
        String basedOnCode,
        String basedOnTitle,
        Boolean isDefault,
        Boolean active
) {
    public record ContractArticleResponse(
            String code,
            Integer ordinal,
            String title,
            String kind,
            String body
    ) {
    }
}
