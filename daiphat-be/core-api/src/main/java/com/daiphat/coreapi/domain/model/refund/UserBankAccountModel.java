package com.daiphat.coreapi.domain.model.refund;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBankAccountModel {

    private Long id;
    private UUID userId;
    private String bankName;
    private String bankLogo;
    private String bankBin;
    private String bankAccountNo;
    private String bankAccountName;

    @Builder.Default
    private boolean isDefault = false;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void applyBankMetadata(String bankName, String bankLogo, String bankBin) {
        this.bankName = bankName;
        this.bankLogo = bankLogo;
        this.bankBin = bankBin;
    }

    public void markAsDefault() {
        this.isDefault = true;
    }

    public void clearDefault() {
        this.isDefault = false;
    }
}
