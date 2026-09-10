package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Quỹ đại lý — theo dõi số dư khả dụng để trả giải thưởng.
 * Scope: agency = LOTTERY_RETAILER (đại lý bán vé), KHÔNG phải nhà đài.
 *
 * <ul>
 *   <li>Credit: khi PrizeClaimSubmission COMPLETED (nhà đài trả đại lý)
 *   <li>Debit: khi PrizePayout payout/payoutPartial/payFinalInstallment (đại lý trả khách)
 * </ul>
 *
 * <p>Không dùng @Version optimistic lock — dùng pessimistic lock (SELECT FOR UPDATE)
 * ở tầng repository query để tránh double-spend.
 */
@Entity
@Table(name = "agency_funds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AgencyFundEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agency_id", nullable = false, unique = true)
    private UUID agencyId;

    @Column(name = "available_balance", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal availableBalance = BigDecimal.ZERO;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
