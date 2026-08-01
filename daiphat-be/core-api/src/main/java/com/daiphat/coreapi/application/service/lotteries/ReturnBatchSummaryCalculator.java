package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Computes {@code totalQuantity} / {@code totalReturnValue} for return batch headers and lines.
 * <p>
 * Open for inspection and no attached serials yet: eligible {@code IN_STOCK} serials from
 * ImportBatchLines matching supplier + station + drawDate → {@code importCost × count}.
 * <p>
 * After serials are attached to the return batch: aggregates from attached serials only.
 * Header totals are always the sum of line totals.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReturnBatchSummaryCalculator {

    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;

    @Transactional
    public void recalculate(Long batchId) {
        if (batchId == null) {
            return;
        }
        ReturnBatchModel batch = returnBatchRepositoryPort.findById(batchId).orElse(null);
        if (batch == null) {
            return;
        }
        List<ReturnBatchLineModel> lines = returnBatchRepositoryPort.findLinesByBatchId(batchId);
        boolean hasAttached = lines.stream()
                .anyMatch(line -> lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(line.getId()) > 0);

        if (batch.getStatus() != null && batch.getStatus().isOpenForInspection() && !hasAttached) {
            recalculateFromEligibleImportInventory(batch, lines);
        } else {
            for (ReturnBatchLineModel line : lines) {
                recalculateFromAttachedSerials(line);
            }
        }

        lines = returnBatchRepositoryPort.findLinesByBatchId(batchId);
        batch = returnBatchRepositoryPort.findById(batchId).orElse(batch);
        batch.setLines(lines);
        batch.recalculateAggregates();
        returnBatchRepositoryPort.save(batch);

        log.debug(
                "Recalculated return batch summary id={} qty={} value={}",
                batchId,
                batch.getTotalQuantity(),
                batch.getTotalReturnValue()
        );
    }

    private void recalculateFromEligibleImportInventory(
            ReturnBatchModel batch,
            List<ReturnBatchLineModel> lines
    ) {
        for (ReturnBatchLineModel line : lines) {
            List<ImportBatchLineModel> importLines =
                    importBatchLineRepositoryPort.findEligibleBySupplierStationAndDrawDate(
                            batch.getLotterySupplierId(),
                            line.getLotteryStationId(),
                            batch.getDrawDate()
                    );

            int quantity = 0;
            BigDecimal value = BigDecimal.ZERO;
            for (ImportBatchLineModel importLine : importLines) {
                long eligibleCount = lotteryTicketSerialRepositoryPort.countByImportBatchLineIdAndStatus(
                        importLine.getId(),
                        LotteryTicketSerialStatus.IN_STOCK
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

            line.setTotalQuantity(quantity);
            line.setTotalReturnValue(ImportCostCalculator.scaleMoney(value));
            returnBatchRepositoryPort.saveLine(line);
        }
    }

    private void recalculateFromAttachedSerials(ReturnBatchLineModel line) {
        List<LotteryTicketSerialModel> serials =
                lotteryTicketSerialRepositoryPort.findAllByReturnBatchLineId(line.getId());
        int qty = serials.size();
        BigDecimal total = BigDecimal.ZERO;
        for (LotteryTicketSerialModel serial : serials) {
            BigDecimal unitCost = BigDecimal.ZERO;
            if (serial.getImportBatchLineId() != null) {
                unitCost = importBatchLineRepositoryPort.findById(serial.getImportBatchLineId())
                        .map(ImportBatchLineModel::getImportCost)
                        .orElse(BigDecimal.ZERO);
            }
            total = total.add(unitCost != null ? unitCost : BigDecimal.ZERO);
        }
        line.setTotalQuantity(qty);
        line.setTotalReturnValue(ImportCostCalculator.scaleMoney(total));
        returnBatchRepositoryPort.saveLine(line);
    }
}
