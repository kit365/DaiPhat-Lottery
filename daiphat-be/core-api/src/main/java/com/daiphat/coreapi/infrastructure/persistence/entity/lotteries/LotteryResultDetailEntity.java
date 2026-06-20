package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "lottery_result_details",
        indexes = {
                @Index(name = "idx_lottery_result_details_result_id", columnList = "lottery_result_id"),
                @Index(name = "idx_lottery_result_details_prize_structure_id", columnList = "prize_structure_id"),
                @Index(name = "idx_lottery_result_details_winning_number", columnList = "winning_number")
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_lottery_result_details_result_prize_winning_number",
                        columnNames = {"lottery_result_id", "prize_structure_id", "winning_number"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LotteryResultDetailEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_result_id", nullable = false)
    private LotteryResultEntity lotteryResult;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prize_structure_id", nullable = false)
    private PrizeStructureEntity prizeStructure;

    @Column(name = "winning_number", nullable = false, length = 20)
    private String winningNumber;
}
