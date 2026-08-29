package com.daiphat.coreapi.infrastructure.persistence.entity.payout;

import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutOwnershipVerificationLevel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutTicketOrigin;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.UserBankAccountEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "prize_payout_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrizePayoutRequestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_code", nullable = false, unique = true, length = 50)
    private String requestCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private UserEntity customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_detail_id", nullable = false)
    private OrderDetailEntity orderDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "serial_id", nullable = false)
    private LotteryTicketSerialEntity serial;

    @Column(name = "prize_code", nullable = false, length = 50)
    private String prizeCode;

    @Column(name = "prize_display_name", length = 200)
    private String prizeDisplayName;

    @Column(name = "gross_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "tax_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "commission_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal commissionAmount;

    @Column(name = "net_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal netAmount;

    @Column(name = "cash_amount", precision = 15, scale = 2)
    private BigDecimal cashAmount;

    @Column(name = "transfer_amount", precision = 15, scale = 2)
    private BigDecimal transferAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 30)
    private PrizePayoutChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(name = "ticket_origin", nullable = false, length = 30)
    private PrizePayoutTicketOrigin ticketOrigin;

    @Enumerated(EnumType.STRING)
    @Column(name = "ownership_verification_level", nullable = false, length = 30)
    private PrizePayoutOwnershipVerificationLevel ownershipVerificationLevel;

    @Builder.Default
    @Column(name = "manual_ownership_confirmed", nullable = false)
    private boolean manualOwnershipConfirmed = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PrizePayoutPaymentMethod paymentMethod;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_account_id")
    private UserBankAccountEntity bankAccount;

    @Column(name = "bank_name", length = 200)
    private String bankName;

    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    @Column(name = "account_holder_name", length = 200)
    private String accountHolderName;

    @Column(name = "recipient_full_name", length = 200)
    private String recipientFullName;

    @Column(name = "recipient_id_number", length = 20)
    private String recipientIdNumber;

    @Column(name = "recipient_id_image_url", length = 500)
    private String recipientIdImageUrl;

    @Column(name = "recipient_id_image_back_url", length = 500)
    private String recipientIdImageBackUrl;

    @Column(name = "recipient_identity_captured_at")
    private LocalDateTime recipientIdentityCapturedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PrizePayoutRequestStatus status;

    @Builder.Default
    @Column(name = "reject_count", nullable = false)
    private int rejectCount = 0;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "transfer_evidence_url", length = 500)
    private String transferEvidenceUrl;

    @Column(name = "confirmation_contract_url", length = 500)
    private String confirmationContractUrl;

    // ─── Partial Payout fields ───────────────────────────────────────────────

    /** Tổng tiền thưởng gốc — lưu tại thời điểm tạo, không đổi. */
    @Column(name = "total_prize_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalPrizeAmount = BigDecimal.ZERO;

    /** Tổng đã trả đến hiện tại (sum of installments). */
    @Column(name = "paid_amount_to_date", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal paidAmountToDate = BigDecimal.ZERO;

    /** Ghi chú lý do chờ ứng quỹ. */
    @Column(name = "fund_advance_note", columnDefinition = "TEXT")
    private String fundAdvanceNote;

    /** Mã phiếu cam kết chi trả (PCK-YYYYMMDD-XXXXXX). */
    @Column(name = "commitment_voucher_code", length = 50)
    private String commitmentVoucherCode;

    /** Hạn cam kết trả nốt. */
    @Column(name = "commitment_expires_at")
    private LocalDateTime commitmentExpiresAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "completed_by")
    private UserEntity completedBy;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "last_modified_by")
    private String lastModifiedBy;

    public UUID getCustomerId() {
        return customer != null ? customer.getId() : null;
    }

    public UUID getOrderId() {
        return order != null ? order.getId() : null;
    }

    public Long getOrderDetailId() {
        return orderDetail != null ? orderDetail.getId() : null;
    }

    public Long getSerialId() {
        return serial != null ? serial.getId() : null;
    }

    public Long getBankAccountId() {
        return bankAccount != null ? bankAccount.getId() : null;
    }

    public UUID getCompletedById() {
        return completedBy != null ? completedBy.getId() : null;
    }
}
