package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationActivationField;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryStationModel {

    private Long id;
    private String name;
    private String province;
    private LotteryRegionModel region;

    // Giá & Tồn kho
    private BigDecimal price;
    private BigDecimal commissionRate;

    @Builder.Default
    private Integer inventoryCount = 0;

    // Lịch quay
    private List<DayOfWeek> drawDays;
    private LocalTime drawTime;
    private LocalDate nextDrawDate;

    // Legacy column kept for future use; not used in current workflow.
    @Builder.Default
    private LotteryStationStatus status = LotteryStationStatus.INACTIVE;

    @Builder.Default
    private boolean isActive = false;

    private UUID approvedById;
    private LocalDateTime approvedAt;

    // Hiển thị
    private String image;
    private String thumbnailUrl;
    private String thumbnailPublicId;
    private String description;

    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    // ---- Business methods ----

    public boolean isActivationReady() {
        return getMissingActivationFields().isEmpty();
    }

    public List<String> getMissingActivationFields() {
        List<String> missing = new ArrayList<>();
        if (!hasText(name)) {
            missing.add(LotteryStationActivationField.NAME.name());
        }
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            missing.add(LotteryStationActivationField.PRICE.name());
        }
        if (!hasValidCommissionRate()) {
            missing.add(LotteryStationActivationField.COMMISSION_RATE.name());
        }
        if (region == null) {
            missing.add(LotteryStationActivationField.REGION.name());
        }
        if (!hasText(province)) {
            missing.add(LotteryStationActivationField.PROVINCE.name());
        }
        if (drawDays == null || drawDays.isEmpty()) {
            missing.add(LotteryStationActivationField.DRAW_SCHEDULE.name());
        }
        if (drawTime == null) {
            missing.add(LotteryStationActivationField.DRAW_TIME.name());
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
                ErrorCode.LOTTERY_STATION_ACTIVATION_INCOMPLETE,
                Map.of("missingFields", missing)
        );
    }

    public static String buildActivationIncompleteMessage(List<String> missingFields) {
        String fieldList = missingFields.stream()
                .map(LotteryStationModel::toDisplayLabel)
                .map(label -> "- " + label)
                .collect(Collectors.joining("\n"));
        return "Nhà đài chưa đủ thông tin bắt buộc để kích hoạt.\n\n"
                + "Vui lòng hoàn tất các trường sau:\n\n"
                + fieldList;
    }

    private static String toDisplayLabel(String fieldKey) {
        try {
            return LotteryStationActivationField.valueOf(fieldKey).displayLabel();
        } catch (IllegalArgumentException ex) {
            return fieldKey;
        }
    }

    private boolean hasValidCommissionRate() {
        return commissionRate != null
                && commissionRate.compareTo(BigDecimal.ZERO) >= 0
                && commissionRate.compareTo(BigDecimal.ONE) <= 0;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public void increaseInventory(int amount) {
        if (amount <= 0) {
            return;
        }
        int current = this.inventoryCount != null ? this.inventoryCount : 0;
        this.inventoryCount = current + amount;
    }

    public void decreaseInventory(int amount) {
        if (amount <= 0) {
            return;
        }
        int current = this.inventoryCount != null ? this.inventoryCount : 0;
        this.inventoryCount = Math.max(0, current - amount);
    }

    public boolean isAvailable() {
        return this.isActive
                && this.inventoryCount != null
                && this.inventoryCount > 0;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return this.deletedAt != null;
    }
}
