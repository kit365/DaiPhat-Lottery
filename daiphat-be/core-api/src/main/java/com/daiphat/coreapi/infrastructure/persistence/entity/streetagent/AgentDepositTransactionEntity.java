package com.daiphat.coreapi.infrastructure.persistence.entity.streetagent;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** Draw.io {@code Agent_Deposit_Transaction} skeleton — Phase 1 no service. */
@Entity
@Table(name = "agent_deposit_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AgentDepositTransactionEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private StreetAgentProfileEntity agent;

    @Column(name = "debt_date", nullable = false)
    private LocalDate debtDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "allocation_id")
    private AllocationBatchEntity allocation;

    @Column(name = "required_amount", precision = 18, scale = 0)
    private BigDecimal requiredAmount;

    @Column(name = "paid_amount", precision = 18, scale = 0)
    private BigDecimal paidAmount;

    @Column(name = "remaining_amount", precision = 18, scale = 0)
    private BigDecimal remainingAmount;

    @Column(name = "returned_amount", precision = 18, scale = 0)
    private BigDecimal returnedAmount;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "pending";

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "collected_by")
    private UUID collectedBy;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "transaction_type", length = 30)
    private String transactionType;

    @Column(name = "balance_before", precision = 18, scale = 0)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", precision = 18, scale = 0)
    private BigDecimal balanceAfter;

    @Column(length = 500)
    private String reason;
}
