package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "return_batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ReturnBatchEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_code", length = 100)
    private String batchCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_supplier_id", nullable = false)
    private LotterySupplierEntity lotterySupplier;

    @Column(name = "draw_date", nullable = false)
    private LocalDate drawDate;

    @Column(name = "supplier_settlement_id")
    private Long supplierSettlementId;

    @Column(name = "return_receipt_url", length = 500)
    private String returnReceiptUrl;

    @Column(name = "return_evidence_url", length = 500)
    private String returnEvidenceUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_mode", length = 40)
    private com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode deliveryMode;

    @Column(name = "total_quantity", nullable = false)
    @Builder.Default
    private Integer totalQuantity = 0;

    @Column(name = "total_return_value", nullable = false, precision = 18, scale = 3)
    @Builder.Default
    private BigDecimal totalReturnValue = BigDecimal.ZERO;

    @Column(name = "returned_by")
    private UUID returnedBy;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ReturnBatchStatus status = ReturnBatchStatus.PENDING_INSPECTION;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @OneToMany(mappedBy = "returnBatch", fetch = FetchType.LAZY)
    @Builder.Default
    private List<ReturnBatchLineEntity> lines = new ArrayList<>();
}
