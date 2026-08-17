package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Aligns status-coverage lottery ticket status with serial rows (same rules as
 * {@link LotteryTicketModel#resolveAggregateStatus}).
 */
final class StatusCoverageTicketStatusHelper {

    private static final LocalTime DEFAULT_DRAW_TIME = LocalTime.of(16, 15);
    private static final String ALL_SERIALS_FAULTY_STATUS_REASON =
            "Tất cả sê-ri vé đã báo hỏng hoặc mất — không còn vé bán được.";

    private StatusCoverageTicketStatusHelper() {
    }

    static void syncTicketStatusFromSerials(
            Long ticketId,
            LotteryStationEntity station,
            LocalDateTime now,
            String actor,
            LotteryTicketRepository lotteryTicketRepository,
            LotteryTicketSerialRepository lotteryTicketSerialRepository
    ) {
        LotteryTicketEntity ticket = lotteryTicketRepository.findById(ticketId).orElse(null);
        if (ticket == null) {
            return;
        }
        List<LotteryTicketSerialEntity> serials =
                lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId);
        syncTicketStatusFromSerials(ticket, station, serials, now, actor, lotteryTicketRepository);
    }

    static void syncTicketStatusFromSerials(
            LotteryTicketEntity ticket,
            LotteryStationEntity station,
            List<LotteryTicketSerialEntity> serials,
            LocalDateTime now,
            String actor,
            LotteryTicketRepository lotteryTicketRepository
    ) {
        long availableSerialCount = serials.stream()
                .filter(serial -> serial.getStatus() == LotteryTicketSerialStatus.IN_STOCK)
                .count();
        int totalSerialCount = serials.size();
        long soldSerialCount = serials.stream()
                .filter(serial -> serial.getStatus() == LotteryTicketSerialStatus.SOLD)
                .count();

        LocalTime cutoffTime = station.getDrawTime() != null ? station.getDrawTime() : DEFAULT_DRAW_TIME;
        boolean expired = isExpired(ticket.getDrawDate(), cutoffTime, now);

        LotteryTicketStatus resolvedStatus;
        if (expired) {
            resolvedStatus = LotteryTicketStatus.EXPIRED;
        } else if (availableSerialCount > 0) {
            resolvedStatus = LotteryTicketStatus.IN_STOCK;
        } else if (totalSerialCount == 0) {
            resolvedStatus = LotteryTicketStatus.IN_STOCK;
        } else if (soldSerialCount > 0) {
            resolvedStatus = LotteryTicketStatus.SOLD_OUT;
        } else {
            resolvedStatus = LotteryTicketStatus.IN_STOCK;
        }

        ticket.setStatus(resolvedStatus);
        ticket.setUpdatedAt(now);
        ticket.setLastModifiedBy(actor);
        lotteryTicketRepository.save(ticket);
    }

    private static boolean isExpired(LocalDate drawDate, LocalTime cutoffTime, LocalDateTime now) {
        if (drawDate == null) {
            return false;
        }
        LocalDate today = now.toLocalDate();
        if (drawDate.isBefore(today)) {
            return true;
        }
        if (!drawDate.isEqual(today)) {
            return false;
        }
        return now.toLocalTime().isAfter(cutoffTime);
    }
}
