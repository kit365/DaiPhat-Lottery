package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
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
@Table(
        name = "lottery_tickets",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_lottery_ticket_station_numbers_draw_date",
                        columnNames = {"station_id", "numbers", "draw_date"}
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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private LotteryStationEntity station;

    @Column(name = "ticket_img", length = 500)
    private String ticketImg;

    @Column(nullable = false, length = 100)
    private String numbers;

    @Column(name = "draw_date", nullable = false)
    private LocalDate drawDate;

    /**
     * Legacy column restored by V202607151430 (NOT NULL). Import-batch flow resolves
     * display batch codes from import_batch_lines; this field still must be persisted.
     */
    @Column(name = "batch_code", nullable = false, length = 100)
    private String batchCode;


    @org.hibernate.annotations.Formula("(select count(s.id) from lottery_ticket_serials s where s.ticket_id = id and s.status = 'IN_STOCK' and s.deleted_at is null)")
    private Integer quantity;

    @Column(name = "price_snapshot", nullable = false, precision = 15)
    private BigDecimal priceSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private LotteryTicketStatus status = LotteryTicketStatus.IN_STOCK;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LotteryTicketSerialEntity> serials = new ArrayList<>();

    @Transient
    private UserEntity importedBy;

    @Transient
    private LocalDateTime importedAt;

    @Transient
    @Builder.Default
    private boolean verified = false;

    @Transient
    private UserEntity verifiedBy;

    @Transient
    private LocalDateTime verifiedAt;

    @Transient
    private LocalDateTime returnedAt;

    @Column(name = "replace_ticket_id")
    private Long replaceTicketId;

    @PrePersist
    @PreUpdate
    void ensureBatchCode() {
        if (batchCode == null || batchCode.isBlank()) {
            batchCode = "LEGACY-" + (id != null ? id : UUID.randomUUID());
        }
    }
}
