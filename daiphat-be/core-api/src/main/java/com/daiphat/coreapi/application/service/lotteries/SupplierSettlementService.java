package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementStationInventoryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementKpisResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.ReturnBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.SupplierSettlementApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SettlementStationInventoryRow;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.SupplierSettlementCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupplierSettlementService implements SupplierSettlementServicePort {

    private static final Set<String> SORTABLE_FIELDS = Set.of(
            "id",
            "periodFrom",
            "periodTo",
            "supplierSettlementCode",
            "totalImportValue",
            "totalReturnValue",
            "totalPaidAmount",
            "remainingAmount",
            "status",
            "createdAt",
            "updatedAt"
    );

    private static final Map<String, String> SORT_FIELD_ALIASES = Map.of(
            "supplierName", "lotterySupplier.name",
            "supplierCode", "lotterySupplier.code",
            "supplierSettlementCode", "supplierSettlementCode"
    );

    private final SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;
    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final SupplierSettlementApplicationMapper supplierSettlementApplicationMapper;
    private final ImportBatchApplicationMapper importBatchApplicationMapper;
    private final ReturnBatchApplicationMapper returnBatchApplicationMapper;
    private final SupplierSettlementCodeGenerator supplierSettlementCodeGenerator;
    private final NotificationServicePort notificationService;
    private final UserRepositoryPort userRepositoryPort;
    private final Clock clock;

    @Override
    @Transactional
    public SupplierSettlementModel findOrCreateForImport(LotterySupplierModel supplier, LocalDate drawDate) {
        if (supplier == null || supplier.getId() == null) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_SUPPLIER_REQUIRED);
        }
        if (drawDate == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }

        return supplierSettlementRepositoryPort
                .findBySupplierIdAndPeriodFrom(supplier.getId(), drawDate)
                .orElseGet(() -> createForImport(supplier, drawDate));
    }

    @Override
    @Transactional
    public void recalculateTotalImportValue(Long settlementId) {
        recalculateAmounts(settlementId);
    }

    @Override
    @Transactional
    public void recalculateTotalReturnValue(Long settlementId) {
        recalculateAmounts(settlementId);
    }

    @Override
    @Transactional
    public void recalculateAmounts(Long settlementId) {
        if (settlementId == null) {
            return;
        }
        SupplierSettlementModel settlement = supplierSettlementRepositoryPort.findById(settlementId)
                .orElse(null);
        if (settlement == null) {
            log.warn("Skip settlement recalculation; settlement {} not found", settlementId);
            return;
        }

        BigDecimal totalImportValue = ImportCostCalculator.scaleMoney(
                supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(settlementId)
        );
        BigDecimal totalReturnValue = ImportCostCalculator.scaleMoney(
                supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(settlementId)
        );
        settlement.applyTotalImportValue(totalImportValue);
        settlement.applyTotalReturnValue(totalReturnValue);

        // Determine return cutoff expiration based on supplier's returnCutOffTime and periodFrom
        boolean isReturnExpired = false;
        BigDecimal expiredReturnValue = BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);

        if (settlement.getLotterySupplierId() != null && settlement.getPeriodFrom() != null) {
            LotterySupplierModel supplier = lotterySupplierRepositoryPort.findById(settlement.getLotterySupplierId())
                    .orElse(null);
            if (supplier != null && supplier.getReturnCutOffTime() != null) {
                LocalDateTime cutOffDateTime = LocalDateTime.of(settlement.getPeriodFrom(), supplier.getReturnCutOffTime());
                if (LocalDateTime.now(clock).isAfter(cutOffDateTime)) {
                    isReturnExpired = true;
                    expiredReturnValue = ImportCostCalculator.scaleMoney(
                            supplierSettlementRepositoryPort.sumExpiredReturnValueBySettlementId(settlementId)
                    );
                }
            }
        }
        settlement.setReturnExpired(isReturnExpired);
        settlement.applyExpiredReturnValue(expiredReturnValue);

        BigDecimal remainingAmount = BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);
        if (supplierSettlementRepositoryPort.existsCompletedInspectionReturnBatch(settlementId) || isReturnExpired) {
            BigDecimal paid = settlement.getTotalPaidAmount() != null
                    ? settlement.getTotalPaidAmount()
                    : BigDecimal.ZERO;
            // If return is expired past supplier cutoff time, supplier refuses return tickets => store must pay full import cost for all tickets (totalReturnValue deduction is forfeited)
            BigDecimal effectiveReturnValue = isReturnExpired
                    ? BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE)
                    : totalReturnValue;
            remainingAmount = ImportCostCalculator.scaleMoney(totalImportValue.subtract(effectiveReturnValue).subtract(paid));
            if (remainingAmount.signum() < 0) {
                remainingAmount = BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);
            }
        }
        settlement.applyRemainingAmount(remainingAmount);
        if (settlement.getStatus() == SupplierSettlementStatus.CLOSED && settlement.getPaidAt() == null) {
            settlement.setPaidAt(LocalDateTime.now(clock));
        }

        supplierSettlementRepositoryPort.save(settlement);
        log.debug(
                "Recalculated supplier settlement id={} totalImportValue={} totalReturnValue={} remainingAmount={} isReturnExpired={} expiredReturnValue={}",
                settlementId,
                totalImportValue,
                totalReturnValue,
                settlement.getRemainingAmount(),
                isReturnExpired,
                expiredReturnValue
        );
    }

    @Override
    @Transactional
    public int updateExpiredSettlements() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<SupplierSettlementModel> openSettlements = supplierSettlementRepositoryPort.findByStatus(SupplierSettlementStatus.OPEN);
        int updated = 0;
        for (SupplierSettlementModel settlement : openSettlements) {
            if (settlement.getLotterySupplierId() != null && settlement.getPeriodFrom() != null) {
                LotterySupplierModel supplier = lotterySupplierRepositoryPort.findById(settlement.getLotterySupplierId())
                        .orElse(null);
                if (supplier != null && supplier.getReturnCutOffTime() != null) {
                    LocalDateTime cutOffDateTime = LocalDateTime.of(settlement.getPeriodFrom(), supplier.getReturnCutOffTime());
                    if (now.isAfter(cutOffDateTime)) {
                        boolean wasExpired = settlement.isReturnExpired();
                        recalculateAmounts(settlement.getId());
                        SupplierSettlementModel refreshed = supplierSettlementRepositoryPort.findById(settlement.getId()).orElse(null);
                        if (refreshed != null && refreshed.isReturnExpired() && !wasExpired) {
                            updated++;
                            sendExpiredNotification(refreshed);
                        }
                    }
                }
            }
        }
        if (updated > 0) {
            log.info("Updated {} supplier settlement(s) past returnCutOffTime to isReturnExpired=true", updated);
        }
        return updated;
    }

    private void sendExpiredNotification(SupplierSettlementModel settlement) {
        if (settlement == null || notificationService == null || userRepositoryPort == null) {
            return;
        }
        String supplierName = settlement.getSupplierName() != null ? settlement.getSupplierName() : "Nhà cung cấp";
        String periodStr = (settlement.getPeriodFrom() != null ? settlement.getPeriodFrom().toString() : "")
                + (settlement.getPeriodTo() != null ? " đến " + settlement.getPeriodTo().toString() : "");
        String title = "Cảnh báo quá hạn trả vé nhà cung cấp";
        String content = "Kỳ đối soát của nhà cung cấp " + supplierName + " (" + periodStr
                + ") đã vượt quá mốc thời gian hạn trả vé quy định do chưa bàn giao hoặc bàn giao trễ.";

        userRepositoryPort.findAll().stream()
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .forEach(user -> {
                    NotificationModel notification = NotificationModel.builder()
                            .userId(user.getId())
                            .title(title)
                            .content(content)
                            .type(NotificationType.SYSTEM)
                            .channel(NotificationChannel.IN_APP)
                            .referenceId(String.valueOf(settlement.getId()))
                            .referenceType(NotificationReferenceType.SYSTEM)
                            .build();
                    notification.markAsSent();
                    notificationService.createNotification(notification);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SupplierSettlementResponse> getAll(
            int page,
            int size,
            Long lotterySupplierId,
            SupplierSettlementStatus status,
            LocalDate periodFrom,
            LocalDate periodTo,
            String search,
            String sortBy,
            String direction
    ) {
        PageRequest pageRequest = PageRequest.of(
                Math.max(page - 1, 0),
                size,
                SortUtils.createSort(resolveSortField(sortBy), direction)
        );
        Page<SupplierSettlementResponse> responsePage = supplierSettlementRepositoryPort
                .findAll(pageRequest, lotterySupplierId, status, periodFrom, periodTo, search)
                .map(supplierSettlementApplicationMapper::toResponse);
        return PageResponse.from(responsePage, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierSettlementResponse getById(Long id) {
        SupplierSettlementModel model = supplierSettlementRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND));
        return supplierSettlementApplicationMapper.toResponse(model);
    }

    @Override
    @Transactional
    public SupplierSettlementResponse updateReceiptUrl(Long settlementId, String supplierSettlementReceiptUrl) {
        SupplierSettlementModel settlement = supplierSettlementRepositoryPort.findById(settlementId)
                .orElseThrow(() -> new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND));
        String trimmed = supplierSettlementReceiptUrl != null ? supplierSettlementReceiptUrl.trim() : null;
        settlement.setSupplierSettlementReceiptUrl(
                trimmed == null || trimmed.isEmpty() ? null : trimmed
        );
        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
        log.info("Updated supplierSettlementReceiptUrl for settlementId={}", settlementId);
        return supplierSettlementApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SupplierSettlementOverviewResponse getOverview(Long id) {
        if (supplierSettlementRepositoryPort.findById(id).isEmpty()) {
            throw new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND);
        }
        recalculateAmounts(id);

        SupplierSettlementModel settlement = supplierSettlementRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND));
        SupplierSettlementResponse settlementResponse = supplierSettlementApplicationMapper.toResponse(settlement);

        List<ImportBatchResponse> importBatches = importBatchRepositoryPort.findBySupplierSettlementId(id).stream()
                .map(importBatchApplicationMapper::toResponse)
                .toList();
        List<ReturnBatchResponse> returnBatches = returnBatchRepositoryPort.findBySupplierSettlementId(id).stream()
                .map(returnBatchApplicationMapper::toResponse)
                .toList();

        List<SettlementStationInventoryRow> stationRows =
                lotteryTicketSerialRepositoryPort.aggregateInventoryByStationForSettlement(id);
        List<SettlementStationInventoryResponse> inventoryByStation = stationRows.stream()
                .map(row -> SettlementStationInventoryResponse.builder()
                        .lotteryStationId(row.lotteryStationId())
                        .lotteryStationName(row.lotteryStationName())
                        .importedQuantity((int) row.importedQuantity())
                        .soldQuantity((int) row.soldQuantity())
                        .remainingQuantity((int) row.remainingQuantity())
                        .damagedQuantity((int) row.damagedQuantity())
                        .lostQuantity((int) row.lostQuantity())
                        .voidedQuantity((int) row.voidedQuantity())
                        .returnQuantity((int) row.returnQuantity())
                        .returnValue(ImportCostCalculator.scaleMoney(row.returnValue()))
                        .build())
                .toList();

        int imported = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::importedQuantity).sum();
        int sold = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::soldQuantity).sum();
        int remaining = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::remainingQuantity).sum();
        int damaged = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::damagedQuantity).sum();
        int lost = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::lostQuantity).sum();
        int voided = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::voidedQuantity).sum();
        int preparedReturn = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::returnQuantity).sum();

        SupplierSettlementKpisResponse kpis = SupplierSettlementKpisResponse.builder()
                .totalImportedTickets(imported)
                .totalImportValue(settlementResponse.totalImportValue())
                .totalSoldTickets(sold)
                .totalRemainingTickets(remaining)
                .totalDamagedTickets(damaged)
                .totalLostTickets(lost)
                .totalVoidedTickets(voided)
                .totalPreparedForReturnTickets(preparedReturn)
                .totalReturnValue(settlementResponse.totalReturnValue())
                .remainingPayableAmount(settlementResponse.remainingAmount())
                .isReturnExpired(settlementResponse.isReturnExpired())
                .expiredReturnValue(settlementResponse.expiredReturnValue())
                .build();

        return SupplierSettlementOverviewResponse.builder()
                .settlement(settlementResponse)
                .kpis(kpis)
                .importBatches(importBatches)
                .returnBatches(returnBatches)
                .inventoryByStation(inventoryByStation)
                .build();
    }

    private SupplierSettlementModel createForImport(LotterySupplierModel supplier, LocalDate drawDate) {
        int paymentTermDays = supplier.getPaymentTermDays() != null ? supplier.getPaymentTermDays() : 0;
        if (paymentTermDays < 0) {
            paymentTermDays = 0;
        }
        LocalDate periodTo = drawDate.plusDays(paymentTermDays);

        SupplierSettlementModel created = SupplierSettlementModel.builder()
                .lotterySupplierId(supplier.getId())
                .periodFrom(drawDate)
                .periodTo(periodTo)
                .supplierSettlementCode(supplierSettlementCodeGenerator.generateCode(drawDate))
                .totalImportValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .totalPaidAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .remainingAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .status(SupplierSettlementStatus.OPEN)
                .build();

        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(created);
        log.info(
                "Created supplier settlement id={} code={} supplierId={} periodFrom={} periodTo={}",
                saved.getId(),
                saved.getSupplierSettlementCode(),
                supplier.getId(),
                drawDate,
                periodTo
        );
        return saved;
    }

    private String resolveSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "periodFrom";
        }
        if (SORT_FIELD_ALIASES.containsKey(sortBy)) {
            return SORT_FIELD_ALIASES.get(sortBy);
        }
        if (SORTABLE_FIELDS.contains(sortBy)) {
            return sortBy;
        }
        return "periodFrom";
    }
}
