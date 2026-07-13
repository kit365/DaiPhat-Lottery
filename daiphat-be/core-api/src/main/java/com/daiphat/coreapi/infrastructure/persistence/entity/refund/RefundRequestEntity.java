package com.daiphat.coreapi.infrastructure.persistence.entity.refund;

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
