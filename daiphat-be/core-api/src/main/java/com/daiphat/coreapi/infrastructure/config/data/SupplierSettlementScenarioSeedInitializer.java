package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementAdjustmentRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementRepository;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.SupplierSettlementCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Compact, known-quantity inventory for supplier-settlement QA.
 *
 * <p>Supplier {@code DOI_SOAT_QA} is isolated from {@code MINH_CHINH} so matching,
 * VOIDED exclusion, leftover inspectable serials, freeze timestamps, and station
 * commissions can be exercised without the large mixed PN-SEED inventory.
 *
 * <p>Per draw date × 2 stations:
 * <ul>
 *   <li>Station A: 24 serials (12 GOOD IN_STOCK + 6 SOLD + 2 DAMAGED + 2 LOST + 2 VOIDED)</li>
 *   <li>Station B: 20 serials (10 GOOD + 5 SOLD + 2 DAMAGED + 2 LOST + 1 VOIDED)</li>
 *   <li>System import qty excludes VOIDED → 41</li>
 * </ul>
 *
 * <p>Yesterday: return {@code HANDED_OVER} with every GOOD {@code IN_STOCK|EXPIRED}
 * serial attached (system return qty = leftover 0). Today / tomorrow: return
 * {@code PENDING_INSPECTION}, serials unattached so leftover inspectable remains.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.lottery.seed.enabled", havingValue = "true")
@Order(116)
public class SupplierSettlementScenarioSeedInitializer implements ApplicationRunner {

    static final String SYSTEM_ACTOR = "settlement-scenario-seed";
    static final String SUPPLIER_CODE = "DOI_SOAT_QA";
    static final String HEADER_CODE_PREFIX = "PN-SETTLE-";
    static final String LINE_CODE_PREFIX = "LO-SETTLE-";
    static final String SERIAL_PREFIX = "IBSETTLE-";
    static final String RETURN_NOTE_PREFIX = "SEED-RETURN-SETTLE-";
    static final String RETURN_CODE_PREFIX = "PT-SETTLE-";

    private static final String SUPPLIER_NAME = "Đối soát QA";
    private static final BigDecimal DEFAULT_IMPORT_COST = BigDecimal.valueOf(10_000);
    private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;
    private static final int NUMBER_CURSOR_START = 650_000;
    private static final int STATION_LIMIT = 2;
    private static final LocalTime PAYMENT_CUT_OFF = LocalTime.of(18, 0);
    private static final LocalTime RETURN_CUT_OFF = LocalTime.of(14, 30);

    private static final List<SerialKind> STATION_A = List.of(
            new SerialKind(LotteryTicketSerialStatus.IN_STOCK, TicketCondition.GOOD, null, 12),
            new SerialKind(LotteryTicketSerialStatus.SOLD, TicketCondition.GOOD, null, 6),
            new SerialKind(
                    LotteryTicketSerialStatus.IN_STOCK,
                    TicketCondition.DAMAGED,
                    LotteryTicketSerialFaultedBy.INTERNAL_FAULT,
                    2
            ),
            new SerialKind(
                    LotteryTicketSerialStatus.IN_STOCK,
                    TicketCondition.LOST,
                    LotteryTicketSerialFaultedBy.ISSUER_FAULT,
                    2
            ),
            new SerialKind(
                    LotteryTicketSerialStatus.IN_STOCK,
                    TicketCondition.VOIDED,
                    LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT,
                    2
            )
    );

    private static final List<SerialKind> STATION_B = List.of(
            new SerialKind(LotteryTicketSerialStatus.IN_STOCK, TicketCondition.GOOD, null, 10),
            new SerialKind(LotteryTicketSerialStatus.SOLD, TicketCondition.GOOD, null, 5),
            new SerialKind(
                    LotteryTicketSerialStatus.IN_STOCK,
                    TicketCondition.DAMAGED,
                    LotteryTicketSerialFaultedBy.INTERNAL_FAULT,
                    2
            ),
            new SerialKind(
                    LotteryTicketSerialStatus.IN_STOCK,
                    TicketCondition.LOST,
                    LotteryTicketSerialFaultedBy.ISSUER_FAULT,
                    2
            ),
            new SerialKind(
                    LotteryTicketSerialStatus.IN_STOCK,
                    TicketCondition.VOIDED,
                    LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT,
                    1
            )
    );

    private final LotterySupplierRepository lotterySupplierRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final ImportBatchRepository importBatchRepository;
    private final ImportBatchLineRepository importBatchLineRepository;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final LotterySerialSeedCleanup lotterySerialSeedCleanup;
    private final ReturnBatchRepository returnBatchRepository;
    private final ReturnBatchLineRepository returnBatchLineRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final SupplierSettlementAdjustmentRepository supplierSettlementAdjustmentRepository;
    private final SupplierSettlementCodeGenerator supplierSettlementCodeGenerator;
    private final UserRepository userRepository;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserEntity operator = findSeedOperator();
        if (operator == null) {
            log.warn("Skip settlement-scenario seed: no staff operator account found.");
            return;
        }

        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate today = now.toLocalDate();
        resetPreviousSeedData();

        LotterySupplierEntity supplier = ensureSupplier(now);
        int batchCount = 0;
        int ticketCount = 0;
        int serialCount = 0;

        for (LocalDate drawDate : List.of(today.minusDays(1), today, today.plusDays(1))) {
            List<LotteryStationEntity> stations = findIssuersForDrawDate(drawDate).stream()
                    .limit(STATION_LIMIT)
                    .toList();
            if (stations.size() < STATION_LIMIT) {
                log.warn(
                        "Skip settlement-scenario drawDate={}: need {} scheduled stations, found {}.",
                        drawDate,
                        STATION_LIMIT,
                        stations.size()
                );
                continue;
            }

            SeededImport seeded = seedImportBatch(supplier, operator, stations, drawDate, today, now);
            SupplierSettlementEntity settlement = ensureSettlement(supplier, drawDate, now);
            seeded.batch().setSupplierSettlementId(settlement.getId());
            importBatchRepository.save(seeded.batch());

            seedReturnBatch(supplier, settlement, seeded, drawDate, today, now, operator);

            batchCount++;
            ticketCount += seeded.ticketCount();
            serialCount += seeded.serialCount();
            log.info(
                    "Settlement-scenario seeded drawDate={} import={} tickets={} serials={} "
                            + "importedExclVoided={} returnableGood={} handedOver={} leftoverInspectable={}.",
                    drawDate,
                    seeded.batch().getBatchCode(),
                    seeded.ticketCount(),
                    seeded.serialCount(),
                    seeded.importedExclVoided(),
                    seeded.returnableGood(),
                    seeded.handOverReturn(),
                    seeded.handOverReturn() ? 0 : seeded.returnableGood()
            );
        }

        log.info(
                "Settlement-scenario seed complete: supplier={} batches={} tickets={} serials={}.",
                SUPPLIER_CODE,
                batchCount,
                ticketCount,
                serialCount
        );
    }

    private SeededImport seedImportBatch(
            LotterySupplierEntity supplier,
            UserEntity operator,
            List<LotteryStationEntity> stations,
            LocalDate drawDate,
            LocalDate today,
            LocalDateTime now
    ) {
        LocalDateTime importedAt = resolveImportedAt(drawDate, today, now);
        String headerCode = HEADER_CODE_PREFIX + drawDate.format(BASIC_DATE) + "-NEW-QA";
        ImportBatchEntity batch = importBatchRepository.save(
                ImportBatchEntity.builder()
                        .batchCode(headerCode)
                        .drawDate(drawDate)
                        .supplier(supplier)
                        .importMode(ImportBatchImportMode.IN_DAY)
                        .invoiceEvidenceUrl(imageUrl(headerCode + "-invoice"))
                        .ticketListImageUrls(new ArrayList<>(List.of(
                                imageUrl(headerCode + "-list-1"),
                                imageUrl(headerCode + "-list-2")
                        )))
                        .importedBy(operator)
                        .importedAt(importedAt)
                        .lineCount(stations.size())
                        .totalDeclareQuantity(0)
                        .totalDeclaredCostValue(BigDecimal.ZERO)
                        .totalImportedQuantity(0)
                        .totalImportedCostValue(BigDecimal.ZERO)
                        .submittedAt(importedAt)
                        .completedAt(importedAt.plusMinutes(30))
                        .note("SEED settlement QA import for " + drawDate)
                        .createdAt(importedAt)
                        .updatedAt(now)
                        .createdBy(SYSTEM_ACTOR)
                        .lastModifiedBy(SYSTEM_ACTOR)
                        .build()
        );

        List<ImportBatchLineEntity> lines = new ArrayList<>();
        int ticketCount = 0;
        int serialCount = 0;
        int importedExclVoided = 0;
        int returnableGood = 0;
        int importedQty = 0;
        BigDecimal importedCost = BigDecimal.ZERO;
        boolean pastDraw = isPastDraw(stations.getFirst(), drawDate, now);

        for (int stationIndex = 0; stationIndex < stations.size(); stationIndex++) {
            LotteryStationEntity station = stations.get(stationIndex);
            ImportBatchLineEntity line = importBatchLineRepository.save(
                    createLine(batch, station, drawDate, importedAt, now)
            );
            List<SerialKind> kinds = stationIndex == 0 ? STATION_A : STATION_B;
            LineSeedResult lineResult = seedTicketsForLine(
                    line,
                    station,
                    operator,
                    drawDate,
                    importedAt,
                    now,
                    pastDraw,
                    kinds
            );
            int createdSerials = lineResult.serialCount();
            line.setDeclareQuantity(createdSerials);
            line.setDeclaredCostValue(DEFAULT_IMPORT_COST.multiply(BigDecimal.valueOf(createdSerials)));
            line.setTotalQuantity(createdSerials);
            line.setTotalCostValue(DEFAULT_IMPORT_COST.multiply(BigDecimal.valueOf(createdSerials)));
            ImportBatchSeedStatusHelper.applyLineStatus(line, now);
            importBatchLineRepository.save(line);
            lines.add(line);

            importedQty += createdSerials;
            importedCost = importedCost.add(line.getTotalCostValue());
            ticketCount += lineResult.ticketCount();
            serialCount += createdSerials;
            importedExclVoided += lineResult.importedExclVoided();
            returnableGood += lineResult.returnableGood();
        }

        batch.setLines(lines);
        batch.setLineCount(lines.size());
        batch.setTotalImportedQuantity(importedQty);
        batch.setTotalImportedCostValue(importedCost);
        batch.setTotalDeclareQuantity(importedQty);
        batch.setTotalDeclaredCostValue(importedCost);
        ImportBatchSeedStatusHelper.applyHeaderStatus(batch, lines, now);
        batch = importBatchRepository.save(batch);
        lotteryTicketSerialRepository.flush();

        boolean handOverReturn = drawDate.isBefore(today);
        return new SeededImport(
                batch,
                lines,
                ticketCount,
                serialCount,
                importedExclVoided,
                returnableGood,
                handOverReturn
        );
    }

    private LineSeedResult seedTicketsForLine(
            ImportBatchLineEntity line,
            LotteryStationEntity station,
            UserEntity operator,
            LocalDate drawDate,
            LocalDateTime importedAt,
            LocalDateTime now,
            boolean pastDraw,
            List<SerialKind> kinds
    ) {
        BigDecimal price = station.getPrice() != null ? station.getPrice() : DEFAULT_IMPORT_COST;
        List<LotteryTicketSerialEntity> serialBuffer = new ArrayList<>();
        int ticketCount = 0;
        int importedExclVoided = 0;
        int returnableGood = 0;
        int numberCursor = NUMBER_CURSOR_START;

        for (SerialKind kind : kinds) {
            for (int index = 0; index < kind.count(); index++) {
                ticketCount++;
                String numbers = String.format("%06d", Math.floorMod(numberCursor++, 1_000_000));
                String ticketSeedKey = SERIAL_PREFIX
                        + drawDate.format(BASIC_DATE)
                        + "-"
                        + station.getId()
                        + "-"
                        + String.format("%03d", ticketCount);
                LotteryTicketEntity ticket = lotteryTicketRepository.save(
                        LotteryTicketEntity.builder()
                                .station(station)
                                .ticketImg(imageUrl(ticketSeedKey))
                                .numbers(numbers)
                                .drawDate(drawDate)
                                .batchCode(line.getBatchCode())
                                .priceSnapshot(price)
                                .active(true)
                                .createdAt(importedAt.plusMinutes(20))
                                .updatedAt(now)
                                .createdBy(SYSTEM_ACTOR)
                                .lastModifiedBy(SYSTEM_ACTOR)
                                .build()
                );

                SerialSpec spec = resolveSpec(kind, pastDraw);
                serialBuffer.add(buildSerial(
                        ticket,
                        line,
                        operator,
                        ticketSeedKey + "-01",
                        spec,
                        importedAt.plusMinutes(20),
                        now
                ));
                if (spec.condition() != TicketCondition.VOIDED) {
                    importedExclVoided++;
                }
                if (isReturnEligible(spec)) {
                    returnableGood++;
                }
            }
        }

        List<LotteryTicketSerialEntity> saved = lotteryTicketSerialRepository.saveAll(serialBuffer);
        for (LotteryTicketSerialEntity serial : saved) {
            StatusCoverageTicketStatusHelper.syncTicketStatusFromSerials(
                    serial.getTicket(),
                    station,
                    List.of(serial),
                    now,
                    SYSTEM_ACTOR,
                    lotteryTicketRepository
            );
        }
        return new LineSeedResult(ticketCount, saved.size(), importedExclVoided, returnableGood);
    }

    private void seedReturnBatch(
            LotterySupplierEntity supplier,
            SupplierSettlementEntity settlement,
            SeededImport seeded,
            LocalDate drawDate,
            LocalDate today,
            LocalDateTime now,
            UserEntity operator
    ) {
        boolean handOver = seeded.handOverReturn();
        // Auto-gen / prior seeds may already hold PENDING_INSPECTION for this supplier+draw
        // (unique index uq_return_batches_pending_inspection_supplier_draw). Clear them first.
        clearReturnBatchesForSupplierDraw(supplier.getId(), drawDate);

        ReturnBatchEntity batch = returnBatchRepository.save(
                ReturnBatchEntity.builder()
                        .batchCode(RETURN_CODE_PREFIX + drawDate.format(BASIC_DATE) + "-0001")
                        .lotterySupplier(supplier)
                        .drawDate(drawDate)
                        .supplierSettlementId(settlement.getId())
                        .note(RETURN_NOTE_PREFIX + supplier.getCode() + "-" + drawDate)
                        .status(handOver ? ReturnBatchStatus.HANDED_OVER : ReturnBatchStatus.PENDING_INSPECTION)
                        .deliveryMode(handOver ? ReturnDeliveryMode.RETAILER_DELIVERS : null)
                        .returnReceiptUrl(handOver ? imageUrl("return-receipt-" + drawDate) : null)
                        .returnedAt(handOver ? now.minusHours(4) : null)
                        .returnedBy(handOver ? operator.getId() : null)
                        .confirmedAt(handOver ? now.minusHours(3) : null)
                        .totalQuantity(0)
                        .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                        .createdAt(now.minusHours(6))
                        .updatedAt(now)
                        .createdBy(SYSTEM_ACTOR)
                        .lastModifiedBy(SYSTEM_ACTOR)
                        .build()
        );

        int headerQty = 0;
        BigDecimal headerValue = BigDecimal.ZERO;
        for (ImportBatchLineEntity importLine : seeded.lines()) {
            LotteryStationEntity station = importLine.getLotteryStation();
            List<LotteryTicketSerialEntity> eligible = lotteryTicketSerialRepository
                    .findByImportBatchLine_IdIn(List.of(importLine.getId()))
                    .stream()
                    .filter(serial -> serial.getDeletedAt() == null)
                    .filter(this::isReturnEligibleSerial)
                    .toList();

            ReturnBatchLineEntity line = returnBatchLineRepository.save(
                    ReturnBatchLineEntity.builder()
                            .returnBatch(batch)
                            .lotteryStation(station)
                            .status(handOver ? ReturnBatchLineStatus.INSPECTED : ReturnBatchLineStatus.PENDING)
                            .totalQuantity(eligible.size())
                            .totalReturnValue(ImportCostCalculator.scaleMoney(
                                    DEFAULT_IMPORT_COST.multiply(BigDecimal.valueOf(eligible.size()))
                            ))
                            .createdAt(now.minusHours(6))
                            .updatedAt(now)
                            .createdBy(SYSTEM_ACTOR)
                            .lastModifiedBy(SYSTEM_ACTOR)
                            .build()
            );

            if (handOver) {
                for (LotteryTicketSerialEntity serial : eligible) {
                    serial.setReturnBatchLineId(line.getId());
                    serial.setReturnedAt(now.minusHours(4));
                    serial.setLastModifiedBy(SYSTEM_ACTOR);
                    serial.setUpdatedAt(now);
                }
                lotteryTicketSerialRepository.saveAll(eligible);
            }

            headerQty += eligible.size();
            headerValue = headerValue.add(line.getTotalReturnValue());
        }

        batch.setTotalQuantity(headerQty);
        batch.setTotalReturnValue(ImportCostCalculator.scaleMoney(headerValue));
        returnBatchRepository.save(batch);
    }

    private ImportBatchLineEntity createLine(
            ImportBatchEntity batch,
            LotteryStationEntity station,
            LocalDate drawDate,
            LocalDateTime importedAt,
            LocalDateTime now
    ) {
        String stationCode = toStationCode(station.getName());
        return ImportBatchLineEntity.builder()
                .importBatch(batch)
                .lotteryStation(station)
                .batchType(ImportBatchType.NEW)
                .batchCode(LINE_CODE_PREFIX + drawDate.format(BASIC_DATE) + "-" + stationCode + "-NEW-QA")
                .declareQuantity(0)
                .declaredCostValue(BigDecimal.ZERO)
                .totalQuantity(0)
                .importCost(DEFAULT_IMPORT_COST)
                .totalCostValue(BigDecimal.ZERO)
                .importedAt(importedAt.plusMinutes(15))
                .createdAt(importedAt)
                .updatedAt(now)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();
    }

    private LotteryTicketSerialEntity buildSerial(
            LotteryTicketEntity ticket,
            ImportBatchLineEntity line,
            UserEntity operator,
            String serialNumber,
            SerialSpec spec,
            LocalDateTime importedAt,
            LocalDateTime now
    ) {
        var builder = LotteryTicketSerialEntity.builder()
                .ticket(ticket)
                .stationId(ticket.getStation().getId())
                .drawDate(ticket.getDrawDate())
                .importBatch(line.getImportBatch())
                .importBatchLine(line)
                .ticketImg(ticket.getTicketImg())
                .serialNumber(serialNumber)
                .status(spec.status())
                .ticketCondition(spec.condition())
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
            builder.faultedBy(spec.faultedBy());
            builder.damagedReason("Seed " + spec.faultedBy().name());
        }
        if (spec.status() == LotteryTicketSerialStatus.RESERVED) {
            builder.reservedAt(now.minusMinutes(10));
            builder.reservationExpiresAt(now.plusMinutes(20));
        }
        return builder.build();
    }

    private static SerialSpec resolveSpec(SerialKind kind, boolean pastDraw) {
        LotteryTicketSerialStatus status = kind.status();
        if (pastDraw
                && status != LotteryTicketSerialStatus.SOLD
                && kind.condition() != TicketCondition.VOIDED) {
            status = LotteryTicketSerialStatus.EXPIRED;
        }
        return new SerialSpec(status, kind.condition(), kind.faultedBy());
    }

    private boolean isReturnEligibleSerial(LotteryTicketSerialEntity serial) {
        if (serial.getTicketCondition() != TicketCondition.GOOD) {
            return false;
        }
        return serial.getStatus() == LotteryTicketSerialStatus.IN_STOCK
                || serial.getStatus() == LotteryTicketSerialStatus.EXPIRED;
    }

    private static boolean isReturnEligible(SerialSpec spec) {
        if (spec.condition() != TicketCondition.GOOD) {
            return false;
        }
        return spec.status() == LotteryTicketSerialStatus.IN_STOCK
                || spec.status() == LotteryTicketSerialStatus.EXPIRED;
    }

    private void clearReturnBatchesForSupplierDraw(Long supplierId, LocalDate drawDate) {
        if (supplierId == null || drawDate == null) {
            return;
        }
        List<ReturnBatchEntity> existing =
                returnBatchRepository.findAllByLotterySupplier_IdAndDrawDateAndDeletedAtIsNull(
                        supplierId,
                        drawDate
                );
        deleteReturnBatchesFully(existing);
    }

    private void deleteReturnBatchesFully(List<ReturnBatchEntity> batches) {
        if (batches == null || batches.isEmpty()) {
            return;
        }
        List<Long> returnLineIds = new ArrayList<>();
        for (ReturnBatchEntity batch : batches) {
            if (batch.getId() == null) {
                continue;
            }
            for (ReturnBatchLineEntity line :
                    returnBatchLineRepository.findByReturnBatch_IdAndDeletedAtIsNull(batch.getId())) {
                if (line.getId() != null) {
                    returnLineIds.add(line.getId());
                }
            }
        }
        if (!returnLineIds.isEmpty()) {
            List<LotteryTicketSerialEntity> linked =
                    lotteryTicketSerialRepository.findByReturnBatchLineIdInAndDeletedAtIsNull(returnLineIds);
            for (LotteryTicketSerialEntity serial : linked) {
                serial.setReturnBatchLineId(null);
                serial.setReturnedAt(null);
                serial.setLastModifiedBy(SYSTEM_ACTOR);
                lotteryTicketSerialRepository.save(serial);
            }
            returnBatchLineRepository.deleteAll(
                    returnBatchLineRepository.findAllById(returnLineIds)
            );
            returnBatchLineRepository.flush();
        }
        returnBatchRepository.deleteAll(batches);
        returnBatchRepository.flush();
    }

    private void resetPreviousSeedData() {
        deleteReturnBatchesFully(
                returnBatchRepository.findByNoteStartingWithAndDeletedAtIsNull(RETURN_NOTE_PREFIX)
        );

        // Clear leftover return batches for DOI_SOAT_QA (incl. auto-generated PENDING_INSPECTION)
        // so re-seed cannot hit uq_return_batches_pending_inspection_supplier_draw.
        lotterySupplierRepository.findByCodeIgnoreCaseAndDeletedAtIsNull(SUPPLIER_CODE).ifPresent(supplier -> {
            if (supplier.getId() == null) {
                return;
            }
            LocalDate today = LocalDate.now(clock);
            for (LocalDate drawDate : List.of(today.minusDays(1), today, today.plusDays(1))) {
                clearReturnBatchesForSupplierDraw(supplier.getId(), drawDate);
            }
        });

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

        List<LotteryTicketSerialEntity> seedSerials =
                lotteryTicketSerialRepository.findBySerialNumberStartingWith(SERIAL_PREFIX);
        Set<Long> ticketIds = new HashSet<>();
        if (!seedSerials.isEmpty()) {
            List<Long> seedSerialIds = seedSerials.stream().map(LotteryTicketSerialEntity::getId).toList();
            lotterySerialSeedCleanup.clearDependentsBeforeSerialDelete(seedSerialIds);
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

        lotterySupplierRepository.findByCodeIgnoreCaseAndDeletedAtIsNull(SUPPLIER_CODE).ifPresent(supplier -> {
            if (supplier.getId() == null) {
                return;
            }
            List<SupplierSettlementEntity> settlements = supplierSettlementRepository.findAll().stream()
                    .filter(item -> item.getDeletedAt() == null)
                    .filter(item -> item.getLotterySupplier() != null
                            && supplier.getId().equals(item.getLotterySupplier().getId()))
                    .filter(item -> SYSTEM_ACTOR.equals(item.getCreatedBy())
                            || "supplier-settlement-seed".equals(item.getCreatedBy())
                            || "return-batch-seed".equals(item.getCreatedBy()))
                    .toList();
            for (SupplierSettlementEntity settlement : settlements) {
                var adjustments = supplierSettlementAdjustmentRepository
                        .findBySupplierSettlement_IdAndDeletedAtIsNull(settlement.getId());
                if (!adjustments.isEmpty()) {
                    supplierSettlementAdjustmentRepository.deleteAll(adjustments);
                }
                supplierSettlementRepository.delete(settlement);
            }
            if (!settlements.isEmpty()) {
                supplierSettlementRepository.flush();
            }
        });
    }

    private LotterySupplierEntity ensureSupplier(LocalDateTime now) {
        return lotterySupplierRepository.findByCodeIgnoreCaseAndDeletedAtIsNull(SUPPLIER_CODE)
                .map(existing -> {
                    existing.setName(SUPPLIER_NAME);
                    existing.setType(LotterySupplierType.DISTRIBUTOR);
                    existing.setContactName(SUPPLIER_NAME);
                    existing.setContactPhone("0909000111");
                    existing.setContactEmail("doisoat.qa@seed.local");
                    existing.setAddress("1 Nguyen Hue, Quan 1, TP.HCM");
                    existing.setTaxCode("0311111111");
                    existing.setPaymentTermDays(1);
                    existing.setDefaultImportCost(DEFAULT_IMPORT_COST);
                    existing.setImportAllowFrom(LocalTime.of(8, 0));
                    existing.setReturnCutOffTime(RETURN_CUT_OFF);
                    existing.setPaymentCutOffTime(PAYMENT_CUT_OFF);
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
                                .contactPhone("0909000111")
                                .contactEmail("doisoat.qa@seed.local")
                                .address("1 Nguyen Hue, Quan 1, TP.HCM")
                                .taxCode("0311111111")
                                .paymentTermDays(1)
                                .defaultImportCost(DEFAULT_IMPORT_COST)
                                .importAllowFrom(LocalTime.of(8, 0))
                                .returnCutOffTime(RETURN_CUT_OFF)
                                .paymentCutOffTime(PAYMENT_CUT_OFF)
                                .isActive(true)
                                .createdAt(now)
                                .updatedAt(now)
                                .createdBy(SYSTEM_ACTOR)
                                .lastModifiedBy(SYSTEM_ACTOR)
                                .build()
                ));
    }

    private SupplierSettlementEntity ensureSettlement(
            LotterySupplierEntity supplier,
            LocalDate drawDate,
            LocalDateTime now
    ) {
        return supplierSettlementRepository
                .findByLotterySupplier_IdAndPeriodFromAndDeletedAtIsNull(supplier.getId(), drawDate)
                .orElseGet(() -> supplierSettlementRepository.save(
                        SupplierSettlementEntity.builder()
                                .lotterySupplier(supplier)
                                .periodFrom(drawDate)
                                .periodTo(drawDate.plusDays(1))
                                .supplierSettlementCode(supplierSettlementCodeGenerator.generateCode(drawDate))
                                .totalImportValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                                .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                                .totalPaidAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                                .remainingAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                                .systemTicketImportPrice(ImportCostCalculator.scaleMoney(DEFAULT_IMPORT_COST))
                                .status(SupplierSettlementStatus.OPEN)
                                .reconciliationPhase(SupplierSettlementReconciliationPhase.MATCHING)
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

    private LocalDateTime resolveImportedAt(LocalDate drawDate, LocalDate today, LocalDateTime now) {
        LocalDateTime candidate = drawDate.isAfter(today)
                ? LocalDateTime.of(today, LocalTime.of(8, 40))
                : LocalDateTime.of(drawDate, LocalTime.of(8, 15));
        return candidate.isAfter(now) ? now.minusMinutes(20) : candidate;
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

    private UserEntity findSeedOperator() {
        List<UserEntity> operators = userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_STAFF_OPERATOR));
        if (!operators.isEmpty()) {
            return operators.getFirst();
        }
        List<UserEntity> admins = userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ADMIN));
        return admins.isEmpty() ? null : admins.getFirst();
    }

    private static String imageUrl(String seed) {
        return "https://picsum.photos/seed/" + seed + "/800/500";
    }

    private static String toStationCode(String stationName) {
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

    private record SerialKind(
            LotteryTicketSerialStatus status,
            TicketCondition condition,
            LotteryTicketSerialFaultedBy faultedBy,
            int count
    ) {
    }

    private record SerialSpec(
            LotteryTicketSerialStatus status,
            TicketCondition condition,
            LotteryTicketSerialFaultedBy faultedBy
    ) {
    }

    private record LineSeedResult(
            int ticketCount,
            int serialCount,
            int importedExclVoided,
            int returnableGood
    ) {
    }

    private record SeededImport(
            ImportBatchEntity batch,
            List<ImportBatchLineEntity> lines,
            int ticketCount,
            int serialCount,
            int importedExclVoided,
            int returnableGood,
            boolean handOverReturn
    ) {
    }
}
