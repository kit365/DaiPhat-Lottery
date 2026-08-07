package com.daiphat.coreapi.infrastructure.persistence.entity.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.*;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "allocation_batches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class AllocationBatchEntity extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "batch_code", nullable = false, unique = true, length = 50)
    private String batchCode;
    @Enumerated(EnumType.STRING) @Column(name = "batch_type", nullable = false, length = 30)
    private AllocationBatchType batchType;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "street_agent_profile_id")
    private StreetAgentProfileEntity streetAgentProfile;
    @Column(name = "business_date", nullable = false)
    private LocalDate businessDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    @Builder.Default private AllocationBatchStatus status = AllocationBatchStatus.DRAFT;
    @Column(name = "reservation_expires_at") private LocalDateTime reservationExpiresAt;
    @Column(name = "face_value_snapshot", precision = 18, scale = 0) private BigDecimal faceValueSnapshot;
    @Column(name = "vendor_unit_price_snapshot", precision = 18, scale = 0) private BigDecimal vendorUnitPriceSnapshot;
    @Column(name = "deposit_rate_snapshot", precision = 6, scale = 5) private BigDecimal depositRateSnapshot;
    @Enumerated(EnumType.STRING) @Column(name = "late_policy_snapshot", length = 30) private VendorLateReturnPolicy latePolicySnapshot;
    @Column(name = "return_cutoff_snapshot") private LocalTime returnCutoffSnapshot;
    @Column(name = "allocated_quantity", nullable = false) @Builder.Default private Integer allocatedQuantity = 0;
    @Column(name = "returned_quantity", nullable = false) @Builder.Default private Integer returnedQuantity = 0;
    @Column(name = "sold_quantity", nullable = false) @Builder.Default private Integer soldQuantity = 0;
    @Column(name = "deposit_required_amount", precision = 18, scale = 0) private BigDecimal depositRequiredAmount;
    @Column(name = "deposit_received_amount", precision = 18, scale = 0) private BigDecimal depositReceivedAmount;
    @Column(name = "gross_cash_remitted", precision = 18, scale = 0) private BigDecimal grossCashRemitted;
    @Column(name = "commission_payable", precision = 18, scale = 0) private BigDecimal commissionPayable;
    @Column(name = "deposit_refund_amount", precision = 18, scale = 0) private BigDecimal depositRefundAmount;
    @Column(name = "deposit_forfeited_amount", precision = 18, scale = 0) private BigDecimal depositForfeitedAmount;
    @Column(name = "forced_purchase_amount", precision = 18, scale = 0) private BigDecimal forcedPurchaseAmount;
    @Column(name = "additional_amount_due", precision = 18, scale = 0) private BigDecimal additionalAmountDue;
    @Column(name = "deposit_balance_before", precision = 18, scale = 0) private BigDecimal depositBalanceBefore;
    @Column(name = "deposit_balance_after", precision = 18, scale = 0) private BigDecimal depositBalanceAfter;
    @Column(name = "deposit_received_at") private LocalDateTime depositReceivedAt;
    @Column(name = "deposit_received_by") private UUID depositReceivedBy;
    @Column(name = "settled_at") private LocalDateTime settledAt;
    @Column(name = "settled_by") private UUID settledBy;
    @Column(name = "lucky_override_reason", length = 500) private String luckyOverrideReason;
    @OneToMany(mappedBy = "allocationBatch", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default private List<AllocationBatchDetailEntity> details = new ArrayList<>();

    /**
     * Read-only convenience for legacy adapter hydration. Cascade/orphanRemoval live on
     * {@link AllocationBatchDetailEntity#getAgentTicketStocks()} only.
     */
    @OneToMany(mappedBy = "allocationBatch")
    @Builder.Default private List<AgentTicketStockEntity> agentTicketStocks = new ArrayList<>();
}
