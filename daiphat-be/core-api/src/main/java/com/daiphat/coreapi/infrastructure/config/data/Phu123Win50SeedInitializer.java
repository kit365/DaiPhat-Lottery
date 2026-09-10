package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.infrastructure.persistence.entity.auth.RoleEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.TransactionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.RoleRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryResultDetailRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryResultRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeStructureRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Local fixture: 50 winning tickets for {@code phu123} across the last 5 VN draw days,
 * with lottery results, import batches, and 12 COMPLETED online orders
 * (30 {@code PROXY_HOLDING} / 20 {@code HANDED_OVER}).
 * <p>
 * Replaces the former SQL scripts under {@code scripts/local-seed/*phu123*win50*}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.lottery.seed.win50-phu123.enabled", havingValue = "true")
@Order(125)
public class Phu123Win50SeedInitializer implements ApplicationRunner {

    private static final BigDecimal TICKET_PRICE = BigDecimal.valueOf(10_000);
    private static final BigDecimal IMPORT_COST = new BigDecimal("9500.000");
    private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LotteryStationRepository lotteryStationRepository;
    private final LotterySupplierRepository lotterySupplierRepository;
    private final PrizeStructureRepository prizeStructureRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final ImportBatchRepository importBatchRepository;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final LotteryResultRepository lotteryResultRepository;
    private final LotteryResultDetailRepository lotteryResultDetailRepository;
    private final OrderRepository orderRepository;
    private final LotterySerialSeedCleanup lotterySerialSeedCleanup;
    private final VietnamClock vietnamClock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        RoleEntity memberRole = roleRepository.findByCode(RoleConstants.ROLE_MEMBER).orElse(null);
        if (memberRole == null) {
            log.warn("Skip PHU123 WIN50 seed: ROLE_MEMBER missing.");
            return;
        }

        LocalDateTime now = vietnamClock.now();
        LocalDate today = vietnamClock.today();

        UserEntity customer = ensureCustomer(memberRole, now);
        UserEntity actor = userRepository.findAll().stream()
                .filter(user -> user.getDeletedAt() == null)
                .min(Comparator.comparing(UserEntity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(UserEntity::getId))
                .orElse(null);
        if (actor == null) {
            log.warn("Skip PHU123 WIN50 seed: no actor user found.");
            return;
        }

        LotterySupplierEntity supplier = resolveSupplier();
        if (supplier == null) {
            log.warn("Skip PHU123 WIN50 seed: supplier MINH_CHINH/MINHCHINH not found.");
            return;
        }

        Map<String, PrizeStructureEntity> prizeByCode = loadPrizeStructures();
        if (prizeByCode.size() < Phu123Win50SeedCatalog.PRIZES.size()) {
            log.warn("Skip PHU123 WIN50 seed: missing prize_structures (found {}).", prizeByCode.size());
            return;
        }

        List<LotteryStationEntity> activeStations = lotteryStationRepository.findAll().stream()
                .filter(station -> station.getDeletedAt() == null)
                .filter(LotteryStationEntity::isActive)
                .sorted(Comparator.comparing(LotteryStationEntity::getId))
                .toList();
        if (activeStations.isEmpty()) {
            log.warn("Skip PHU123 WIN50 seed: no active lottery stations.");
            return;
        }

        resetPreviousSeedData();

        Map<Phu123Win50SeedCatalog.DrawResultKey, Map<String, String>> drawResults = new LinkedHashMap<>();
        Map<Phu123Win50SeedCatalog.DrawResultKey, String> stationCodes = new LinkedHashMap<>();

        for (int dayOffset = 1; dayOffset <= 5; dayOffset++) {
            LocalDate drawDate = today.minusDays(dayOffset);
            List<LotteryStationEntity> dayStations = activeStations.stream()
                    .filter(station -> station.getDrawDays() != null
                            && station.getDrawDays().contains(drawDate.getDayOfWeek()))
                    .toList();
            if (dayStations.isEmpty()) {
                throw new IllegalStateException(
                        "PHU123_WIN50: no stations draw on " + drawDate + " (" + drawDate.getDayOfWeek() + ")."
                );
            }
            for (LotteryStationEntity station : dayStations) {
                Phu123Win50SeedCatalog.DrawResultKey key =
                        new Phu123Win50SeedCatalog.DrawResultKey(station.getId(), drawDate);
                drawResults.put(key, Phu123Win50SeedCatalog.buildResults(station.getId(), drawDate));
                stationCodes.put(key, resolveStationCode(station));
            }
        }

        List<Phu123Win50SeedCatalog.DrawResultKey> drawKeys = new ArrayList<>(drawResults.keySet());
        drawKeys.sort(Comparator
                .comparing(Phu123Win50SeedCatalog.DrawResultKey::drawDate)
                .thenComparing(Phu123Win50SeedCatalog.DrawResultKey::stationId));

        List<Phu123Win50SeedCatalog.Winner> winners = placeWinners(drawKeys, drawResults, stationCodes);
        Map<String, LotteryTicketSerialEntity> serialByNumber =
                persistInventory(winners, drawResults, supplier, actor, prizeByCode, now);
        persistOrders(winners, serialByNumber, customer, actor, now);

        log.info(
                "PHU123 WIN50 seed complete: 50 winners (30 online) for {} across 12 orders.",
                Phu123Win50SeedCatalog.EMAIL
        );
    }

    private UserEntity ensureCustomer(RoleEntity memberRole, LocalDateTime now) {
        Optional<UserEntity> existing = userRepository.findByUsernameIgnoreCase(Phu123Win50SeedCatalog.USERNAME);
        if (existing.isEmpty()) {
            existing = userRepository.findByEmailIgnoreCase(Phu123Win50SeedCatalog.EMAIL);
        }
        if (existing.isPresent()) {
            return existing.get();
        }

        UserEntity created = UserEntity.builder()
                .role(memberRole)
                .username(Phu123Win50SeedCatalog.USERNAME)
                .email(Phu123Win50SeedCatalog.EMAIL)
                .phone(Phu123Win50SeedCatalog.PHONE)
                .firstName(Phu123Win50SeedCatalog.FIRST_NAME)
                .lastName(Phu123Win50SeedCatalog.LAST_NAME)
                .status("ACTIVE")
                .emailVerified(true)
                .twoFactorEnabled(false)
                .agreedToTerms(true)
                .hasPassword(true)
                .password(passwordEncoder.encode(Phu123Win50SeedCatalog.DEFAULT_PASSWORD))
                .failedLoginAttempts(0)
                .authVersion(0)
                .createdAt(now)
                .updatedAt(now)
                .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                .build();
        created = userRepository.save(created);
        log.info(
                "PHU123 WIN50: created user {} ({}) default password {}",
                Phu123Win50SeedCatalog.USERNAME,
                Phu123Win50SeedCatalog.EMAIL,
                Phu123Win50SeedCatalog.DEFAULT_PASSWORD
        );
        return created;
    }

    private LotterySupplierEntity resolveSupplier() {
        return lotterySupplierRepository.findByCodeIgnoreCaseAndDeletedAtIsNull("MINH_CHINH")
                .or(() -> lotterySupplierRepository.findByCodeIgnoreCaseAndDeletedAtIsNull("MINHCHINH"))
                .orElse(null);
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
        for (String code : Phu123Win50SeedCatalog.PRIZES) {
            PrizeStructureEntity entity = byCode.get(code);
            if (entity != null) {
                filtered.put(code, entity);
            }
        }
        return filtered;
    }

    private List<Phu123Win50SeedCatalog.Winner> placeWinners(
            List<Phu123Win50SeedCatalog.DrawResultKey> drawKeys,
            Map<Phu123Win50SeedCatalog.DrawResultKey, Map<String, String>> drawResults,
            Map<Phu123Win50SeedCatalog.DrawResultKey, String> stationCodes
    ) {
        List<Phu123Win50SeedCatalog.Winner> winners = new ArrayList<>();
        Set<String> usedNumbers = new HashSet<>();
        Set<String> usedDbSlots = new HashSet<>();
        int dayI = 0;
        int idx = 0;

        for (int prizeOrd = 0; prizeOrd < Phu123Win50SeedCatalog.PRIZES.size(); prizeOrd++) {
            String prize = Phu123Win50SeedCatalog.PRIZES.get(prizeOrd);
            int count = Phu123Win50SeedCatalog.PRIZE_COUNTS[prizeOrd];
            for (int variant = 0; variant < count; variant++) {
                boolean placed = false;
                for (int attempt = 0; attempt < 400; attempt++) {
                    Phu123Win50SeedCatalog.DrawResultKey key =
                            drawKeys.get((dayI + attempt) % drawKeys.size());
                    Map<String, String> results = drawResults.get(key);
                    String stationCode = stationCodes.get(key);
                    String candidate;
                    if ("DB".equals(prize)) {
                        candidate = results.get("DB");
                        String dbSlot = key.stationId() + ":" + key.drawDate();
                        if (usedDbSlots.contains(dbSlot)) {
                            continue;
                        }
                    } else {
                        String base = ("DB_PHU".equals(prize) || "KK".equals(prize))
                                ? results.get("DB")
                                : results.get(prize);
                        candidate = Phu123Win50SeedCatalog.craftTicket(
                                prize, base, variant * 11 + attempt * 7 + dayI + 3
                        );
                    }

                    if (!Objects.equals(Phu123Win50SeedCatalog.firstPrize(candidate, results), prize)) {
                        continue;
                    }
                    String numberKey = key.stationId() + ":" + key.drawDate() + ":" + candidate;
                    if (!usedNumbers.add(numberKey)) {
                        continue;
                    }
                    if (lotteryTicketRepository.existsByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(
                            key.stationId(), candidate, key.drawDate()
                    )) {
                        usedNumbers.remove(numberKey);
                        continue;
                    }

                    if ("DB".equals(prize)) {
                        usedDbSlots.add(key.stationId() + ":" + key.drawDate());
                    }

                    idx++;
                    String serial = Phu123Win50SeedCatalog.buildSerial(
                            key.drawDate(), stationCode, idx, candidate
                    );
                    winners.add(new Phu123Win50SeedCatalog.Winner(
                            idx, key.stationId(), stationCode, key.drawDate(), candidate, prize, serial
                    ));
                    placed = true;
                    dayI++;
                    break;
                }
                if (!placed) {
                    throw new IllegalStateException(
                            "PHU123_WIN50: could not place winner " + prize + " variant=" + variant
                    );
                }
            }
        }

        if (winners.size() != 50) {
            throw new IllegalStateException("PHU123_WIN50: expected 50 winners, got " + winners.size());
        }

        Map<String, Long> byPrize = winners.stream()
                .collect(Collectors.groupingBy(Phu123Win50SeedCatalog.Winner::prize, Collectors.counting()));
        for (Map.Entry<String, Long> entry : byPrize.entrySet()) {
            if (entry.getValue() < 3) {
                throw new IllegalStateException("PHU123_WIN50: each prize must have at least 3 winners.");
            }
        }

        long onlineCount = winners.stream()
                .filter(winner -> Phu123Win50SeedCatalog.ONLINE_CLAIMABLE.contains(winner.prize()))
                .count();
        if (onlineCount != 30) {
            throw new IllegalStateException(
                    "PHU123_WIN50: expected 30 online-claimable tickets, got " + onlineCount
            );
        }
        return winners;
    }

    private Map<String, LotteryTicketSerialEntity> persistInventory(
            List<Phu123Win50SeedCatalog.Winner> winners,
            Map<Phu123Win50SeedCatalog.DrawResultKey, Map<String, String>> drawResults,
            LotterySupplierEntity supplier,
            UserEntity actor,
            Map<String, PrizeStructureEntity> prizeByCode,
            LocalDateTime now
    ) {
        Map<String, LotteryTicketSerialEntity> serialByNumber = new HashMap<>();
        Map<LocalDate, List<Phu123Win50SeedCatalog.Winner>> byDraw = winners.stream()
                .collect(Collectors.groupingBy(
                        Phu123Win50SeedCatalog.Winner::drawDate,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        Map<Long, LotteryStationEntity> stationsById = lotteryStationRepository.findAll().stream()
                .filter(station -> station.getId() != null)
                .collect(Collectors.toMap(LotteryStationEntity::getId, station -> station, (a, b) -> a));

        for (Map.Entry<LocalDate, List<Phu123Win50SeedCatalog.Winner>> entry : byDraw.entrySet()) {
            LocalDate drawDate = entry.getKey();
            List<Phu123Win50SeedCatalog.Winner> dayWinners = entry.getValue();
            String compact = drawDate.format(BASIC_DATE);
            LocalDateTime importedAt = drawDate.atTime(LocalTime.of(9, 0));
            String batchCode = Phu123Win50SeedCatalog.BATCH_CODE_PREFIX + compact;
            String settlementCode = Phu123Win50SeedCatalog.SETTLEMENT_CODE_PREFIX + compact;

            Set<Long> stationIds = dayWinners.stream()
                    .map(Phu123Win50SeedCatalog.Winner::stationId)
                    .collect(Collectors.toCollection(HashSet::new));
            int qty = dayWinners.size();
            BigDecimal dayCost = IMPORT_COST.multiply(BigDecimal.valueOf(qty)).setScale(3, RoundingMode.HALF_UP);

            SupplierSettlementEntity settlement = supplierSettlementRepository
                    .findByLotterySupplier_IdAndPeriodFromAndDeletedAtIsNull(supplier.getId(), drawDate)
                    .orElseGet(() -> supplierSettlementRepository.save(SupplierSettlementEntity.builder()
                            .lotterySupplier(supplier)
                            .periodFrom(drawDate)
                            .periodTo(drawDate)
                            .supplierSettlementCode(settlementCode)
                            .totalImportValue(BigDecimal.ZERO)
                            .totalReturnValue(BigDecimal.ZERO)
                            .totalPaidAmount(BigDecimal.ZERO)
                            .remainingAmount(BigDecimal.ZERO)
                            .status(SupplierSettlementStatus.COMPLETED)
                            .reconciliationPhase(SupplierSettlementReconciliationPhase.COMPLETED)
                            .isReturnExpired(true)
                            .expiredReturnValue(BigDecimal.ZERO)
                            .originalTicketUnitPrice(IMPORT_COST)
                            .reconciledTicketUnitPrice(IMPORT_COST)
                            .discrepancyTypes(new ArrayList<>())
                            .discrepancyItems(new ArrayList<>())
                            .paymentEvidenceUrls(new ArrayList<>())
                            .stationCommissionSnapshots(new ArrayList<>())
                            .createdAt(now)
                            .updatedAt(now)
                            .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                            .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                            .build()));

            ImportBatchEntity batch = importBatchRepository.save(ImportBatchEntity.builder()
                    .batchCode(batchCode)
                    .drawDate(drawDate)
                    .supplier(supplier)
                    .supplierSettlementId(settlement.getId())
                    .importMode(ImportBatchImportMode.IN_DAY)
                    .invoiceEvidenceUrl("https://seed.local/phu123-win50/invoice.png")
                    .ticketListImageUrls(new ArrayList<>(List.of(
                            "https://seed.local/phu123-win50/ticket-list.png"
                    )))
                    .importedBy(actor)
                    .importedAt(importedAt)
                    .status(ImportBatchStatus.IMPORTED)
                    .lineCount(stationIds.size())
                    .totalDeclareQuantity(qty)
                    .totalDeclaredCostValue(dayCost)
                    .totalImportedQuantity(qty)
                    .totalImportedCostValue(dayCost)
                    .submittedAt(importedAt)
                    .completedAt(importedAt.plusMinutes(30))
                    .note("PHU123 WIN50 import batch")
                    .createdAt(now)
                    .updatedAt(now)
                    .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                    .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                    .build());

            Map<Long, List<Phu123Win50SeedCatalog.Winner>> byStation = dayWinners.stream()
                    .collect(Collectors.groupingBy(Phu123Win50SeedCatalog.Winner::stationId));

            List<ImportBatchLineEntity> lines = new ArrayList<>();
            Map<Long, String> lineCodeByStation = new HashMap<>();
            for (Long stationId : byStation.keySet().stream().sorted().toList()) {
                List<Phu123Win50SeedCatalog.Winner> stationWinners = byStation.get(stationId);
                LotteryStationEntity station = stationsById.get(stationId);
                if (station == null) {
                    throw new IllegalStateException("PHU123_WIN50: station missing id=" + stationId);
                }
                String stationCode = stationWinners.getFirst().stationCode();
                Map<String, String> results = drawResults.get(
                        new Phu123Win50SeedCatalog.DrawResultKey(stationId, drawDate)
                );

                upsertLotteryResult(station, drawDate, results, prizeByCode, now);

                int stationQty = stationWinners.size();
                BigDecimal stationCost = IMPORT_COST.multiply(BigDecimal.valueOf(stationQty))
                        .setScale(3, RoundingMode.HALF_UP);
                String lineCode = Phu123Win50SeedCatalog.LINE_CODE_PREFIX + compact + "-" + stationCode + "-NEW";
                lineCodeByStation.put(stationId, lineCode);

                lines.add(ImportBatchLineEntity.builder()
                        .importBatch(batch)
                        .lotteryStation(station)
                        .batchType(ImportBatchType.NEW)
                        .batchCode(lineCode)
                        .declareQuantity(stationQty)
                        .declaredCostValue(stationCost)
                        .totalQuantity(stationQty)
                        .importCost(IMPORT_COST)
                        .totalCostValue(stationCost)
                        .status(ImportBatchLineStatus.IMPORTED)
                        .importedAt(importedAt.plusMinutes(30))
                        .createdAt(now)
                        .updatedAt(now)
                        .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                        .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                        .build());
            }

            batch.setLines(lines);
            batch = importBatchRepository.save(batch);
            Map<Long, ImportBatchLineEntity> lineByStationId = batch.getLines().stream()
                    .collect(Collectors.toMap(
                            line -> line.getLotteryStation().getId(),
                            line -> line,
                            (a, b) -> a
                    ));

            for (Long stationId : byStation.keySet().stream().sorted().toList()) {
                LotteryStationEntity station = stationsById.get(stationId);
                ImportBatchLineEntity line = lineByStationId.get(stationId);
                String lineCode = lineCodeByStation.get(stationId);
                for (Phu123Win50SeedCatalog.Winner winner : byStation.get(stationId).stream()
                        .sorted(Comparator.comparingInt(Phu123Win50SeedCatalog.Winner::idx))
                        .toList()) {
                    LotteryTicketEntity ticket = lotteryTicketRepository.save(LotteryTicketEntity.builder()
                            .station(station)
                            .numbers(winner.numbers())
                            .drawDate(winner.drawDate())
                            .priceSnapshot(TICKET_PRICE)
                            .status(LotteryTicketStatus.SOLD_OUT)
                            .active(false)
                            .batchCode(lineCode)
                            .createdAt(importedAt)
                            .updatedAt(now)
                            .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                            .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                            .build());

                    LotteryTicketSerialEntity serial = lotteryTicketSerialRepository.save(
                            LotteryTicketSerialEntity.builder()
                                    .ticket(ticket)
                                    .importBatch(batch)
                                    .importBatchLine(line)
                                    .serialNumber(winner.serial())
                                    .status(LotteryTicketSerialStatus.SOLD)
                                    .ticketCondition(TicketCondition.GOOD)
                                    .payoutState(SerialPayoutState.NONE)
                                    .inputSource(InputSource.MANUAL)
                                    .stationId(stationId)
                                    .drawDate(drawDate)
                                    .importedBy(actor)
                                    .importedAt(importedAt)
                                    .verified(true)
                                    .createdAt(now)
                                    .updatedAt(now)
                                    .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                                    .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                                    .build()
                    );
                    serialByNumber.put(serial.getSerialNumber(), serial);
                }
            }

            if (Phu123Win50SeedCatalog.SEED_MARKER.equals(settlement.getCreatedBy())) {
                BigDecimal currentImport = settlement.getTotalImportValue() == null
                        ? BigDecimal.ZERO
                        : settlement.getTotalImportValue();
                int currentQty = settlement.getSystemImportQuantity() == null
                        ? 0
                        : settlement.getSystemImportQuantity();
                BigDecimal currentSystemValue = settlement.getSystemImportValue() == null
                        ? BigDecimal.ZERO
                        : settlement.getSystemImportValue();
                settlement.setTotalImportValue(currentImport.add(dayCost));
                settlement.setSystemImportQuantity(currentQty + qty);
                settlement.setSystemImportValue(currentSystemValue.add(dayCost));
                settlement.setUpdatedAt(now);
                supplierSettlementRepository.save(settlement);
            }
        }
        return serialByNumber;
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
                        .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                        .build());

        result.setSource("MANUAL");
        result.setOfficial(true);
        result.setStatus(LotteryResultStatus.COMPLETED);
        result.setPublishedAt(drawDate.atTime(LocalTime.of(16, 35)));
        result.setDeletedAt(null);
        result.setUpdatedAt(now);
        result.setLastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER);
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
        for (String prizeCode : Phu123Win50SeedCatalog.RESULT_DETAIL_CODES) {
            details.add(LotteryResultDetailEntity.builder()
                    .lotteryResult(result)
                    .prizeStructure(prizeByCode.get(prizeCode))
                    .winningNumber(Phu123Win50SeedCatalog.padWin(prizeCode, results.get(prizeCode)))
                    .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                    .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                    .build());
        }
        for (String prizeCode : List.of("DB_PHU", "KK")) {
            details.add(LotteryResultDetailEntity.builder()
                    .lotteryResult(result)
                    .prizeStructure(prizeByCode.get(prizeCode))
                    .winningNumber(results.get("DB"))
                    .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                    .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                    .build());
        }
        lotteryResultDetailRepository.saveAll(details);
    }

    private void persistOrders(
            List<Phu123Win50SeedCatalog.Winner> winners,
            Map<String, LotteryTicketSerialEntity> serialByNumber,
            UserEntity customer,
            UserEntity actor,
            LocalDateTime now
    ) {
        for (Phu123Win50SeedCatalog.OrderPlan plan : Phu123Win50SeedCatalog.ORDER_PLANS) {
            List<Phu123Win50SeedCatalog.Winner> orderWinners = winners.stream()
                    .filter(winner -> winner.idx() > plan.cumStart() && winner.idx() <= plan.cumEnd())
                    .sorted(Comparator.comparingInt(Phu123Win50SeedCatalog.Winner::idx))
                    .toList();
            if (orderWinners.isEmpty()) {
                continue;
            }

            LocalDate minDraw = orderWinners.stream()
                    .map(Phu123Win50SeedCatalog.Winner::drawDate)
                    .min(LocalDate::compareTo)
                    .orElseThrow();
            LocalDateTime paidAt = minDraw.atTime(LocalTime.of(9, 45)).plusMinutes((plan.orderN() - 1L) * 17L);
            LocalDateTime pickupAt = minDraw.atTime(LocalTime.of(18, 10)).plusMinutes((plan.orderN() - 1L) * 9L);
            String orderCode = Phu123Win50SeedCatalog.ORDER_CODE_PREFIX + String.format("%03d", plan.orderN());
            BigDecimal total = TICKET_PRICE.multiply(BigDecimal.valueOf(plan.slots()));

            List<OrderDetailEntity> details = new ArrayList<>();
            for (Phu123Win50SeedCatalog.Winner winner : orderWinners) {
                LotteryTicketSerialEntity serial = serialByNumber.get(winner.serial());
                if (serial == null || serial.getTicket() == null) {
                    throw new IllegalStateException("PHU123_WIN50: missing serial " + winner.serial());
                }
                boolean online = Phu123Win50SeedCatalog.ONLINE_CLAIMABLE.contains(winner.prize());
                details.add(OrderDetailEntity.builder()
                        .lotteryTicket(serial.getTicket())
                        .lotteryTicketSerial(serial)
                        .quantity(1)
                        .price(TICKET_PRICE)
                        .status(online ? OrderDetailStatus.PROXY_HOLDING : OrderDetailStatus.HANDED_OVER)
                        .handedOverAt(online ? null : pickupAt)
                        .handedOverBy(online ? null : actor.getId())
                        .createdAt(paidAt)
                        .updatedAt(now)
                        .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                        .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                        .build());
            }

            OrderEntity order = OrderEntity.builder()
                    .user(customer)
                    .name(Phu123Win50SeedCatalog.FIRST_NAME + " " + Phu123Win50SeedCatalog.LAST_NAME)
                    .phone(Phu123Win50SeedCatalog.PHONE)
                    .email(Phu123Win50SeedCatalog.EMAIL)
                    .orderCode(orderCode)
                    .orderType(OrderType.ONLINE)
                    .receiveType(OrderReceiveType.COUNTER_PICKUP)
                    .totalAmount(total)
                    .status(OrderStatus.COMPLETED)
                    .expectedPickupAt(paidAt.plusHours(7))
                    .actualPickedUpAt(pickupAt)
                    .pickedUpBy(actor)
                    .createdAt(paidAt)
                    .updatedAt(now)
                    .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                    .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
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
                    .createdAt(paidAt)
                    .updatedAt(now)
                    .createdBy(Phu123Win50SeedCatalog.SEED_MARKER)
                    .lastModifiedBy(Phu123Win50SeedCatalog.SEED_MARKER)
                    .build();

            order.setOrderDetails(new ArrayList<>(details));
            order.setTransactions(new ArrayList<>(List.of(transaction)));
            orderRepository.save(order);
        }
    }

    private void resetPreviousSeedData() {
        List<OrderEntity> seedOrders =
                orderRepository.findByOrderCodeStartingWith(Phu123Win50SeedCatalog.ORDER_CODE_PREFIX);
        if (!seedOrders.isEmpty()) {
            orderRepository.deleteAll(seedOrders);
            orderRepository.flush();
        }

        List<LotteryTicketSerialEntity> seedSerials =
                lotteryTicketSerialRepository.findBySerialNumberStartingWith(Phu123Win50SeedCatalog.SERIAL_PREFIX);
        Set<Long> ticketIds = new HashSet<>();
        if (!seedSerials.isEmpty()) {
            List<Long> serialIds = seedSerials.stream().map(LotteryTicketSerialEntity::getId).toList();
            lotterySerialSeedCleanup.clearDependentsBeforeSerialDelete(serialIds);
            for (LotteryTicketSerialEntity serial : seedSerials) {
                if (serial.getTicket() != null && serial.getTicket().getId() != null) {
                    ticketIds.add(serial.getTicket().getId());
                }
                lotteryTicketSerialRepository.delete(serial);
            }
            lotteryTicketSerialRepository.flush();
        }

        for (Long ticketId : ticketIds) {
            if (lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId).isEmpty()) {
                lotteryTicketRepository.deleteById(ticketId);
            }
        }
        lotteryTicketRepository.flush();

        List<ImportBatchEntity> seedBatches = importBatchRepository
                .findByBatchCodeStartingWithAndDeletedAtIsNull(Phu123Win50SeedCatalog.BATCH_CODE_PREFIX);
        Set<Long> settlementIds = seedBatches.stream()
                .map(ImportBatchEntity::getSupplierSettlementId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
        for (ImportBatchEntity batch : seedBatches) {
            batch.setSupplierSettlementId(null);
        }
        if (!seedBatches.isEmpty()) {
            importBatchRepository.saveAll(seedBatches);
            importBatchRepository.flush();
            importBatchRepository.deleteAll(seedBatches);
            importBatchRepository.flush();
        }

        for (Long settlementId : settlementIds) {
            supplierSettlementRepository.findByIdAndDeletedAtIsNull(settlementId).ifPresent(settlement -> {
                if (Phu123Win50SeedCatalog.SEED_MARKER.equals(settlement.getCreatedBy())
                        || (settlement.getSupplierSettlementCode() != null
                        && settlement.getSupplierSettlementCode()
                        .startsWith(Phu123Win50SeedCatalog.SETTLEMENT_CODE_PREFIX))) {
                    supplierSettlementRepository.delete(settlement);
                }
            });
        }
        supplierSettlementRepository.flush();

        if (!seedOrders.isEmpty() || !seedSerials.isEmpty() || !seedBatches.isEmpty()) {
            log.info(
                    "Removed previous PHU123 WIN50 seed: orders={}, serials={}, batches={}.",
                    seedOrders.size(),
                    seedSerials.size(),
                    seedBatches.size()
            );
        }
    }

    private static String resolveStationCode(LotteryStationEntity station) {
        if (station.getCode() != null && !station.getCode().isBlank()) {
            return station.getCode();
        }
        return "S" + station.getId();
    }
}
