package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode;
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

/**
 * Phiếu nộp vé trúng thưởng (gom chung mọi nhà đài hoặc theo nhà đài cũ).
 * Luồng: DRAFT → INSPECTING → PENDING_HANDOVER → HANDED_OVER → CLOSED (hoặc CANCELLED trước bàn giao).
 */
@Entity
@Table(name = "prize_claim_submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PrizeClaimSubmissionEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_code", nullable = false, unique = true, length = 50)
    private String submissionCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_supplier_id")
    private LotteryStationEntity lotterySupplier;

    @Column(name = "period_from")
    private LocalDate periodFrom;

    @Column(name = "period_to")
    private LocalDate periodTo;

    @Column(name = "total_ticket_count")
    @Builder.Default
    private Integer totalTicketCount = 0;

    @Column(name = "total_gross_prize_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalGrossPrizeAmount = BigDecimal.ZERO;

    @Column(name = "total_net_claim_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalNetClaimAmount = BigDecimal.ZERO;

    @Column(name = "total_tax_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalTaxAmount = BigDecimal.ZERO;

    @Column(name = "total_commission_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalCommissionAmount = BigDecimal.ZERO;

    /** Số tiền thực tế nhận từ Nhà cung cấp (nhập tay để đối soát). */
    @Column(name = "actual_received_amount", precision = 19, scale = 2)
    private BigDecimal actualReceivedAmount;

    /** Ảnh chứng từ số tiền Nhà cung cấp đã thanh toán. */
    @Column(name = "actual_received_evidence_url", length = 500)
    private String actualReceivedEvidenceUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PrizeClaimSubmissionStatus status = PrizeClaimSubmissionStatus.DRAFT;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "submitted_by")
    private UUID submittedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_mode", length = 32)
    private ReturnDeliveryMode deliveryMode;

    @Column(name = "handover_evidence_url", length = 500)
    private String handoverEvidenceUrl;

    @Column(name = "handover_receipt_url", length = 500)
    private String handoverReceiptUrl;

    @Column(name = "supplier_reference", length = 200)
    private String supplierReference;

    @Column(name = "handover_note", columnDefinition = "TEXT")
    private String handoverNote;

    @Column(name = "handed_over_at")
    private LocalDateTime handedOverAt;

    @Column(name = "handed_over_by")
    private UUID handedOverBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancelled_by")
    private UUID cancelledBy;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    /** Cảnh báo: phiếu HANDED_OVER quá 3 ngày vẫn còn vé AWAITING_OUTCOME. */
    @Column(name = "needs_outcome", nullable = false)
    @Builder.Default
    private boolean needsOutcome = false;

    @OneToMany(mappedBy = "prizeClaimSubmission", fetch = FetchType.LAZY)
    @Builder.Default
    private List<PrizeClaimSubmissionLineEntity> lines = new ArrayList<>();
}
