package com.daiphat.coreapi.infrastructure.persistence.entity.refund;

import com.daiphat.coreapi.domain.model.enums.ekyc.EkycStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundCounterPayoutMethod;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundFundSource;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.order.refund.ReimburseStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "refund_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_type", nullable = false, length = 30)
    private RefundType refundType;

    @OneToMany(mappedBy = "refundRequest", fetch = FetchType.LAZY)
    @Builder.Default
    private List<OrderDetailEntity> orderDetails = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by", nullable = false)
    private UserEntity requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_role", nullable = false, length = 20)
    private RefundRequestRole requestRole;

    @Column(name = "refund_amount", nullable = false, precision = 15)
    private BigDecimal refundAmount;

    @Column(name = "refund_reason", length = 500)
    private String refundReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_account_id")
    private UserBankAccountEntity bankAccount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RefundRequestStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "fund_source", nullable = false, length = 30)
    private RefundFundSource fundSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "reimburse_status", nullable = false, length = 20)
    private ReimburseStatus reimburseStatus;

    @Column(name = "attempt_number", nullable = false)
    private int attemptNumber;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "operator_note", columnDefinition = "TEXT")
    private String operatorNote;

    @Column(name = "cccd_front_image_url", length = 500)
    private String cccdFrontImageUrl;

    @Column(name = "cccd_back_image_url", length = 500)
    private String cccdBackImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "ekyc_status", length = 32)
    private EkycStatus ekycStatus;

    @Column(name = "ekyc_failure_reason", length = 500)
    private String ekycFailureReason;

    @Column(name = "ekyc_ocr_name", length = 255)
    private String ekycOcrName;

    @Column(name = "ekyc_ocr_id_number", length = 64)
    private String ekycOcrIdNumber;

    @Column(name = "ekyc_ocr_dob", length = 32)
    private String ekycOcrDob;

    @Column(name = "ekyc_ocr_gender", length = 32)
    private String ekycOcrGender;

    @Column(name = "ekyc_ocr_nationality", length = 100)
    private String ekycOcrNationality;

    @Column(name = "ekyc_ocr_place_of_birth", length = 500)
    private String ekycOcrPlaceOfBirth;

    @Column(name = "ekyc_ocr_place_of_residence", length = 500)
    private String ekycOcrPlaceOfResidence;

    @Column(name = "ekyc_ocr_issue_date", length = 64)
    private String ekycOcrIssueDate;

    @Column(name = "ekyc_ocr_expiry_date", length = 64)
    private String ekycOcrExpiryDate;

    @Column(name = "ekyc_verified_at")
    private LocalDateTime ekycVerifiedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "counter_payout_method", length = 20)
    private RefundCounterPayoutMethod counterPayoutMethod;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private UserEntity reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

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

    public UUID getRequestedById() {
        return requestedBy != null ? requestedBy.getId() : null;
    }

    public Long getBankAccountId() {
        return bankAccount != null ? bankAccount.getId() : null;
    }

    public UUID getReviewedById() {
        return reviewedBy != null ? reviewedBy.getId() : null;
    }
}
