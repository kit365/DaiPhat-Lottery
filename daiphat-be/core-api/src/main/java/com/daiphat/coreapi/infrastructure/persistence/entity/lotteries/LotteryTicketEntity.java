package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
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
        name = "lottery_tickets",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_lottery_ticket_product_serial_numbers_draw_date",
                        columnNames = {"product_id", "serial_number", "numbers", "draw_date"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LotteryTicketEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private LotteryProductEntity product;

    @Column(name = "ticket_img", length = 500)
    private String ticketImg;

    @Column(name = "serial_number", nullable = false, length = 100)
    private String serialNumber;

    @Column(nullable = false, length = 100)
    private String numbers;

    @Column(name = "draw_date", nullable = false)
    private LocalDate drawDate;

    @Column(name = "batch_code", nullable = false, length = 100)
    private String batchCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private LotteryTicketStatus status = LotteryTicketStatus.IN_STOCK;

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
}
