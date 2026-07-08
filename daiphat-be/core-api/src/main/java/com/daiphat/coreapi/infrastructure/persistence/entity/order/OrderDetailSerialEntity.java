package com.daiphat.coreapi.infrastructure.persistence.entity.order;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
        name = "order_detail_serials",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_order_detail_serials_detail_serial",
                        columnNames = {"order_detail_id", "lottery_ticket_serial_id"}
                ),
                @UniqueConstraint(
                        name = "uk_order_detail_serials_serial",
                        columnNames = {"lottery_ticket_serial_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrderDetailSerialEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_detail_id", nullable = false)
    private OrderDetailEntity orderDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_ticket_serial_id", nullable = false)
    private LotteryTicketSerialEntity lotteryTicketSerial;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
