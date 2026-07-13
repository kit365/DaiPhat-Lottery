package com.daiphat.coreapi.infrastructure.persistence.entity.order;

import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentReason;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ticket_replacement_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketReplacementHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "order_detail_id", nullable = false)
    private Long orderDetailId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_ticket_serial_id", nullable = false)
    private LotteryTicketSerialEntity oldTicketSerial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_ticket_serial_id", nullable = false)
    private LotteryTicketSerialEntity newTicketSerial;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TicketIncidentReason reason;

    @Column(length = 500)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by", nullable = false)
    private UserEntity handledBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
