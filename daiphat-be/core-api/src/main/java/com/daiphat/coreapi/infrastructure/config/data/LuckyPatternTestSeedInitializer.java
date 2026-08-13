package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.config.VendorTestSeedProperties;
import com.daiphat.coreapi.application.port.in.streetagent.LuckyPatternConfigServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.LuckyPatternConfigEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.LuckyPatternConfigRepository;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Dev-only fixture: lucky pattern configs + a few matching tickets/serials for
 * vendor allocation override tests. Runs after {@link VendorTestTicketSeedInitializer}
 * and finishes with {@code recomputeAll} so {@code is_lucky} matches production tagging.
 */
@Component
@Order(110)
@ConditionalOnProperty(
        value = "daiphat.vendor.test-seed.enabled",
        havingValue = "true"
)
@Slf4j
public class LuckyPatternTestSeedInitializer implements ApplicationRunner {

    private static final String SUPPLIER_CODE = "LOCAL-LUCKY-TEST";
    private static final String BATCH_PREFIX = "LOCAL-LUCKY-";

    private final LuckyPatternConfigRepository luckyPatternConfigRepository;
    private final LuckyPatternConfigServicePort luckyPatternConfigService;
    private final LotteryStationRepository stationRepository;
    private final LotterySupplierRepository supplierRepository;
    private final ImportBatchRepository importBatchRepository;
    private final ImportBatchLineRepository importBatchLineRepository;
    private final LotteryTicketRepository ticketRepository;
    private final LotteryTicketSerialRepository serialRepository;
    private final UserRepository userRepository;
    private final TransactionTemplate transaction;
    private final VendorTestSeedProperties properties;
    private final VietnamClock vietnamClock;

    public LuckyPatternTestSeedInitializer(
            LuckyPatternConfigRepository luckyPatternConfigRepository,
            LuckyPatternConfigServicePort luckyPatternConfigService,
            LotteryStationRepository stationRepository,
            LotterySupplierRepository supplierRepository,
            ImportBatchRepository importBatchRepository,
            ImportBatchLineRepository importBatchLineRepository,
            LotteryTicketRepository ticketRepository,
            LotteryTicketSerialRepository serialRepository,
            UserRepository userRepository,
            PlatformTransactionManager transactionManager,
            VendorTestSeedProperties properties,
            VietnamClock vietnamClock
    ) {
        this.luckyPatternConfigRepository = luckyPatternConfigRepository;
        this.luckyPatternConfigService = luckyPatternConfigService;
        this.stationRepository = stationRepository;
        this.supplierRepository = supplierRepository;
        this.importBatchRepository = importBatchRepository;
        this.importBatchLineRepository = importBatchLineRepository;
        this.ticketRepository = ticketRepository;
        this.serialRepository = serialRepository;
        this.userRepository = userRepository;
        this.transaction = new TransactionTemplate(transactionManager);
        this.properties = properties;
        this.vietnamClock = vietnamClock;
    }

    @Override
    public void run(ApplicationArguments args) {
        transaction.executeWithoutResult(status -> {
            seedPatterns();
            LocalDate today = vietnamClock.today();
            seedTickets(today);
            seedTickets(today.plusDays(properties.getFutureDays()));
        });
        // Tag after commit so patterns + serials are visible; mirrors config create/update.
        luckyPatternConfigService.recomputeAll();
        log.info("Lucky pattern test seed finished (patterns + tickets + recompute).");
    }

    private void seedPatterns() {
        Map<String, LuckyPatternConfigEntity> existingByName = luckyPatternConfigRepository.findAll().stream()
                .collect(Collectors.toMap(LuckyPatternConfigEntity::getName, Function.identity(), (a, b) -> a));

        int created = 0;
        for (LuckyPatternTestSeedCatalog.PatternSeed seed : LuckyPatternTestSeedCatalog.patterns()) {
            if (existingByName.containsKey(seed.name())) {
                continue;
            }
            luckyPatternConfigRepository.save(LuckyPatternConfigEntity.builder()
                    .patternType(seed.patternType())
                    .exactNumbers(seed.exactNumbers())
                    .matchDigits(seed.matchDigits())
                    .matchPosition(seed.matchPosition())
                    .name(seed.name())
                    .description(seed.description())
                    .badgeLabel(seed.badgeLabel())
                    .badgeColor(seed.badgeColor())
                    .priority(seed.priority())
                    .active(true)
                    .createdBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                    .lastModifiedBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                    .build());
            created++;
        }
        log.info("Lucky pattern config seed: {} created, catalog size={}.",
                created, LuckyPatternTestSeedCatalog.patterns().size());
    }

    private void seedTickets(LocalDate drawDate) {
        UserEntity actor = userRepository.findAll().stream().findFirst().orElse(null);
        if (actor == null) {
            log.warn("Skip lucky ticket seed: no user exists yet.");
            return;
        }

        List<LotteryStationEntity> stations = resolveStations(drawDate);
        if (stations.isEmpty()) {
            log.warn("Skip lucky ticket seed: no active station for {}.", drawDate);
            return;
        }

        LocalDateTime now = vietnamClock.now();
        LotterySupplierEntity supplier = supplierRepository
                .findByCodeIgnoreCaseAndDeletedAtIsNull(SUPPLIER_CODE)
                .orElseGet(() -> supplierRepository.save(LotterySupplierEntity.builder()
                        .name("Nhà cung cấp test số đẹp local")
                        .code(SUPPLIER_CODE)
                        .type(LotterySupplierType.DISTRIBUTOR)
                        .contactName("Local Lucky Test")
                        .contactPhone("0900000068")
                        .address("LOCAL")
                        .paymentTermDays(0)
                        .defaultImportCost(properties.getFaceValue())
                        .importAllowFrom(properties.getSupplierImportAllowedFrom())
                        .returnCutOffTime(properties.getSupplierReturnCutoff())
                        .isActive(true)
                        .createdBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                        .lastModifiedBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                        .build()));

        String batchCode = BATCH_PREFIX + drawDate.toString().replace("-", "");
        ImportBatchEntity batch = importBatchRepository
                .findByBatchCodeAndDeletedAtIsNull(batchCode)
                .orElseGet(() -> importBatchRepository.save(ImportBatchEntity.builder()
                        .batchCode(batchCode)
                        .drawDate(drawDate)
                        .supplier(supplier)
                        .importMode(ImportBatchImportMode.IN_DAY)
                        .importedBy(actor)
                        .importedAt(now)
                        .status(ImportBatchStatus.IMPORTED)
                        .completedAt(now)
                        .note("Local fixture for lucky pattern / vendor override.")
                        .createdBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                        .lastModifiedBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                        .build()));

        Set<String> existingLuckySerials = serialRepository
                .findBySerialNumberStartingWithAndDeletedAtIsNull(LuckyPatternTestSeedCatalog.SERIAL_PREFIX)
                .stream()
                .map(LotteryTicketSerialEntity::getSerialNumber)
                .collect(Collectors.toCollection(HashSet::new));

        int createdSerials = 0;
        for (LotteryStationEntity station : stations) {
            String lineCode = batchCode + "-" + station.getId();
            ImportBatchLineEntity line = importBatchLineRepository
                    .findByBatchCodeAndDeletedAtIsNull(lineCode)
                    .orElseGet(() -> importBatchLineRepository.save(ImportBatchLineEntity.builder()
                            .importBatch(batch)
                            .lotteryStation(station)
                            .batchType(ImportBatchType.NEW)
                            .batchCode(lineCode)
                            .declareQuantity(LuckyPatternTestSeedCatalog.tickets().size())
                            .declaredCostValue(properties.getFaceValue()
                                    .multiply(BigDecimal.valueOf(LuckyPatternTestSeedCatalog.tickets().size())))
                            .totalQuantity(0)
                            .importCost(properties.getFaceValue())
                            .totalCostValue(BigDecimal.ZERO)
                            .status(ImportBatchLineStatus.IMPORTED)
                            .importedAt(now)
                            .createdBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                            .lastModifiedBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                            .build()));

            Map<String, LotteryTicketEntity> ticketsByNumber = ticketRepository
                    .findAllByStation_IdInAndDrawDateAndDeletedAtIsNull(List.of(station.getId()), drawDate)
                    .stream()
                    .collect(Collectors.toMap(LotteryTicketEntity::getNumbers, Function.identity(), (a, b) -> a));

            int stationCreated = 0;
            for (LuckyPatternTestSeedCatalog.TicketSeed ticketSeed : LuckyPatternTestSeedCatalog.tickets()) {
                String numbers = ticketSeed.numbers();
                LotteryTicketEntity ticket = ticketsByNumber.get(numbers);
                if (ticket == null) {
                    ticket = ticketRepository.save(LotteryTicketEntity.builder()
                            .station(station)
                            .numbers(numbers)
                            .drawDate(drawDate)
                            .batchCode(lineCode)
                            .priceSnapshot(properties.getFaceValue())
                            .status(LotteryTicketStatus.IN_STOCK)
                            .active(true)
                            .createdBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                            .lastModifiedBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                            .build());
                    ticketsByNumber.put(numbers, ticket);
                }

                String serialBase = LuckyPatternTestSeedCatalog.SERIAL_PREFIX
                        + drawDate.toString().replace("-", "")
                        + "-" + station.getId() + "-" + numbers;

                // Two physical copies per number so override qty is easy to exercise.
                for (int copy = 1; copy <= 2; copy++) {
                    String copySerial = serialBase + "-" + copy;
                    if (!existingLuckySerials.add(copySerial)) {
                        continue;
                    }
                    serialRepository.save(LotteryTicketSerialEntity.builder()
                            .ticket(ticket)
                            .importBatch(batch)
                            .importBatchLine(line)
                            .serialNumber(copySerial)
                            .stationId(station.getId())
                            .drawDate(drawDate)
                            .status(LotteryTicketSerialStatus.IN_STOCK)
                            .ticketCondition(TicketCondition.GOOD)
                            .inputSource(InputSource.MANUAL)
                            .importedBy(actor)
                            .importedAt(now)
                            .verified(true)
                            .createdBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                            .lastModifiedBy(LuckyPatternTestSeedCatalog.SEED_MARKER)
                            .build());
                    createdSerials++;
                    stationCreated++;
                }
            }

            int totalQty = LuckyPatternTestSeedCatalog.tickets().size() * 2;
            line.setTotalQuantity(totalQty);
            line.setTotalCostValue(properties.getFaceValue().multiply(BigDecimal.valueOf(totalQty)));
            line.setStatus(ImportBatchLineStatus.IMPORTED);
            line.setImportedAt(now);
            importBatchLineRepository.save(line);

            if (stationCreated > 0) {
                station.setInventoryCount((station.getInventoryCount() == null ? 0 : station.getInventoryCount()) + stationCreated);
                stationRepository.save(station);
            }
        }

        int expectedQty = stations.size() * LuckyPatternTestSeedCatalog.tickets().size() * 2;
        batch.setLineCount(stations.size());
        batch.setTotalDeclareQuantity(expectedQty);
        batch.setTotalDeclaredCostValue(properties.getFaceValue().multiply(BigDecimal.valueOf(expectedQty)));
        batch.setTotalImportedQuantity(expectedQty);
        batch.setTotalImportedCostValue(properties.getFaceValue().multiply(BigDecimal.valueOf(expectedQty)));
        batch.setStatus(ImportBatchStatus.IMPORTED);
        batch.setCompletedAt(now);
        importBatchRepository.save(batch);

        log.info("Lucky ticket seed: {} new serials across {} stations for {}.",
                createdSerials, stations.size(), drawDate);
    }

    private List<LotteryStationEntity> resolveStations(LocalDate drawDate) {
        List<LotteryStationEntity> active = stationRepository.findAll().stream()
                .filter(station -> station.getDeletedAt() == null)
                .filter(LotteryStationEntity::isActive)
                .sorted(Comparator.comparing(LotteryStationEntity::getId))
                .toList();
        DayOfWeek drawDay = drawDate.getDayOfWeek();
        List<LotteryStationEntity> scheduled = active.stream()
                .filter(station -> station.getDrawDays() != null && station.getDrawDays().contains(drawDay))
                .limit(Math.min(2, properties.getStationLimit()))
                .toList();
        if (!scheduled.isEmpty()) {
            return scheduled;
        }
        return active.stream().limit(Math.min(2, properties.getStationLimit())).toList();
    }
}
