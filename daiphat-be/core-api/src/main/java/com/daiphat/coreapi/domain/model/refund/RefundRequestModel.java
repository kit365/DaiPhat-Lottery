package com.daiphat.coreapi.domain.model.refund;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundFundSource;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.order.refund.ReimburseStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequestModel {

    public static final String MANUAL_RESOLUTION_NOTE =
            "Vượt quá số lần nhập lại. Vui lòng mang CCCD đến quầy hỗ trợ hoặc liên hệ với CSKH để được hỗ trợ trong thời gian sớm nhất!";

    private Long id;
    private RefundType refundType;
    /**
     * Derived from linked {@code OrderDetail}s (not persisted on refund_requests).
     * Populated when loading or after linking details for a customer order refund.
     */
    private UUID orderId;
    @Builder.Default
    private List<Long> orderDetailIds = new ArrayList<>();
    private UUID requestedBy;
    private RefundRequestRole requestRole;

    @Builder.Default
    private RefundRequestStatus status = RefundRequestStatus.READY_TO_PAY;

    private BigDecimal refundAmount;
    private String refundReason;
    private Long bankAccountId;

    @Builder.Default
    private RefundFundSource fundSource = RefundFundSource.COMPANY_FUND;

    @Builder.Default
    private ReimburseStatus reimburseStatus = ReimburseStatus.NONE;

    @Builder.Default
    private int attemptNumber = 1;

    @Builder.Default
    private int retryCount = 0;

    private String operatorNote;

    private UUID reviewedBy;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    /** Customer refund submit: immediately ready for payout (no approval step). */
    public void initializeForCreate() {
        this.status = RefundRequestStatus.READY_TO_PAY;
        if (this.fundSource == null) {
            this.fundSource = RefundFundSource.COMPANY_FUND;
        }
        if (this.reimburseStatus == null) {
            this.reimburseStatus = ReimburseStatus.NONE;
        }
        if (this.attemptNumber <= 0) {
            this.attemptNumber = 1;
        }
        if (this.retryCount < 0) {
            this.retryCount = 0;
        }
    }

    public void initializeForAutoApprovedCancel() {
        this.status = RefundRequestStatus.READY_TO_PAY;
        this.fundSource = RefundFundSource.COMPANY_FUND;
        this.reimburseStatus = ReimburseStatus.NONE;
        this.attemptNumber = 1;
        this.retryCount = 0;
    }

    /** Staff incident cancel: order already cancelled; wait for customer bank account. */
    public void initializeForStaffIncidentCancel() {
        this.status = RefundRequestStatus.WAITING_FOR_INFO;
        this.requestRole = RefundRequestRole.STAFF;
        this.bankAccountId = null;
        this.fundSource = RefundFundSource.COMPANY_FUND;
        this.reimburseStatus = ReimburseStatus.NONE;
        this.attemptNumber = 1;
        this.retryCount = 0;
        this.operatorNote = null;
    }

    /** Customer/staff attaches bank while waiting for STK → ready for payout. */
    public void attachBankAccount(Long bankAccountId) {
        ensureStatus(RefundRequestStatus.WAITING_FOR_INFO);
        if (bankAccountId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        this.bankAccountId = bankAccountId;
        this.status = RefundRequestStatus.READY_TO_PAY;
        this.operatorNote = null;
    }

    /**
     * Staff requests customer to correct bank info after a failed transfer attempt.
     * Increments {@code retryCount}; moves to WAITING_FOR_INFO or MANUAL_RESOLUTION.
     */
    public void requestBankInfoCorrection(String note, int maxRetry) {
        if (this.status != RefundRequestStatus.READY_TO_PAY && this.status != RefundRequestStatus.APPROVED) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }
        if (note == null || note.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Vui lòng nhập ghi chú cho khách hàng.");
        }
        if (maxRetry <= 0) {
            maxRetry = 3;
        }
        this.retryCount = this.retryCount + 1;
        if (this.retryCount >= maxRetry) {
            this.status = RefundRequestStatus.MANUAL_RESOLUTION;
            this.operatorNote = MANUAL_RESOLUTION_NOTE;
            return;
        }
        this.status = RefundRequestStatus.WAITING_FOR_INFO;
        this.operatorNote = note.trim();
    }

    /** Marks refund as paid. Payout evidence is stored on the related Transaction. */
    public void markPaid() {
        if (this.status != RefundRequestStatus.APPROVED && this.status != RefundRequestStatus.READY_TO_PAY) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }
        this.status = RefundRequestStatus.PAID;
    }

    public void expire() {
        if (this.status != RefundRequestStatus.WAITING_FOR_INFO
                && this.status != RefundRequestStatus.APPROVED
                && this.status != RefundRequestStatus.READY_TO_PAY) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }
        this.status = RefundRequestStatus.EXPIRED;
    }

    private void ensureStatus(RefundRequestStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }
    }
}
