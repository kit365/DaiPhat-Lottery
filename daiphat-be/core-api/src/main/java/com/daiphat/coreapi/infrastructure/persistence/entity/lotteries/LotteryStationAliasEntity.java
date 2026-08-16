package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * A supplier's spelling of a station name, learned when an operator corrects a
 * row during file import preview.
 */
@Entity
@Table(name = "lottery_station_aliases")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LotteryStationAliasEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lottery_station_id", nullable = false)
    private Long lotteryStationId;

    /** Already run through VietnameseTextNormalizer, so lookups are a plain equals. */
    @Column(name = "alias_normalized", nullable = false, length = 160)
    private String aliasNormalized;
}
