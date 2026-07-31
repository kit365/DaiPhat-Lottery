package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

/**
 * Keeps lottery ticket aggregate status in sync with its serials without depending on
 * {@link LotteryTicketService} or {@link LotteryTicketSerialService}, avoiding circular injection.
 */
@Service
@RequiredArgsConstructor
public class LotteryTicketAggregateSyncService {

    private static final Collection<LotteryTicketSerialStatus> AVAILABLE_STATUSES =
            List.of(LotteryTicketSerialStatus.IN_STOCK);
    private static final Collection<LotteryTicketSerialStatus> SOLD_SERIAL_STATUSES =
            List.of(LotteryTicketSerialStatus.SOLD);
    private static final Collection<LotteryTicketSerialStatus> FAULTY_SERIAL_STATUSES = List.of(
            LotteryTicketSerialStatus.DAMAGED,
            LotteryTicketSerialStatus.LOST
    );
    private static final Collection<LotteryTicketSerialStatus> EXPIRABLE_STATUSES = List.of(
            LotteryTicketSerialStatus.IN_STOCK,
            LotteryTicketSerialStatus.PROXY_HOLDING
    );

    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;

    @Transactional
    public void syncTicketAggregate(Long ticketId) {
        LotteryTicketModel ticket = lotteryTicketRepositoryPort.findById(ticketId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
        LotteryStationModel station = lotteryStationServicePort.findModelById(ticket.getStationId())
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));

        LocalTime cutoffTime = station.getDrawTime();
        if (ticket.isExpired(cutoffTime)) {
            lotteryTicketSerialRepositoryPort.findByTicketIdAndStatuses(ticketId, EXPIRABLE_STATUSES)
                    .forEach(serial -> {
                        serial.expire();
                        lotteryTicketSerialRepositoryPort.save(serial);
                    });
        }

        long availableSerialCount = lotteryTicketSerialRepositoryPort.countByTicketIdAndStatuses(
                ticketId, AVAILABLE_STATUSES);
        int totalSerialCount = lotteryTicketSerialRepositoryPort.findAllByTicketId(ticketId).size();
        int soldSerialCount = (int) lotteryTicketSerialRepositoryPort.countByTicketIdAndStatuses(
                ticketId, SOLD_SERIAL_STATUSES);
        int faultySerialCount = (int) lotteryTicketSerialRepositoryPort.countByTicketIdAndStatuses(
                ticketId, FAULTY_SERIAL_STATUSES);
        ticket.syncAggregateState(
                (int) availableSerialCount,
                totalSerialCount,
                soldSerialCount,
                faultySerialCount,
                cutoffTime);
        lotteryTicketRepositoryPort.save(ticket);
        lotteryStationServicePort.recalculateInventory(ticket.getStationId());
    }
}
