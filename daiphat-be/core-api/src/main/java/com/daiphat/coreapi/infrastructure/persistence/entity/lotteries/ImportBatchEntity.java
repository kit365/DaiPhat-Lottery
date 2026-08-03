package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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

    @Column(name = "batch_code", nullable = false, length = 50, unique = true)
    private String batchCode;

    @Column(name = "draw_date", nullable = false)
    private LocalDate drawDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private LotterySupplierEntity supplier;

    @Column(name = "supplier_settlement_id")
    private Long supplierSettlementId;

    @Enumerated(EnumType.STRING)
    @Column(name = "import_mode", length = 30)
    private ImportBatchImportMode importMode;

    @Column(name = "invoice_evidence_url", length = 500)
    private String invoiceEvidenceUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imported_by", nullable = false)
    private UserEntity importedBy;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ImportBatchStatus status = ImportBatchStatus.DRAFT;

    @Column(name = "line_count", nullable = false)
    @Builder.Default
    private Integer lineCount = 0;

    @Column(name = "total_declare_quantity", nullable = false)
    @Builder.Default
    private Integer totalDeclareQuantity = 0;

    @Column(name = "total_declared_cost_value", nullable = false, precision = 18, scale = 3)
    @Builder.Default
    private BigDecimal totalDeclaredCostValue = BigDecimal.ZERO;

    @Column(name = "total_imported_quantity", nullable = false)
    @Builder.Default
    private Integer totalImportedQuantity = 0;

    @Column(name = "total_imported_cost_value", nullable = false, precision = 18, scale = 3)
    @Builder.Default
    private BigDecimal totalImportedCostValue = BigDecimal.ZERO;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "ledger_at")
    private LocalDateTime ledgerAt;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @OneToMany(mappedBy = "importBatch", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ImportBatchLineEntity> lines = new ArrayList<>();
}
