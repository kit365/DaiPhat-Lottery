package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "lottery_ticket_serials",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_lottery_ticket_serials_ticket_serial",
                        columnNames = {"ticket_id", "serial_number"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LotteryTicketSerialEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private LotteryTicketEntity ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_batch_id")
    private ImportBatchEntity importBatch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_batch_line_id")
    private ImportBatchLineEntity importBatchLine;

    @Column(name = "ticket_img", length = 500)
    private String ticketImg;

    @Column(name = "serial_number", nullable = false, length = 100)
    private String serialNumber;

    /** Denormalized from ticket for UNIQUE(station, draw_date, serial_number). */
    @Column(name = "station_id", nullable = false)
    private Long stationId;

    /** Denormalized from ticket for UNIQUE(station, draw_date, serial_number). */
    @Column(name = "draw_date", nullable = false)
    private LocalDate drawDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private LotteryTicketSerialStatus status = LotteryTicketSerialStatus.IN_STOCK;

    @Enumerated(EnumType.STRING)
    @Column(name = "faulted_by", length = 30)
    private LotteryTicketSerialFaultedBy faultedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "input_source", nullable = false, length = 20)
    @Builder.Default
    private InputSource inputSource = InputSource.MANUAL;

    @Column(name = "reserved_at")
    private LocalDateTime reservedAt;

    @Column(name = "reservation_expires_at")
    private LocalDateTime reservationExpiresAt;

    @Column(name = "reserved_by_order_id")
    private UUID reservedByOrderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imported_by", nullable = false)
    private UserEntity importedBy;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private boolean verified = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private UserEntity verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;

    @Column(name = "damaged_evidence_url", length = 500)
    private String damagedEvidenceUrl;

    @Column(name = "damaged_reason", length = 500)
    private String damagedReason;

    @Column(name = "replaced_for_ticket_id")
    private Long replacedForTicketId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_state", nullable = false, length = 30)
    @Builder.Default
    private SerialPayoutState payoutState = SerialPayoutState.NONE;
}
