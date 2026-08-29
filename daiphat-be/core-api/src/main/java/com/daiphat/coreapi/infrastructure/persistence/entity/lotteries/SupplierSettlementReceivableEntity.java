package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReceivableStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "supplier_settlement_receivables")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SupplierSettlementReceivableEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prize_claim_submission_id", nullable = false)
    private PrizeClaimSubmissionEntity prizeClaimSubmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_supplier_id", nullable = false)
    private LotteryStationEntity lotterySupplier;

    @Column(name = "original_outstanding_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal originalOutstandingAmount;

    @Column(name = "remaining_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal remainingAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private SupplierSettlementReceivableStatus status = SupplierSettlementReceivableStatus.PENDING;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @Column(name = "settled_by", length = 100)
    private String settledBy;

    @Column(columnDefinition = "TEXT")
    private String note;
}
