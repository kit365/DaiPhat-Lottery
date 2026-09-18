package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryResultDetailRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryResultRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeStructureRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Marks 50 winning tickets <b>from the shared demo inventory</b>
 * ({@link DemoSeedConstants#INVENTORY_SERIAL_PREFIX}, past draws ≤ 30 days),
 * upserts matching lottery results, and attaches COMPLETED online orders to {@code member}.
 * <p>
 * Does not create a parallel ticket universe — inventory must already exist
 * ({@link LotteryImportBatchSeedInitializer}).
 */
@Component
@ConditionalOnProperty(value = "daiphat.lottery.seed.win50-payout.enabled", havingValue = "true")
@Order(105)
@RequiredArgsConstructor
@Slf4j
public class DemoWinPayoutSeedInitializer implements ApplicationRunner {

    private static final BigDecimal TICKET_PRICE = BigDecimal.valueOf(10_000);
    private static final int MAX_LOOKBACK_DAYS = 30;
    private static final int TARGET_WINNERS = 50;

    private final SeedAccountResolver seedAccountResolver;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final LotteryResultRepository lotteryResultRepository;
    private final LotteryResultDetailRepository lotteryResultDetailRepository;
    private final PrizeStructureRepository prizeStructureRepository;
    private final OrderRepository orderRepository;
    private final LotterySerialSeedCleanup lotterySerialSeedCleanup;
    private final VietnamClock vietnamClock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserEntity member = seedAccountResolver.findMember();
        UserEntity operator = seedAccountResolver.findOperator();
        if (member == null || operator == null) {
            log.warn("Skip win50-payout seed: member/operator missing (run AuthSeed first).");
            return;
        }

        Map<String, PrizeStructureEntity> prizeByCode = loadPrizeStructures();
        if (prizeByCode.size() < DemoWinPayoutSeedCatalog.PRIZES.size()) {
            log.warn("Skip win50-payout seed: missing prize_structures (found {}).", prizeByCode.size());
            return;
        }

        LocalDateTime now = vietnamClock.now();
        LocalDate today = vietnamClock.today();
        LocalDate oldest = today.minusDays(MAX_LOOKBACK_DAYS);

        resetPreviousOverlay(now);

        List<LotteryTicketSerialEntity> pool = loadClaimableInventory(oldest, today.minusDays(1));
        if (pool.size() < TARGET_WINNERS) {
            log.warn(
                    "Skip win50-payout seed: need ≥{} claimable (EXPIRED/IN_STOCK) IBSEED serials in past ≤{} days, found {}.",
                    TARGET_WINNERS,
                    MAX_LOOKBACK_DAYS,
                    pool.size()
            );
            return;
        }

        Map<DemoWinPayoutSeedCatalog.DrawResultKey, Map<String, String>> drawResults = new LinkedHashMap<>();
        List<ClaimedWinner> winners = claimWinnersFromPool(pool, drawResults);
        if (winners.size() != TARGET_WINNERS) {
            log.warn("Skip win50-payout seed: claimed {} winners, expected {}.", winners.size(), TARGET_WINNERS);
            return;
        }

        for (Map.Entry<DemoWinPayoutSeedCatalog.DrawResultKey, Map<String, String>> entry : drawResults.entrySet()) {
            LotteryStationEntity station = winners.stream()
                    .filter(w -> w.stationId() == entry.getKey().stationId()
                            && w.drawDate().equals(entry.getKey().drawDate()))
                    .map(ClaimedWinner::station)
                    .findFirst()
                    .orElse(null);
            if (station == null) {
                continue;
            }
            upsertLotteryResult(station, entry.getKey().drawDate(), entry.getValue(), prizeByCode, now);
        }

        persistOrders(winners, member, operator, now);
        log.info(
                "Win50 payout seed complete: {} winners from IBSEED inventory across 12 orders for member={}.",
                winners.size(),
                member.getUsername()
        );
    }

    private List<LotteryTicketSerialEntity> loadClaimableInventory(LocalDate fromInclusive, LocalDate toInclusive) {
        return lotteryTicketSerialRepository
                .findBySerialNumberStartingWithAndDeletedAtIsNull(DemoSeedConstants.INVENTORY_SERIAL_PREFIX)
                .stream()
                // Past inventory is seeded as EXPIRED (after draw cutoff). Claim those
                // unsold serials and convert them into member-owned winners.
                .filter(serial -> serial.getStatus() == LotteryTicketSerialStatus.EXPIRED
                        || serial.getStatus() == LotteryTicketSerialStatus.IN_STOCK)
                .filter(serial -> serial.getTicketCondition() == null
                        || serial.getTicketCondition() == TicketCondition.GOOD)
                .filter(serial -> serial.getTicket() != null
                        && serial.getTicket().getDeletedAt() == null
                        && serial.getTicket().getDrawDate() != null
                        && !serial.getTicket().getDrawDate().isBefore(fromInclusive)
                        && !serial.getTicket().getDrawDate().isAfter(toInclusive)
                        && serial.getTicket().getStation() != null)
                .filter(serial -> serial.getTicket().getStatus() == LotteryTicketStatus.EXPIRED
                        || serial.getTicket().getStatus() == LotteryTicketStatus.IN_STOCK)
                .sorted(Comparator
                        .comparing((LotteryTicketSerialEntity s) -> s.getTicket().getDrawDate())
                        .thenComparing(s -> s.getTicket().getStation().getId())
                        .thenComparing(LotteryTicketSerialEntity::getSerialNumber))
                .toList();
    }

    private List<ClaimedWinner> claimWinnersFromPool(
            List<LotteryTicketSerialEntity> pool,
            Map<DemoWinPayoutSeedCatalog.DrawResultKey, Map<String, String>> drawResults
    ) {
        // One serial per ticket id so we do not double-claim.
        Map<Long, LotteryTicketSerialEntity> byTicketId = new LinkedHashMap<>();
        for (LotteryTicketSerialEntity serial : pool) {
            byTicketId.putIfAbsent(serial.getTicket().getId(), serial);
        }
        List<LotteryTicketSerialEntity> unique = new ArrayList<>(byTicketId.values());

        Map<DemoWinPayoutSeedCatalog.DrawResultKey, List<LotteryTicketSerialEntity>> byDraw = new LinkedHashMap<>();
        for (LotteryTicketSerialEntity serial : unique) {
            LotteryTicketEntity ticket = serial.getTicket();
            DemoWinPayoutSeedCatalog.DrawResultKey key =
                    new DemoWinPayoutSeedCatalog.DrawResultKey(ticket.getStation().getId(), ticket.getDrawDate());
            byDraw.computeIfAbsent(key, ignored -> new ArrayList<>()).add(serial);
            drawResults.computeIfAbsent(
                    key,
                    k -> DemoWinPayoutSeedCatalog.buildResults(k.stationId(), k.drawDate())
            );
        }

        List<DemoWinPayoutSeedCatalog.DrawResultKey> drawKeys = new ArrayList<>(byDraw.keySet());
        drawKeys.sort(Comparator
                .comparing(DemoWinPayoutSeedCatalog.DrawResultKey::drawDate)
                .thenComparing(DemoWinPayoutSeedCatalog.DrawResultKey::stationId));

        List<ClaimedWinner> winners = new ArrayList<>();
        Set<Long> usedTicketIds = new HashSet<>();
        Set<String> usedDbSlots = new HashSet<>();
        int dayI = 0;
        int idx = 0;

        for (int prizeOrd = 0; prizeOrd < DemoWinPayoutSeedCatalog.PRIZES.size(); prizeOrd++) {
            String prize = DemoWinPayoutSeedCatalog.PRIZES.get(prizeOrd);
            int count = DemoWinPayoutSeedCatalog.PRIZE_COUNTS[prizeOrd];
            for (int variant = 0; variant < count; variant++) {
                boolean placed = false;
                for (int attempt = 0; attempt < 500 && !placed; attempt++) {
                    DemoWinPayoutSeedCatalog.DrawResultKey key =
                            drawKeys.get((dayI + attempt) % drawKeys.size());
                    List<LotteryTicketSerialEntity> candidates = byDraw.get(key);
                    if (candidates == null || candidates.isEmpty()) {
                        continue;
                    }
                    Map<String, String> results = drawResults.get(key);
                    String dbSlot = key.stationId() + ":" + key.drawDate();
                    if ("DB".equals(prize) && usedDbSlots.contains(dbSlot)) {
                        continue;
                    }

                    LotteryTicketSerialEntity serial = candidates.stream()
                            .filter(s -> !usedTicketIds.contains(s.getTicket().getId()))
                            .findFirst()
                            .orElse(null);
                    if (serial == null) {
                        continue;
                    }

                    String candidateNumbers;
                    if ("DB".equals(prize)) {
                        candidateNumbers = results.get("DB");
                    } else {
                        String base = ("DB_PHU".equals(prize) || "KK".equals(prize))
                                ? results.get("DB")
                                : results.get(prize);
                        candidateNumbers = DemoWinPayoutSeedCatalog.craftTicket(
                                prize, base, variant * 11 + attempt * 7 + dayI + 3
                        );
                    }
                    if (!Objects.equals(DemoWinPayoutSeedCatalog.firstPrize(candidateNumbers, results), prize)) {
                        continue;
                    }

                    // Ensure uniqueness on station+date+numbers among remaining inventory.
                    boolean clash = lotteryTicketRepository
                            .existsByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(
                                    key.stationId(), candidateNumbers, key.drawDate()
                            )
                            && !candidateNumbers.equals(serial.getTicket().getNumbers());
                    if (clash) {
                        continue;
                    }

                    LotteryTicketEntity ticket = serial.getTicket();
                    ticket.setNumbers(candidateNumbers);
                    ticket.setStatus(LotteryTicketStatus.SOLD_OUT);
                    ticket.setActive(false);
                    ticket.setLastModifiedBy(DemoWinPayoutSeedCatalog.SEED_MARKER);
                    lotteryTicketRepository.save(ticket);

                    serial.setStatus(LotteryTicketSerialStatus.SOLD);
                    serial.setPayoutState(SerialPayoutState.NONE);
                    serial.setInputSource(serial.getInputSource() != null ? serial.getInputSource() : InputSource.MANUAL);
                    serial.setLastModifiedBy(DemoWinPayoutSeedCatalog.SEED_MARKER);
                    lotteryTicketSerialRepository.save(serial);

                    usedTicketIds.add(ticket.getId());
                    if ("DB".equals(prize)) {
                        usedDbSlots.add(dbSlot);
                    }
                    idx++;
                    winners.add(new ClaimedWinner(
                            idx,
                            key.stationId(),
                            key.drawDate(),
                            candidateNumbers,
                            prize,
                            serial.getSerialNumber(),
                            ticket.getStation(),
                            serial
                    ));
                    dayI++;
                    placed = true;
                }
                if (!placed) {
                    throw new IllegalStateException(
                            "WIN50_PAYOUT: could not place prize " + prize + " variant " + variant
                                    + " — expand past inventory or reduce win count."
                    );
                }
            }
        }

        long online = winners.stream()
                .filter(w -> DemoWinPayoutSeedCatalog.ONLINE_CLAIMABLE.contains(w.prize()))
                .count();
        if (online != 30) {
            throw new IllegalStateException("WIN50_PAYOUT: expected 30 online-claimable, got " + online);
        }
        return winners;
    }

    private void persistOrders(
            List<ClaimedWinner> winners,
            UserEntity member,
            UserEntity operator,
            LocalDateTime now
    ) {
        String memberName = ((member.getFirstName() == null ? "" : member.getFirstName()) + " "
                + (member.getLastName() == null ? "" : member.getLastName())).trim();
        if (memberName.isBlank()) {
            memberName = member.getUsername();
        }

        for (DemoWinPayoutSeedCatalog.OrderPlan plan : DemoWinPayoutSeedCatalog.ORDER_PLANS) {
            List<ClaimedWinner> orderWinners = winners.stream()
                    .filter(winner -> winner.idx() > plan.cumStart() && winner.idx() <= plan.cumEnd())
                    .sorted(Comparator.comparingInt(ClaimedWinner::idx))
                    .toList();
            if (orderWinners.isEmpty()) {
                continue;
            }

            LocalDate minDraw = orderWinners.stream()
                    .map(ClaimedWinner::drawDate)
                    .min(LocalDate::compareTo)
                    .orElseThrow();
            LocalDateTime paidAt = minDraw.atTime(LocalTime.of(9, 45)).plusMinutes((plan.orderN() - 1L) * 17L);
            LocalDateTime pickupAt = minDraw.atTime(LocalTime.of(18, 10)).plusMinutes((plan.orderN() - 1L) * 9L);
            String orderCode = DemoWinPayoutSeedCatalog.ORDER_CODE_PREFIX + String.format("%03d", plan.orderN());
            BigDecimal total = TICKET_PRICE.multiply(BigDecimal.valueOf(plan.slots()));

            List<OrderDetailEntity> details = new ArrayList<>();
            for (ClaimedWinner winner : orderWinners) {
                boolean online = DemoWinPayoutSeedCatalog.ONLINE_CLAIMABLE.contains(winner.prize());
                details.add(OrderDetailEntity.builder()
                        .lotteryTicket(winner.serial().getTicket())
                        .lotteryTicketSerial(winner.serial())
                        .quantity(1)
                        .price(TICKET_PRICE)
                        .status(online ? OrderDetailStatus.PROXY_HOLDING : OrderDetailStatus.HANDED_OVER)
                        .handedOverAt(online ? null : pickupAt)
                        .handedOverBy(online ? null : operator.getId())
                        .createdAt(paidAt)
                        .updatedAt(now)
                        .createdBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                        .lastModifiedBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                        .build());
            }

            OrderEntity order = OrderEntity.builder()
                    .user(member)
                    .name(memberName)
                    .phone(member.getPhone())
                    .email(member.getEmail())
                    .orderCode(orderCode)
                    .orderType(OrderType.ONLINE)
                    .receiveType(OrderReceiveType.COUNTER_PICKUP)
                    .totalAmount(total)
                    .status(OrderStatus.COMPLETED)
                    .expectedPickupAt(paidAt.plusHours(7))
                    .actualPickedUpAt(pickupAt)
                    .pickedUpBy(operator)
                    .createdAt(paidAt)
                    .updatedAt(now)
                    .createdBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                    .lastModifiedBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                    .build();

            for (OrderDetailEntity detail : details) {
                detail.setOrder(order);
            }

            TransactionEntity transaction = TransactionEntity.builder()
                    .order(order)
                    .amount(total)
                    .gateway(PaymentGateway.PAYOS)
                    .status(TransactionStatus.COMPLETED)
                    .paidAt(paidAt)
                    .type(TransactionType.ONLINE)
                    .paymentRef(DemoWinPayoutSeedCatalog.PAYMENT_REF_PREFIX + String.format("%03d", plan.orderN()))
                    .createdAt(paidAt)
                    .updatedAt(now)
                    .createdBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                    .lastModifiedBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                    .build();

            order.setOrderDetails(new ArrayList<>(details));
            order.setTransactions(new ArrayList<>(List.of(transaction)));
            orderRepository.save(order);
        }
    }

    private void upsertLotteryResult(
            LotteryStationEntity station,
            LocalDate drawDate,
            Map<String, String> results,
            Map<String, PrizeStructureEntity> prizeByCode,
            LocalDateTime now
    ) {
        LotteryResultEntity result = lotteryResultRepository
                .findByStation_IdAndDrawDateAndDeletedAtIsNull(station.getId(), drawDate)
                .orElseGet(() -> LotteryResultEntity.builder()
                        .station(station)
                        .drawDate(drawDate)
                        .createdAt(now)
                        .createdBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                        .build());

        result.setSource("MANUAL");
        result.setOfficial(true);
        result.setStatus(LotteryResultStatus.COMPLETED);
        result.setPublishedAt(drawDate.atTime(LocalTime.of(16, 35)));
        result.setDeletedAt(null);
        result.setUpdatedAt(now);
        result.setLastModifiedBy(DemoWinPayoutSeedCatalog.SEED_MARKER);
        result = lotteryResultRepository.save(result);

        List<LotteryResultDetailEntity> existing =
                lotteryResultDetailRepository
                        .findByLotteryResult_IdAndDeletedAtIsNullOrderByPrizeStructure_DisplayOrderAscWinningNumberAsc(
                                result.getId()
                        );
        if (!existing.isEmpty()) {
            lotteryResultDetailRepository.deleteAll(existing);
            lotteryResultDetailRepository.flush();
        }

        List<LotteryResultDetailEntity> details = new ArrayList<>();
        for (String prizeCode : DemoWinPayoutSeedCatalog.RESULT_DETAIL_CODES) {
            details.add(LotteryResultDetailEntity.builder()
                    .lotteryResult(result)
                    .prizeStructure(prizeByCode.get(prizeCode))
                    .winningNumber(DemoWinPayoutSeedCatalog.padWin(prizeCode, results.get(prizeCode)))
                    .createdBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                    .lastModifiedBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                    .build());
        }
        for (String prizeCode : List.of("DB_PHU", "KK")) {
            details.add(LotteryResultDetailEntity.builder()
                    .lotteryResult(result)
                    .prizeStructure(prizeByCode.get(prizeCode))
                    .winningNumber(results.get("DB"))
                    .createdBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                    .lastModifiedBy(DemoWinPayoutSeedCatalog.SEED_MARKER)
                    .build());
        }
        lotteryResultDetailRepository.saveAll(details);
    }

    private void resetPreviousOverlay(LocalDateTime now) {
        deleteOrdersByPrefix(DemoWinPayoutSeedCatalog.ORDER_CODE_PREFIX);
        deleteOrdersByPrefix(DemoWinPayoutSeedCatalog.LEGACY_ORDER_PREFIX);

        // Revert IBSEED serials previously claimed by this overlay.
        List<LotteryTicketSerialEntity> marked = lotteryTicketSerialRepository
                .findBySerialNumberStartingWithAndDeletedAtIsNull(DemoSeedConstants.INVENTORY_SERIAL_PREFIX)
                .stream()
                .filter(serial -> DemoWinPayoutSeedCatalog.SEED_MARKER.equals(serial.getLastModifiedBy())
                        || DemoWinPayoutSeedCatalog.LEGACY_MARKER.equals(serial.getLastModifiedBy()))
                .toList();
        for (LotteryTicketSerialEntity serial : marked) {
            serial.setStatus(LotteryTicketSerialStatus.IN_STOCK);
            serial.setPayoutState(SerialPayoutState.NONE);
            serial.setLastModifiedBy(DemoSeedConstants.INVENTORY_ACTOR);
            serial.setUpdatedAt(now);
            if (serial.getTicket() != null) {
                LotteryTicketEntity ticket = serial.getTicket();
                ticket.setStatus(LotteryTicketStatus.IN_STOCK);
                ticket.setActive(true);
                ticket.setLastModifiedBy(DemoSeedConstants.INVENTORY_ACTOR);
                ticket.setUpdatedAt(now);
                lotteryTicketRepository.save(ticket);
            }
            lotteryTicketSerialRepository.save(serial);
        }

        // Hard-delete legacy parallel p123 universe if still present.
        List<LotteryTicketSerialEntity> legacySerials =
                lotteryTicketSerialRepository.findBySerialNumberStartingWith(
                        DemoWinPayoutSeedCatalog.LEGACY_SERIAL_PREFIX
                );
        if (!legacySerials.isEmpty()) {
            List<Long> serialIds = legacySerials.stream()
                    .map(LotteryTicketSerialEntity::getId)
                    .filter(Objects::nonNull)
                    .toList();
            lotterySerialSeedCleanup.clearDependentsBeforeSerialDelete(serialIds);
            Set<Long> ticketIds = new HashSet<>();
            for (LotteryTicketSerialEntity serial : legacySerials) {
                if (serial.getTicket() != null && serial.getTicket().getId() != null) {
                    ticketIds.add(serial.getTicket().getId());
                }
                lotteryTicketSerialRepository.delete(serial);
            }
            lotteryTicketSerialRepository.flush();
            for (Long ticketId : ticketIds) {
                if (lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId).isEmpty()) {
                    lotteryTicketRepository.deleteById(ticketId);
                }
            }
        }
    }

    private void deleteOrdersByPrefix(String prefix) {
        List<OrderEntity> seedOrders = orderRepository.findByOrderCodeStartingWith(prefix);
        if (!seedOrders.isEmpty()) {
            orderRepository.deleteAll(seedOrders);
            orderRepository.flush();
        }
    }

    private Map<String, PrizeStructureEntity> loadPrizeStructures() {
        Map<String, PrizeStructureEntity> byCode = new HashMap<>();
        for (PrizeStructureEntity prize : prizeStructureRepository.findAll()) {
            if (prize.getDeletedAt() != null || prize.getPrizeCode() == null) {
                continue;
            }
            byCode.putIfAbsent(prize.getPrizeCode().toUpperCase(), prize);
        }
        Map<String, PrizeStructureEntity> filtered = new HashMap<>();
        for (String code : DemoWinPayoutSeedCatalog.PRIZES) {
            PrizeStructureEntity entity = byCode.get(code);
            if (entity != null) {
                filtered.put(code, entity);
            }
        }
        return filtered;
    }

    private record ClaimedWinner(
            int idx,
            long stationId,
            LocalDate drawDate,
            String numbers,
            String prize,
            String serialNumber,
            LotteryStationEntity station,
            LotteryTicketSerialEntity serial
    ) {
    }
}
