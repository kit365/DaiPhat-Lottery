package com.daiphat.coreapi.infrastructure.persistence.entity.order;

import com.daiphat.coreapi.domain.model.enums.order.OrderDetailStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
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

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
        name = "order_details",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_order_details_order_ticket_serial",
                        columnNames = {"order_id", "lottery_ticket_serial_id"}
                ),
                @UniqueConstraint(
                        name = "uk_order_details_replaced_by_ticket_serial",
                        columnNames = {"replaced_by_ticket_serial_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrderDetailEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_ticket_serial_id", nullable = false)
    private LotteryTicketSerialEntity lotteryTicketSerial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "replaced_by_ticket_serial_id", unique = true)
    private LotteryTicketSerialEntity replacedByTicketSerial;

    @Column(nullable = false, precision = 15)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderDetailStatus status;

    @OneToMany(mappedBy = "orderDetail", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderRefundEntity> refunds;

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
