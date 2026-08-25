package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.AgentTicketStockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Seeds one NEW import batch per draw date (yesterday / today / tomorrow) for the
 * scheduled southern stations of that weekday. Ticket rows cover
 * {@link LotteryTicketStatus} + {@link TicketCondition} combinations; serials follow
 * current aggregate/expiry rules. Idempotent: only {@code PN-SEED-*} / {@code LO-SEED-*}
 * / {@code IBSEED-*} rows are replaced.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.lottery.seed.enabled", havingValue = "true")
@Order(110)
public class LotteryImportBatchSeedInitializer implements ApplicationRunner {

    private static final String SYSTEM_ACTOR = "import-batch-seed";
    private static final String SUPPLIER_CODE = "MINH_CHINH";
    private static final String SUPPLIER_NAME = "Minh Chính";
    private static final String HEADER_CODE_PREFIX = "PN-SEED-";
    private static final String LINE_CODE_PREFIX = "LO-SEED-";
    static final String SERIAL_PREFIX = "IBSEED-";
    private static final BigDecimal DEFAULT_IMPORT_COST = BigDecimal.valueOf(10_000);
    private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;
    private static final int MIN_TICKETS_PER_BATCH = 100;
    private static final int MAX_TICKETS_PER_BATCH = 200;
    private static final int NUMBER_CURSOR_START = 800_000;

    /**
     * One cycle covers every live ticket/serial/condition case. Future and in-day
     * sellable inventory weights {@link SeedTicketScenario#IN_STOCK_GOOD}.
     */
    private static final List<SeedTicketScenario> SEED_TICKET_SCENARIOS = List.of(
            SeedTicketScenario.IN_STOCK_GOOD,
            SeedTicketScenario.IN_STOCK_GOOD,
            SeedTicketScenario.PARTIAL_RESERVED,
            SeedTicketScenario.PARTIAL_SOLD,
            SeedTicketScenario.SOLD_OUT,
            SeedTicketScenario.DAMAGED_INTERNAL,
            SeedTicketScenario.LOST_ISSUER,
            SeedTicketScenario.VOIDED_ENTRY,
            SeedTicketScenario.MIXED_FAULT,
            SeedTicketScenario.ALL_FAULTY,
            SeedTicketScenario.PROXY_HOLDING,
            SeedTicketScenario.IN_STOCK_GOOD
    );

    private static final List<SeedTicketScenario> FUTURE_SELLABLE_SCENARIOS = List.of(
            SeedTicketScenario.IN_STOCK_GOOD,
            SeedTicketScenario.IN_STOCK_GOOD,
            SeedTicketScenario.IN_STOCK_GOOD,
            SeedTicketScenario.IN_STOCK_GOOD,
            SeedTicketScenario.PARTIAL_RESERVED,
            SeedTicketScenario.PARTIAL_SOLD,
            SeedTicketScenario.SOLD_OUT,
            SeedTicketScenario.DAMAGED_INTERNAL,
            SeedTicketScenario.LOST_ISSUER,
            SeedTicketScenario.VOIDED_ENTRY,
            SeedTicketScenario.MIXED_FAULT,
            SeedTicketScenario.PROXY_HOLDING
    );

    private final LotterySupplierRepository lotterySupplierRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final ImportBatchRepository importBatchRepository;
    private final ImportBatchLineRepository importBatchLineRepository;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final AgentTicketStockRepository agentTicketStockRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Value("${daiphat.lottery.seed.tickets-per-batch:150}")
    private int ticketsPerBatch;

    @Value("${daiphat.lottery.seed.serials-per-ticket:4}")
    private int serialsPerTicket;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserEntity operator = findSeedOperator();
        if (operator == null) {
            log.warn("Skip import-batch seed: no staff operator account found.");
            return;
        }

        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();

        resetPreviousSeedData();

        LotterySupplierEntity supplier = ensureSupplier(now);
        List<BatchPlan> plans = buildBatchPlans(today, now);
        if (plans.isEmpty()) {
            log.warn("Skip import-batch seed: no batch plans for current schedule.");
            return;
        }

        Map<String, Integer> numberCursorByStationDate = new HashMap<>();
        int batchCount = 0;
        int lineCount = 0;
        int ticketCount = 0;

        for (BatchPlan plan : plans) {
            List<LotteryStationEntity> stations = findIssuersForDrawDate(plan.drawDate());
            if (stations.isEmpty()) {
                log.info(
                        "Skip seed batch type={} drawDate={}: no active issuers scheduled.",
                        plan.batchType(),
                        plan.drawDate()
                );
                continue;
            }

            ImportBatchEntity batch = importBatchRepository.save(
                    createBatch(supplier, operator, plan, stations.size(), now)
            );

            List<ImportBatchLineEntity> lines = new ArrayList<>();
            for (LotteryStationEntity station : stations) {
                lines.add(createLine(batch, station, plan, now, 0));
            }
            batch.setLines(lines);
            batch.setLineCount(lines.size());
            batch = importBatchRepository.save(batch);

            int importedQty = 0;
            int batchTickets = 0;
            BigDecimal importedCost = BigDecimal.ZERO;
            int[] ticketsByStation = distributeTickets(stations.size());
            for (int stationIndex = 0; stationIndex < batch.getLines().size(); stationIndex++) {
                ImportBatchLineEntity line = batch.getLines().get(stationIndex);
                LotteryStationEntity station = line.getLotteryStation();
                int lineTickets = ticketsByStation[stationIndex];
                int createdSerials = seedTicketsForLine(
                        line,
                        station,
                        operator,
                        plan,
                        now,
                        lineTickets,
                        numberCursorByStationDate
                );
                int declareQty = createdSerials;
                line.setDeclareQuantity(declareQty);
                line.setDeclaredCostValue(DEFAULT_IMPORT_COST.multiply(BigDecimal.valueOf(declareQty)));
                line.setTotalQuantity(createdSerials);
                line.setTotalCostValue(line.getImportCost().multiply(BigDecimal.valueOf(createdSerials)));
                ImportBatchSeedStatusHelper.applyLineStatus(line, now);
                importedQty += createdSerials;
                importedCost = importedCost.add(line.getTotalCostValue());
                batchTickets += lineTickets;
                ticketCount += lineTickets;
                lineCount++;
            }

            batch.setTotalImportedQuantity(importedQty);
            batch.setTotalImportedCostValue(importedCost);
            batch.setTotalDeclareQuantity(importedQty);
            batch.setTotalDeclaredCostValue(importedCost);
            ImportBatchSeedStatusHelper.applyHeaderStatus(batch, batch.getLines(), now);
            importBatchRepository.save(batch);
            batchCount++;
            log.info(
                    "Seeded import batch {} drawDate={} type={} stations={} tickets={} serials={}.",
                    batch.getBatchCode(),
                    plan.drawDate(),
                    plan.batchType(),
                    stations.size(),
                    batchTickets,
                    importedQty
            );
        }

        lotteryTicketRepository.flush();
        log.info(
                "Import-batch seed complete: supplier={}, batches={}, lines={}, tickets={}, serialsPerTicket={}.",
                SUPPLIER_CODE,
                batchCount,
                lineCount,
                ticketCount,
                Math.max(serialsPerTicket, 1)
        );
    }

    private List<BatchPlan> buildBatchPlans(LocalDate today, LocalDateTime now) {
        LocalDate yesterday = today.minusDays(1);
        LocalDate tomorrow = today.plusDays(1);
        return List.of(
                new BatchPlan(
                        yesterday,
                        ImportBatchType.NEW,
                        ImportBatchImportMode.IN_DAY,
                        "SEED-NEW-YESTERDAY",
                        resolveImportedAt(yesterday, today, now)
                ),
                new BatchPlan(
                        today,
                        ImportBatchType.NEW,
                        ImportBatchImportMode.IN_DAY,
                        "SEED-NEW-TODAY",
                        resolveImportedAt(today, today, now)
                ),
                new BatchPlan(
                        tomorrow,
                        ImportBatchType.NEW,
                        ImportBatchImportMode.IN_DAY,
                        "SEED-NEW-TOMORROW",
                        resolveImportedAt(tomorrow, today, now)
                )
        );
    }

    /**
     * Historical timestamp: morning of the draw date for today/yesterday; today morning
     * when importing tomorrow's tickets. Never in the future.
     */
    private LocalDateTime resolveImportedAt(LocalDate drawDate, LocalDate today, LocalDateTime now) {
        LocalDateTime candidate = drawDate.isAfter(today)
                ? LocalDateTime.of(today, LocalTime.of(8, 40))
                : LocalDateTime.of(drawDate, LocalTime.of(8, 15));
        if (!candidate.isAfter(now)) {
            return candidate;
        }
        return now.minusMinutes(20);
    }

    private int[] distributeTickets(int stationCount) {
        int target = Math.min(MAX_TICKETS_PER_BATCH, Math.max(MIN_TICKETS_PER_BATCH, ticketsPerBatch));
        int[] counts = new int[stationCount];
        int base = target / stationCount;
        int remainder = target % stationCount;
        for (int i = 0; i < stationCount; i++) {
            counts[i] = Math.max(SEED_TICKET_SCENARIOS.size(), base + (i < remainder ? 1 : 0));
        }
        int total = 0;
        for (int count : counts) {
            total += count;
        }
        if (total > MAX_TICKETS_PER_BATCH) {
            int overflow = total - MAX_TICKETS_PER_BATCH;
            for (int i = counts.length - 1; i >= 0 && overflow > 0; i--) {
                int reducible = counts[i] - SEED_TICKET_SCENARIOS.size();
                int cut = Math.min(reducible, overflow);
                counts[i] -= cut;
                overflow -= cut;
            }
        }
        return counts;
    }

    private void resetPreviousSeedData() {
        List<ImportBatchEntity> seedBatches =
                importBatchRepository.findByBatchCodeStartingWithAndDeletedAtIsNull(HEADER_CODE_PREFIX);

        Set<Long> lineIds = new HashSet<>();
        for (ImportBatchEntity batch : seedBatches) {
            if (batch.getId() == null) {
                continue;
            }
            for (ImportBatchLineEntity line : importBatchLineRepository.findByImportBatch_Id(batch.getId())) {
                if (line.getId() != null) {
                    lineIds.add(line.getId());
                }
            }
        }

        Map<Long, LotteryTicketSerialEntity> serialsById = new HashMap<>();
        for (LotteryTicketSerialEntity serial : lotteryTicketSerialRepository.findBySerialNumberStartingWith(SERIAL_PREFIX)) {
            if (serial.getId() != null) {
                serialsById.put(serial.getId(), serial);
            }
        }
        if (!lineIds.isEmpty()) {
            for (LotteryTicketSerialEntity serial : lotteryTicketSerialRepository.findByImportBatchLine_IdIn(lineIds)) {
                if (serial.getId() != null) {
                    serialsById.put(serial.getId(), serial);
                }
            }
        }
        for (ImportBatchEntity batch : seedBatches) {
            if (batch.getId() == null) {
                continue;
            }
            for (LotteryTicketSerialEntity serial : lotteryTicketSerialRepository.findByImportBatch_Id(batch.getId())) {
                if (serial.getId() != null) {
                    serialsById.put(serial.getId(), serial);
                }
            }
        }

        List<LotteryTicketSerialEntity> seedSerials = new ArrayList<>(serialsById.values());
        Set<Long> ticketIds = new HashSet<>();
        if (!seedSerials.isEmpty()) {
            List<Long> seedSerialIds = seedSerials.stream().map(LotteryTicketSerialEntity::getId).toList();
            LotterySerialSeedCleanup.clearDependentsBeforeSerialDelete(
                    agentTicketStockRepository,
                    lotteryTicketSerialRepository,
                    seedSerialIds
            );

            for (LotteryTicketSerialEntity serial : seedSerials) {
                if (serial.getTicket() != null && serial.getTicket().getId() != null) {
                    ticketIds.add(serial.getTicket().getId());
                }
                lotteryTicketSerialRepository.delete(serial);
            }
            lotteryTicketSerialRepository.flush();
        }

        for (Long lineId : lineIds) {
            lotteryTicketSerialRepository.deleteByImportBatchLine_Id(lineId);
        }
        if (!lineIds.isEmpty()) {
            lotteryTicketSerialRepository.flush();
        }

        for (Long ticketId : ticketIds) {
            if (lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId).isEmpty()) {
                lotteryTicketRepository.deleteById(ticketId);
            }
        }
        lotteryTicketRepository.flush();

        if (!seedBatches.isEmpty()) {
            importBatchRepository.deleteAll(seedBatches);
            importBatchRepository.flush();
        }

        if (!seedSerials.isEmpty() || !seedBatches.isEmpty()) {
            log.info(
                    "Removed previous import-batch seed data: serials={}, batches={}.",
                    seedSerials.size(),
                    seedBatches.size()
            );
        }
    }

    private LotterySupplierEntity ensureSupplier(LocalDateTime now) {
        return lotterySupplierRepository.findByCodeIgnoreCaseAndDeletedAtIsNull(SUPPLIER_CODE)
                .map(existing -> {
                    existing.setName(SUPPLIER_NAME);
                    existing.setType(LotterySupplierType.DISTRIBUTOR);
                    existing.setContactName(SUPPLIER_NAME);
                    existing.setContactPhone("0909123456");
                    existing.setContactEmail("minhchinh@seed.local");
                    existing.setAddress("123 Nguyen Hue, Quan 1, TP.HCM");
                    existing.setTaxCode("0312345678");
                    existing.setPaymentTermDays(0);
                    existing.setDefaultImportCost(DEFAULT_IMPORT_COST);
                    existing.setImportAllowFrom(LocalTime.of(8, 0));
                    existing.setReturnCutOffTime(LocalTime.of(14, 30));
                    existing.setPaymentCutOffTime(LocalTime.of(18, 0));
                    existing.setActive(true);
                    existing.setUpdatedAt(now);
                    existing.setLastModifiedBy(SYSTEM_ACTOR);
                    return lotterySupplierRepository.save(existing);
                })
                .orElseGet(() -> lotterySupplierRepository.save(
                        LotterySupplierEntity.builder()
                                .name(SUPPLIER_NAME)
                                .code(SUPPLIER_CODE)
                                .type(LotterySupplierType.DISTRIBUTOR)
                                .contactName(SUPPLIER_NAME)
                                .contactPhone("0909123456")
                                .contactEmail("minhchinh@seed.local")
                                .address("123 Nguyen Hue, Quan 1, TP.HCM")
                                .taxCode("0312345678")
                                .paymentTermDays(0)
                                .defaultImportCost(DEFAULT_IMPORT_COST)
                                .importAllowFrom(LocalTime.of(8, 0))
                                .returnCutOffTime(LocalTime.of(14, 30))
                                .paymentCutOffTime(LocalTime.of(18, 0))
                                .isActive(true)
                                .createdAt(now)
                                .updatedAt(now)
                                .createdBy(SYSTEM_ACTOR)
                                .lastModifiedBy(SYSTEM_ACTOR)
                                .build()
                ));
    }

    private List<LotteryStationEntity> findIssuersForDrawDate(LocalDate drawDate) {
        DayOfWeek day = drawDate.getDayOfWeek();
        return lotteryStationRepository.findAll().stream()
                .filter(station -> station.getDeletedAt() == null)
                .filter(LotteryStationEntity::isActive)
                .filter(station -> station.getDrawDays() != null && station.getDrawDays().contains(day))
                .sorted((a, b) -> String.CASE_INSENSITIVE_ORDER.compare(
                        a.getName() != null ? a.getName() : "",
                        b.getName() != null ? b.getName() : ""
                ))
                .toList();
    }

    private ImportBatchEntity createBatch(
            LotterySupplierEntity supplier,
            UserEntity operator,
            BatchPlan plan,
            int stationCount,
            LocalDateTime now
    ) {
        String headerCode = HEADER_CODE_PREFIX
                + plan.drawDate().format(BASIC_DATE)
                + "-"
                + plan.batchType().name()
                + "-"
                + plan.suffix();
        LocalDateTime importedAt = plan.importedAt();

        return ImportBatchEntity.builder()
                .batchCode(headerCode)
                .drawDate(plan.drawDate())
                .supplier(supplier)
                .importMode(plan.importMode())
                .invoiceEvidenceUrl("https://picsum.photos/seed/" + headerCode + "-invoice/800/500")
                .ticketListImageUrls(new ArrayList<>(List.of(
                        "https://picsum.photos/seed/" + headerCode + "-list-1/800/500",
                        "https://picsum.photos/seed/" + headerCode + "-list-2/800/500"
                )))
                .importedBy(operator)
                .importedAt(importedAt)
                .status(ImportBatchStatus.IMPORTED)
                .lineCount(stationCount)
                .totalDeclareQuantity(0)
                .totalDeclaredCostValue(BigDecimal.ZERO)
                .totalImportedQuantity(0)
                .totalImportedCostValue(BigDecimal.ZERO)
                .submittedAt(importedAt)
                .completedAt(importedAt.plusMinutes(30))
                .note("Seed import batch (" + plan.batchType().name() + ") for draw " + plan.drawDate())
                .createdAt(importedAt)
                .updatedAt(now)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
    }

    private ImportBatchLineEntity createLine(
            ImportBatchEntity batch,
            LotteryStationEntity station,
            BatchPlan plan,
            LocalDateTime now,
            int declareQty
    ) {
        String stationCode = ImportBatchCodeHelper.toStationCode(station.getName());
        String lineCode = LINE_CODE_PREFIX
                + plan.drawDate().format(BASIC_DATE)
                + "-"
                + stationCode
                + "-"
                + ImportBatchCodeHelper.toTypeCode(plan.batchType())
                + "-"
                + plan.suffix();

        return ImportBatchLineEntity.builder()
                .importBatch(batch)
                .lotteryStation(station)
                .batchType(plan.batchType())
                .batchCode(lineCode)
                .declareQuantity(declareQty)
                .declaredCostValue(DEFAULT_IMPORT_COST.multiply(BigDecimal.valueOf(Math.max(declareQty, 0))))
                .totalQuantity(0)
                .importCost(DEFAULT_IMPORT_COST)
                .totalCostValue(BigDecimal.ZERO)
                .status(ImportBatchLineStatus.IMPORTED)
                .importedAt(plan.importedAt().plusMinutes(15))
                .createdAt(plan.importedAt())
                .updatedAt(now)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
    }

    private int seedTicketsForLine(
            ImportBatchLineEntity line,
            LotteryStationEntity station,
            UserEntity operator,
            BatchPlan plan,
            LocalDateTime now,
            int ticketCount,
            Map<String, Integer> numberCursorByStationDate
    ) {
        int serialCount = Math.max(serialsPerTicket, 1);
        boolean pastDraw = isPastDraw(station, plan.drawDate(), now);
        boolean futureDraw = plan.drawDate().isAfter(now.toLocalDate());
        List<SeedTicketScenario> scenarioCycle = futureDraw ? FUTURE_SELLABLE_SCENARIOS : SEED_TICKET_SCENARIOS;
        BigDecimal price = station.getPrice() != null ? station.getPrice() : DEFAULT_IMPORT_COST;
        String cursorKey = station.getId() + "|" + plan.drawDate();
        int createdSerials = 0;
        List<LotteryTicketSerialEntity> serialBuffer = new ArrayList<>(ticketCount * serialCount);

        for (int index = 0; index < ticketCount; index++) {
            SeedTicketScenario scenario = scenarioCycle.get(index % scenarioCycle.size());
            TicketSeedPlan ticketPlan = resolveTicketSeedPlan(scenario, pastDraw, serialCount);
            LotteryTicketStatus ticketStatus = ticketPlan.ticketStatus();
            List<SerialSeedSpec> serialSpecs = ticketPlan.serialSpecs();

            int numberValue = numberCursorByStationDate.compute(
                    cursorKey,
                    (key, current) -> current == null ? NUMBER_CURSOR_START : current + 1
            );
            String numbers = String.format("%06d", Math.floorMod(numberValue, 1_000_000));
            String ticketSeedKey = SERIAL_PREFIX
                    + plan.drawDate().format(BASIC_DATE)
                    + "-"
                    + station.getId()
                    + "-"
                    + ImportBatchCodeHelper.toTypeCode(line.getBatchType())
                    + "-"
                    + String.format("%03d", index + 1);

            LotteryTicketEntity ticket = lotteryTicketRepository.save(
                    LotteryTicketEntity.builder()
                            .station(station)
                            .ticketImg("https://picsum.photos/seed/" + ticketSeedKey + "/800/500")
                            .numbers(numbers)
                            .drawDate(plan.drawDate())
                            .batchCode(line.getBatchCode())
                            .priceSnapshot(price)
                            .status(ticketStatus)
                            .active(true)
                            .createdAt(plan.importedAt().plusMinutes(20))
                            .updatedAt(now)
                            .createdBy(SYSTEM_ACTOR)
                            .lastModifiedBy(SYSTEM_ACTOR)
                            .build()
            );

            for (int serialIndex = 0; serialIndex < serialSpecs.size(); serialIndex++) {
                SerialSeedSpec spec = serialSpecs.get(serialIndex);
                String serialNumber = ticketSeedKey + "-" + String.format("%02d", serialIndex + 1);
                serialBuffer.add(buildSeedSerial(
                        ticket,
                        line,
                        operator,
                        serialNumber,
                        spec,
                        plan.importedAt().plusMinutes(20),
                        now
                ));
                createdSerials++;
            }
        }
        if (!serialBuffer.isEmpty()) {
            lotteryTicketSerialRepository.saveAll(serialBuffer);
        }
        return createdSerials;
    }

    private LotteryTicketSerialEntity buildSeedSerial(
            LotteryTicketEntity ticket,
            ImportBatchLineEntity line,
            UserEntity operator,
            String serialNumber,
            SerialSeedSpec spec,
            LocalDateTime importedAt,
            LocalDateTime now
    ) {
        var serialBuilder = LotteryTicketSerialEntity.builder()
                .ticket(ticket)
                .stationId(ticket.getStation().getId())
                .drawDate(ticket.getDrawDate())
                .importBatch(line.getImportBatch())
                .importBatchLine(line)
                .ticketImg(ticket.getTicketImg())
                .serialNumber(serialNumber)
                .status(spec.serialStatus())
                .ticketCondition(spec.ticketCondition() != null ? spec.ticketCondition() : TicketCondition.GOOD)
                .inputSource(InputSource.MANUAL)
                .importedBy(operator)
                .importedAt(importedAt)
                .verified(true)
                .verifiedBy(operator)
                .verifiedAt(importedAt.plusMinutes(5))
                .createdAt(importedAt)
                .updatedAt(now)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR);

        if (spec.faultedBy() != null) {
            serialBuilder.faultedBy(spec.faultedBy());
            serialBuilder.damagedReason("Seed " + spec.faultedBy().name());
        }
        if (spec.serialStatus() == LotteryTicketSerialStatus.RESERVED) {
            serialBuilder.reservedAt(now.minusMinutes(10));
            serialBuilder.reservationExpiresAt(now.plusMinutes(20));
        }
        return serialBuilder.build();
    }

    private boolean isPastDraw(LotteryStationEntity station, LocalDate drawDate, LocalDateTime now) {
        if (drawDate.isBefore(now.toLocalDate())) {
            return true;
        }
        if (!drawDate.isEqual(now.toLocalDate())) {
            return false;
        }
        LocalTime drawTime = station.getDrawTime() != null ? station.getDrawTime() : LocalTime.of(16, 15);
        return now.toLocalTime().isAfter(drawTime);
    }

    /**
     * Maps a seed scenario to aggregate ticket status + serial specs, then applies
     * draw-cutoff expiry the same way {@code expireDueTickets} does.
     */
    private TicketSeedPlan resolveTicketSeedPlan(
            SeedTicketScenario scenario,
            boolean pastDraw,
            int serialCount
    ) {
        int count = Math.max(serialCount, 1);
        TicketSeedPlan plan = switch (scenario) {
            case IN_STOCK_GOOD -> new TicketSeedPlan(
                    LotteryTicketStatus.IN_STOCK,
                    fillGood(count, LotteryTicketSerialStatus.IN_STOCK)
            );
            case PARTIAL_RESERVED -> {
                List<SerialSeedSpec> specs = fillGood(count, LotteryTicketSerialStatus.IN_STOCK);
                specs.set(0, new SerialSeedSpec(LotteryTicketSerialStatus.RESERVED, TicketCondition.GOOD, null));
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
            case SOLD_OUT -> new TicketSeedPlan(
                    LotteryTicketStatus.SOLD_OUT,
                    fillGood(count, LotteryTicketSerialStatus.SOLD)
            );
            case PARTIAL_SOLD -> {
                List<SerialSeedSpec> specs = fillGood(count, LotteryTicketSerialStatus.IN_STOCK);
                int sold = Math.max(1, count / 2);
                for (int i = 0; i < sold; i++) {
                    specs.set(i, new SerialSeedSpec(LotteryTicketSerialStatus.SOLD, TicketCondition.GOOD, null));
                }
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
            case DAMAGED_INTERNAL -> {
                List<SerialSeedSpec> specs = fillGood(count, LotteryTicketSerialStatus.IN_STOCK);
                specs.set(0, new SerialSeedSpec(
                        LotteryTicketSerialStatus.IN_STOCK,
                        TicketCondition.DAMAGED,
                        LotteryTicketSerialFaultedBy.INTERNAL_FAULT
                ));
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
            case LOST_ISSUER -> {
                List<SerialSeedSpec> specs = fillGood(count, LotteryTicketSerialStatus.IN_STOCK);
                specs.set(0, new SerialSeedSpec(
                        LotteryTicketSerialStatus.IN_STOCK,
                        TicketCondition.LOST,
                        LotteryTicketSerialFaultedBy.ISSUER_FAULT
                ));
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
            case VOIDED_ENTRY -> {
                List<SerialSeedSpec> specs = fillGood(count, LotteryTicketSerialStatus.IN_STOCK);
                specs.set(0, new SerialSeedSpec(
                        LotteryTicketSerialStatus.IN_STOCK,
                        TicketCondition.VOIDED,
                        LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT
                ));
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
            case MIXED_FAULT -> {
                List<SerialSeedSpec> specs = fillGood(count, LotteryTicketSerialStatus.IN_STOCK);
                specs.set(0, new SerialSeedSpec(
                        LotteryTicketSerialStatus.IN_STOCK,
                        TicketCondition.DAMAGED,
                        LotteryTicketSerialFaultedBy.INTERNAL_FAULT
                ));
                if (count > 1) {
                    specs.set(1, new SerialSeedSpec(
                            LotteryTicketSerialStatus.IN_STOCK,
                            TicketCondition.LOST,
                            LotteryTicketSerialFaultedBy.ISSUER_FAULT
                    ));
                }
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
            case ALL_FAULTY -> {
                List<SerialSeedSpec> specs = new ArrayList<>(count);
                for (int i = 0; i < count; i++) {
                    boolean damaged = i % 2 == 0;
                    specs.add(new SerialSeedSpec(
                            LotteryTicketSerialStatus.IN_STOCK,
                            damaged ? TicketCondition.DAMAGED : TicketCondition.LOST,
                            damaged
                                    ? LotteryTicketSerialFaultedBy.INTERNAL_FAULT
                                    : LotteryTicketSerialFaultedBy.ISSUER_FAULT
                    ));
                }
                yield new TicketSeedPlan(LotteryTicketStatus.SOLD_OUT, List.copyOf(specs));
            }
            case PROXY_HOLDING -> {
                List<SerialSeedSpec> specs = fillGood(count, LotteryTicketSerialStatus.IN_STOCK);
                specs.set(0, new SerialSeedSpec(
                        LotteryTicketSerialStatus.SOLD,
                        TicketCondition.GOOD,
                        null
                ));
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
        };
        return pastDraw ? expirePlan(plan) : plan;
    }

    private static List<SerialSeedSpec> fillGood(int count, LotteryTicketSerialStatus status) {
        List<SerialSeedSpec> specs = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            specs.add(new SerialSeedSpec(status, TicketCondition.GOOD, null));
        }
        return specs;
    }

    /**
     * After giờ sổ: ticket EXPIRED. IN_STOCK / RESERVED serials become
     * EXPIRED (same as {@code expireActiveSerials} plus reserved). SOLD stays SOLD.
     * Fault condition is preserved.
     */
    private static TicketSeedPlan expirePlan(TicketSeedPlan plan) {
        List<SerialSeedSpec> expired = new ArrayList<>(plan.serialSpecs().size());
        for (SerialSeedSpec spec : plan.serialSpecs()) {
            if (spec.serialStatus() == LotteryTicketSerialStatus.SOLD) {
                expired.add(spec);
                continue;
            }
            expired.add(new SerialSeedSpec(
                    LotteryTicketSerialStatus.EXPIRED,
                    spec.ticketCondition() != null ? spec.ticketCondition() : TicketCondition.GOOD,
                    spec.faultedBy()
            ));
        }
        return new TicketSeedPlan(LotteryTicketStatus.EXPIRED, List.copyOf(expired));
    }

    private UserEntity findSeedOperator() {
        List<UserEntity> operators = userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_STAFF_OPERATOR));
        if (!operators.isEmpty()) {
            return operators.getFirst();
        }
        List<UserEntity> admins = userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ADMIN));
        return admins.isEmpty() ? null : admins.getFirst();
    }

    private enum SeedTicketScenario {
        IN_STOCK_GOOD,
        PARTIAL_RESERVED,
        SOLD_OUT,
        PARTIAL_SOLD,
        DAMAGED_INTERNAL,
        LOST_ISSUER,
        VOIDED_ENTRY,
        MIXED_FAULT,
        ALL_FAULTY,
        PROXY_HOLDING
    }

    private record BatchPlan(
            LocalDate drawDate,
            ImportBatchType batchType,
            ImportBatchImportMode importMode,
            String suffix,
            LocalDateTime importedAt
    ) {
    }

    private record TicketSeedPlan(
            LotteryTicketStatus ticketStatus,
            List<SerialSeedSpec> serialSpecs
    ) {
    }

    private record SerialSeedSpec(
            LotteryTicketSerialStatus serialStatus,
            TicketCondition ticketCondition,
            LotteryTicketSerialFaultedBy faultedBy
    ) {
    }

    private static final class ImportBatchCodeHelper {
        private ImportBatchCodeHelper() {
        }

        static String toStationCode(String stationName) {
            if (stationName == null || stationName.isBlank()) {
                return "STATION";
            }
            String normalized = java.text.Normalizer.normalize(stationName.trim(), java.text.Normalizer.Form.NFD)
                    .replaceAll("\\p{M}+", "")
                    .replace('đ', 'd')
                    .replace('Đ', 'D')
                    .replaceAll("[^A-Za-z0-9]+", "")
                    .toUpperCase(java.util.Locale.ROOT);
            if (normalized.isBlank()) {
                return "STATION";
            }
            return normalized.length() > 16 ? normalized.substring(0, 16) : normalized;
        }

        static String toTypeCode(ImportBatchType batchType) {
            if (batchType == null) {
                return "UNK";
            }
            return switch (batchType) {
                case NEW -> "NEW";
                case SUPPLEMENTARY -> "SUPP";
                case ADJUSTMENT -> "ADJ";
            };
        }
    }
}
