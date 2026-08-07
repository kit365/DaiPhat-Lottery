package com.daiphat.coreapi.infrastructure.persistence.entity.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationSerialStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Draw.io {@code Agent_Ticket_Stock}: one physical serial handed to a vendor via a batch detail.
 * Owner/cascade path is {@link AllocationBatchDetailEntity} → stocks (not batch → stocks).
 */
@Entity
@Table(name = "agent_ticket_stocks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AgentTicketStockEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Denormalized convenience FK — not cascade owner. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocation_batch_id", nullable = false)
    private AllocationBatchEntity allocationBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocation_batch_detail_id", nullable = false)
    private AllocationBatchDetailEntity allocationBatchDetail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_ticket_id", nullable = false)
    private LotteryTicketEntity lotteryTicket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_ticket_serial_id", nullable = false)
    private LotteryTicketSerialEntity lotteryTicketSerial;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AllocationSerialStatus status = AllocationSerialStatus.DRAFT_RESERVED;

    @Column(name = "reserved_at")
    private LocalDateTime reservedAt;

    @Column(name = "reserved_expires_at")
    private LocalDateTime reservedExpiresAt;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;

    @Column(name = "sold_at")
    private LocalDateTime soldAt;

    @Column(name = "lucky_override", nullable = false)
    @Builder.Default
    private Boolean luckyOverride = false;

    @Column(name = "lucky_override_reason", length = 500)
    private String luckyOverrideReason;

    @Column(name = "lucky_override_by")
    private UUID luckyOverrideBy;

    @Column(name = "lucky_override_at")
    private LocalDateTime luckyOverrideAt;
}
