package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "lottery_results",
        indexes = {
                @Index(name = "idx_lottery_results_station_id", columnList = "station_id"),
                @Index(name = "idx_lottery_results_draw_date", columnList = "draw_date"),
                @Index(name = "idx_lottery_results_status", columnList = "status")
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_lottery_results_station_draw_date",
                        columnNames = {"station_id", "draw_date"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LotteryResultEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private LotteryStationEntity station;

    @Column(name = "draw_date", nullable = false)
    private LocalDate drawDate;

    @Column(name = "source", length = 100)
    private String source;

    @Column(name = "is_official", nullable = false)
    @Builder.Default
    private boolean isOfficial = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private LotteryResultStatus status = LotteryResultStatus.PENDING;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    @OneToMany(mappedBy = "lotteryResult", fetch = FetchType.LAZY)
    @Builder.Default
    private List<LotteryResultDetailEntity> details = new ArrayList<>();
}
