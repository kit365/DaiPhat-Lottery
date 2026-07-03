package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "import_batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ImportBatchEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_station_id", nullable = false)
    private LotteryStationEntity lotteryStation;

    @Column(name = "supplier_ledger_id")
    private Long supplierLedgerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "requested_batch_type", nullable = false, length = 30)
    private ImportBatchType requestedBatchType;

    @Enumerated(EnumType.STRING)
    @Column(name = "batch_type", nullable = false, length = 30)
    private ImportBatchType batchType;

    @Column(name = "invoice_evidence_url", length = 500)
    private String invoiceEvidenceUrl;

    @Column(name = "draw_date", nullable = false)
    private LocalDate drawDate;

    @Column(name = "declare_quantity", nullable = false)
    private Integer declareQuantity;

    @Column(name = "total_quantity", nullable = false)
    @Builder.Default
    private Integer totalQuantity = 0;

    @Column(name = "import_cost", nullable = false, precision = 15, scale = 0)
    private BigDecimal importCost;

    @Column(name = "total_cost_value", nullable = false, precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal totalCostValue = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imported_by", nullable = false)
    private UserEntity importedBy;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ImportBatchStatus status = ImportBatchStatus.DRAFT;
}
