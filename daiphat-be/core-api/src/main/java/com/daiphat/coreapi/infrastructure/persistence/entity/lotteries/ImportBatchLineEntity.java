package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "import_batch_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ImportBatchLineEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_batch_id", nullable = false)
    private ImportBatchEntity importBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_station_id", nullable = false)
    private LotteryStationEntity lotteryStation;

    @Enumerated(EnumType.STRING)
    @Column(name = "batch_type", nullable = false, length = 30)
    private ImportBatchType batchType;

    @Column(name = "batch_code", nullable = false, length = 100, unique = true)
    private String batchCode;

    @Column(name = "declare_quantity", nullable = false)
    private Integer declareQuantity;

    @Column(name = "declared_cost_value", nullable = false, precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal declaredCostValue = BigDecimal.ZERO;

    @Column(name = "total_quantity", nullable = false)
    @Builder.Default
    private Integer totalQuantity = 0;

    @Column(name = "import_cost", nullable = false, precision = 15, scale = 0)
    private BigDecimal importCost;

    @Column(name = "total_cost_value", nullable = false, precision = 15, scale = 0)
    @Builder.Default
    private BigDecimal totalCostValue = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ImportBatchLineStatus status = ImportBatchLineStatus.OPEN;

    @Column(name = "imported_at")
    private LocalDateTime importedAt;

    @Column(name = "cancel_reason")
    private String cancelReason;
}
