package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Phiếu nộp vé trúng thưởng cho nhà đài.
 * Luồng: DRAFT → SUBMITTED → CONFIRMED → PAYMENT_PENDING → COMPLETED.
 * Bất kỳ trạng thái nào (trừ COMPLETED) đều có thể CANCELLED (DRAFT tự do; SUBMITTED+ cần maker-checker).
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
    @JoinColumn(name = "lottery_supplier_id", nullable = false)
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

    @Column(name = "total_commission_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal totalCommissionAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PrizeClaimSubmissionStatus status = PrizeClaimSubmissionStatus.DRAFT;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "submitted_by")
    private UUID submittedBy;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "confirmed_by")
    private UUID confirmedBy;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "completed_by")
    private UUID completedBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancelled_by")
    private UUID cancelledBy;

    /** Người duyệt hủy — maker-checker */
    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "confirmation_reference", length = 200)
    private String confirmationReference;

    @Column(name = "confirmation_evidence_url", length = 500)
    private String confirmationEvidenceUrl;

    @Column(name = "payment_deadline")
    private LocalDate paymentDeadline;

    @Column(name = "is_overdue", nullable = false)
    @Builder.Default
    private boolean overdue = false;

    @Column(name = "paid_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status", length = 30)
    private PrizeClaimSubmissionSettlementStatus settlementStatus;

    @Column(name = "settlement_difference_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal settlementDifferenceAmount = BigDecimal.ZERO;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payment_evidence_urls", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> paymentEvidenceUrls = new ArrayList<>();

    @Column(name = "payment_note", columnDefinition = "TEXT")
    private String paymentNote;

    @OneToMany(mappedBy = "prizeClaimSubmission", fetch = FetchType.LAZY)
    @Builder.Default
    private List<PrizeClaimSubmissionLineEntity> lines = new ArrayList<>();
}
