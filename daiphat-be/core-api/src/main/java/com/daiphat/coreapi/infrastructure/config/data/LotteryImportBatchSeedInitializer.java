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
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
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
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Seeds a default supplier, time-aware ImportBatch / ImportBatchLine rows for
 * NEW / SUPPLEMENTARY / ADJUSTMENT, and ~N lottery tickets per line with
 * ~M linked serials each (default 10).
 * Idempotent: removes only seeder-owned PN-SEED-* / LO-SEED-* / IBSEED-* data each run.
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
    private static final String SERIAL_PREFIX = "IBSEED-";
    private static final BigDecimal DEFAULT_IMPORT_COST = BigDecimal.valueOf(10_000);
    private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    /**
     * Seed scenarios that preserve UI variety. Ticket status is always one of the
     * four aggregate values; deleted ticket statuses are expressed via serial state.
     * PROXY_HOLDING / PENDING_RETURN / RETURNED / VOIDED are intentionally excluded.
     */
    private static final List<SeedTicketScenario> SEED_TICKET_SCENARIOS = List.of(
            SeedTicketScenario.IN_STOCK,
            SeedTicketScenario.IMPORTING,
            SeedTicketScenario.SOLD_OUT,
            SeedTicketScenario.RESERVED,
            SeedTicketScenario.SOLD,
            SeedTicketScenario.INTERNAL_FAULT,
            SeedTicketScenario.ISSUER_FAULT
    );

    private final LotterySupplierRepository lotterySupplierRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final ImportBatchRepository importBatchRepository;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final UserRepository userRepository;
    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final Clock clock;

    @Value("${daiphat.lottery.seed.tickets-per-station-per-date:20}")
    private int ticketsPerLine;

    @Value("${daiphat.lottery.seed.serials-per-ticket:10}")
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
        LocalTime cutoff = importBatchConfigResolver.resolveImportBatchCutoff();
        boolean afterCutoff = now.toLocalTime().isAfter(cutoff);

        resetPreviousSeedData();

        LotterySupplierEntity supplier = ensureSupplier(now);
        List<BatchPlan> plans = buildBatchPlans(today, afterCutoff);
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
                lines.add(createLine(batch, station, plan, now));
            }
            batch.setLines(lines);
            batch.setLineCount(lines.size());
            batch = importBatchRepository.save(batch);

            int importedQty = 0;
            BigDecimal importedCost = BigDecimal.ZERO;
            for (ImportBatchLineEntity line : batch.getLines()) {
                LotteryStationEntity station = line.getLotteryStation();
                int createdSerials = seedTicketsForLine(
                        line,
                        station,
                        operator,
                        plan.drawDate(),
                        now,
                        numberCursorByStationDate
                );
                line.setTotalQuantity(createdSerials);
                line.setTotalCostValue(line.getImportCost().multiply(BigDecimal.valueOf(createdSerials)));
                importedQty += createdSerials;
                importedCost = importedCost.add(line.getTotalCostValue());
                ticketCount += Math.max(ticketsPerLine, 1);
                lineCount++;
            }

            batch.setTotalImportedQuantity(importedQty);
            batch.setTotalImportedCostValue(importedCost);
            int declaredPerLine = Math.max(ticketsPerLine, 1) * Math.max(serialsPerTicket, 1);
            batch.setTotalDeclareQuantity(Math.max(importedQty, lines.size() * declaredPerLine));
            batch.setTotalDeclaredCostValue(
                    DEFAULT_IMPORT_COST.multiply(BigDecimal.valueOf(batch.getTotalDeclareQuantity()))
            );
            importBatchRepository.save(batch);
            batchCount++;
        }

        lotteryTicketRepository.flush();
        log.info(
                "Import-batch seed complete: supplier={}, batches={}, lines={}, tickets={}, serialsPerTicket={}, afterCutoff={}, cutoff={}.",
                SUPPLIER_CODE,
                batchCount,
                lineCount,
                ticketCount,
                Math.max(serialsPerTicket, 1),
                afterCutoff,
                cutoff
        );
    }

    private List<BatchPlan> buildBatchPlans(LocalDate today, boolean afterCutoff) {
        List<BatchPlan> plans = new ArrayList<>();
        LocalDate yesterday = today.minusDays(1);
        LocalDate tomorrow = today.plusDays(1);

        if (afterCutoff) {
            // After cutoff: today can only be ADJUSTMENT; NEW/SUPPLEMENTARY move to tomorrow.
            plans.add(new BatchPlan(
                    today,
                    ImportBatchType.ADJUSTMENT,
                    ImportBatchImportMode.POST_DRAW_SUPPLEMENT,
                    "SEED-ADJ-TODAY"
            ));
            plans.add(new BatchPlan(
                    tomorrow,
                    ImportBatchType.NEW,
                    ImportBatchImportMode.IN_DAY,
                    "SEED-NEW-TOMORROW"
            ));
            plans.add(new BatchPlan(
                    tomorrow,
                    ImportBatchType.SUPPLEMENTARY,
                    ImportBatchImportMode.IN_DAY,
                    "SEED-SUPP-TOMORROW"
            ));
        } else {
            // Before cutoff: yesterday ADJUSTMENT; today NEW + SUPPLEMENTARY; tomorrow NEW.
            plans.add(new BatchPlan(
                    yesterday,
                    ImportBatchType.ADJUSTMENT,
                    ImportBatchImportMode.POST_DRAW_SUPPLEMENT,
                    "SEED-ADJ-YESTERDAY"
            ));
            plans.add(new BatchPlan(
                    today,
                    ImportBatchType.NEW,
                    ImportBatchImportMode.IN_DAY,
                    "SEED-NEW-TODAY"
            ));
            plans.add(new BatchPlan(
                    today,
                    ImportBatchType.SUPPLEMENTARY,
                    ImportBatchImportMode.IN_DAY,
                    "SEED-SUPP-TODAY"
            ));
            plans.add(new BatchPlan(
                    tomorrow,
                    ImportBatchType.NEW,
                    ImportBatchImportMode.IN_DAY,
                    "SEED-NEW-TOMORROW"
            ));
        }
        return plans;
    }

    private void resetPreviousSeedData() {
        List<LotteryTicketSerialEntity> seedSerials =
                lotteryTicketSerialRepository.findBySerialNumberStartingWithAndDeletedAtIsNull(SERIAL_PREFIX);
        Set<Long> ticketIds = new HashSet<>();
        if (!seedSerials.isEmpty()) {
            // Break self-FK before delete: replacement serials keep replaced_for_ticket_id
            // pointing at older IBSEED rows from prior runs.
            List<Long> seedSerialIds = seedSerials.stream().map(LotteryTicketSerialEntity::getId).toList();
            lotteryTicketSerialRepository.clearReplacedForTicketIdRefs(seedSerialIds);

            for (LotteryTicketSerialEntity serial : seedSerials) {
                if (serial.getTicket() != null && serial.getTicket().getId() != null) {
                    ticketIds.add(serial.getTicket().getId());
                }
                lotteryTicketSerialRepository.delete(serial);
            }
        }

        for (Long ticketId : ticketIds) {
            if (lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId).isEmpty()) {
                lotteryTicketRepository.deleteById(ticketId);
            }
        }

        List<ImportBatchEntity> seedBatches =
                importBatchRepository.findByBatchCodeStartingWithAndDeletedAtIsNull(HEADER_CODE_PREFIX);
        if (!seedBatches.isEmpty()) {
            importBatchRepository.deleteAll(seedBatches);
        }

        // Flush deletes before IDENTITY re-inserts (same pattern as OrderSeedInitializer).
        lotteryTicketRepository.flush();
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

        return ImportBatchEntity.builder()
                .batchCode(headerCode)
                .drawDate(plan.drawDate())
                .supplier(supplier)
                .importMode(plan.importMode())
                .importedBy(operator)
                .importedAt(now.minusHours(1))
                .status(ImportBatchStatus.IMPORTED)
                .lineCount(stationCount)
                .totalDeclareQuantity(0)
                .totalDeclaredCostValue(BigDecimal.ZERO)
                .totalImportedQuantity(0)
                .totalImportedCostValue(BigDecimal.ZERO)
                .submittedAt(now.minusHours(1))
                .completedAt(now.minusMinutes(30))
                .note("Seed import batch (" + plan.batchType().name() + ") for draw " + plan.drawDate())
                .createdAt(now)
                .updatedAt(now)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
    }

    private ImportBatchLineEntity createLine(
            ImportBatchEntity batch,
            LotteryStationEntity station,
            BatchPlan plan,
            LocalDateTime now
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

        int declareQty = Math.max(ticketsPerLine, 1) * Math.max(serialsPerTicket, 1);
        return ImportBatchLineEntity.builder()
                .importBatch(batch)
                .lotteryStation(station)
                .batchType(plan.batchType())
                .batchCode(lineCode)
                .declareQuantity(declareQty)
                .declaredCostValue(DEFAULT_IMPORT_COST.multiply(BigDecimal.valueOf(declareQty)))
                .totalQuantity(0)
                .importCost(DEFAULT_IMPORT_COST)
                .totalCostValue(BigDecimal.ZERO)
                .status(ImportBatchLineStatus.IMPORTED)
                .importedAt(now.minusMinutes(30))
                .createdAt(now)
                .updatedAt(now)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
    }

    private int seedTicketsForLine(
            ImportBatchLineEntity line,
            LotteryStationEntity station,
            UserEntity operator,
            LocalDate drawDate,
            LocalDateTime now,
            Map<String, Integer> numberCursorByStationDate
    ) {
        int ticketCount = Math.max(ticketsPerLine, 1);
        int serialCount = Math.max(serialsPerTicket, 1);
        boolean pastDraw = isPastDraw(station, drawDate, now);
        BigDecimal price = station.getPrice() != null ? station.getPrice() : DEFAULT_IMPORT_COST;
        String cursorKey = station.getId() + "|" + drawDate;
        int createdSerials = 0;

        for (int index = 0; index < ticketCount; index++) {
            SeedTicketScenario scenario = SEED_TICKET_SCENARIOS.get(index % SEED_TICKET_SCENARIOS.size());
            TicketSeedPlan plan = resolveTicketSeedPlan(scenario, pastDraw, serialCount);
            LotteryTicketStatus ticketStatus = plan.ticketStatus();
            List<SerialSeedSpec> serialSpecs = plan.serialSpecs();

            int numberValue = numberCursorByStationDate.compute(
                    cursorKey,
                    (key, current) -> current == null ? 800_000 : current + 1
            );
            String numbers = String.format("%06d", Math.floorMod(numberValue, 1_000_000));
            String ticketSeedKey = SERIAL_PREFIX
                    + drawDate.format(BASIC_DATE)
                    + "-"
                    + station.getId()
                    + "-"
                    + ImportBatchCodeHelper.toTypeCode(line.getBatchType())
                    + "-"
                    + String.format("%03d", index + 1);

            LotteryTicketEntity ticket = lotteryTicketRepository
                    .findByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(station.getId(), numbers, drawDate)
                    .map(existing -> {
                        existing.setTicketImg("https://picsum.photos/seed/" + ticketSeedKey + "/800/500");
                        existing.setBatchCode(line.getBatchCode());

                        existing.setPriceSnapshot(price);
                        existing.setStatus(ticketStatus);
                        existing.setActive(true);
                        existing.setUpdatedAt(now);
                        existing.setLastModifiedBy(SYSTEM_ACTOR);
                        return lotteryTicketRepository.save(existing);
                    })
                    .orElseGet(() -> lotteryTicketRepository.save(
                            LotteryTicketEntity.builder()
                                    .station(station)
                                    .ticketImg("https://picsum.photos/seed/" + ticketSeedKey + "/800/500")
                                    .numbers(numbers)
                                    .drawDate(drawDate)
                                    .batchCode(line.getBatchCode())

                                    .priceSnapshot(price)
                                    .status(ticketStatus)
                                    .active(true)
                                    .createdAt(now.minusMinutes(40))
                                    .updatedAt(now)
                                    .createdBy(SYSTEM_ACTOR)
                                    .lastModifiedBy(SYSTEM_ACTOR)
                                    .build()
                    ));

            for (int serialIndex = 0; serialIndex < serialSpecs.size(); serialIndex++) {
                SerialSeedSpec spec = serialSpecs.get(serialIndex);
                String serialNumber = ticketSeedKey + "-" + String.format("%02d", serialIndex + 1);
                saveSeedSerial(ticket, line, operator, serialNumber, spec, now);
                createdSerials++;
            }
        }
        return createdSerials;
    }

    private void saveSeedSerial(
            LotteryTicketEntity ticket,
            ImportBatchLineEntity line,
            UserEntity operator,
            String serialNumber,
            SerialSeedSpec spec,
            LocalDateTime now
    ) {
        LotteryTicketSerialEntity.LotteryTicketSerialEntityBuilder serialBuilder = LotteryTicketSerialEntity.builder()
                .ticket(ticket)
                .importBatch(line.getImportBatch())
                .importBatchLine(line)
                .ticketImg(ticket.getTicketImg())
                .serialNumber(serialNumber)
                .status(spec.serialStatus())
                .inputSource(InputSource.MANUAL)
                .importedBy(operator)
                .importedAt(now.minusMinutes(35))
                .verified(true)
                .verifiedBy(operator)
                .verifiedAt(now.minusMinutes(30))
                .createdAt(now.minusMinutes(35))
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

        lotteryTicketSerialRepository.save(serialBuilder.build());
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
     * Maps a seed scenario to aggregate ticket status + serial specs.
     * Deleted ticket statuses (RESERVED/SOLD/INTERNAL_FAULT/ISSUER_FAULT) live on serials;
     * ticket status is only IMPORTING / IN_STOCK / SOLD_OUT / EXPIRED.
     * IN_STOCK tickets always keep at least one IN_STOCK serial.
     */
    private TicketSeedPlan resolveTicketSeedPlan(
            SeedTicketScenario scenario,
            boolean pastDraw,
            int serialCount
    ) {
        int count = Math.max(serialCount, 1);
        if (pastDraw) {
            return new TicketSeedPlan(
                    LotteryTicketStatus.EXPIRED,
                    List.copyOf(Collections.nCopies(
                            count,
                            new SerialSeedSpec(LotteryTicketSerialStatus.EXPIRED, null)
                    ))
            );
        }
        return switch (scenario) {
            case IN_STOCK -> new TicketSeedPlan(
                    LotteryTicketStatus.IN_STOCK,
                    List.copyOf(Collections.nCopies(
                            count,
                            new SerialSeedSpec(LotteryTicketSerialStatus.IN_STOCK, null)
                    ))
            );
            case IMPORTING -> new TicketSeedPlan(
                    LotteryTicketStatus.IMPORTING,
                    List.copyOf(Collections.nCopies(
                            count,
                            new SerialSeedSpec(LotteryTicketSerialStatus.IN_STOCK, null)
                    ))
            );
            case SOLD_OUT, SOLD -> new TicketSeedPlan(
                    LotteryTicketStatus.SOLD_OUT,
                    List.copyOf(Collections.nCopies(
                            count,
                            new SerialSeedSpec(LotteryTicketSerialStatus.SOLD, null)
                    ))
            );
            case RESERVED -> {
                List<SerialSeedSpec> specs = new ArrayList<>(count);
                specs.add(new SerialSeedSpec(LotteryTicketSerialStatus.RESERVED, null));
                for (int i = 1; i < count; i++) {
                    specs.add(new SerialSeedSpec(LotteryTicketSerialStatus.IN_STOCK, null));
                }
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
            case INTERNAL_FAULT -> {
                List<SerialSeedSpec> specs = new ArrayList<>(count);
                specs.add(new SerialSeedSpec(
                        LotteryTicketSerialStatus.DAMAGED,
                        LotteryTicketSerialFaultedBy.INTERNAL_FAULT
                ));
                for (int i = 1; i < count; i++) {
                    specs.add(new SerialSeedSpec(LotteryTicketSerialStatus.IN_STOCK, null));
                }
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
            case ISSUER_FAULT -> {
                List<SerialSeedSpec> specs = new ArrayList<>(count);
                specs.add(new SerialSeedSpec(
                        LotteryTicketSerialStatus.DAMAGED,
                        LotteryTicketSerialFaultedBy.ISSUER_FAULT
                ));
                for (int i = 1; i < count; i++) {
                    specs.add(new SerialSeedSpec(LotteryTicketSerialStatus.IN_STOCK, null));
                }
                yield new TicketSeedPlan(LotteryTicketStatus.IN_STOCK, List.copyOf(specs));
            }
        };
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
        IN_STOCK,
        IMPORTING,
        SOLD_OUT,
        /** Ticket IN_STOCK; one serial RESERVED, rest IN_STOCK. */
        RESERVED,
        /** Ticket SOLD_OUT; all serials SOLD (same aggregate as SOLD_OUT). */
        SOLD,
        /** Ticket IN_STOCK; one DAMAGED+INTERNAL_FAULT serial, rest IN_STOCK. */
        INTERNAL_FAULT,
        /** Ticket IN_STOCK; one DAMAGED+ISSUER_FAULT serial, rest IN_STOCK. */
        ISSUER_FAULT
    }

    private record BatchPlan(
            LocalDate drawDate,
            ImportBatchType batchType,
            ImportBatchImportMode importMode,
            String suffix
    ) {
    }

    private record TicketSeedPlan(
            LotteryTicketStatus ticketStatus,
            List<SerialSeedSpec> serialSpecs
    ) {
    }

    private record SerialSeedSpec(
            LotteryTicketSerialStatus serialStatus,
            LotteryTicketSerialFaultedBy faultedBy
    ) {
    }

    /**
     * Local copy of ImportBatchCodeGenerator helpers so seed codes stay stable
     * without consuming production sequences.
     */
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
                case LATE_IMPORT -> "LATE";
                case ADJUSTMENT -> "ADJ";
            };
        }
    }
}
