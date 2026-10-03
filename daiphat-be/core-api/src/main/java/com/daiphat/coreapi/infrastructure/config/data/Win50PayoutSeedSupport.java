package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;

/** Shared prerequisite checks for additive winning-order seeds and their import inventory. */
@Component
@RequiredArgsConstructor
class Win50PayoutSeedSupport {
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final ImportBatchRepository importBatchRepository;
    private final LotteryTicketSerialRepository serialRepository;

    List<Win50PayoutSeedCatalog.OrderPlan> missingOrderPlans(boolean officialDemo) {
        List<Win50PayoutSeedCatalog.OrderPlan> plans = officialDemo
                ? Win50PayoutSeedCatalog.OFFICIAL_ORDER_PLANS : Win50PayoutSeedCatalog.ORDER_PLANS;
        return plans.stream()
                .filter(plan -> orderRepository.findByOrderCode(
                        Win50PayoutSeedCatalog.ORDER_CODE_PREFIX + String.format("%03d", plan.orderN())).isEmpty())
                .toList();
    }

    /** One representative per completely unclaimed ticket: crafting changes all of its serials. */
    List<LotteryTicketSerialEntity> loadClaimableInventory(boolean officialDemo, LocalDate from, LocalDate to) {
        List<LotteryTicketSerialEntity> source = officialDemo
                ? importBatchRepository.findByNoteStartingWithAndDeletedAtIsNull(
                        SeedDocumentCodes.IMPORT_NOTE_PREFIX + "MAIN").stream()
                        .filter(batch -> batch.getDrawDate() != null
                                && !batch.getDrawDate().isBefore(from) && !batch.getDrawDate().isAfter(to))
                        .flatMap(batch -> serialRepository.findByImportBatch_Id(batch.getId()).stream())
                        .toList()
                : serialRepository.findBySerialNumberStartingWithAndDeletedAtIsNull(
                        SharedSeedConstants.INVENTORY_SERIAL_PREFIX);
        LinkedHashMap<Long, LotteryTicketSerialEntity> byTicket = new LinkedHashMap<>();
        for (LotteryTicketSerialEntity serial : source) {
            var ticket = serial.getTicket();
            if (!isUnclaimed(serial) || ticket == null || ticket.getDeletedAt() != null
                    || ticket.getDrawDate() == null || ticket.getDrawDate().isBefore(from)
                    || ticket.getDrawDate().isAfter(to) || !SouthernStationSeedSupport.isCanonicalSouthern(ticket.getStation())
                    || (ticket.getStatus() != LotteryTicketStatus.EXPIRED && ticket.getStatus() != LotteryTicketStatus.IN_STOCK)) {
                continue;
            }
            byTicket.putIfAbsent(ticket.getId(), serial);
        }
        return byTicket.values().stream()
                .filter(serial -> !orderDetailRepository.existsByLotteryTicket_Id(serial.getTicket().getId()))
                .filter(serial -> serialRepository.findByTicket_IdAndDeletedAtIsNull(serial.getTicket().getId())
                        .stream().allMatch(Win50PayoutSeedSupport::isUnclaimed))
                .sorted(Comparator.comparing((LotteryTicketSerialEntity serial) -> serial.getTicket().getDrawDate())
                        .thenComparing(serial -> serial.getTicket().getStation().getId())
                        .thenComparing(LotteryTicketSerialEntity::getSerialNumber))
                .toList();
    }

    private static boolean isUnclaimed(LotteryTicketSerialEntity serial) {
        return serial.getDeletedAt() == null
                && (serial.getStatus() == LotteryTicketSerialStatus.IN_STOCK || serial.getStatus() == LotteryTicketSerialStatus.EXPIRED)
                && (serial.getTicketCondition() == null || serial.getTicketCondition() == TicketCondition.GOOD)
                && (serial.getPayoutState() == null || serial.getPayoutState() == SerialPayoutState.NONE)
                && serial.getReturnBatchLineId() == null
                && serial.getReservedByOrderId() == null
                && serial.getReservedByAllocationBatchId() == null;
    }
}
