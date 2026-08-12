package com.daiphat.coreapi.infrastructure.persistence.entity.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.AgentSettlementStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "agent_settlements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AgentSettlementEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private StreetAgentProfileEntity agent;

    @Column(name = "settlement_date", nullable = false)
    private LocalDate settlementDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocation_batch_id", nullable = false)
    private AllocationBatchEntity allocationBatch;

    /** Vendor receipt batch used to validate physical returns before settlement. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_batch_id")
    private ReturnBatchEntity returnBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id")
    private DailySalesReportEntity report;

    @Column(name = "returned_value", precision = 18, scale = 0)
    private BigDecimal returnedValue;

    @Column(name = "sold_value", precision = 18, scale = 0)
    private BigDecimal soldValue;

    @Column(name = "commission_amount", precision = 18, scale = 0)
    private BigDecimal commissionAmount;

    @Column(name = "deposit_amount", precision = 18, scale = 0)
    private BigDecimal depositAmount;

    @Column(name = "agent_receives", precision = 18, scale = 0)
    private BigDecimal agentReceives;

    @Column(name = "agent_pays", precision = 18, scale = 0)
    private BigDecimal agentPays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AgentSettlementStatus status = AgentSettlementStatus.COMPLETED;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "collected_by")
    private UUID collectedBy;

    @Column(name = "collected_at")
    private LocalDateTime collectedAt;
}
