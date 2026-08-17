package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyType;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.lotteries.StationCommissionSnapshot;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    @Column(name = "supplier_settlement_code", nullable = false, length = 100, unique = true)
    private String supplierSettlementCode;

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

    @Column(name = "supplier_settlement_receipt_url", length = 500)
    private String supplierSettlementReceiptUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payment_evidence_urls", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<String> paymentEvidenceUrls = new ArrayList<>();

    @Column(name = "is_return_expired", nullable = false)
    @Builder.Default
    private boolean isReturnExpired = false;

    @Column(name = "expired_return_value", nullable = false, precision = 18, scale = 3)
    @Builder.Default
    private BigDecimal expiredReturnValue = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private SupplierSettlementStatus status = SupplierSettlementStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(name = "reconciliation_phase", nullable = false, length = 40)
    @Builder.Default
    private SupplierSettlementReconciliationPhase reconciliationPhase = SupplierSettlementReconciliationPhase.MATCHING;

    @Column(name = "system_import_quantity")
    private Integer systemImportQuantity;

    @Column(name = "system_import_value", precision = 18, scale = 3)
    private BigDecimal systemImportValue;

    @Column(name = "system_return_quantity")
    private Integer systemReturnQuantity;

    @Column(name = "system_return_value", precision = 18, scale = 3)
    private BigDecimal systemReturnValue;

    @Column(name = "actual_ticket_import_quantity")
    private Integer actualTicketImportQuantity;

    @Column(name = "actual_ticket_import_value", precision = 18, scale = 3)
    private BigDecimal actualTicketImportValue;

    @Column(name = "actual_return_ticket_quantity")
    private Integer actualReturnTicketQuantity;

    @Column(name = "actual_return_ticket_value", precision = 18, scale = 3)
    private BigDecimal actualReturnTicketValue;

    @Column(name = "original_ticket_unit_price", precision = 18, scale = 3)
    private BigDecimal originalTicketUnitPrice;

    @Column(name = "reconciled_ticket_unit_price", precision = 18, scale = 3)
    private BigDecimal reconciledTicketUnitPrice;

    @Column(name = "system_ticket_import_price", precision = 18, scale = 3)
    private BigDecimal systemTicketImportPrice;

    @Column(name = "actual_ticket_import_price", precision = 18, scale = 3)
    private BigDecimal actualTicketImportPrice;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "station_commission_snapshots", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private List<StationCommissionSnapshot> stationCommissionSnapshots =
            new ArrayList<>();

    @Column(name = "system_import_quantity_frozen_at")
    private java.time.LocalDateTime systemImportQuantityFrozenAt;

    @Column(name = "system_return_quantity_frozen_at")
    private java.time.LocalDateTime systemReturnQuantityFrozenAt;

    @Column(name = "initial_estimated_settlement_value", precision = 18, scale = 3)
    private BigDecimal initialEstimatedSettlementValue;

    @Column(name = "final_settlement_value", precision = 18, scale = 3)
    private BigDecimal finalSettlementValue;

    @Column(name = "actual_paid_amount", precision = 18, scale = 3)
    private BigDecimal actualPaidAmount;

    @Column(name = "settlement_difference_amount", precision = 18, scale = 3)
    private BigDecimal settlementDifferenceAmount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "discrepancy_types", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private List<SupplierSettlementDiscrepancyType> discrepancyTypes = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "discrepancy_items", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private List<SettlementDiscrepancyItemColumn> discrepancyItems = new ArrayList<>();

    @Column(name = "import_quantity_mismatch", nullable = false)
    @Builder.Default
    private boolean importQuantityMismatch = false;

    @Column(name = "import_value_mismatch", nullable = false)
    @Builder.Default
    private boolean importValueMismatch = false;

    @Column(name = "return_quantity_mismatch", nullable = false)
    @Builder.Default
    private boolean returnQuantityMismatch = false;

    @Column(name = "return_value_mismatch", nullable = false)
    @Builder.Default
    private boolean returnValueMismatch = false;

    @Column(name = "import_discrepancy_resolved", nullable = false)
    @Builder.Default
    private boolean importDiscrepancyResolved = false;

    @Column(name = "return_discrepancy_resolved", nullable = false)
    @Builder.Default
    private boolean returnDiscrepancyResolved = false;

    @Column(name = "unit_price_discrepancy_resolved", nullable = false)
    @Builder.Default
    private boolean unitPriceDiscrepancyResolved = true;

    @Column(name = "recalculated_total_paid_amount", precision = 18, scale = 3)
    private BigDecimal recalculatedTotalPaidAmount;

    @Column(name = "reconciliation_note", columnDefinition = "TEXT")
    private String reconciliationNote;

    @Column(name = "matching_confirmed_at")
    private java.time.LocalDateTime matchingConfirmedAt;

    @Column(name = "matching_confirmed_by")
    private UUID matchingConfirmedBy;

    @Column(name = "completed_at")
    private java.time.LocalDateTime completedAt;

    @Column(name = "completed_by")
    private UUID completedBy;

    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "paid_at")
    private java.time.LocalDateTime paidAt;
}
