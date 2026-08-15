package com.daiphat.coreapi.domain.model.contract;

import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractModel {
    private Long id;
    private String code;
    private ContractType type;
    /** Customer-facing title printed on the PDF. */
    private String title;
    /** Admin/staff label shown in the settings list. */
    private String staffName;
    private String subtitle;
    private String partyARoleLabel;
    private String partyBRoleLabel;
    private String partyASignatureLabel;
    private String partyBSignatureLabel;
    @Builder.Default
    private List<ContractArticle> articles = new ArrayList<>();
    private String footerNote;
    private Long basedOnId;
    @Builder.Default
    private Boolean isDefault = false;
    @Builder.Default
    private Boolean active = true;
    private java.time.LocalDateTime deletedAt;
}
