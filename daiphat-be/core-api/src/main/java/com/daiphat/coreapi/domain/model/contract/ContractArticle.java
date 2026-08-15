package com.daiphat.coreapi.domain.model.contract;

import com.daiphat.coreapi.domain.model.enums.contract.ContractArticleKind;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractArticle {
    private String code;
    private Integer ordinal;
    private String title;
    private ContractArticleKind kind;
    private String body;
}
