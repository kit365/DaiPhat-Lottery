package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
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
import java.time.LocalDate;

@Entity
@Table(name = "supplier_settlements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SupplierSettlementEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_supplier_id", nullable = false)
    private LotterySupplierEntity lotterySupplier;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Column(name = "total_import_value", nullable = false, precision = 18, scale = 3)
    @Builder.Default
    private BigDecimal totalImportValue = BigDecimal.ZERO;

    @Column(name = "total_return_value", nullable = false, precision = 18, scale = 3)
    @Builder.Default
    private BigDecimal totalReturnValue = BigDecimal.ZERO;

    @Column(name = "total_paid_amount", nullable = false, precision = 18, scale = 3)
    @Builder.Default
    private BigDecimal totalPaidAmount = BigDecimal.ZERO;

    @Column(name = "remaining_amount", nullable = false, precision = 18, scale = 3)
    @Builder.Default
    private BigDecimal remainingAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private SupplierSettlementStatus status = SupplierSettlementStatus.OPEN;

    @Column(name = "transaction_id")
    private Long transactionId;
}
