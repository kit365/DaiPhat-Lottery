package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import lombok.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryStationModel {

    private Long id;
    private String name;
    private String province;
    private String region;
    private LotteryStationType type;

    // Quy tắc số
    private Integer numberLength;
    private Integer minNumber;
    private Integer maxNumber;

    // Giá & Tồn kho
    private BigDecimal price;

    @Builder.Default
    private Integer inventoryCount = 0;

    // Lịch quay
    private List<DayOfWeek> drawDays;
    private LocalTime drawTime;
    private LocalDate nextDrawDate;

    // Trạng thái
    @Builder.Default
    private LotteryStationStatus status = LotteryStationStatus.ACTIVE;

    private UUID approvedById;
    private LocalDateTime approvedAt;

    // Hiển thị
    private String image;
    private String thumbnailUrl;
    private String thumbnailPublicId;
    private String description;

    @Builder.Default
    private Integer displayOrder = 0;

    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    // ---- Business methods ----

    public void deactivate() {
        this.status = LotteryStationStatus.INACTIVE;
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
        return this.status == LotteryStationStatus.ACTIVE
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
