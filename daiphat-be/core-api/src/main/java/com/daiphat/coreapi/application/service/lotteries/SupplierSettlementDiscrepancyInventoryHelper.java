package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.SettlementExcessImportTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SettlementImportPlaceholderRequest;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.ImportBatchCodeGenerator;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.ReturnBatchCodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Side-effect helpers for settlement import/return discrepancy resolution
 * (ADJUSTMENT import batches, LOST placeholders, excess inventory, excess return receipts).
 */
@Component
@RequiredArgsConstructor
public class SupplierSettlementDiscrepancyInventoryHelper {

    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final ImportBatchCodeGenerator importBatchCodeGenerator;
    private final LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final ReturnBatchCodeGenerator returnBatchCodeGenerator;
    private final ReturnBatchImportSyncService returnBatchImportSyncService;

    public List<Long> createLostPlaceholders(
            SupplierSettlementModel settlement,
            List<SettlementImportPlaceholderRequest> placeholders,
            BigDecimal unitCost,
            UUID actorId,
            LocalDateTime now,
            TicketCondition ticketCondition,
            String damagedEvidenceUrl,
            String reasonNote
    ) {
        if (placeholders == null || placeholders.isEmpty()) {
            return List.of();
        }
        TicketCondition condition = ticketCondition != null ? ticketCondition : TicketCondition.LOST;
        if (condition != TicketCondition.LOST
                && condition != TicketCondition.DAMAGED
                && condition != TicketCondition.VOIDED
                && condition != TicketCondition.UNDER_IMPORTED) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Tình trạng vé thiếu phải là LOST, DAMAGED, VOIDED hoặc UNDER_IMPORTED."
            );
        }
        if (condition == TicketCondition.DAMAGED
                && (damagedEvidenceUrl == null || damagedEvidenceUrl.isBlank())) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Vé hư hỏng / rách bắt buộc đính kèm ảnh minh chứng."
            );
        }

        String prefix = switch (condition) {
            case DAMAGED -> "DMG";
            case VOIDED -> "VOID";
            case UNDER_IMPORTED -> "MISS";
            default -> "LOST";
        };
        LotteryTicketSerialFaultedBy faultedBy =
                condition == TicketCondition.VOIDED || condition == TicketCondition.UNDER_IMPORTED
                        ? LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT
                        : LotteryTicketSerialFaultedBy.ISSUER_FAULT;
        String reason = (reasonNote != null && !reasonNote.isBlank())
                ? reasonNote.trim()
                : "Settlement import discrepancy " + condition.name() + " placeholder";
        String evidence = damagedEvidenceUrl != null && !damagedEvidenceUrl.isBlank()
                ? damagedEvidenceUrl.trim()
                : null;

        ImportBatchModel batch = createAdjustmentBatch(
                settlement, actorId, now, "ADJ-" + condition.name() + " reconciliation"
        );
        List<Long> createdSerialIds = new ArrayList<>();
        Map<Long, ImportBatchLineModel> lineByStation = new HashMap<>();

        for (SettlementImportPlaceholderRequest req : placeholders) {
            if (req == null || req.lotteryStationId() == null || req.quantity() == null || req.quantity() <= 0) {
                continue;
            }
            LotteryStationModel station = lotteryStationRepositoryPort.findById(req.lotteryStationId())
                    .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));
            ImportBatchLineModel line = lineByStation.computeIfAbsent(
                    station.getId(),
                    id -> createAdjustmentLine(batch, station, unitCost, now)
            );
            for (int i = 0; i < req.quantity(); i++) {
                String token = UUID.randomUUID().toString().replace("-", "");
                String numbers = prefix + "-" + token;
                String serialNumber = prefix + "-" + token;
                LotteryTicketModel ticket = lotteryTicketRepositoryPort.save(LotteryTicketModel.builder()
                        .stationId(station.getId())
                        .numbers(numbers)
                        .drawDate(settlement.getPeriodFrom())
                        .priceSnapshot(unitCost != null ? unitCost : station.getPrice())
                        .status(LotteryTicketStatus.IN_STOCK)
                        .active(true)
                        .quantity(1)
                        .importedById(actorId)
                        .importedAt(now)
                        .build());
                LotteryTicketSerialModel.LotteryTicketSerialModelBuilder serialBuilder = LotteryTicketSerialModel.builder()
                        .ticketId(ticket.getId())
                        .importBatchId(batch.getId())
                        .importBatchLineId(line.getId())
                        .serialNumber(serialNumber)
                        .stationId(station.getId())
                        .drawDate(settlement.getPeriodFrom())
                        .status(LotteryTicketSerialStatus.IN_STOCK)
                        .ticketCondition(condition)
                        .faultedBy(faultedBy)
                        .damagedReason(reason)
                        .importedById(actorId)
                        .importedAt(now);
                if (condition == TicketCondition.DAMAGED) {
                    serialBuilder.damagedEvidenceUrl(evidence);
                }
                LotteryTicketSerialModel saved = lotteryTicketSerialRepositoryPort.save(serialBuilder.build());
                createdSerialIds.add(saved.getId());
                bumpLineImported(line, unitCost);
            }
        }
        finalizeAdjustmentBatch(batch);
        return createdSerialIds;
    }

    public List<Long> createExcessGoodTickets(
            SupplierSettlementModel settlement,
            List<SettlementExcessImportTicketRequest> excessTickets,
            BigDecimal unitCost,
            UUID actorId,
            LocalDateTime now
    ) {
        if (excessTickets == null || excessTickets.isEmpty()) {
            return List.of();
        }
        ImportBatchModel batch = createAdjustmentBatch(settlement, actorId, now, "ADJ-EXCESS reconciliation");
        List<Long> createdSerialIds = new ArrayList<>();
        Map<Long, ImportBatchLineModel> lineByStation = new HashMap<>();

        for (SettlementExcessImportTicketRequest req : excessTickets) {
            if (req == null || req.lotteryStationId() == null
                    || req.numbers() == null || req.numbers().isBlank()
                    || req.serialNumber() == null || req.serialNumber().isBlank()) {
                continue;
            }
            String numbers = req.numbers().trim();
            String serialNumber = req.serialNumber().trim();
            LotteryStationModel station = lotteryStationRepositoryPort.findById(req.lotteryStationId())
                    .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND));
            if (lotteryTicketSerialRepositoryPort.findFirstBySerialNumber(serialNumber).isPresent()) {
                throw new DomainException(
                        ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED,
                        "Sê-ri đã tồn tại: " + serialNumber
                );
            }
            ImportBatchLineModel line = lineByStation.computeIfAbsent(
                    station.getId(),
                    id -> createAdjustmentLine(batch, station, unitCost, now)
            );
            LotteryTicketModel ticket = lotteryTicketRepositoryPort
                    .findByUniqueFields(station.getId(), numbers, settlement.getPeriodFrom())
                    .orElseGet(() -> lotteryTicketRepositoryPort.save(LotteryTicketModel.builder()
                            .stationId(station.getId())
                            .numbers(numbers)
                            .drawDate(settlement.getPeriodFrom())
                            .priceSnapshot(unitCost != null ? unitCost : station.getPrice())
                            .status(LotteryTicketStatus.IN_STOCK)
                            .active(true)
                            .quantity(1)
                            .importedById(actorId)
                            .importedAt(now)
                            .build()));
            LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                    .ticketId(ticket.getId())
                    .importBatchId(batch.getId())
                    .importBatchLineId(line.getId())
                    .serialNumber(serialNumber)
                    .stationId(station.getId())
                    .drawDate(settlement.getPeriodFrom())
                    .status(LotteryTicketSerialStatus.IN_STOCK)
                    .ticketCondition(TicketCondition.GOOD)
                    .importedById(actorId)
                    .importedAt(now)
                    .build();
            LotteryTicketSerialModel saved = lotteryTicketSerialRepositoryPort.save(serial);
            createdSerialIds.add(saved.getId());
            bumpLineImported(line, unitCost);
        }
        finalizeAdjustmentBatch(batch);
        // A good-ticket import adjustment is returnable inventory. If the normal
        // return batch is still open, include it immediately; never enrich the
        // separate EXCESS_SUPPLIER_RETURN adjustment receipt.
        returnBatchImportSyncService.refreshOpenPrimarySupplierReturn(
                settlement.getLotterySupplierId(),
                settlement.getPeriodFrom()
        );
        return createdSerialIds;
    }

    /**
     * Validates excess return serials, creates EXCESS_SUPPLIER_RETURN batch, attaches serials.
     * @return attached serial ids
     */
    public List<Long> acceptExcessReturnSerials(
            SupplierSettlementModel settlement,
            List<String> serialNumbers,
            BigDecimal unitCost,
            UUID actorId,
            LocalDateTime now
    ) {
        if (serialNumbers == null || serialNumbers.isEmpty()) {
            return List.of();
        }
        List<LotteryTicketSerialModel> serials = new ArrayList<>();
        for (String raw : serialNumbers) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String serialNumber = raw.trim();
            LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findFirstBySerialNumber(serialNumber)
                    .orElseThrow(() -> new DomainException(
                            ErrorCode.INVALID_INPUT,
                            "Không tìm thấy sê-ri: " + serialNumber
                    ));
            if (!Objects.equals(serial.getDrawDate(), settlement.getPeriodFrom())) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Sê-ri " + serialNumber + " không thuộc ngày kỳ đối soát."
                );
            }
            if (serial.getReturnBatchLineId() != null) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Sê-ri " + serialNumber + " đã gắn phiếu trả."
                );
            }
            if (serial.getTicketCondition() != null && serial.getTicketCondition() != TicketCondition.GOOD) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Sê-ri " + serialNumber + " không ở tình trạng GOOD."
                );
            }
            if (serial.getStatus() != LotteryTicketSerialStatus.IN_STOCK
                    && serial.getStatus() != LotteryTicketSerialStatus.EXPIRED) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Sê-ri " + serialNumber + " không đủ điều kiện trả."
                );
            }
            serials.add(serial);
        }
        if (serials.isEmpty()) {
            return List.of();
        }

        Map<Long, List<LotteryTicketSerialModel>> byStation = new LinkedHashMap<>();
        for (LotteryTicketSerialModel serial : serials) {
            byStation.computeIfAbsent(serial.getStationId(), k -> new ArrayList<>()).add(serial);
        }

        ReturnBatchModel batch = ReturnBatchModel.builder()
                .batchCode(returnBatchCodeGenerator.generateHeaderCode(settlement.getPeriodFrom()))
                .lotterySupplierId(settlement.getLotterySupplierId())
                .returnBatchType(ReturnBatchType.EXCESS_SUPPLIER_RETURN)
                .drawDate(settlement.getPeriodFrom())
                .supplierSettlementId(settlement.getId())
                .status(ReturnBatchStatus.PENDING_INSPECTION)
                .returnedBy(actorId)
                .returnedAt(now)
                .note("Nhập trả hàng thừa từ đối soát #" + settlement.getId())
                .lines(new ArrayList<>())
                .build();
        batch = returnBatchRepositoryPort.save(batch);

        List<Long> attachedIds = new ArrayList<>();
        for (Map.Entry<Long, List<LotteryTicketSerialModel>> entry : byStation.entrySet()) {
            ReturnBatchLineModel line = ReturnBatchLineModel.builder()
                    .returnBatchId(batch.getId())
                    .lotteryStationId(entry.getKey())
                    .status(ReturnBatchLineStatus.PENDING)
                    .totalQuantity(0)
                    .totalReturnValue(BigDecimal.ZERO)
                    .build();
            line = returnBatchRepositoryPort.saveLine(line);

            BigDecimal lineValue = BigDecimal.ZERO;
            for (LotteryTicketSerialModel serial : entry.getValue()) {
                serial.setReturnBatchLineId(line.getId());
                serial.setManualOverride(true);
                serial.setOverrideReason("Excess return during settlement reconciliation");
                lotteryTicketSerialRepositoryPort.save(serial);
                attachedIds.add(serial.getId());
                lineValue = lineValue.add(unitCost != null ? unitCost : BigDecimal.ZERO);
            }
            line.setTotalQuantity(entry.getValue().size());
            line.setTotalReturnValue(ImportCostCalculator.scaleMoney(lineValue));
            returnBatchRepositoryPort.saveLine(line);
        }

        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(batch.getId());
        batch.setLines(lines);
        batch.recalculateAggregates();
        batch.setStatus(ReturnBatchStatus.INSPECTING);
        returnBatchRepositoryPort.save(batch);
        return attachedIds;
    }

    private ImportBatchModel createAdjustmentBatch(
            SupplierSettlementModel settlement,
            UUID actorId,
            LocalDateTime now,
            String note
    ) {
        ImportBatchModel batch = ImportBatchModel.builder()
                .batchCode(importBatchCodeGenerator.generateHeaderCode(settlement.getPeriodFrom()))
                .drawDate(settlement.getPeriodFrom())
                .supplierId(settlement.getLotterySupplierId())
                .supplierSettlementId(settlement.getId())
                .importMode(ImportBatchImportMode.IN_DAY)
                .status(ImportBatchStatus.RECEIVING)
                .importedBy(actorId)
                .importedAt(now)
                .submittedAt(now)
                .note(note)
                .lines(new ArrayList<>())
                .build();
        return importBatchRepositoryPort.save(batch);
    }

    private ImportBatchLineModel createAdjustmentLine(
            ImportBatchModel batch,
            LotteryStationModel station,
            BigDecimal unitCost,
            LocalDateTime now
    ) {
        ImportBatchLineModel line = ImportBatchLineModel.builder()
                .importBatchId(batch.getId())
                .lotteryStationId(station.getId())
                .batchType(ImportBatchType.ADJUSTMENT)
                .batchCode(importBatchCodeGenerator.generateLineCode(station, ImportBatchType.ADJUSTMENT, batch.getDrawDate()))
                .declareQuantity(0)
                .declaredCostValue(BigDecimal.ZERO)
                .totalQuantity(0)
                .importCost(unitCost != null ? unitCost : station.getPrice())
                .totalCostValue(BigDecimal.ZERO)
                .status(ImportBatchLineStatus.IMPORTING)
                .importedAt(now)
                .build();
        return importBatchLineRepositoryPort.save(line);
    }

    private void bumpLineImported(ImportBatchLineModel line, BigDecimal unitCost) {
        int qty = (line.getTotalQuantity() != null ? line.getTotalQuantity() : 0) + 1;
        int declare = Math.max(line.getDeclareQuantity() != null ? line.getDeclareQuantity() : 0, qty);
        line.setTotalQuantity(qty);
        line.setDeclareQuantity(declare);
        BigDecimal cost = line.getImportCost() != null
                ? line.getImportCost()
                : (unitCost != null ? unitCost : BigDecimal.ZERO);
        line.setImportCost(cost);
        line.setTotalCostValue(ImportCostCalculator.scaleMoney(cost.multiply(BigDecimal.valueOf(qty))));
        line.setDeclaredCostValue(ImportCostCalculator.scaleMoney(cost.multiply(BigDecimal.valueOf(declare))));
        importBatchLineRepositoryPort.save(line);
    }

    private void finalizeAdjustmentBatch(ImportBatchModel batch) {
        List<ImportBatchLineModel> lines = importBatchLineRepositoryPort.findByImportBatchId(batch.getId());
        for (ImportBatchLineModel line : lines) {
            line.setStatus(ImportBatchLineStatus.IMPORTED);
            importBatchLineRepositoryPort.save(line);
        }
        batch.setLines(lines);
        batch.recalculateAggregates();
        batch.setStatus(ImportBatchStatus.IMPORTED);
        batch.setCompletedAt(LocalDateTime.now());
        importBatchRepositoryPort.save(batch);
    }
}
