package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PrizeStructureModel {

    private UUID id;
    private UUID productId;
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
            throw new DomainException(ErrorCode.INVALID_INPUT, "Bậc giải thưởng không hợp lệ.");
        }
        if (prizeCode == null || prizeCode.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Mã giải thưởng không được để trống.");
        }
        if (prizeValue == null || prizeValue.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Giá trị giải thưởng phải lớn hơn hoặc bằng 0.");
        }
        if (quantity == null || quantity < 1) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Số lượng giải phải lớn hơn hoặc bằng 1.");
        }
        if (matchFrom == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Quy tắc so khớp không hợp lệ.");
        }
        if (!isOnly && productRegion != null && region != null
                && !region.equalsIgnoreCase(productRegion)) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Cấu trúc giải dùng chung miền phải có region trùng với sản phẩm.");
        }

        validateMatchDigits();
    }

    private void validateMatchDigits() {
        if (matchFrom == MatchFrom.EXACT) {
            return;
        }

        if (matchDigits == null || matchDigits < 1) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Số chữ số khớp phải lớn hơn 0 khi quy tắc so khớp là LAST hoặc ANY.");
        }
    }
}
