package com.daiphat.coreapi.infrastructure.config.data;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

/**
 * Native cleanup for FK dependents of seeded {@code lottery_ticket_serials}.
 */
@Repository
@RequiredArgsConstructor
class LotterySerialSeedCleanupRepository {

    private final EntityManager entityManager;

    void clearOrderAndPayoutDependents(Collection<Long> serialIds) {
        if (serialIds == null || serialIds.isEmpty()) {
            return;
        }
        List<Long> ids = List.copyOf(serialIds);

        entityManager.createNativeQuery("""
                        UPDATE transactions t
                           SET prize_payout_request_id = NULL
                         WHERE t.prize_payout_request_id IN (
                               SELECT ppr.id
                                 FROM prize_payout_requests ppr
                                WHERE ppr.serial_id IN (:serialIds)
                                   OR ppr.order_detail_id IN (
                                       SELECT od.id
                                         FROM order_details od
                                        WHERE od.lottery_ticket_serial_id IN (:serialIds)
                                           OR od.replaced_by_ticket_serial_id IN (:serialIds)
                                   )
                         )
                        """)
                .setParameter("serialIds", ids)
                .executeUpdate();

        entityManager.createNativeQuery("""
                        DELETE FROM prize_payout_installments ppi
                         WHERE ppi.prize_payout_request_id IN (
                               SELECT ppr.id
                                 FROM prize_payout_requests ppr
                                WHERE ppr.serial_id IN (:serialIds)
                                   OR ppr.order_detail_id IN (
                                       SELECT od.id
                                         FROM order_details od
                                        WHERE od.lottery_ticket_serial_id IN (:serialIds)
                                           OR od.replaced_by_ticket_serial_id IN (:serialIds)
                                   )
                         )
                        """)
                .setParameter("serialIds", ids)
                .executeUpdate();

        entityManager.createNativeQuery("""
                        DELETE FROM prize_claim_submission_lines pcsl
                         WHERE pcsl.serial_id IN (:serialIds)
                            OR pcsl.prize_payout_request_id IN (
                                SELECT ppr.id
                                  FROM prize_payout_requests ppr
                                 WHERE ppr.serial_id IN (:serialIds)
                                    OR ppr.order_detail_id IN (
                                        SELECT od.id
                                          FROM order_details od
                                         WHERE od.lottery_ticket_serial_id IN (:serialIds)
                                            OR od.replaced_by_ticket_serial_id IN (:serialIds)
                                    )
                            )
                        """)
                .setParameter("serialIds", ids)
                .executeUpdate();

        entityManager.createNativeQuery("""
                        DELETE FROM prize_payout_requests ppr
                         WHERE ppr.serial_id IN (:serialIds)
                            OR ppr.order_detail_id IN (
                                SELECT od.id
                                  FROM order_details od
                                 WHERE od.lottery_ticket_serial_id IN (:serialIds)
                                    OR od.replaced_by_ticket_serial_id IN (:serialIds)
                            )
                        """)
                .setParameter("serialIds", ids)
                .executeUpdate();

        entityManager.createNativeQuery("""
                        UPDATE daily_sales_report_details dsrd
                           SET order_detail_id = NULL
                         WHERE dsrd.order_detail_id IN (
                               SELECT od.id
                                 FROM order_details od
                                WHERE od.lottery_ticket_serial_id IN (:serialIds)
                                   OR od.replaced_by_ticket_serial_id IN (:serialIds)
                         )
                        """)
                .setParameter("serialIds", ids)
                .executeUpdate();

        entityManager.createNativeQuery("""
                        UPDATE supplier_settlement_adjustments ssa
                           SET lottery_ticket_serial_id = NULL
                         WHERE ssa.lottery_ticket_serial_id IN (:serialIds)
                        """)
                .setParameter("serialIds", ids)
                .executeUpdate();

        entityManager.createNativeQuery("""
                        UPDATE order_details od
                           SET replaced_by_ticket_serial_id = NULL
                         WHERE od.replaced_by_ticket_serial_id IN (:serialIds)
                        """)
                .setParameter("serialIds", ids)
                .executeUpdate();

        entityManager.createNativeQuery("""
                        DELETE FROM order_details od
                         WHERE od.lottery_ticket_serial_id IN (:serialIds)
                        """)
                .setParameter("serialIds", ids)
                .executeUpdate();

        entityManager.flush();
    }
}
