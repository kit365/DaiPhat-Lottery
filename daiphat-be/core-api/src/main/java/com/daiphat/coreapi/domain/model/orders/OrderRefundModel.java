package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderRefundStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderRefundModel {

    private Long id;
    private Long orderDetailId;

    @Builder.Default
    private OrderRefundStatus status = OrderRefundStatus.PENDING;

    private BigDecimal refundAmount;
    private String refundReason;
    private String bankBin;
    private String bankName;
    private String bankAccountNo;
    private String bankAccountName;
    private LocalDateTime refundAt;
    private UUID refundApprovedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (this.status == null) {
            this.status = OrderRefundStatus.PENDING;
        }
    }

    public void applyBankInfo(String bankBin, String bankName, String bankAccountNo, String bankAccountName) {
        this.bankBin = bankBin;
        this.bankName = bankName;
        this.bankAccountNo = bankAccountNo;
        this.bankAccountName = bankAccountName;
    }

    public void clearBankInfo() {
        this.bankBin = null;
        this.bankName = null;
        this.bankAccountNo = null;
        this.bankAccountName = null;
    }

    public void approve(UUID approverId) {
        ensureStatus(OrderRefundStatus.PENDING);
        this.status = OrderRefundStatus.APPROVED;
        this.refundApprovedBy = approverId;
        this.refundAt = LocalDateTime.now();
    }

    public void approveWithTransfer(UUID approverId) {
        ensureBankInfoPresent();
        approve(approverId);
    }

    public void approveCash(UUID approverId) {
        clearBankInfo();
        approve(approverId);
    }

    public void reject(String rejectReason) {
        ensureStatus(OrderRefundStatus.PENDING);
        this.status = OrderRefundStatus.REJECTED;
        this.refundReason = rejectReason;
        this.refundAt = null;
        this.refundApprovedBy = null;
    }

    public boolean hasBankInfo() {
        return isPresent(this.bankBin)
                && isPresent(this.bankName)
                && isPresent(this.bankAccountNo)
                && isPresent(this.bankAccountName);
    }

    public boolean isApproved() {
        return this.status == OrderRefundStatus.APPROVED;
    }

    private void ensureStatus(OrderRefundStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.ORDER_REFUND_INVALID_STATUS);
        }
    }

    private void ensureBankInfoPresent() {
        if (!hasBankInfo()) {
            throw new DomainException(ErrorCode.ORDER_REFUND_BANK_INFO_REQUIRED);
        }
    }

    private boolean isPresent(String value) {
        return value != null && !value.isBlank();
    }
}
