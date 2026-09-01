package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.AgentTicketStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;

/**
 * Clears FK dependents before hard-deleting seeded {@code lottery_ticket_serials} on app restart.
 */
@Component
@RequiredArgsConstructor
class LotterySerialSeedCleanup {

    private final LotterySerialSeedCleanupRepository lotterySerialSeedCleanupRepository;
    private final AgentTicketStockRepository agentTicketStockRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;

    void clearDependentsBeforeSerialDelete(Collection<Long> serialIds) {
        if (serialIds == null || serialIds.isEmpty()) {
            return;
        }
        lotterySerialSeedCleanupRepository.clearOrderAndPayoutDependents(serialIds);
        lotteryTicketSerialRepository.clearReplacedForTicketIdRefs(serialIds);
        agentTicketStockRepository.deleteByLotteryTicketSerial_IdIn(serialIds);
    }
}
