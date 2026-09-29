package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketAggregateSyncUseCase;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
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
public class LotteryTicketAggregateSyncService implements LotteryTicketAggregateSyncUseCase {

    private static final Collection<LotteryTicketSerialStatus> SOLD_SERIAL_STATUSES =
            List.of(LotteryTicketSerialStatus.SOLD);
    private static final Collection<LotteryTicketSerialStatus> EXPIRABLE_STATUSES =
            List.of(LotteryTicketSerialStatus.IN_STOCK);

    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final TicketSalesCutoffPolicy ticketSalesCutoffPolicy;

    @Transactional
    public void syncTicketAggregate(Long ticketId) {
        LotteryTicketModel ticket = lotteryTicketRepositoryPort.findById(ticketId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
        LotteryStationModel station = lotteryStationServicePort.findModelById(ticket.getStationId())
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));

        LocalTime cutoffTime = station.getDrawTime();
        lotteryTicketSerialRepositoryPort.findByTicketIdAndStatuses(ticketId, EXPIRABLE_STATUSES)
                .stream()
                .filter(ticketSalesCutoffPolicy::isClosed)
                .forEach(serial -> {
                    serial.expire();
                    lotteryTicketSerialRepositoryPort.save(serial);
                });

        List<LotteryTicketSerialModel> allSerials = lotteryTicketSerialRepositoryPort.findAllByTicketId(ticketId);
        long availableSerialCount = allSerials.stream()
                .filter(LotteryTicketSerialModel::isAvailableForSale)
                .filter(serial -> !ticketSalesCutoffPolicy.isClosed(serial))
                .count();
        int totalSerialCount = (int) allSerials.stream().filter(LotteryTicketSerialModel::isVisibleInventory).count();
        int soldSerialCount = (int) lotteryTicketSerialRepositoryPort.countByTicketIdAndStatuses(
                ticketId, SOLD_SERIAL_STATUSES);
        List<LotteryTicketSerialModel> faultySerials = allSerials.stream()
                .filter(LotteryTicketSerialModel::isVisibleInventory)
                .filter(serial -> serial.getTicketCondition() != null && serial.getTicketCondition().isIncidentReported())
                .toList();
        ticket.syncAggregateState(
                (int) availableSerialCount,
                totalSerialCount,
                soldSerialCount,
                faultySerials.size(),
                cutoffTime,
                LotteryTicketModel.buildAllSerialsFaultyReason(faultySerials));
        boolean hasReserved = allSerials.stream()
                .anyMatch(serial -> serial.getStatus() == LotteryTicketSerialStatus.RESERVED);
        boolean hasExpired = allSerials.stream()
                .anyMatch(serial -> serial.getStatus() == LotteryTicketSerialStatus.EXPIRED);
        if (availableSerialCount == 0 && hasExpired && !hasReserved) {
            ticket.expire();
        }
        lotteryTicketRepositoryPort.save(ticket);
        lotteryStationServicePort.recalculateInventory(ticket.getStationId());
    }
}
