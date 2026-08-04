package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierActivationField;
import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LotterySupplierModel {

    private Long id;
    private String name;
    private String code;
    private LotterySupplierType type;
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String address;
    private String taxCode;
    private Integer paymentTermDays;
    private BigDecimal defaultImportCost;
    private LocalTime importAllowFrom;
    private LocalTime returnCutOffTime;
    @Builder.Default
    private boolean isActive = false;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public boolean isActivationReady() {
        return getMissingActivationFields().isEmpty();
    }

    public List<String> getMissingActivationFields() {
        List<String> missing = new ArrayList<>();
        if (!hasText(contactPhone)) {
            missing.add(LotterySupplierActivationField.CONTACT_PHONE.name());
        }
        if (!hasText(address)) {
            missing.add(LotterySupplierActivationField.ADDRESS.name());
        }
        if (paymentTermDays == null || paymentTermDays < 0) {
            missing.add(LotterySupplierActivationField.PAYMENT_TERM_DAYS.name());
        }
        if (defaultImportCost == null || defaultImportCost.compareTo(BigDecimal.ZERO) <= 0) {
            missing.add(LotterySupplierActivationField.DEFAULT_IMPORT_COST.name());
        }
        return missing;
    }

    public void applyIsActive(Boolean requestedActive) {
        if (!isActivationReady()) {
            this.isActive = false;
            return;
        }
        if (requestedActive != null) {
            this.isActive = requestedActive;
        }
    }

    public void requireActivationReady() {
        List<String> missing = getMissingActivationFields();
        if (missing.isEmpty()) {
            return;
        }
        throw new DomainException(
                ErrorCode.LOTTERY_SUPPLIER_ACTIVATION_INCOMPLETE,
                Map.of("missingFields", missing)
        );
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
