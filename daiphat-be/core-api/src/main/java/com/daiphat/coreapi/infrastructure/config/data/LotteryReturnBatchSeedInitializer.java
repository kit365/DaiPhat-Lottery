package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ReturnBatchRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Derives {@link ReturnBatchEntity} / {@link ReturnBatchLineEntity} seed rows from
 * seeded ImportBatch data ({@code PN-SEED-*} and {@code PN-STATUS-*}).
 * <p>
 * Rules: at most one Return Batch per supplier + draw date; lines grouped by station;
 * totals from eligible {@code IN_STOCK|EXPIRED} serials × {@code ImportBatchLine.importCost}.
 * Serials stay unattached so inspection can still list and confirm them
 * ({@code returnBatchLineId} is set only when staff confirms kiểm tra vé).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.lottery.seed.enabled", havingValue = "true")
@Order(115)
public class LotteryReturnBatchSeedInitializer implements ApplicationRunner {

    private static final String SYSTEM_ACTOR = "return-batch-seed";
    private static final String NOTE_PREFIX = "SEED-RETURN-";
    private static final List<String> IMPORT_BATCH_CODE_PREFIXES = List.of("PN-SEED-", "PN-STATUS-");

    private final ImportBatchRepository importBatchRepository;
    private final ImportBatchLineRepository importBatchLineRepository;
    private final ReturnBatchRepository returnBatchRepository;
    private final ReturnBatchLineRepository returnBatchLineRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final SupplierSettlementCodeGenerator supplierSettlementCodeGenerator;
    private final SupplierSettlementServicePort supplierSettlementServicePort;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        LocalDateTime now = LocalDateTime.now(clock);

        resetPreviousSeedReturnBatches();

        List<ImportBatchEntity> seedImportBatches = loadSeedImportBatches();
        if (seedImportBatches.isEmpty()) {
            log.warn("Skip return-batch seed: no seeded ImportBatch rows found.");
            return;
        }

        Map<SupplierDrawKey, List<ImportBatchEntity>> bySupplierDraw = seedImportBatches.stream()
                .filter(batch -> batch.getSupplier() != null && batch.getSupplier().getId() != null)
                .filter(batch -> batch.getDrawDate() != null)
                .filter(batch -> batch.getStatus() != ImportBatchStatus.CANCELLED)
                .collect(Collectors.groupingBy(
                        batch -> new SupplierDrawKey(batch.getSupplier().getId(), batch.getDrawDate()),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        int batchCount = 0;
        int lineCount = 0;
        Set<Long> settlementIds = new LinkedHashSet<>();

        for (Map.Entry<SupplierDrawKey, List<ImportBatchEntity>> entry : bySupplierDraw.entrySet()) {
            List<ImportBatchEntity> importBatches = entry.getValue();
            if (importBatches.isEmpty()) {
                continue;
            }
            LotterySupplierEntity supplier = importBatches.get(0).getSupplier();
            LocalDate drawDate = entry.getKey().drawDate();

            Result created = upsertReturnBatch(supplier, drawDate, importBatches, now);
            batchCount++;
            lineCount += created.lineCount();
            if (created.settlementId() != null) {
                settlementIds.add(created.settlementId());
            }
        }

        returnBatchRepository.flush();
        importBatchRepository.flush();
        for (Long settlementId : settlementIds) {
            try {
                supplierSettlementServicePort.recalculateAmounts(settlementId);
            } catch (RuntimeException ex) {
                log.error(
                        "Failed to recalculate settlement amounts after return-batch seed: settlementId={}",
                        settlementId,
                        ex
                );
                throw ex;
            }
        }
        log.info(
                "Return-batch seed complete: returnBatches={}, returnLines={}, sourceImportBatches={}, settlementsRefreshed={}.",
                batchCount,
                lineCount,
                seedImportBatches.size(),
                settlementIds.size()
        );
    }

    private List<ImportBatchEntity> loadSeedImportBatches() {
        Map<Long, ImportBatchEntity> byId = new LinkedHashMap<>();
        for (String prefix : IMPORT_BATCH_CODE_PREFIXES) {
            for (ImportBatchEntity batch : importBatchRepository.findByBatchCodeStartingWithAndDeletedAtIsNull(prefix)) {
                if (batch.getId() != null) {
                    byId.putIfAbsent(batch.getId(), batch);
                }
            }
        }
        return new ArrayList<>(byId.values());
    }

    private void resetPreviousSeedReturnBatches() {
        List<ReturnBatchEntity> seedBatches =
                returnBatchRepository.findByNoteStartingWithAndDeletedAtIsNull(NOTE_PREFIX);
        if (seedBatches.isEmpty()) {
            return;
        }

        List<Long> lineIds = new ArrayList<>();
        for (ReturnBatchEntity batch : seedBatches) {
            List<ReturnBatchLineEntity> lines =
                    returnBatchLineRepository.findByReturnBatch_IdAndDeletedAtIsNull(batch.getId());
            for (ReturnBatchLineEntity line : lines) {
                lineIds.add(line.getId());
            }
        }

        if (!lineIds.isEmpty()) {
            List<LotteryTicketSerialEntity> linked =
                    lotteryTicketSerialRepository.findByReturnBatchLineIdInAndDeletedAtIsNull(lineIds);
            for (LotteryTicketSerialEntity serial : linked) {
                serial.setReturnBatchLineId(null);
                if (serial.getStatus() != LotteryTicketSerialStatus.EXPIRED) {
                    serial.setStatus(LotteryTicketSerialStatus.IN_STOCK);
                }
                serial.setLastModifiedBy(SYSTEM_ACTOR);
                lotteryTicketSerialRepository.save(serial);
            }
            returnBatchLineRepository.deleteAll(
                    returnBatchLineRepository.findAllById(lineIds)
            );
        }

        returnBatchRepository.deleteAll(seedBatches);
        returnBatchRepository.flush();
        log.info("Removed previous return-batch seed data: batches={}.", seedBatches.size());
    }

    private Result upsertReturnBatch(
            LotterySupplierEntity supplier,
            LocalDate drawDate,
            List<ImportBatchEntity> importBatches,
            LocalDateTime now
    ) {
        SupplierSettlementEntity settlement = ensureSettlement(supplier, drawDate, now);

        // Link source import batches so totalImportValue can be summed for this settlement.
        for (ImportBatchEntity importBatch : importBatches) {
            if (!Objects.equals(importBatch.getSupplierSettlementId(), settlement.getId())) {
                importBatch.setSupplierSettlementId(settlement.getId());
                importBatch.setUpdatedAt(now);
                importBatch.setLastModifiedBy(SYSTEM_ACTOR);
                importBatchRepository.save(importBatch);
            }
        }

        Optional<ReturnBatchEntity> existingOpt = findSeedTargetReturnBatch(supplier.getId(), drawDate);

        ReturnBatchEntity batch;
        if (existingOpt.isPresent()) {
            batch = existingOpt.get();
            // Replace lines so quantities stay consistent with current seed inventory.
            List<ReturnBatchLineEntity> oldLines =
                    returnBatchLineRepository.findByReturnBatch_IdAndDeletedAtIsNull(batch.getId());
            if (!oldLines.isEmpty()) {
                List<Long> oldLineIds = oldLines.stream().map(ReturnBatchLineEntity::getId).toList();
                List<LotteryTicketSerialEntity> linked =
                        lotteryTicketSerialRepository.findByReturnBatchLineIdInAndDeletedAtIsNull(oldLineIds);
                for (LotteryTicketSerialEntity serial : linked) {
                    serial.setReturnBatchLineId(null);
                    lotteryTicketSerialRepository.save(serial);
                }
                returnBatchLineRepository.deleteAll(oldLines);
                returnBatchLineRepository.flush();
            }
            batch.setSupplierSettlementId(settlement.getId());
            batch.setNote(NOTE_PREFIX + supplier.getCode() + "-" + drawDate);
            if (batch.getBatchCode() == null || batch.getBatchCode().isBlank()) {
                batch.setBatchCode("PT-" + drawDate.format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE) + "-" + String.format("%04d", batch.getId() != null ? batch.getId() : 1));
            }
            batch.setStatus(ReturnBatchStatus.PENDING_INSPECTION);
            batch.setDeliveryMode(null);
            batch.setReturnedAt(null);
            batch.setReturnedBy(null);
            batch.setConfirmedAt(null);
            batch.setUpdatedAt(now);
            batch.setLastModifiedBy(SYSTEM_ACTOR);
        } else {
            batch = ReturnBatchEntity.builder()
                    .batchCode("PT-" + drawDate.format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE) + "-000" + (drawDate.getDayOfMonth() % 9 + 1))
                    .lotterySupplier(supplier)
                    .drawDate(drawDate)
                    .supplierSettlementId(settlement.getId())
                    .note(NOTE_PREFIX + supplier.getCode() + "-" + drawDate)
                    .status(ReturnBatchStatus.PENDING_INSPECTION)
                    .totalQuantity(0)
                    .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                    .createdAt(now)
                    .updatedAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .lastModifiedBy(SYSTEM_ACTOR)
                    .build();
        }
        batch = returnBatchRepository.save(batch);

        Map<Long, LotteryStationEntity> stationsById = new LinkedHashMap<>();
        List<ImportBatchLineEntity> allImportLines = new ArrayList<>();
        for (ImportBatchEntity importBatch : importBatches) {
            List<ImportBatchLineEntity> lines =
                    importBatchLineRepository.findByImportBatch_IdAndDeletedAtIsNull(importBatch.getId());
            for (ImportBatchLineEntity line : lines) {
                if (line.getLotteryStation() == null) {
                    continue;
                }
                if (line.getStatus() == ImportBatchLineStatus.CANCELLED) {
                    continue;
                }
                allImportLines.add(line);
                LotteryStationEntity station = line.getLotteryStation();
                if (station.getId() != null) {
                    stationsById.putIfAbsent(station.getId(), station);
                }
            }
        }

        int createdLines = 0;

        List<LotteryStationEntity> stations = stationsById.values().stream()
                .sorted(Comparator.comparing(
                        s -> s.getName() != null ? s.getName() : "",
                        String.CASE_INSENSITIVE_ORDER
                ))
                .toList();

        for (LotteryStationEntity station : stations) {
            StationTotals totals = calculateStationTotals(allImportLines, station.getId());
            ReturnBatchLineEntity line = ReturnBatchLineEntity.builder()
                    .returnBatch(batch)
                    .lotteryStation(station)
                    .status(ReturnBatchLineStatus.PENDING)
                    .totalQuantity(totals.quantity())
                    .totalReturnValue(ImportCostCalculator.scaleMoney(totals.value()))
                    .createdAt(now)
                    .updatedAt(now)
                    .createdBy(SYSTEM_ACTOR)
                    .lastModifiedBy(SYSTEM_ACTOR)
                    .build();
            returnBatchLineRepository.save(line);
            createdLines++;
        }

        List<ReturnBatchLineEntity> savedLines =
                returnBatchLineRepository.findByReturnBatch_IdAndDeletedAtIsNull(batch.getId());
        int headerQty = 0;
        BigDecimal headerValue = BigDecimal.ZERO;
        for (ReturnBatchLineEntity line : savedLines) {
            headerQty += line.getTotalQuantity() != null ? line.getTotalQuantity() : 0;
            if (line.getTotalReturnValue() != null) {
                headerValue = headerValue.add(line.getTotalReturnValue());
            }
        }
        batch.setTotalQuantity(headerQty);
        batch.setTotalReturnValue(ImportCostCalculator.scaleMoney(headerValue));
        batch.setStatus(ReturnBatchStatus.PENDING_INSPECTION);
        batch.setDeliveryMode(null);
        batch.setReturnedAt(null);
        batch.setReturnedBy(null);
        batch.setLines(savedLines);
        returnBatchRepository.save(batch);

        log.info(
                "Seeded return batch id={} supplier={} drawDate={} status={} lines={} qty={} value={} (from {} import batches, serials left unattached for inspection).",
                batch.getId(),
                supplier.getCode(),
                drawDate,
                batch.getStatus(),
                createdLines,
                headerQty,
                batch.getTotalReturnValue(),
                importBatches.size()
        );
        return new Result(createdLines, settlement.getId());
    }

    /**
     * Prefer an existing seed-tagged batch; otherwise the newest non-cancelled one.
     * Avoids NonUniqueResult when auto-cancel left a CANCELLED row beside the seed batch.
     */
    private Optional<ReturnBatchEntity> findSeedTargetReturnBatch(Long supplierId, LocalDate drawDate) {
        List<ReturnBatchEntity> existing =
                returnBatchRepository.findAllByLotterySupplier_IdAndDrawDateAndDeletedAtIsNull(
                        supplierId,
                        drawDate
                );
        if (existing.isEmpty()) {
            return Optional.empty();
        }
        return existing.stream()
                .filter(batch -> batch.getNote() != null && batch.getNote().startsWith(NOTE_PREFIX))
                .max(Comparator.comparing(ReturnBatchEntity::getId, Comparator.nullsLast(Long::compareTo)))
                .or(() -> existing.stream()
                        .filter(batch -> batch.getStatus() != ReturnBatchStatus.CANCELLED)
                        .max(Comparator.comparing(ReturnBatchEntity::getId, Comparator.nullsLast(Long::compareTo))))
                .or(() -> existing.stream()
                        .max(Comparator.comparing(ReturnBatchEntity::getId, Comparator.nullsLast(Long::compareTo))));
    }

    private StationTotals calculateStationTotals(List<ImportBatchLineEntity> importLines, Long stationId) {
        int quantity = 0;
        BigDecimal value = BigDecimal.ZERO;
        for (ImportBatchLineEntity importLine : importLines) {
            if (importLine.getLotteryStation() == null
                    || !Objects.equals(importLine.getLotteryStation().getId(), stationId)) {
                continue;
            }
            long eligibleCount = lotteryTicketSerialRepository.countReturnEligibleByImportBatchLineId(
                    importLine.getId()
            );
            if (eligibleCount <= 0) {
                continue;
            }
            BigDecimal unitCost = importLine.getImportCost() != null
                    ? importLine.getImportCost()
                    : BigDecimal.ZERO;
            quantity += (int) eligibleCount;
            value = value.add(unitCost.multiply(BigDecimal.valueOf(eligibleCount)));
        }
        return new StationTotals(quantity, value);
    }

    private SupplierSettlementEntity ensureSettlement(
            LotterySupplierEntity supplier,
            LocalDate drawDate,
            LocalDateTime now
    ) {
        return supplierSettlementRepository
                .findByLotterySupplier_IdAndPeriodFromAndDeletedAtIsNull(supplier.getId(), drawDate)
                .orElseGet(() -> {
                    int termDays = supplier.getPaymentTermDays() != null ? supplier.getPaymentTermDays() : 0;
                    if (termDays < 0) {
                        termDays = 0;
                    }
                    String code = supplierSettlementCodeGenerator.generateCode(drawDate);
                    SupplierSettlementEntity created = supplierSettlementRepository.save(
                            SupplierSettlementEntity.builder()
                                    .lotterySupplier(supplier)
                                    .periodFrom(drawDate)
                                    .periodTo(drawDate.plusDays(termDays))
                                    .supplierSettlementCode(code)
                                    .totalImportValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                                    .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                                    .totalPaidAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                                    .remainingAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                                    .status(SupplierSettlementStatus.OPEN)
                                    .createdAt(now)
                                    .updatedAt(now)
                                    .createdBy(SYSTEM_ACTOR)
                                    .lastModifiedBy(SYSTEM_ACTOR)
                                    .build()
                    );
                    log.info(
                            "Created seed supplier settlement id={} code={} supplier={} periodFrom={}",
                            created.getId(),
                            code,
                            supplier.getCode(),
                            drawDate
                    );
                    return created;
                });
    }

    private record SupplierDrawKey(Long supplierId, LocalDate drawDate) {
    }

    private record StationTotals(int quantity, BigDecimal value) {
    }

    private record Result(int lineCount, Long settlementId) {
    }
}
