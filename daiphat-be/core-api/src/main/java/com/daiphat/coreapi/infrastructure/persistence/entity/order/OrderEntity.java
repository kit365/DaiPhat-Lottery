package com.daiphat.coreapi.infrastructure.persistence.entity.order;

import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
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
import java.util.List;
import java.util.UUID;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
        name = "orders",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_orders_order_code", columnNames = "order_code")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(name = "order_code", nullable = false, length = 50)
    private String orderCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, length = 20)
    private OrderType orderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "receive_type", nullable = false, length = 30)
    private OrderReceiveType receiveType;

    @Column(name = "total_amount", nullable = false, precision = 15)
    private BigDecimal totalAmount;

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderDetailEntity> orderDetails;

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TransactionEntity> transactions;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private OrderStatus status;

    @Column(name = "expected_pickup_at")
    private LocalDateTime expectedPickupAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancel_type", length = 50)
    private OrderCancelType cancelType;

    @Column(name = "handover_evidence_url", length = 500)
    private String handoverEvidenceUrl;

    @Column(name = "payment_complaint_evidence_url", length = 500)
    private String paymentComplaintEvidenceUrl;

    @Column(name = "payment_complaint_submitted_at")
    private LocalDateTime paymentComplaintSubmittedAt;

    @Column(name = "payment_complaint_resolved_at")
    private LocalDateTime paymentComplaintResolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_complaint_resolved_by")
    private UserEntity paymentComplaintResolvedBy;

    @Column(name = "payment_complaint_resolution_reason", length = 500)
    private String paymentComplaintResolutionReason;

    @Column(name = "actual_picked_up_at")
    private LocalDateTime actualPickedUpAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "picked_up_by")
    private UserEntity pickedUpBy;

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
