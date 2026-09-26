package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
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
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Marks {@link Win50PayoutSeedCatalog#TARGET_WINNERS} winning tickets
 * <b>from the shared demo inventory</b>
 * ({@link SharedSeedConstants#INVENTORY_SERIAL_PREFIX}, past draws ≤ 30 days)
 * and attaches one COMPLETED online order to {@code member}.
 * <p>
 * Winners are crafted against the <b>official</b> lottery results of their draw; the seed never
 * writes lottery results itself, because a COMPLETED result with details is never re-crawled.
 * Draws without an official result are synced through {@link LotteryResultServicePort} first.
 * <p>
 * Does not create a parallel ticket universe — inventory must already exist
 * ({@link LotteryImportBatchSeedInitializer}). Only real Miền Nam catalog stations are used.
 */
@Component
@ConditionalOnProperty(value = "daiphat.lottery.seed.win50-payout.enabled", havingValue = "true")
@Order(105)
@Slf4j
public class Win50PayoutSeedInitializer implements ApplicationRunner {

    private static final BigDecimal TICKET_PRICE = BigDecimal.valueOf(10_000);
    private static final int MAX_LOOKBACK_DAYS = 30;
    private static final int MAX_RESULT_DRAWS = 6;
    private static final int MAX_RESULT_SYNC_ATTEMPTS = 12;

    private final SeedAccountResolver seedAccountResolver;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final LotteryResultRepository lotteryResultRepository;
    private final LotteryResultDetailRepository lotteryResultDetailRepository;
    private final PrizeStructureRepository prizeStructureRepository;
    private final OrderRepository orderRepository;
    private final LotterySerialSeedCleanup lotterySerialSeedCleanup;
    private final LotteryResultServicePort lotteryResultServicePort;
    private final TransactionTemplate transaction;
    private final VietnamClock vietnamClock;

    public Win50PayoutSeedInitializer(
            SeedAccountResolver seedAccountResolver,
            LotteryTicketRepository lotteryTicketRepository,
            LotteryTicketSerialRepository lotteryTicketSerialRepository,
            LotteryResultRepository lotteryResultRepository,
            LotteryResultDetailRepository lotteryResultDetailRepository,
            PrizeStructureRepository prizeStructureRepository,
            OrderRepository orderRepository,
            LotterySerialSeedCleanup lotterySerialSeedCleanup,
            LotteryResultServicePort lotteryResultServicePort,
            PlatformTransactionManager transactionManager,
            VietnamClock vietnamClock
    ) {
        this.seedAccountResolver = seedAccountResolver;
        this.lotteryTicketRepository = lotteryTicketRepository;
        this.lotteryTicketSerialRepository = lotteryTicketSerialRepository;
        this.lotteryResultRepository = lotteryResultRepository;
        this.lotteryResultDetailRepository = lotteryResultDetailRepository;
        this.prizeStructureRepository = prizeStructureRepository;
        this.orderRepository = orderRepository;
        this.lotterySerialSeedCleanup = lotterySerialSeedCleanup;
        this.lotteryResultServicePort = lotteryResultServicePort;
        this.transaction = new TransactionTemplate(transactionManager);
        this.vietnamClock = vietnamClock;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Win50PayoutSeedCatalog.DrawResultKey> candidateDraws = transaction.execute(status -> prepareOverlay());
        if (candidateDraws == null || candidateDraws.isEmpty()) {
            return;
        }

        // Result sync calls the crawler and commits on its own; keep it outside the seed transaction.
        Set<Win50PayoutSeedCatalog.DrawResultKey> officialDraws = ensureOfficialResults(candidateDraws);
        if (officialDraws.isEmpty()) {
            log.warn(
                    "Skip win50-payout seed: no official lottery result available for {} candidate draw(s); retry on next restart.",
                    candidateDraws.size()
            );
            return;
        }

        try {
            transaction.executeWithoutResult(status -> seedWinners(officialDraws));
        } catch (IllegalStateException ex) {
            log.warn("Skip win50-payout seed: {}", ex.getMessage());
        }
    }

    private List<Win50PayoutSeedCatalog.DrawResultKey> prepareOverlay() {
        if (seedAccountResolver.findMember() == null || seedAccountResolver.findOperator() == null) {
            log.warn("Skip win50-payout seed: member/operator missing (run AuthSeed first).");
            return List.of();
        }
        int prizeCount = loadPrizeStructures().size();
        if (prizeCount < Win50PayoutSeedCatalog.PRIZES.size()) {
            log.warn("Skip win50-payout seed: missing prize_structures (found {}).", prizeCount);
            return List.of();
        }

        LocalDateTime now = vietnamClock.now();
        resetPreviousOverlay(now);
        releaseFakeResults(now);

        List<LotteryTicketSerialEntity> pool = loadClaimableInventory();
        if (pool.size() < Win50PayoutSeedCatalog.TARGET_WINNERS) {
            log.warn(
                    "Skip win50-payout seed: need ≥{} claimable (EXPIRED/IN_STOCK) IBSEED serials in past ≤{} days, found {}.",
                    Win50PayoutSeedCatalog.TARGET_WINNERS,
                    MAX_LOOKBACK_DAYS,
                    pool.size()
            );
            return List.of();
        }

        return pool.stream()
                .map(Win50PayoutSeedInitializer::drawKeyOf)
                .distinct()
                .sorted(Comparator
                        .comparing(Win50PayoutSeedCatalog.DrawResultKey::drawDate, Comparator.reverseOrder())
                        .thenComparing(Win50PayoutSeedCatalog.DrawResultKey::stationId))
                .toList();
    }

    private Set<Win50PayoutSeedCatalog.DrawResultKey> ensureOfficialResults(
            List<Win50PayoutSeedCatalog.DrawResultKey> candidateDraws
    ) {
        Set<Win50PayoutSeedCatalog.DrawResultKey> officialDraws = new LinkedHashSet<>();
        int syncAttempts = 0;
        for (Win50PayoutSeedCatalog.DrawResultKey key : candidateDraws) {
            if (officialDraws.size() >= MAX_RESULT_DRAWS) {
                break;
            }
            if (hasOfficialResult(key)) {
                officialDraws.add(key);
                continue;
            }
            if (syncAttempts >= MAX_RESULT_SYNC_ATTEMPTS) {
                continue;
            }
            syncAttempts++;
            try {
                LotteryResultModel result = lotteryResultServicePort.ensureResultForBoard(key.stationId(), key.drawDate());
                lotteryResultServicePort.syncResult(result.getId(), LotteryStationSourceType.DEFAULT);
            } catch (RuntimeException ex) {
                log.warn(
                        "Win50 payout seed: could not sync official result stationId={} drawDate={}: {}",
                        key.stationId(),
                        key.drawDate(),
                        ex.getMessage()
                );
                continue;
            }
            if (hasOfficialResult(key)) {
                officialDraws.add(key);
            }
        }
        return officialDraws;
    }

    private boolean hasOfficialResult(Win50PayoutSeedCatalog.DrawResultKey key) {
        return Boolean.TRUE.equals(transaction.execute(status -> !loadOfficialResult(key).isEmpty()));
    }

    private void seedWinners(Set<Win50PayoutSeedCatalog.DrawResultKey> officialDraws) {
        UserEntity member = seedAccountResolver.findMember();
        UserEntity operator = seedAccountResolver.findOperator();
        if (member == null || operator == null) {
            throw new IllegalStateException("member/operator missing");
        }

        Map<Win50PayoutSeedCatalog.DrawResultKey, Map<String, List<String>>> drawResults = new LinkedHashMap<>();
        for (Win50PayoutSeedCatalog.DrawResultKey key : officialDraws) {
            Map<String, List<String>> results = loadOfficialResult(key);
            if (!results.isEmpty()) {
                drawResults.put(key, results);
            }
        }

        List<LotteryTicketSerialEntity> pool = loadClaimableInventory().stream()
                .filter(serial -> drawResults.containsKey(drawKeyOf(serial)))
                .toList();
        List<ClaimedWinner> winners = claimWinnersFromPool(pool, drawResults);
        if (winners.size() != Win50PayoutSeedCatalog.TARGET_WINNERS) {
            throw new IllegalStateException(
                    "claimed " + winners.size() + " winners, expected " + Win50PayoutSeedCatalog.TARGET_WINNERS
            );
        }

        persistOrders(winners, member, operator, vietnamClock.now());
        log.info(
                "Win50 payout seed complete: {} winners from IBSEED inventory on {} official draw(s) across {} order(s) for member={}.",
                winners.size(),
                drawResults.size(),
                Win50PayoutSeedCatalog.ORDER_PLANS.size(),
                member.getUsername()
        );
    }

    /**
     * Prize code → winning numbers of a COMPLETED result that covers every prize DB–G8;
     * empty when the draw has no complete official result yet.
     */
    private Map<String, List<String>> loadOfficialResult(Win50PayoutSeedCatalog.DrawResultKey key) {
        LotteryResultEntity result = lotteryResultRepository
                .findByStation_IdAndDrawDateAndDeletedAtIsNull(key.stationId(), key.drawDate())
                .orElse(null);
        if (result == null || result.getStatus() != LotteryResultStatus.COMPLETED) {
            return Map.of();
        }

        Map<String, List<String>> byPrize = new LinkedHashMap<>();
        for (LotteryResultDetailEntity detail : lotteryResultDetailRepository
                .findByLotteryResult_IdAndDeletedAtIsNullOrderByPrizeStructure_DisplayOrderAscWinningNumberAsc(
                        result.getId()
                )) {
            if (detail.getPrizeStructure() == null
                    || detail.getPrizeStructure().getPrizeCode() == null
                    || detail.getWinningNumber() == null) {
                continue;
            }
            String prizeCode = detail.getPrizeStructure().getPrizeCode().toUpperCase();
            if (Win50PayoutSeedCatalog.FAKE_RESULT_PRIZE_CODES.contains(prizeCode)) {
                return Map.of();
            }
            if (Win50PayoutSeedCatalog.RESULT_DETAIL_CODES.contains(prizeCode)) {
                byPrize.computeIfAbsent(prizeCode, ignored -> new ArrayList<>()).add(detail.getWinningNumber());
            }
        }
        return byPrize.keySet().containsAll(Win50PayoutSeedCatalog.RESULT_DETAIL_CODES) ? byPrize : Map.of();
    }

    /**
     * Older runs overwrote official results with one fabricated number per prize (plus DB_PHU/KK),
     * which the result sync then skipped forever. Strip those details so the backlog sync
     * (or {@link #ensureOfficialResults}) fetches the real numbers again.
     */
    private void releaseFakeResults(LocalDateTime now) {
        Set<Long> fakeResultIds = new LinkedHashSet<>();
        for (LotteryResultDetailEntity detail : lotteryResultDetailRepository
                .findByPrizeStructure_PrizeCodeInAndDeletedAtIsNull(Win50PayoutSeedCatalog.FAKE_RESULT_PRIZE_CODES)) {
            if (detail.getLotteryResult() != null && detail.getLotteryResult().getId() != null) {
                fakeResultIds.add(detail.getLotteryResult().getId());
            }
        }

        for (Long resultId : fakeResultIds) {
            LotteryResultEntity result = lotteryResultRepository.findById(resultId).orElse(null);
            if (result == null) {
                continue;
            }
            lotteryResultDetailRepository.deleteAll(
                    lotteryResultDetailRepository
                            .findByLotteryResult_IdAndDeletedAtIsNullOrderByPrizeStructure_DisplayOrderAscWinningNumberAsc(
                                    resultId
                            )
            );
            result.setStatus(LotteryResultStatus.PENDING);
            result.setOfficial(false);
            result.setSource(LotteryStationSourceType.DEFAULT.value());
            result.setPublishedAt(null);
            result.setUpdatedAt(now);
            lotteryResultRepository.save(result);
        }

        if (!fakeResultIds.isEmpty()) {
            lotteryResultDetailRepository.flush();
            log.info(
                    "Win50 payout seed: released {} lottery result(s) faked by an older run; they will be re-synced from the official source.",
                    fakeResultIds.size()
            );
        }
    }

    private static Win50PayoutSeedCatalog.DrawResultKey drawKeyOf(LotteryTicketSerialEntity serial) {
        LotteryTicketEntity ticket = serial.getTicket();
        return new Win50PayoutSeedCatalog.DrawResultKey(ticket.getStation().getId(), ticket.getDrawDate());
    }

    private List<LotteryTicketSerialEntity> loadClaimableInventory() {
        LocalDate today = vietnamClock.today();
        return loadClaimableInventory(today.minusDays(MAX_LOOKBACK_DAYS), today.minusDays(1));
    }

    private List<LotteryTicketSerialEntity> loadClaimableInventory(LocalDate fromInclusive, LocalDate toInclusive) {
        return lotteryTicketSerialRepository
                .findBySerialNumberStartingWithAndDeletedAtIsNull(SharedSeedConstants.INVENTORY_SERIAL_PREFIX)
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
                        && serial.getTicket().getStation() != null
                        && SouthernStationSeedSupport.isCanonicalSouthern(serial.getTicket().getStation()))
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
            Map<Win50PayoutSeedCatalog.DrawResultKey, Map<String, List<String>>> drawResults
    ) {
        // One serial per ticket id so we do not double-claim.
        Map<Long, LotteryTicketSerialEntity> byTicketId = new LinkedHashMap<>();
        for (LotteryTicketSerialEntity serial : pool) {
            byTicketId.putIfAbsent(serial.getTicket().getId(), serial);
        }
        List<LotteryTicketSerialEntity> unique = new ArrayList<>(byTicketId.values());

        Map<Win50PayoutSeedCatalog.DrawResultKey, List<LotteryTicketSerialEntity>> byDraw = new LinkedHashMap<>();
        for (LotteryTicketSerialEntity serial : unique) {
            byDraw.computeIfAbsent(drawKeyOf(serial), ignored -> new ArrayList<>()).add(serial);
        }
        if (byDraw.isEmpty()) {
            return List.of();
        }

        List<Win50PayoutSeedCatalog.DrawResultKey> drawKeys = new ArrayList<>(byDraw.keySet());
        drawKeys.sort(Comparator
                .comparing(Win50PayoutSeedCatalog.DrawResultKey::drawDate)
                .thenComparing(Win50PayoutSeedCatalog.DrawResultKey::stationId));

        List<ClaimedWinner> winners = new ArrayList<>();
        Set<Long> usedTicketIds = new HashSet<>();
        Set<String> usedDbSlots = new HashSet<>();
        int dayI = 0;
        int idx = 0;

        for (int prizeOrd = 0; prizeOrd < Win50PayoutSeedCatalog.PRIZES.size(); prizeOrd++) {
            String prize = Win50PayoutSeedCatalog.PRIZES.get(prizeOrd);
            int count = Win50PayoutSeedCatalog.PRIZE_COUNTS[prizeOrd];
            for (int variant = 0; variant < count; variant++) {
                boolean placed = false;
                for (int attempt = 0; attempt < 500 && !placed; attempt++) {
                    Win50PayoutSeedCatalog.DrawResultKey key =
                            drawKeys.get((dayI + attempt) % drawKeys.size());
                    List<LotteryTicketSerialEntity> candidates = byDraw.get(key);
                    if (candidates == null || candidates.isEmpty()) {
                        continue;
                    }
                    Map<String, List<String>> results = drawResults.get(key);
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
                        candidateNumbers = results.get("DB").get(0);
                    } else {
                        List<String> wins = ("DB_PHU".equals(prize) || "KK".equals(prize))
                                ? results.get("DB")
                                : results.get(prize);
                        String base = wins.get(variant % wins.size());
                        candidateNumbers = Win50PayoutSeedCatalog.craftTicket(
                                prize, base, variant * 11 + attempt * 7 + dayI + 3
                        );
                    }
                    if (!Objects.equals(Win50PayoutSeedCatalog.firstPrize(candidateNumbers, results), prize)) {
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
                    ticket.setLastModifiedBy(Win50PayoutSeedCatalog.SEED_MARKER);
                    lotteryTicketRepository.save(ticket);

                    serial.setStatus(LotteryTicketSerialStatus.SOLD);
                    serial.setPayoutState(SerialPayoutState.NONE);
                    serial.setInputSource(serial.getInputSource() != null ? serial.getInputSource() : InputSource.MANUAL);
                    serial.setLastModifiedBy(Win50PayoutSeedCatalog.SEED_MARKER);
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
                .filter(w -> Win50PayoutSeedCatalog.ONLINE_CLAIMABLE.contains(w.prize()))
                .count();
        if (online != Win50PayoutSeedCatalog.EXPECTED_ONLINE_CLAIMABLE) {
            throw new IllegalStateException(
                    "WIN50_PAYOUT: expected "
                            + Win50PayoutSeedCatalog.EXPECTED_ONLINE_CLAIMABLE
                            + " online-claimable, got "
                            + online
            );
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

        for (Win50PayoutSeedCatalog.OrderPlan plan : Win50PayoutSeedCatalog.ORDER_PLANS) {
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
            String orderCode = Win50PayoutSeedCatalog.ORDER_CODE_PREFIX + String.format("%03d", plan.orderN());
            BigDecimal total = TICKET_PRICE.multiply(BigDecimal.valueOf(plan.slots()));

            List<OrderDetailEntity> details = new ArrayList<>();
            for (ClaimedWinner winner : orderWinners) {
                boolean online = Win50PayoutSeedCatalog.ONLINE_CLAIMABLE.contains(winner.prize());
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
                        .createdBy(Win50PayoutSeedCatalog.SEED_MARKER)
                        .lastModifiedBy(Win50PayoutSeedCatalog.SEED_MARKER)
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
                    .createdBy(Win50PayoutSeedCatalog.SEED_MARKER)
                    .lastModifiedBy(Win50PayoutSeedCatalog.SEED_MARKER)
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
                    .paymentRef(Win50PayoutSeedCatalog.PAYMENT_REF_PREFIX + String.format("%03d", plan.orderN()))
                    .createdAt(paidAt)
                    .updatedAt(now)
                    .createdBy(Win50PayoutSeedCatalog.SEED_MARKER)
                    .lastModifiedBy(Win50PayoutSeedCatalog.SEED_MARKER)
                    .build();

            order.setOrderDetails(new ArrayList<>(details));
            order.setTransactions(new ArrayList<>(List.of(transaction)));
            orderRepository.save(order);
        }
    }

    private void resetPreviousOverlay(LocalDateTime now) {
        deleteOrdersByPrefix(Win50PayoutSeedCatalog.ORDER_CODE_PREFIX);
        deleteOrdersByPrefix(Win50PayoutSeedCatalog.LEGACY_ORDER_PREFIX);

        // Revert IBSEED serials previously claimed by this overlay.
        List<LotteryTicketSerialEntity> marked = lotteryTicketSerialRepository
                .findBySerialNumberStartingWithAndDeletedAtIsNull(SharedSeedConstants.INVENTORY_SERIAL_PREFIX)
                .stream()
                .filter(serial -> Win50PayoutSeedCatalog.SEED_MARKER.equals(serial.getLastModifiedBy())
                        || Win50PayoutSeedCatalog.LEGACY_MARKER.equals(serial.getLastModifiedBy()))
                .toList();
        for (LotteryTicketSerialEntity serial : marked) {
            serial.setStatus(LotteryTicketSerialStatus.IN_STOCK);
            serial.setPayoutState(SerialPayoutState.NONE);
            serial.setLastModifiedBy(SharedSeedConstants.INVENTORY_ACTOR);
            serial.setUpdatedAt(now);
            if (serial.getTicket() != null) {
                LotteryTicketEntity ticket = serial.getTicket();
                ticket.setStatus(LotteryTicketStatus.IN_STOCK);
                ticket.setActive(true);
                ticket.setLastModifiedBy(SharedSeedConstants.INVENTORY_ACTOR);
                ticket.setUpdatedAt(now);
                lotteryTicketRepository.save(ticket);
            }
            lotteryTicketSerialRepository.save(serial);
        }

        // Hard-delete legacy parallel p123 universe if still present.
        List<LotteryTicketSerialEntity> legacySerials =
                lotteryTicketSerialRepository.findBySerialNumberStartingWith(
                        Win50PayoutSeedCatalog.LEGACY_SERIAL_PREFIX
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
        for (String code : Win50PayoutSeedCatalog.PRIZES) {
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
