package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimRejectionReason;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutRequestEntity;
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
import java.time.LocalDateTime;

/**
 * Dòng vé trong phiếu nộp PrizeClaimSubmission.
 * Liên kết đến lottery_ticket_serials qua serialId.
 */
@Entity
@Table(name = "prize_claim_submission_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PrizeClaimSubmissionLineEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prize_claim_submission_id", nullable = false)
    private PrizeClaimSubmissionEntity prizeClaimSubmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prize_payout_request_id")
    private PrizePayoutRequestEntity prizePayoutRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "serial_id", nullable = false)
    private LotteryTicketSerialEntity serial;

    @Column(name = "station_id", nullable = false)
    private Long stationId;

    @Column(name = "draw_date")
    private LocalDate drawDate;

    @Column(name = "prize_code", length = 50)
    private String prizeCode;

    @Column(name = "prize_display_name", length = 200)
    private String prizeDisplayName;

    @Column(name = "gross_prize_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal grossPrizeAmount = BigDecimal.ZERO;

    @Column(name = "net_claim_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal netClaimAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "commission_amount", precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal commissionAmount = BigDecimal.ZERO;

    @Column(name = "ticket_serial_number", length = 100)
    private String ticketSerialNumber;

    @Column(name = "ticket_numbers", length = 200)
    private String ticketNumbers;

    @Enumerated(EnumType.STRING)
    @Column(name = "line_status", nullable = false, length = 30)
    @Builder.Default
    private PrizeClaimSubmissionLineStatus lineStatus = PrizeClaimSubmissionLineStatus.SELECTED;

    @Enumerated(EnumType.STRING)
    @Column(name = "rejection_reason", length = 50)
    private PrizeClaimRejectionReason rejectionReason;

    @Column(columnDefinition = "TEXT")
    private String rejectionNote;

    @Column(name = "outcome_evidence_url", length = 500)
    private String outcomeEvidenceUrl;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
}
