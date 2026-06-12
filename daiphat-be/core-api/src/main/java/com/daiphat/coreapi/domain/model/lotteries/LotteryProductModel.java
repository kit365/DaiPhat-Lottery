package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryProductModel {

    private Long id;
    private String name;
    private String province;
    private String region;
    private LotteryProductType type;

    // Quy tắc số
    private Integer numberLength;
    private Integer minNumber;
    private Integer maxNumber;

    // Giá & Tồn kho
    private BigDecimal price;

    @Builder.Default
    private Integer inventoryCount = 0;

    // Lịch quay
    private String drawSchedule;
    private String drawTime;
    private LocalDate nextDrawDate;

    // Trạng thái
    @Builder.Default
    private LotteryProductStatus status = LotteryProductStatus.DRAFT;

    private UUID approvedById;
    private LocalDateTime approvedAt;

    // Hiển thị
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

    public void submitForApproval() {
        if (this.status != LotteryProductStatus.DRAFT) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_INVALID_STATUS);
        }
        this.status = LotteryProductStatus.PENDING_APPROVAL;
    }

    public void approve(UUID adminId) {
        if (this.status != LotteryProductStatus.PENDING_APPROVAL) {
            throw new DomainException(ErrorCode.LOTTERY_PRODUCT_INVALID_STATUS);
        }
        this.status = LotteryProductStatus.ACTIVE;
        this.approvedById = adminId;
        this.approvedAt = LocalDateTime.now();
    }

    public void deactivate() {
        this.status = LotteryProductStatus.INACTIVE;
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
        return this.status == LotteryProductStatus.ACTIVE
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
