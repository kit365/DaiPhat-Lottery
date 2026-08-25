package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.AgentTicketStockRepository;

import java.util.Collection;

/**
 * Clears FK dependents before hard-deleting seeded {@code lottery_ticket_serials} on app restart.
 */
final class LotterySerialSeedCleanup {

    private LotterySerialSeedCleanup() {
    }

    static void clearDependentsBeforeSerialDelete(
            AgentTicketStockRepository agentTicketStockRepository,
            LotteryTicketSerialRepository lotteryTicketSerialRepository,
            Collection<Long> serialIds
    ) {
        if (serialIds == null || serialIds.isEmpty()) {
            return;
        }
        lotteryTicketSerialRepository.clearReplacedForTicketIdRefs(serialIds);
        agentTicketStockRepository.deleteByLotteryTicketSerial_IdIn(serialIds);
    }
}
