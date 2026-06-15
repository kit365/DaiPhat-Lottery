package com.daiphat.coreapi.infrastructure.persistence.entity.order;

import com.daiphat.coreapi.domain.model.enums.order.refund.OrderRefundStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
        name = "order_refunds"
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrderRefundEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_detail_id", nullable = false)
    private OrderDetailEntity orderDetail;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", nullable = false, length = 20)
    private OrderRefundStatus status;

    @Column(name = "refund_amount", precision = 15)
    private BigDecimal refundAmount;

    @Column(name = "refund_reason", length = 500)
    private String refundReason;

    @Column(name = "bank_bin", length = 20)
    private String bankBin;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account_no", length = 50)
    private String bankAccountNo;

    @Column(name = "bank_account_name", length = 150)
    private String bankAccountName;

    @Column(name = "refund_at")
    private LocalDateTime refundAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_approved_by")
    private UserEntity refundApprovedBy;

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
}
