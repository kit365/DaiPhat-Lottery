package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PrizeStructureModel {

    private Long id;
    private Long productId;
    private String region;

    @Builder.Default
    private boolean isOnly = false;

    private PrizeLevel prizeLevel;
    private String prizeDisplayName;
    private String prizeCode;
    private BigDecimal prizeValue;
    private Integer quantity;
    private Integer matchDigits;
    private MatchFrom matchFrom;
    private String matchFromDisplayName;

    @Builder.Default
    private Integer displayOrder = 0;

    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void applyProductDefaults(String productRegion) {
        if (this.region == null || this.region.isBlank()) {
            this.region = productRegion;
        }
        if (this.displayOrder == null) {
            this.displayOrder = 0;
        }
    }

    public String resolvePrizeDisplayName() {
        if (prizeDisplayName != null && !prizeDisplayName.isBlank()) {
            return prizeDisplayName;
        }
        return prizeLevel != null ? prizeLevel.getDisplayName() : null;
    }

    public String resolveMatchFromDisplayName() {
        if (matchFromDisplayName != null && !matchFromDisplayName.isBlank()) {
            return matchFromDisplayName;
        }
        return matchFrom != null ? matchFrom.getDisplayName() : null;
    }

    public void validate(String productRegion) {
        if (prizeLevel == null) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_INVALID_LEVEL);
        }
        if (prizeCode == null || prizeCode.isBlank()) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_CODE_REQUIRED);
        }
        if (prizeValue == null || prizeValue.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_VALUE_INVALID);
        }
        if (quantity == null || quantity < 1) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_QUANTITY_INVALID);
        }
        if (matchFrom == null) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_MATCH_RULE_INVALID);
        }
        if (!isOnly && productRegion != null && region != null
                && !region.equalsIgnoreCase(productRegion)) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_REGION_INVALID);
        }

        validateMatchDigits();
    }

    private void validateMatchDigits() {
        if (matchFrom == MatchFrom.EXACT) {
            return;
        }

        if (matchDigits == null || matchDigits < 1) {
            throw new DomainException(ErrorCode.PRIZE_STRUCTURE_MATCH_DIGITS_INVALID);
        }
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return this.deletedAt != null;
    }
}
