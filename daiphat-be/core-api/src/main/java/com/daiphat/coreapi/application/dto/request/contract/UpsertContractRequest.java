package com.daiphat.coreapi.application.dto.request.contract;

import com.daiphat.coreapi.domain.model.enums.contract.ContractArticleKind;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpsertContractRequest(
        @NotNull ContractType type,
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String staffName,
        @Size(max = 500) String subtitle,
        @NotBlank @Size(max = 200) String partyARoleLabel,
        @NotBlank @Size(max = 200) String partyBRoleLabel,
        @NotBlank @Size(max = 200) String partyASignatureLabel,
        @NotBlank @Size(max = 200) String partyBSignatureLabel,
        String footerNote,
        Boolean isDefault,
        @Valid List<ArticleRequest> articles
) {
    public record ArticleRequest(
            @Size(max = 50) String code,
            Integer ordinal,
            @NotBlank @Size(max = 255) String title,
            ContractArticleKind kind,
            String body
    ) {
    }
}
