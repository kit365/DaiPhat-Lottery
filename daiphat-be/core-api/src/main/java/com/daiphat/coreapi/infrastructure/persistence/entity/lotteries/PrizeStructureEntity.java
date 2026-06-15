package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
@Entity
@Table(name = "prize_structures")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PrizeStructureEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private LotteryStationEntity station;

    @Column(length = 20)
    private String region;

    @Column(name = "is_only", nullable = false)
    @Builder.Default
    private boolean isOnly = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "prize_level", nullable = false, length = 50)
    private PrizeLevel prizeLevel;

    @Column(name = "prize_display_name", length = 100)
    private String prizeDisplayName;

    @Column(name = "prize_code", nullable = false, length = 20)
    private String prizeCode;

    @Column(name = "prize_value", nullable = false, precision = 15)
    private BigDecimal prizeValue;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "match_digits")
    private Integer matchDigits;

    @Enumerated(EnumType.STRING)
    @Column(name = "match_from", nullable = false, length = 20)
    private MatchFrom matchFrom;

    @Column(name = "match_from_display_name", length = 100)
    private String matchFromDisplayName;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;
}
