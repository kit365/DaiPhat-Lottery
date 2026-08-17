package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.ImportBatchOriginalFileBundle;
import com.daiphat.coreapi.application.dto.request.lotteries.AddSettlementMonetaryAdjustmentRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CompleteSettlementReconciliationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmSettlementMatchingRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SettlementMatchingAdjustmentItem;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveImportDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveReturnDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveUnitPriceDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementCompleteResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementImportFileCheckResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementImportFileCheckStationSummaryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementImportFileCheckTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementResolvableSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementStationInventoryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementStationPricingResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementAdjustmentResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementKpisResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ImportBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.ReturnBatchApplicationMapper;
import com.daiphat.coreapi.application.mapper.lotteries.SupplierSettlementApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchFileImportServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SettlementImportedSerialRow;
import com.daiphat.coreapi.application.port.out.lotteries.SettlementResolvableSerialRow;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementAdjustmentRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.dto.request.lotteries.ReportSerialFaultRequest;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentGroupType;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentReasonCode;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyType;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.SettlementStationInventoryRow;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementAdjustmentModel;
import com.daiphat.coreapi.domain.model.lotteries.SettlementDiscrepancyItem;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.daiphat.coreapi.shared.util.SupplierPaymentCutOffCalculator;
import com.daiphat.coreapi.shared.util.SupplierSettlementCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

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

    private static final Set<SupplierSettlementAdjustmentReasonCode> MONETARY_REASON_CODES = Set.of(
            SupplierSettlementAdjustmentReasonCode.SHIPPING_FEE,
            SupplierSettlementAdjustmentReasonCode.LATE_PENALTY,
            SupplierSettlementAdjustmentReasonCode.DISCOUNT,
            SupplierSettlementAdjustmentReasonCode.OTHER
    );

    static final String AUTO_PAYMENT_DIFFERENCE_NOTE =
            "Chênh lệch thanh toán so với biên lai (phát sinh ngoài kỳ)";
    private static final int MAX_PAYMENT_EVIDENCE_URLS = 10;

    private final SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;
    private final TransactionRepositoryPort transactionRepositoryPort;
    private final SupplierSettlementAdjustmentRepositoryPort supplierSettlementAdjustmentRepositoryPort;
    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final ReturnBatchRepositoryPort returnBatchRepositoryPort;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort;
    private final SupplierSettlementApplicationMapper supplierSettlementApplicationMapper;
    private final ImportBatchApplicationMapper importBatchApplicationMapper;
    private final ReturnBatchApplicationMapper returnBatchApplicationMapper;
    private final SupplierSettlementCodeGenerator supplierSettlementCodeGenerator;
    private final SupplierPaymentCutOffCalculator supplierPaymentCutOffCalculator;
    private final NotificationServicePort notificationService;
    private final UserRepositoryPort userRepositoryPort;
    private final SupplierSettlementDiscrepancyInventoryHelper discrepancyInventoryHelper;
    private final ObjectProvider<ImportBatchFileImportServicePort> importBatchFileImportService;
    private final StoragePort storagePort;
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
        refreshMatchingSystemTotals(settlement, settlementId, totalImportValue, totalReturnValue);

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
        if (settlement.getStatus() != SupplierSettlementStatus.CLOSED) {
            BigDecimal paid = settlement.getTotalPaidAmount() != null
                    ? settlement.getTotalPaidAmount()
                    : BigDecimal.ZERO;
            // Only HANDED_OVER/RECEIVED returns are included in totalReturnValue. Once the cutoff
            // has passed, even those returns no longer reduce the supplier payable.
            BigDecimal effectiveReturnValue = isReturnExpired
                    ? BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE)
                    : totalReturnValue;
            remainingAmount = ImportCostCalculator.scaleMoney(totalImportValue.subtract(effectiveReturnValue).subtract(paid));
            if (remainingAmount.signum() < 0) {
                remainingAmount = BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);
            }
        } else {
            // Closed settlements are immutable snapshots. The settlement outcome may
            // legitimately be a supplier credit, but there is never an open payable.
            remainingAmount = BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);
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

    /**
     * Matching UI reads {@code systemReturnQuantity/Value}, not {@code totalReturnValue}.
     * Keep those snapshot fields in sync with HANDED_OVER/RECEIVED serials until the
     * settlement is closed, so a handover after the first confirm still shows on the form.
     */
    private void refreshMatchingSystemTotals(
            SupplierSettlementModel settlement,
            Long settlementId,
            BigDecimal totalImportValue,
            BigDecimal totalReturnValue
    ) {
        if (!shouldRefreshMatchingSystemTotals(settlement)) {
            return;
        }
        settlement.setSystemImportQuantity(
                (int) supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(settlementId)
        );
        settlement.setSystemImportValue(totalImportValue);
        settlement.setSystemReturnQuantity(
                (int) supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(settlementId)
        );
        settlement.setSystemReturnValue(totalReturnValue);
    }

    private boolean shouldRefreshMatchingSystemTotals(SupplierSettlementModel settlement) {
        if (settlement.getStatus() == SupplierSettlementStatus.CLOSED) {
            return false;
        }
        return settlement.getReconciliationPhase() != SupplierSettlementReconciliationPhase.COMPLETED;
    }

    @Override
    @Transactional
    public int updateExpiredSettlements() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<SupplierSettlementModel> openSettlements = supplierSettlementRepositoryPort.findByStatuses(
                List.of(SupplierSettlementStatus.OPEN, SupplierSettlementStatus.RECEIPT_OVERDUE)
        );
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

    @Override
    @Transactional
    public int markReceiptOverdueSettlements() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<SupplierSettlementModel> openSettlements =
                supplierSettlementRepositoryPort.findByStatus(SupplierSettlementStatus.OPEN);
        int updated = 0;
        for (SupplierSettlementModel settlement : openSettlements) {
            if (settlement.getPeriodFrom() == null || settlement.getLotterySupplierId() == null) {
                continue;
            }
            LotterySupplierModel supplier = lotterySupplierRepositoryPort.findById(settlement.getLotterySupplierId())
                    .orElse(null);
            if (supplier == null || supplier.getPaymentCutOffTime() == null) {
                continue;
            }
            LocalTime paymentCutOff = supplier.getPaymentCutOffTime();
            LocalDateTime deadlineAt = LocalDateTime.of(settlement.getPeriodFrom(), paymentCutOff);
            if (!now.isAfter(deadlineAt)) {
                continue;
            }
            settlement.setStatus(SupplierSettlementStatus.RECEIPT_OVERDUE);
            SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
            sendPaymentOverdueNotification(saved, paymentCutOff);
            updated++;
        }
        if (updated > 0) {
            log.info("Marked {} supplier settlement(s) as payment-overdue past supplier paymentCutOff", updated);
        }
        return updated;
    }

    private void sendPaymentOverdueNotification(SupplierSettlementModel settlement, LocalTime paymentCutOff) {
        if (settlement == null || notificationService == null || userRepositoryPort == null) {
            return;
        }
        String supplierName = settlement.getSupplierName() != null ? settlement.getSupplierName() : "Nhà cung cấp";
        String code = settlement.getSupplierSettlementCode() != null
                ? settlement.getSupplierSettlementCode()
                : String.valueOf(settlement.getId());
        String periodStr = settlement.getPeriodFrom() != null ? settlement.getPeriodFrom().toString() : "";
        if (settlement.getPeriodTo() != null) {
            periodStr = periodStr + " đến " + settlement.getPeriodTo();
        }
        String cutOffLabel = paymentCutOff != null ? paymentCutOff.toString() : "-";
        String title = "Trễ hạn thanh toán nhà cung cấp";
        String content = "Kỳ đối soát " + code + " của " + supplierName
                + " (" + periodStr + ") đã quá giờ thanh toán NCC (" + cutOffLabel
                + ") mà chưa hoàn tất đối soát / chốt thanh toán.";

        userRepositoryPort.findAllByRoleCodes(List.of(RoleConstants.ADMIN)).stream()
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
        if (settlement.getStatus() == SupplierSettlementStatus.CLOSED) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Không thể cập nhật biên lai khi kỳ đối soát đã chốt"
            );
        }
        String trimmed = supplierSettlementReceiptUrl != null ? supplierSettlementReceiptUrl.trim() : null;
        String nextUrl = trimmed == null || trimmed.isEmpty() ? null : trimmed;
        String previousUrl = settlement.getSupplierSettlementReceiptUrl();
        if (previousUrl != null && !previousUrl.isBlank()
                && (nextUrl == null || !previousUrl.trim().equals(nextUrl))) {
            deleteStoredUrlQuietly(previousUrl);
        }
        settlement.setSupplierSettlementReceiptUrl(nextUrl);
        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
        log.info("Updated supplierSettlementReceiptUrl for settlementId={}", settlementId);
        return supplierSettlementApplicationMapper.toResponse(saved);
    }

    private void deleteStoredUrlQuietly(String url) {
        try {
            String key = StorageUtils.extractStorageKeyFromUrl(url);
            if (key != null && !key.isBlank()) {
                storagePort.delete(key);
            }
        } catch (Exception ex) {
            log.warn("Failed to hard-delete stored file for url={}: {}", url, ex.getMessage());
        }
    }

    @Override
    @Transactional
    public SupplierSettlementResponse updatePaymentEvidenceUrls(
            Long settlementId,
            List<String> paymentEvidenceUrls
    ) {
        SupplierSettlementModel settlement = supplierSettlementRepositoryPort.findById(settlementId)
                .orElseThrow(() -> new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND));
        if (settlement.getStatus() == SupplierSettlementStatus.CLOSED
                || settlement.getReconciliationPhase() == SupplierSettlementReconciliationPhase.COMPLETED) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Không thể cập nhật ảnh thanh toán khi kỳ đối soát đã hoàn tất."
            );
        }
        settlement.setPaymentEvidenceUrls(normalizePaymentEvidenceUrls(paymentEvidenceUrls));
        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
        log.info(
                "Updated paymentEvidenceUrls for settlementId={}, count={}",
                settlementId,
                saved.getPaymentEvidenceUrls() != null ? saved.getPaymentEvidenceUrls().size() : 0
        );
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

        // Live HANDED_OVER/RECEIVED serials are already written by recalculateAmounts.
        // Prefill actuals + matching baseline only before the first confirm.
        if (settlement.getMatchingConfirmedAt() == null) {
            if (settlement.getActualTicketImportQuantity() == null) {
                settlement.setActualTicketImportQuantity(settlement.getSystemImportQuantity());
            }
            if (settlement.getActualTicketImportValue() == null) {
                settlement.setActualTicketImportValue(settlement.getSystemImportValue());
            }
            if (settlement.getActualReturnTicketQuantity() == null) {
                settlement.setActualReturnTicketQuantity(settlement.getSystemReturnQuantity());
            }
            if (settlement.getActualReturnTicketValue() == null) {
                settlement.setActualReturnTicketValue(settlement.getSystemReturnValue());
            }

            BigDecimal originalUnitPrice = resolveOriginalTicketUnitPrice(
                    settlement,
                    settlement.getSystemImportQuantity() != null ? settlement.getSystemImportQuantity() : 0,
                    settlement.getSystemImportValue()
            );
            settlement.setOriginalTicketUnitPrice(originalUnitPrice);

            // Baseline before any user reconciliation adjustments (preview; not persisted until confirm).
            // Do NOT mirror baseline into finalSettlementValue — that field is only set after adjustments.
            BigDecimal baseline = computeInitialEstimatedSettlementValue(
                    originalUnitPrice,
                    settlement.getSystemImportQuantity() != null ? settlement.getSystemImportQuantity() : 0,
                    settlement.getSystemReturnQuantity() != null ? settlement.getSystemReturnQuantity() : 0
            );
            settlement.setInitialEstimatedSettlementValue(baseline);
            settlement.setFinalSettlementValue(null);
            settlement.setSettlementDifferenceAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE));
        } else if (settlement.getInitialEstimatedSettlementValue() == null) {
            // Heal rows that lost baseline after column rename / partial migration.
            BigDecimal originalUnitPrice = resolveOriginalTicketUnitPrice(
                    settlement,
                    settlement.getSystemImportQuantity() != null ? settlement.getSystemImportQuantity() : 0,
                    settlement.getSystemImportValue()
            );
            if (settlement.getOriginalTicketUnitPrice() == null) {
                settlement.setOriginalTicketUnitPrice(originalUnitPrice);
            }
            BigDecimal baseline = computeInitialEstimatedSettlementValue(
                    originalUnitPrice,
                    settlement.getSystemImportQuantity() != null ? settlement.getSystemImportQuantity() : 0,
                    settlement.getSystemReturnQuantity() != null ? settlement.getSystemReturnQuantity() : 0
            );
            settlement.freezeInitialEstimatedSettlementValue(baseline);
            if (settlement.getFinalSettlementValue() != null) {
                settlement.applyFinalSettlementValue(settlement.getFinalSettlementValue());
            }
        }

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

        List<SettlementStationPricingResponse> stationPricing = buildStationPricing(importBatches, inventoryByStation);
        if (settlement.getMatchingConfirmedAt() == null) {
            applyAfterCommissionMatchingBaseline(settlement, stationPricing);
            settlementResponse = supplierSettlementApplicationMapper.toResponse(settlement);
        } else if (healFaceValueUnitPriceDiscrepancy(settlement, stationPricing)) {
            settlement = supplierSettlementRepositoryPort.save(settlement);
            settlementResponse = supplierSettlementApplicationMapper.toResponse(settlement);
        }

        int imported = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::importedQuantity).sum();
        int sold = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::soldQuantity).sum();
        int remaining = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::remainingQuantity).sum();
        int damaged = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::damagedQuantity).sum();
        int lost = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::lostQuantity).sum();
        int voided = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::voidedQuantity).sum();
        int preparedReturn = inventoryByStation.stream().mapToInt(SettlementStationInventoryResponse::returnQuantity).sum();
        int expiredReturnTickets = (int) supplierSettlementRepositoryPort.countExpiredReturnTicketsBySettlementId(id);

        SupplierSettlementKpisResponse kpis = SupplierSettlementKpisResponse.builder()
                .totalImportedTickets(imported)
                .totalImportValue(settlementResponse.totalImportValue())
                .totalSoldTickets(sold)
                .totalRemainingTickets(remaining)
                .totalDamagedTickets(damaged)
                .totalLostTickets(lost)
                .totalVoidedTickets(voided)
                .totalPreparedForReturnTickets(preparedReturn)
                .totalExpiredReturnTickets(expiredReturnTickets)
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
                .stationPricing(stationPricing)
                .adjustments(
                        supplierSettlementAdjustmentRepositoryPort.findBySettlementId(id).stream()
                                .map(this::toAdjustmentResponse)
                                .toList()
                )
                .build();
    }

    @Override
    @Transactional
    public SupplierSettlementResponse confirmMatching(
            Long settlementId,
            ConfirmSettlementMatchingRequest request,
            UUID actorId
    ) {
        SupplierSettlementModel settlement = requireOpenSettlement(settlementId);
        ensureReconciliationWindowOpen(settlement);
        assertPhaseAllowsMatching(settlement);
        // A rematch replaces the price evidence; any prior unit-price adjustment must
        // not leak into the next recalculation.
        supplierSettlementAdjustmentRepositoryPort.deleteBySettlementIdAndGroupTypeAndReasonCode(
                settlementId,
                SupplierSettlementAdjustmentGroupType.IMPORT,
                SupplierSettlementAdjustmentReasonCode.WRONG_DENOMINATION
        );

        boolean missingImportReceipt = importBatchRepositoryPort.findBySupplierSettlementId(settlementId).stream()
                .anyMatch(batch -> batch.getInvoiceEvidenceUrl() == null || batch.getInvoiceEvidenceUrl().isBlank());
        if (missingImportReceipt) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần tải ảnh biên lai phiếu nhập lô trước khi xác nhận đối chiếu."
            );
        }

        boolean missingTicketListImages = importBatchRepositoryPort.findBySupplierSettlementId(settlementId).stream()
                .anyMatch(batch -> batch.getTicketListImageUrls() == null || batch.getTicketListImageUrls().isEmpty());
        if (missingTicketListImages) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần tải ảnh danh sách vé nhập của phiếu nhập lô trước khi xác nhận đối chiếu."
            );
        }

        int systemImportQty = (int) supplierSettlementRepositoryPort.countImportedTicketsBySettlementId(settlementId);
        BigDecimal systemImportVal = ImportCostCalculator.scaleMoney(
                supplierSettlementRepositoryPort.sumImportedCostValueBySettlementId(settlementId)
        );
        int systemReturnQty = (int) supplierSettlementRepositoryPort.countPreparedReturnTicketsBySettlementId(settlementId);
        BigDecimal systemReturnVal = ImportCostCalculator.scaleMoney(
                supplierSettlementRepositoryPort.sumPreparedReturnValueBySettlementId(settlementId)
        );

        if (request.actualTicketImportQuantity() == null || request.actualReturnTicketQuantity() == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Số lượng nhập và số lượng trả thực tế là bắt buộc.");
        }
        int actualImportQty = request.actualTicketImportQuantity();
        int actualReturnQty = request.actualReturnTicketQuantity();
        if (actualReturnQty > actualImportQty) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Số lượng vé trả thực tế không được lớn hơn số lượng vé nhập thực tế."
            );
        }

        BigDecimal originalUnitPrice = resolveOriginalTicketUnitPriceFromStations(
                settlementId,
                systemImportQty,
                systemImportVal
        );

        BigDecimal reconciledUnitPrice = request.reconciledTicketUnitPrice();
        if (reconciledUnitPrice == null && request.actualTicketImportValue() != null && actualImportQty > 0) {
            reconciledUnitPrice = request.actualTicketImportValue().divide(
                    BigDecimal.valueOf(actualImportQty),
                    3,
                    java.math.RoundingMode.HALF_UP
            );
        }
        if (reconciledUnitPrice == null) {
            reconciledUnitPrice = originalUnitPrice;
        }
        reconciledUnitPrice = ImportCostCalculator.scaleMoney(reconciledUnitPrice);
        if (reconciledUnitPrice.signum() <= 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Đơn giá vé đối soát phải lớn hơn 0.");
        }

        BigDecimal actualImportVal = request.actualTicketImportValue() != null
                ? ImportCostCalculator.scaleMoney(request.actualTicketImportValue())
                : ImportCostCalculator.scaleMoney(reconciledUnitPrice.multiply(BigDecimal.valueOf(actualImportQty)));

        BigDecimal actualReturnVal = request.actualReturnTicketValue() != null
                ? ImportCostCalculator.scaleMoney(request.actualReturnTicketValue())
                : ImportCostCalculator.scaleMoney(reconciledUnitPrice.multiply(BigDecimal.valueOf(actualReturnQty)));
        BigDecimal expectedImportVal = ImportCostCalculator.scaleMoney(
                reconciledUnitPrice.multiply(BigDecimal.valueOf(actualImportQty))
        );
        BigDecimal expectedReturnVal = ImportCostCalculator.scaleMoney(
                reconciledUnitPrice.multiply(BigDecimal.valueOf(actualReturnQty))
        );
        if (actualImportVal.compareTo(expectedImportVal) != 0 || actualReturnVal.compareTo(expectedReturnVal) != 0) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Giá trị nhập/trả thực tế phải bằng số lượng thực tế × đơn giá vé đối soát."
            );
        }

        // Baseline from original/system data — frozen on first confirm, never overwritten on rematch.
        BigDecimal baselineInitial = computeInitialEstimatedSettlementValue(
                originalUnitPrice,
                systemImportQty,
                systemReturnQty
        );
        boolean importQtyMismatch = actualImportQty != systemImportQty;
        boolean importValMismatch = actualImportVal.compareTo(systemImportVal) != 0;
        boolean returnQtyMismatch = actualReturnQty != systemReturnQty;
        boolean returnValMismatch = actualReturnVal.compareTo(systemReturnVal) != 0;
        if (request.actualPaidAmount() == null) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Giá trị thực trả từ biên lai là bắt buộc."
            );
        }
        BigDecimal ticketNetFromMatching = ImportCostCalculator.scaleMoney(
                reconciledUnitPrice.multiply(BigDecimal.valueOf((long) actualImportQty - actualReturnQty))
        );
        List<SettlementMatchingAdjustmentItem> resolvedCosts = resolvePaymentDifferenceAdjustments(
                ticketNetFromMatching,
                request.additionalCosts(),
                request.actualPaidAmount()
        );
        BigDecimal additionalCostTotal = persistMatchingAdditionalCosts(settlementId, resolvedCosts, actorId);
        BigDecimal finalFromMatching = ImportCostCalculator.scaleMoney(ticketNetFromMatching.add(additionalCostTotal));

        applyDetectedDiscrepancies(
                settlement,
                actualImportQty - systemImportQty,
                actualReturnQty - systemReturnQty,
                reconciledUnitPrice.subtract(originalUnitPrice),
                importValMismatch,
                returnValMismatch
        );

        settlement.setSystemImportQuantity(systemImportQty);
        settlement.setSystemImportValue(systemImportVal);
        settlement.setSystemReturnQuantity(systemReturnQty);
        settlement.setSystemReturnValue(systemReturnVal);
        settlement.setActualTicketImportQuantity(actualImportQty);
        settlement.setActualTicketImportValue(actualImportVal);
        settlement.setActualReturnTicketQuantity(actualReturnQty);
        settlement.setActualReturnTicketValue(actualReturnVal);
        settlement.setOriginalTicketUnitPrice(originalUnitPrice);
        settlement.setReconciledTicketUnitPrice(reconciledUnitPrice);
        settlement.freezeInitialEstimatedSettlementValue(baselineInitial);
        settlement.applyFinalSettlementValue(finalFromMatching);
        settlement.applyActualPaidAmount(request.actualPaidAmount());
        // Rematching invalidates prior recalculation / payment-discrepancy outcome.
        settlement.setRecalculatedTotalPaidAmount(null);
        settlement.setMatchingConfirmedAt(LocalDateTime.now(clock));
        settlement.setMatchingConfirmedBy(actorId);
        if (request.reconciliationNote() != null && !request.reconciliationNote().isBlank()) {
            settlement.setReconciliationNote(request.reconciliationNote().trim());
        }

        if (settlement.hasUnresolvedDiscrepancies()) {
            settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED);
        } else {
            settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION);
        }

        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
        return supplierSettlementApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SettlementResolvableSerialResponse> listMissingReturnTickets(Long settlementId) {
        requireOpenSettlement(settlementId);
        return mapResolvableRows(
                supplierSettlementRepositoryPort.findPreparedReturnSerialsBySettlementId(settlementId)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<SettlementResolvableSerialResponse> listImportResolvableTickets(Long settlementId) {
        requireOpenSettlement(settlementId);
        return mapResolvableRows(
                supplierSettlementRepositoryPort.findImportResolvableSerialsBySettlementId(settlementId)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public SettlementImportFileCheckResponse checkImportFiles(Long settlementId) {
        SupplierSettlementModel settlement = requireOpenSettlement(settlementId);
        List<ImportBatchModel> batches = importBatchRepositoryPort.findBySupplierSettlementId(settlementId);
        List<Long> batchIds = batches.stream().map(ImportBatchModel::getId).toList();
        Map<Long, String> batchCodes = new LinkedHashMap<>();
        for (ImportBatchModel batch : batches) {
            batchCodes.put(batch.getId(), batch.getBatchCode());
        }

        ImportBatchOriginalFileBundle fileSide = importBatchFileImportService.getObject()
                .loadOriginalFilesForSettlementBatches(
                        batchIds,
                        batchCodes,
                        settlement.getLotterySupplierId(),
                        settlement.getPeriodFrom()
                );

        List<SettlementImportFileCheckTicketResponse> systemTickets =
                supplierSettlementRepositoryPort.findImportedSerialsForFileCheck(settlementId).stream()
                        .map(this::toFileCheckTicket)
                        .toList();

        List<SettlementImportFileCheckTicketResponse> fileTickets = fileSide.tickets();
        FileCheckDiff diff = diffFileAndSystem(fileTickets, systemTickets);
        List<SettlementImportFileCheckStationSummaryResponse> summaries = buildFileCheckStationSummaries(
                fileSide,
                systemTickets,
                diff.onlyInSystem(),
                diff.onlyInFile()
        );

        return SettlementImportFileCheckResponse.builder()
                .files(fileSide.files())
                .fileTickets(fileTickets)
                .systemTickets(systemTickets)
                .matchedCount(diff.matchedCount())
                .onlyInSystem(diff.onlyInSystem())
                .onlyInFile(diff.onlyInFile())
                .stationSummaries(summaries)
                .importsTickets(fileSide.importsTickets())
                .build();
    }

    @Override
    @Transactional
    public SupplierSettlementResponse resolveImportDiscrepancy(
            Long settlementId,
            ResolveImportDiscrepancyRequest request,
            UUID actorId
    ) {
        SupplierSettlementModel settlement = requireOpenSettlement(settlementId);
        ensureReconciliationWindowOpen(settlement);
        if (!settlement.needsImportResolution()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Không có chênh lệch số lượng nhập cần xử lý.");
        }
        SettlementDiscrepancyItem importItem = requireDiscrepancyItem(
                settlement, SupplierSettlementDiscrepancyType.IMPORT_QUANTITY
        );
        boolean hasMissing = request.missingPlaceholders() != null && !request.missingPlaceholders().isEmpty();
        boolean hasExcess = request.excessTickets() != null && !request.excessTickets().isEmpty();
        boolean hasExistingFault = request.serialIds() != null && !request.serialIds().isEmpty()
                && request.ticketCondition() != null;
        boolean hasValueAdjustment = request.adjustmentAmount() != null
                && request.adjustmentAmount().compareTo(BigDecimal.ZERO) != 0;
        int requiredQuantity = importItem.getDifference() != null
                ? importItem.getDifference().abs().intValue()
                : 0;
        if (request.markResolved() && !hasMissing && !hasExcess
                && (request.serialIds() == null || request.serialIds().isEmpty())
                && !hasValueAdjustment) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần ghi nhận serial/vé xử lý hoặc một khoản điều chỉnh trước khi xác nhận đã xử lý chênh lệch nhập."
            );
        }
        if (importItem.isNegative() && (hasExcess || hasMissing)) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Hệ thống ghi thừa nhập (âm): hãy chọn trực tiếp các sê-ri đã được ghi nhận trong ngày để xử lý, không tạo vé mới."
            );
        }
        if (importItem.isPositive() && hasExistingFault) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Hệ thống ghi thiếu nhập (dương): chỉ được tạo các vé bổ sung theo nhà đài, không xử lý sê-ri đã tồn tại."
            );
        }
        if (importItem.isNegative() && request.markResolved()) {
            List<Long> requestedSerialIds = request.serialIds() != null ? request.serialIds() : List.of();
            long distinctCount = requestedSerialIds.stream().filter(Objects::nonNull).distinct().count();
            if (!hasExistingFault || distinctCount != requiredQuantity) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Cần chọn đúng " + requiredQuantity
                                + " sê-ri đã nhập trong ngày và ghi tình trạng vé để xử lý số vé hệ thống ghi thừa."
                );
            }
            java.util.Set<Long> eligibleSerialIds = supplierSettlementRepositoryPort
                    .findImportResolvableSerialsBySettlementId(settlementId)
                    .stream()
                    .filter(Objects::nonNull)
                    .map(com.daiphat.coreapi.application.port.out.lotteries.SettlementResolvableSerialRow::serialId)
                    .collect(java.util.stream.Collectors.toSet());
            if (!eligibleSerialIds.containsAll(requestedSerialIds)) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Chỉ được chọn sê-ri thuộc các lô nhập của ngày đối soát và đang ở trạng thái GOOD."
                );
            }
        }
        if (importItem.isPositive() && hasExcess) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Hệ thống ghi thiếu nhập (dương): hãy phân bổ số vé cần bổ sung theo nhà đài."
            );
        }
        if (hasMissing) {
            TicketCondition missingCondition = request.ticketCondition() != null
                    ? request.ticketCondition()
                    : TicketCondition.LOST;
            if (missingCondition != TicketCondition.LOST
                    && missingCondition != TicketCondition.DAMAGED
                    && missingCondition != TicketCondition.VOIDED) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Tình trạng vé thiếu phải là LOST, DAMAGED hoặc VOIDED."
                );
            }
            if (missingCondition == TicketCondition.DAMAGED
                    && (request.damagedEvidenceUrl() == null || request.damagedEvidenceUrl().isBlank())) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Vé hư hỏng / rách bắt buộc đính kèm ảnh minh chứng."
                );
            }
            int placeholderQty = request.missingPlaceholders().stream()
                    .filter(Objects::nonNull)
                    .mapToInt(p -> p.quantity() != null ? p.quantity() : 0)
                    .sum();
            if (requiredQuantity > 0 && placeholderQty != requiredQuantity) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Tổng số lượng vé bổ sung theo nhà đài phải đúng "
                                + requiredQuantity
                                + " vé (hiện tại: "
                                + placeholderQty
                                + ")."
                );
            }
        }
        settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.RESOLVING_IMPORT_DISCREPANCY);

        List<Long> serialIds = request.serialIds() != null ? new ArrayList<>(request.serialIds()) : new ArrayList<>();
        BigDecimal unitCost = settlement.getOriginalTicketUnitPrice() != null
                ? settlement.getOriginalTicketUnitPrice()
                : resolveOriginalTicketUnitPrice(
                        settlement,
                        settlement.getSystemImportQuantity() != null ? settlement.getSystemImportQuantity() : 0,
                        settlement.getSystemImportValue()
                );
        LocalDateTime now = LocalDateTime.now(clock);

        if (request.missingPlaceholders() != null && !request.missingPlaceholders().isEmpty()) {
            TicketCondition missingCondition = request.ticketCondition() != null
                    ? request.ticketCondition()
                    : TicketCondition.LOST;
            List<Long> created = discrepancyInventoryHelper.createLostPlaceholders(
                    settlement,
                    request.missingPlaceholders(),
                    unitCost,
                    actorId,
                    now,
                    missingCondition,
                    request.damagedEvidenceUrl(),
                    request.note()
            );
            serialIds.addAll(created);
            for (Long serialId : created) {
                saveAdjustment(
                        settlementId,
                        serialId,
                        SupplierSettlementAdjustmentGroupType.IMPORT,
                        request.reasonCode() != null
                                ? request.reasonCode()
                                : SupplierSettlementAdjustmentReasonCode.MISSING_IMPORT,
                        BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE),
                        request.note(),
                        actorId
                );
            }
            recalculateAmounts(settlementId);
            settlement = supplierSettlementRepositoryPort.findById(settlementId)
                    .orElseThrow(() -> new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND));
        }

        if (request.excessTickets() != null && !request.excessTickets().isEmpty()) {
            List<Long> created = discrepancyInventoryHelper.createExcessGoodTickets(
                    settlement, request.excessTickets(), unitCost, actorId, now
            );
            serialIds.addAll(created);
            for (Long serialId : created) {
                saveAdjustment(
                        settlementId,
                        serialId,
                        SupplierSettlementAdjustmentGroupType.IMPORT,
                        request.reasonCode() != null
                                ? request.reasonCode()
                                : SupplierSettlementAdjustmentReasonCode.EXCESS_IMPORT,
                        BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE),
                        request.note(),
                        actorId
                );
            }
            recalculateAmounts(settlementId);
            settlement = supplierSettlementRepositoryPort.findById(settlementId)
                    .orElseThrow(() -> new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND));
        }

        List<Long> existingSerialIds = request.serialIds() != null ? request.serialIds() : List.of();
        BigDecimal perSerialAmount = request.adjustmentAmount() != null && !existingSerialIds.isEmpty()
                ? ImportCostCalculator.scaleMoney(
                        request.adjustmentAmount().divide(
                                BigDecimal.valueOf(existingSerialIds.size()),
                                ImportCostCalculator.COST_SCALE,
                                java.math.RoundingMode.HALF_UP
                        )
                )
                : null;

        for (Long serialId : existingSerialIds) {
            if (request.ticketCondition() != null) {
                LotteryTicketSerialFaultedBy faultedBy = request.ticketCondition() == TicketCondition.VOIDED
                        ? LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT
                        : LotteryTicketSerialFaultedBy.ISSUER_FAULT;
                lotteryTicketSerialServicePort.reportFault(
                        serialId,
                        new ReportSerialFaultRequest(
                                request.ticketCondition(),
                                faultedBy,
                                request.note(),
                                request.damagedEvidenceUrl(),
                                null,
                                null
                        ),
                        actorId
                );
            }
            BigDecimal amount = perSerialAmount != null
                    ? perSerialAmount
                    : resolveSerialImportCost(serialId);
            saveAdjustment(
                    settlementId,
                    serialId,
                    SupplierSettlementAdjustmentGroupType.IMPORT,
                    request.reasonCode(),
                    amount,
                    request.note(),
                    actorId
            );
        }

        boolean createdInventory = (request.missingPlaceholders() != null && !request.missingPlaceholders().isEmpty())
                || (request.excessTickets() != null && !request.excessTickets().isEmpty());
        if (existingSerialIds.isEmpty() && !createdInventory && request.adjustmentAmount() != null) {
            saveAdjustment(
                    settlementId,
                    null,
                    SupplierSettlementAdjustmentGroupType.IMPORT,
                    request.reasonCode(),
                    ImportCostCalculator.scaleMoney(request.adjustmentAmount()),
                    request.note(),
                    actorId
            );
        }

        if (request.markResolved()) {
            settlement.setImportDiscrepancyResolved(true);
        }
        advancePhaseAfterResolution(settlement);
        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
        return supplierSettlementApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SupplierSettlementResponse resolveReturnDiscrepancy(
            Long settlementId,
            ResolveReturnDiscrepancyRequest request,
            UUID actorId
    ) {
        SupplierSettlementModel settlement = requireOpenSettlement(settlementId);
        ensureReconciliationWindowOpen(settlement);
        if (!settlement.needsReturnResolution()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Không có chênh lệch số lượng trả cần xử lý.");
        }
        SettlementDiscrepancyItem returnItem = requireDiscrepancyItem(
                settlement, SupplierSettlementDiscrepancyType.RETURN_QUANTITY
        );
        List<Long> requestedSerialIds = request.serialIds() != null ? request.serialIds() : List.of();
        List<String> requestedExcess = request.excessSerialNumbers() != null
                ? request.excessSerialNumbers()
                : List.of();
        int requiredQuantity = returnItem.getDifference() != null
                ? returnItem.getDifference().abs().intValue()
                : 0;
        boolean hasValueAdjustment = request.adjustmentAmount() != null
                && request.adjustmentAmount().compareTo(BigDecimal.ZERO) != 0;
        boolean resolveExcessWithoutSerials = request.markResolved()
                && returnItem.isPositive()
                && requestedSerialIds.isEmpty()
                && requestedExcess.isEmpty()
                && !hasValueAdjustment;
        if (request.markResolved()
                && requestedSerialIds.isEmpty()
                && requestedExcess.isEmpty()
                && !hasValueAdjustment
                && !resolveExcessWithoutSerials) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần ghi nhận serial trả hoặc một khoản điều chỉnh trước khi xác nhận đã xử lý chênh lệch trả."
            );
        }
        if (returnItem.isNegative() && !requestedExcess.isEmpty()) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Hệ thống ghi thừa trả (âm): chỉ được xử lý các sê-ri đã ghi nhận thừa (LOST/hỏng/hủy/hết hạn), không bổ sung sê-ri trả."
            );
        }
        if (returnItem.isPositive() && !requestedSerialIds.isEmpty()) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Hệ thống ghi thiếu trả (dương): chỉ được quét bổ sung sê-ri đã trả thực tế, không xử lý sê-ri ghi thừa."
            );
        }
        if (returnItem.isNegative() && request.markResolved()) {
            long distinctCount = requestedSerialIds.stream().filter(Objects::nonNull).distinct().count();
            if (distinctCount != requiredQuantity) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Cần chọn đúng " + requiredQuantity
                                + " sê-ri đang có trong phiếu trả để ghi nhận tình trạng vé không thể trả."
                );
            }
            Set<Long> eligibleSerialIds = supplierSettlementRepositoryPort
                    .findPreparedReturnSerialsBySettlementId(settlementId)
                    .stream()
                    .filter(Objects::nonNull)
                    .map(SettlementResolvableSerialRow::serialId)
                    .collect(java.util.stream.Collectors.toSet());
            if (!eligibleSerialIds.containsAll(requestedSerialIds)) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Chỉ được chọn sê-ri thuộc phiếu trả của kỳ đối soát và đang ở tình trạng GOOD."
                );
            }
        }
        if (returnItem.isPositive() && request.markResolved() && !requestedExcess.isEmpty()) {
            long distinctCount = requestedExcess.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .distinct()
                    .count();
            if (distinctCount != requiredQuantity) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Cần bổ sung đúng " + requiredQuantity
                                + " sê-ri từ lô nhập của ngày đối soát vào phiếu trả."
                );
            }
        }
        settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.RESOLVING_RETURN_DISCREPANCY);

        List<Long> serialIds = request.serialIds() != null ? request.serialIds() : List.of();
        String resolution = request.resolution() != null ? request.resolution().trim().toUpperCase() : "";
        List<String> excessSerialNumbers = request.excessSerialNumbers() != null
                ? request.excessSerialNumbers()
                : List.of();

        if (!excessSerialNumbers.isEmpty()) {
            BigDecimal unitCost = settlement.getOriginalTicketUnitPrice() != null
                    ? settlement.getOriginalTicketUnitPrice()
                    : resolveOriginalTicketUnitPrice(
                            settlement,
                            settlement.getSystemImportQuantity() != null ? settlement.getSystemImportQuantity() : 0,
                            settlement.getSystemImportValue()
                    );
            List<Long> attached = discrepancyInventoryHelper.acceptExcessReturnSerials(
                    settlement,
                    excessSerialNumbers,
                    unitCost,
                    actorId,
                    LocalDateTime.now(clock)
            );
            for (Long serialId : attached) {
                saveAdjustment(
                        settlementId,
                        serialId,
                        SupplierSettlementAdjustmentGroupType.RETURN,
                        request.reasonCode() != null
                                ? request.reasonCode()
                                : SupplierSettlementAdjustmentReasonCode.EXCESS_RETURN,
                        BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE),
                        request.note(),
                        actorId
                );
            }
            recalculateAmounts(settlementId);
            settlement = supplierSettlementRepositoryPort.findById(settlementId)
                    .orElseThrow(() -> new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND));
        }

        if (!serialIds.isEmpty()
                && !"EXPIRED".equals(resolution)
                && !"LOST".equals(resolution)
                && !"DAMAGED".equals(resolution)
                && !"VOIDED".equals(resolution)) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "resolution phải là EXPIRED, LOST, DAMAGED hoặc VOIDED.");
        }

        BigDecimal perSerialAmount = request.adjustmentAmount() != null && !serialIds.isEmpty()
                ? ImportCostCalculator.scaleMoney(
                        request.adjustmentAmount().divide(
                                BigDecimal.valueOf(serialIds.size()),
                                ImportCostCalculator.COST_SCALE,
                                java.math.RoundingMode.HALF_UP
                        )
                )
                : null;

        for (Long serialId : serialIds) {
            if (serialId == null || serialId <= 0) {
                continue;
            }
            LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(serialId)
                    .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
            if ("EXPIRED".equals(resolution)) {
                if (serial.getStatus() == LotteryTicketSerialStatus.IN_STOCK
                        || serial.getStatus() == LotteryTicketSerialStatus.RESERVED
                        || serial.getStatus() == LotteryTicketSerialStatus.PROXY_HOLDING) {
                    serial.expire();
                    lotteryTicketSerialRepositoryPort.save(serial);
                }
            } else if ("LOST".equals(resolution) || "DAMAGED".equals(resolution) || "VOIDED".equals(resolution)) {
                TicketCondition condition = switch (resolution) {
                    case "DAMAGED" -> TicketCondition.DAMAGED;
                    case "VOIDED" -> TicketCondition.VOIDED;
                    default -> TicketCondition.LOST;
                };
                LotteryTicketSerialFaultedBy faultedBy = "VOIDED".equals(resolution)
                        ? LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT
                        : LotteryTicketSerialFaultedBy.LOST_DURING_RETURN;
                lotteryTicketSerialServicePort.reportFault(
                        serialId,
                        new ReportSerialFaultRequest(
                                condition,
                                faultedBy,
                                request.note(),
                                null,
                                null,
                                null
                        ),
                        actorId
                );
            }
            BigDecimal amount = perSerialAmount != null
                    ? perSerialAmount
                    : resolveSerialImportCost(serialId);
            saveAdjustment(
                    settlementId,
                    serialId,
                    SupplierSettlementAdjustmentGroupType.RETURN,
                    request.reasonCode() != null
                            ? request.reasonCode()
                            : ("EXPIRED".equals(resolution)
                                    ? SupplierSettlementAdjustmentReasonCode.EXPIRED_UNRETURNED
                                    : SupplierSettlementAdjustmentReasonCode.LOST_DURING_RETURN),
                    amount,
                    request.note(),
                    actorId
            );
        }

        if (serialIds.isEmpty() && excessSerialNumbers.isEmpty() && request.adjustmentAmount() != null) {
            saveAdjustment(
                    settlementId,
                    null,
                    SupplierSettlementAdjustmentGroupType.RETURN,
                    request.reasonCode() != null
                            ? request.reasonCode()
                            : SupplierSettlementAdjustmentReasonCode.OTHER,
                    ImportCostCalculator.scaleMoney(request.adjustmentAmount()),
                    request.note(),
                    actorId
            );
        }

        if (resolveExcessWithoutSerials) {
            String note = request.note() != null && !request.note().isBlank()
                    ? request.note()
                    : "Xác nhận bổ sung " + requiredQuantity
                            + " vé trả nhưng không còn vé GOOD đủ điều kiện để gắn sê-ri.";
            saveAdjustment(
                    settlementId,
                    null,
                    SupplierSettlementAdjustmentGroupType.RETURN,
                    request.reasonCode() != null
                            ? request.reasonCode()
                            : SupplierSettlementAdjustmentReasonCode.EXCESS_RETURN,
                    BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE),
                    note,
                    actorId
            );
        }

        if (request.markResolved()) {
            settlement.setReturnDiscrepancyResolved(true);
        }
        advancePhaseAfterResolution(settlement);
        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
        return supplierSettlementApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SupplierSettlementResponse resolveUnitPriceDiscrepancy(
            Long settlementId,
            ResolveUnitPriceDiscrepancyRequest request,
            UUID actorId
    ) {
        SupplierSettlementModel settlement = requireOpenSettlement(settlementId);
        ensureReconciliationWindowOpen(settlement);
        if (!settlement.needsUnitPriceResolution()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Không có chênh lệch giá nhập cần xử lý.");
        }

        int actualImportQty = settlement.getActualTicketImportQuantity() != null
                ? settlement.getActualTicketImportQuantity()
                : 0;
        int actualReturnQty = settlement.getActualReturnTicketQuantity() != null
                ? settlement.getActualReturnTicketQuantity()
                : 0;
        int systemImportQty = settlement.getSystemImportQuantity() != null
                ? settlement.getSystemImportQuantity()
                : actualImportQty;
        BigDecimal original = resolveOriginalTicketUnitPriceFromStations(
                settlementId,
                systemImportQty,
                settlement.getSystemImportValue()
        );
        if (original == null || original.signum() <= 0) {
            original = settlement.getOriginalTicketUnitPrice() != null
                    ? settlement.getOriginalTicketUnitPrice()
                    : BigDecimal.ZERO;
        }
        BigDecimal reconciled = settlement.getReconciledTicketUnitPrice() != null
                ? settlement.getReconciledTicketUnitPrice()
                : original;
        BigDecimal amount = ImportCostCalculator.scaleMoney(
                reconciled.subtract(original).multiply(BigDecimal.valueOf((long) actualImportQty - actualReturnQty))
        );
        supplierSettlementAdjustmentRepositoryPort.deleteBySettlementIdAndGroupTypeAndReasonCode(
                settlementId,
                SupplierSettlementAdjustmentGroupType.IMPORT,
                SupplierSettlementAdjustmentReasonCode.WRONG_DENOMINATION
        );
        if (amount.signum() != 0) {
            saveAdjustment(
                    settlementId,
                    null,
                    SupplierSettlementAdjustmentGroupType.IMPORT,
                    SupplierSettlementAdjustmentReasonCode.WRONG_DENOMINATION,
                    amount,
                    request != null ? request.note() : null,
                    actorId
            );
        }

        if (request == null || request.markResolved()) {
            settlement.setUnitPriceDiscrepancyResolved(true);
        }
        advancePhaseAfterResolution(settlement);
        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
        return supplierSettlementApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SupplierSettlementAdjustmentResponse addSettlementMonetaryAdjustment(
            Long settlementId,
            AddSettlementMonetaryAdjustmentRequest request,
            UUID actorId
    ) {
        SupplierSettlementModel settlement = requireOpenSettlement(settlementId);
        assertSettlementMonetaryWritable(settlement);

        if (request.reasonCode() == null || !MONETARY_REASON_CODES.contains(request.reasonCode())) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "reasonCode phải là SHIPPING_FEE, LATE_PENALTY, DISCOUNT hoặc OTHER."
            );
        }
        if (request.amount() == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "amount là bắt buộc.");
        }
        if (request.note() == null || request.note().isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Ghi chú lý do điều chỉnh là bắt buộc.");
        }

        SupplierSettlementAdjustmentModel model = SupplierSettlementAdjustmentModel.builder()
                .supplierSettlementId(settlementId)
                .groupType(SupplierSettlementAdjustmentGroupType.SETTLEMENT)
                .reasonCode(request.reasonCode())
                .note(request.note().trim())
                .resolvedBy(actorId)
                .build();
        model.applyAmount(ImportCostCalculator.scaleMoney(request.amount()));
        SupplierSettlementAdjustmentModel saved = supplierSettlementAdjustmentRepositoryPort.save(model);

        // Refresh recalculated payable if already past recalc.
        if (settlement.getReconciliationPhase() == SupplierSettlementReconciliationPhase.RECALCULATED
                || settlement.getReconciliationPhase() == SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY) {
            recalculateReconciliation(settlementId, actorId);
        }
        return toAdjustmentResponse(saved);
    }

    @Override
    @Transactional
    public SupplierSettlementResponse recalculateReconciliation(Long settlementId, UUID actorId) {
        SupplierSettlementModel settlement = requireOpenSettlement(settlementId);
        ensureReconciliationWindowOpen(settlement);
        if (settlement.hasUnresolvedDiscrepancies()) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần xử lý hết mọi chênh lệch đã phát hiện trước khi tính lại."
            );
        }
        if (settlement.getReconciliationPhase() != SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION
                && settlement.getReconciliationPhase() != SupplierSettlementReconciliationPhase.RECALCULATED
                && settlement.getReconciliationPhase() != SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Trạng thái đối soát chưa sẵn sàng để tính lại."
            );
        }

        recalculateAmounts(settlementId);
        settlement = supplierSettlementRepositoryPort.findById(settlementId)
                .orElseThrow(() -> new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND));

        // Recalculation must stay on the reconciled snapshot, rather than rebuilding the
        // payable from the live import-batch lines.  The live lines still contain every
        // serial that was originally entered, including serials subsequently marked as a
        // system overstatement.  Using them here would overwrite the actual quantity that
        // the admin already confirmed during matching.
        int actualImportQuantity = settlement.getActualTicketImportQuantity() != null
                ? settlement.getActualTicketImportQuantity()
                : 0;
        int actualReturnQuantity = settlement.getActualReturnTicketQuantity() != null
                ? settlement.getActualReturnTicketQuantity()
                : 0;
        BigDecimal reconciledUnitPrice = settlement.getReconciledTicketUnitPrice() != null
                ? settlement.getReconciledTicketUnitPrice()
                : settlement.getOriginalTicketUnitPrice();
        if (reconciledUnitPrice == null) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Thiếu đơn giá vé đối soát để tính lại giá trị thanh toán."
            );
        }
        BigDecimal ticketNet = ImportCostCalculator.scaleMoney(
                reconciledUnitPrice.multiply(BigDecimal.valueOf((long) actualImportQuantity - actualReturnQuantity))
        );
        // Only explicit monetary adjustments entered at matching are part of the payable.
        // Import/return resolution rows and WRONG_DENOMINATION are audit records: their
        // effect is already represented by actual quantities and reconciled unit price.
        BigDecimal manualSettlementAdjustments = sumSettlementGroupAdjustments(settlementId);
        BigDecimal recalculated = ImportCostCalculator.scaleMoney(ticketNet.add(manualSettlementAdjustments));
        settlement.applyRecalculatedTotalPaidAmount(recalculated);
        settlement.applyFinalSettlementValue(recalculated);
        if (settlement.getActualPaidAmount() != null
                && settlement.getActualPaidAmount().compareTo(recalculated) != 0) {
            settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY);
        } else {
            settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.RECALCULATED);
        }
        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
        return supplierSettlementApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SettlementCompleteResultResponse completeReconciliation(
            Long settlementId,
            CompleteSettlementReconciliationRequest request,
            UUID actorId
    ) {
        SupplierSettlementModel settlement = requireOpenSettlement(settlementId);
        ensureReconciliationWindowOpen(settlement);
        if (settlement.hasUnresolvedDiscrepancies()) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Không thể hoàn tất khi còn chênh lệch chưa xử lý."
            );
        }
        if (settlement.getReconciliationPhase() != SupplierSettlementReconciliationPhase.RECALCULATED
                && settlement.getReconciliationPhase() != SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần tính lại số liệu trước khi hoàn tất đối soát."
            );
        }
        if (settlement.getFinalSettlementValue() == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu giá trị đối soát sau chênh lệch.");
        }
        if (settlement.getActualPaidAmount() == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu giá trị thực trả từ biên lai.");
        }

        boolean hasSettlementAdjustments = supplierSettlementAdjustmentRepositoryPort.findBySettlementId(settlementId)
                .stream()
                .anyMatch(a -> a.getGroupType() == SupplierSettlementAdjustmentGroupType.SETTLEMENT);
        boolean receiptMissing = settlement.getSupplierSettlementReceiptUrl() == null
                || settlement.getSupplierSettlementReceiptUrl().isBlank();
        if ((settlement.getReconciliationPhase() == SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY
                || hasSettlementAdjustments)
                && receiptMissing) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần tải biên lai đối soát trước khi hoàn tất khi có chênh lệch thanh toán / điều chỉnh tiền."
            );
        }

        BigDecimal recalculated = settlement.getRecalculatedTotalPaidAmount() != null
                ? ImportCostCalculator.scaleMoney(settlement.getRecalculatedTotalPaidAmount())
                : null;
        BigDecimal finalValue = ImportCostCalculator.scaleMoney(settlement.getFinalSettlementValue());
        BigDecimal actualPaid = ImportCostCalculator.scaleMoney(settlement.getActualPaidAmount());
        BigDecimal initialValue = settlement.getInitialEstimatedSettlementValue() != null
                ? ImportCostCalculator.scaleMoney(settlement.getInitialEstimatedSettlementValue())
                : BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);
        BigDecimal settlementDiff = settlement.getSettlementDifferenceAmount() != null
                ? ImportCostCalculator.scaleMoney(settlement.getSettlementDifferenceAmount())
                : ImportCostCalculator.scaleMoney(finalValue.subtract(initialValue));
        BigDecimal remainingDiff = ImportCostCalculator.scaleMoney(actualPaid.subtract(finalValue).abs());

        List<SupplierSettlementAdjustmentResponse> adjustments = supplierSettlementAdjustmentRepositoryPort
                .findBySettlementId(settlementId)
                .stream()
                .map(this::toAdjustmentResponse)
                .toList();

        if (actualPaid.compareTo(finalValue) != 0) {
            settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY);
            if (request != null && request.reconciliationNote() != null && !request.reconciliationNote().isBlank()) {
                settlement.setReconciliationNote(request.reconciliationNote().trim());
            }
            SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
            return SettlementCompleteResultResponse.builder()
                    .completed(false)
                    .settlement(supplierSettlementApplicationMapper.toResponse(saved))
                    .recalculatedTotalPaidAmount(recalculated)
                    .finalSettlementValue(finalValue)
                    .actualPaidAmount(actualPaid)
                    .initialEstimatedSettlementValue(initialValue)
                    .settlementDifferenceAmount(settlementDiff)
                    .remainingDifference(remainingDiff)
                    .message("Giá trị thực trả từ biên lai không khớp Sau chênh lệch. Không thể hoàn tất đối soát.")
                    .adjustments(adjustments)
                    .build();
        }

        if (!settlement.hasPaymentEvidence()) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần tải ảnh đã thanh toán thành công cho nhà cung cấp trước khi hoàn tất đối soát."
            );
        }

        if (request != null && request.reconciliationNote() != null && !request.reconciliationNote().isBlank()) {
            settlement.setReconciliationNote(request.reconciliationNote().trim());
        }
        settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.COMPLETED);
        settlement.setStatus(SupplierSettlementStatus.CLOSED);
        settlement.setCompletedAt(LocalDateTime.now(clock));
        settlement.setCompletedBy(actorId);
        settlement.setTotalPaidAmount(actualPaid.max(BigDecimal.ZERO));
        settlement.applyRemainingAmount(BigDecimal.ZERO);
        if (settlement.getPaidAt() == null) {
            settlement.setPaidAt(LocalDateTime.now(clock));
        }
        String firstEvidenceUrl = settlement.getPaymentEvidenceUrls().stream()
                .filter(url -> url != null && !url.isBlank())
                .findFirst()
                .orElse(null);
        if (settlement.getTransactionId() == null) {
            boolean supplierRefund = actualPaid.signum() < 0;
            TransactionModel payment = TransactionModel.builder()
                    .amount(actualPaid.abs())
                    .type(TransactionType.OFFLINE)
                    .transactionType(supplierRefund
                            ? TransactionBusinessType.SUPPLIER_REFUND
                            : TransactionBusinessType.SUPPLIER_PAYMENT)
                    .status(TransactionStatus.COMPLETED)
                    .paidAt(settlement.getPaidAt())
                    .paymentBy(actorId)
                    .paymentEvidenceUrl(firstEvidenceUrl)
                    .note((supplierRefund ? "NCC hoàn / ghi có đối soát " : "Thanh toán đối soát NCC ")
                            + settlement.getSupplierSettlementCode())
                    .build();
            settlement.setTransactionId(transactionRepositoryPort.save(payment).getId());
        }
        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(settlement);
        return SettlementCompleteResultResponse.builder()
                .completed(true)
                .settlement(supplierSettlementApplicationMapper.toResponse(saved))
                .recalculatedTotalPaidAmount(recalculated)
                .finalSettlementValue(finalValue)
                .actualPaidAmount(actualPaid)
                .initialEstimatedSettlementValue(initialValue)
                .settlementDifferenceAmount(settlementDiff)
                .remainingDifference(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .message("Đã hoàn tất đối soát nhà cung cấp.")
                .adjustments(adjustments)
                .build();
    }

    private List<String> normalizePaymentEvidenceUrls(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return new ArrayList<>();
        }
        List<String> normalized = new ArrayList<>();
        for (String url : urls) {
            if (url == null || url.isBlank()) {
                continue;
            }
            String trimmed = url.trim();
            StorageUtils.validateImageEvidenceUrl(trimmed);
            if (!normalized.contains(trimmed)) {
                normalized.add(trimmed);
            }
        }
        if (normalized.size() > MAX_PAYMENT_EVIDENCE_URLS) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Tối đa " + MAX_PAYMENT_EVIDENCE_URLS + " ảnh đã thanh toán cho nhà cung cấp."
            );
        }
        return normalized;
    }

    private SupplierSettlementModel requireOpenSettlement(Long settlementId) {
        SupplierSettlementModel settlement = supplierSettlementRepositoryPort.findById(settlementId)
                .orElseThrow(() -> new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND));
        if (settlement.getStatus() == SupplierSettlementStatus.CLOSED
                || settlement.getReconciliationPhase() == SupplierSettlementReconciliationPhase.COMPLETED) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Kỳ đối soát đã chốt, không thể thao tác.");
        }
        return settlement;
    }

    private void ensureReconciliationWindowOpen(SupplierSettlementModel settlement) {
        LocalTime paymentCutOff = null;
        if (settlement.getLotterySupplierId() != null) {
            LotterySupplierModel supplier = lotterySupplierRepositoryPort.findById(settlement.getLotterySupplierId())
                    .orElse(null);
            if (supplier != null) {
                paymentCutOff = supplier.getPaymentCutOffTime();
            }
        }
        if (paymentCutOff == null) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Nhà cung cấp chưa cấu hình giờ thanh toán (paymentCutOffTime)."
            );
        }
        LocalDateTime now = LocalDateTime.now(clock);
        if (!supplierPaymentCutOffCalculator.isReconciliationWindowOpen(
                settlement.getPeriodFrom(),
                paymentCutOff,
                now
        )) {
            throw new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_RECONCILIATION_NOT_OPEN);
        }
    }

    private void assertPhaseAllowsMatching(SupplierSettlementModel settlement) {
        SupplierSettlementReconciliationPhase phase = settlement.getReconciliationPhase();
        if (phase == SupplierSettlementReconciliationPhase.COMPLETED) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Kỳ đối soát đã hoàn tất.");
        }
    }

    private void assertSettlementMonetaryWritable(SupplierSettlementModel settlement) {
        SupplierSettlementReconciliationPhase phase = settlement.getReconciliationPhase();
        if (phase != SupplierSettlementReconciliationPhase.RECALCULATED
                && phase != SupplierSettlementReconciliationPhase.PAYMENT_DISCREPANCY) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Chỉ được thêm điều chỉnh tiền sau khi tính lại số liệu."
            );
        }
        if (settlement.getSupplierSettlementReceiptUrl() == null
                || settlement.getSupplierSettlementReceiptUrl().isBlank()) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Kỳ đối soát đang khóa đọc-only cho điều chỉnh tiền cho đến khi có biên lai đối soát."
            );
        }
    }

    /**
     * System baseline before reconciliation adjustments:
     * originalTicketUnitPrice × (systemImportQty − systemReturnQty).
     * Unit price is the net import cost (station sale price after station commission).
     */
    private BigDecimal computeInitialEstimatedSettlementValue(
            BigDecimal originalUnitPrice,
            int systemImportQty,
            int systemReturnQty
    ) {
        BigDecimal price = originalUnitPrice != null
                ? originalUnitPrice
                : ImportCostCalculator.scaleMoney(BigDecimal.valueOf(10_000));
        return ImportCostCalculator.scaleMoney(
                price.multiply(BigDecimal.valueOf((long) systemImportQty - systemReturnQty))
        );
    }

    /**
     * Matching baseline uses current station net (price × (1 − commission)), not the
     * pre-commission face value that some historical import lines still store as importCost.
     */
    private void applyAfterCommissionMatchingBaseline(
            SupplierSettlementModel settlement,
            List<SettlementStationPricingResponse> stationPricing
    ) {
        BigDecimal stationNet = weightedAverageNetUnitPrice(stationPricing);
        if (stationNet == null) {
            return;
        }
        int importQty = settlement.getSystemImportQuantity() != null ? settlement.getSystemImportQuantity() : 0;
        int returnQty = settlement.getSystemReturnQuantity() != null ? settlement.getSystemReturnQuantity() : 0;
        BigDecimal previousImportVal = settlement.getSystemImportValue();
        BigDecimal previousReturnVal = settlement.getSystemReturnValue();
        BigDecimal importVal = ImportCostCalculator.scaleMoney(stationNet.multiply(BigDecimal.valueOf(importQty)));
        BigDecimal returnVal = ImportCostCalculator.scaleMoney(stationNet.multiply(BigDecimal.valueOf(returnQty)));
        settlement.setOriginalTicketUnitPrice(stationNet);
        settlement.setSystemImportValue(importVal);
        settlement.setSystemReturnValue(returnVal);
        if (settlement.getActualTicketImportValue() == null
                || (previousImportVal != null && settlement.getActualTicketImportValue().compareTo(previousImportVal) == 0)) {
            settlement.setActualTicketImportValue(importVal);
        }
        if (settlement.getActualReturnTicketValue() == null
                || (previousReturnVal != null && settlement.getActualReturnTicketValue().compareTo(previousReturnVal) == 0)) {
            settlement.setActualReturnTicketValue(returnVal);
        }
        settlement.setInitialEstimatedSettlementValue(
                computeInitialEstimatedSettlementValue(stationNet, importQty, returnQty)
        );
        settlement.setFinalSettlementValue(null);
        settlement.setSettlementDifferenceAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE));
    }

    private BigDecimal resolveOriginalTicketUnitPriceFromStations(
            Long settlementId,
            int systemImportQty,
            BigDecimal systemImportVal
    ) {
        List<ImportBatchResponse> importBatches = java.util.Optional
                .ofNullable(importBatchRepositoryPort.findBySupplierSettlementId(settlementId))
                .orElseGet(List::of)
                .stream()
                .map(importBatchApplicationMapper::toResponse)
                .filter(java.util.Objects::nonNull)
                .toList();
        List<SettlementStationInventoryRow> stationRows = java.util.Optional
                .ofNullable(lotteryTicketSerialRepositoryPort.aggregateInventoryByStationForSettlement(settlementId))
                .orElseGet(List::of);
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
        BigDecimal stationNet = weightedAverageNetUnitPrice(buildStationPricing(importBatches, inventoryByStation));
        if (stationNet != null) {
            return stationNet;
        }
        return computeImportedAverageUnitPrice(systemImportQty, systemImportVal);
    }

    /**
     * Older matching snapshots stored face-value 10.000đ as originalTicketUnitPrice.
     * Rebuild the after-commission baseline so unit-price resolution is not a false gap.
     */
    private boolean healFaceValueUnitPriceDiscrepancy(
            SupplierSettlementModel settlement,
            List<SettlementStationPricingResponse> stationPricing
    ) {
        if (settlement == null || settlement.getStatus() == SupplierSettlementStatus.CLOSED) {
            return false;
        }
        BigDecimal stationNet = weightedAverageNetUnitPrice(stationPricing);
        if (stationNet == null) {
            return false;
        }
        BigDecimal reconciled = settlement.getReconciledTicketUnitPrice();
        if (reconciled == null) {
            return false;
        }
        BigDecimal tolerance = new BigDecimal("0.500");
        boolean matchesAfterCommission = stationNet.subtract(reconciled).abs().compareTo(tolerance) <= 0;
        BigDecimal storedOriginal = settlement.getOriginalTicketUnitPrice();
        boolean storedDiffers = storedOriginal == null
                || storedOriginal.subtract(stationNet).abs().compareTo(tolerance) > 0;
        boolean changed = false;
        if (storedDiffers) {
            settlement.setOriginalTicketUnitPrice(stationNet);
            changed = true;
        }
        if (matchesAfterCommission && settlement.needsUnitPriceResolution()) {
            List<SettlementDiscrepancyItem> items = new ArrayList<>(
                    settlement.getDiscrepancyItems() != null ? settlement.getDiscrepancyItems() : List.of()
            );
            items.removeIf(item -> item != null
                    && item.getType() == SupplierSettlementDiscrepancyType.IMPORT_UNIT_PRICE);
            settlement.setDiscrepancyItems(items);
            settlement.setDiscrepancyTypes(
                    items.stream().map(SettlementDiscrepancyItem::getType).toList()
            );
            settlement.setUnitPriceDiscrepancyResolved(true);
            if (!settlement.hasUnresolvedDiscrepancies()
                    && (settlement.getReconciliationPhase() == SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED
                    || settlement.getReconciliationPhase() == SupplierSettlementReconciliationPhase.RESOLVING_IMPORT_DISCREPANCY
                    || settlement.getReconciliationPhase() == SupplierSettlementReconciliationPhase.RESOLVING_RETURN_DISCREPANCY)) {
                settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION);
            }
            changed = true;
        }
        return changed;
    }

    private BigDecimal weightedAverageNetUnitPrice(List<SettlementStationPricingResponse> rows) {
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        BigDecimal weighted = BigDecimal.ZERO;
        long qty = 0;
        for (SettlementStationPricingResponse row : rows) {
            if (row == null || row.netUnitPrice() == null || row.importedQuantity() <= 0) {
                continue;
            }
            qty += row.importedQuantity();
            weighted = weighted.add(row.netUnitPrice().multiply(BigDecimal.valueOf(row.importedQuantity())));
        }
        if (qty <= 0) {
            return null;
        }
        return ImportCostCalculator.scaleMoney(
                weighted.divide(BigDecimal.valueOf(qty), 3, java.math.RoundingMode.HALF_UP)
        );
    }

    /**
     * Payable unit cost for matching: weighted average of imported line costs.
     * Each line already stored {@code station.price × (1 − station.commissionRate)} at import time,
     * so this is net of per-station commission for tickets in this settlement — not the NCC
     * {@code defaultImportCost} face value (usually 10.000đ).
     *
     * <p>After matching is confirmed, the snapshot is kept for display / discrepancy handling
     * until the next confirm (rematch recomputes from live import costs).
     */
    private BigDecimal resolveOriginalTicketUnitPrice(
            SupplierSettlementModel settlement,
            int systemImportQty,
            BigDecimal systemImportVal
    ) {
        boolean confirmedSnapshot = settlement.getMatchingConfirmedAt() != null
                && settlement.getOriginalTicketUnitPrice() != null;
        if (confirmedSnapshot) {
            return ImportCostCalculator.scaleMoney(settlement.getOriginalTicketUnitPrice());
        }
        return computeImportedAverageUnitPrice(systemImportQty, systemImportVal);
    }

    private BigDecimal computeImportedAverageUnitPrice(int systemImportQty, BigDecimal systemImportVal) {
        if (systemImportQty > 0 && systemImportVal != null && systemImportVal.signum() > 0) {
            return ImportCostCalculator.scaleMoney(
                    systemImportVal.divide(BigDecimal.valueOf(systemImportQty), 3, java.math.RoundingMode.HALF_UP)
            );
        }
        return ImportCostCalculator.scaleMoney(BigDecimal.valueOf(10_000));
    }

    private List<SettlementStationPricingResponse> buildStationPricing(
            List<ImportBatchResponse> importBatches,
            List<SettlementStationInventoryResponse> inventoryByStation
    ) {
        Map<Long, Integer> quantityByStation = new LinkedHashMap<>();
        if (importBatches != null) {
            for (ImportBatchResponse batch : importBatches) {
                if (batch == null || batch.lines() == null) {
                    continue;
                }
                if (batch.status() == ImportBatchStatus.CANCELLED) {
                    continue;
                }
                for (var line : batch.lines()) {
                    if (line == null || line.lotteryStationId() == null) {
                        continue;
                    }
                    if (line.status() == ImportBatchLineStatus.CANCELLED) {
                        continue;
                    }
                    int qty = line.totalQuantity() != null && line.totalQuantity() > 0
                            ? line.totalQuantity()
                            : (line.declareQuantity() != null ? line.declareQuantity() : 0);
                    if (qty <= 0) {
                        continue;
                    }
                    quantityByStation.merge(line.lotteryStationId(), qty, Integer::sum);
                }
            }
        }
        if (quantityByStation.isEmpty() && inventoryByStation != null) {
            for (SettlementStationInventoryResponse row : inventoryByStation) {
                if (row == null || row.lotteryStationId() == null || row.importedQuantity() <= 0) {
                    continue;
                }
                quantityByStation.merge(row.lotteryStationId(), row.importedQuantity(), Integer::sum);
            }
        }
        if (quantityByStation.isEmpty()) {
            return List.of();
        }
        Map<Long, LotteryStationModel> stations = lotteryStationRepositoryPort.findByIds(quantityByStation.keySet())
                .stream()
                .filter(station -> station.getId() != null)
                .collect(java.util.stream.Collectors.toMap(LotteryStationModel::getId, station -> station, (a, b) -> a));
        Map<Long, String> inventoryNames = new LinkedHashMap<>();
        if (inventoryByStation != null) {
            for (SettlementStationInventoryResponse row : inventoryByStation) {
                if (row != null && row.lotteryStationId() != null) {
                    inventoryNames.put(row.lotteryStationId(), row.lotteryStationName());
                }
            }
        }

        List<SettlementStationPricingResponse> rows = new ArrayList<>();
        quantityByStation.forEach((stationId, qty) -> {
            LotteryStationModel station = stations.get(stationId);
            BigDecimal importCost = station != null && station.getPrice() != null
                    ? ImportCostCalculator.scaleMoney(station.getPrice())
                    : ImportCostCalculator.scaleMoney(BigDecimal.valueOf(10_000));
            BigDecimal commissionRate = station != null && station.getCommissionRate() != null
                    ? station.getCommissionRate()
                    : BigDecimal.ZERO;
            BigDecimal net;
            try {
                net = ImportCostCalculator.fromPriceAndCommission(importCost, commissionRate);
            } catch (Exception ex) {
                net = importCost;
            }
            String name = station != null && station.getName() != null
                    ? station.getName()
                    : inventoryNames.getOrDefault(stationId, "Đài #" + stationId);
            rows.add(SettlementStationPricingResponse.builder()
                    .lotteryStationId(stationId)
                    .lotteryStationName(name)
                    .importedQuantity(qty)
                    .importCost(importCost)
                    .commissionRate(commissionRate)
                    .netUnitPrice(net)
                    .build());
        });
        return rows;
    }

    private SettlementDiscrepancyItem requireDiscrepancyItem(
            SupplierSettlementModel settlement,
            SupplierSettlementDiscrepancyType type
    ) {
        SettlementDiscrepancyItem item = settlement.findDiscrepancyItem(type);
        if (item == null) {
            List<SettlementDiscrepancyItem> rebuilt = SettlementDiscrepancyItem.fromMatching(
                    settlement.getSystemImportQuantity(),
                    settlement.getActualTicketImportQuantity(),
                    settlement.getSystemReturnQuantity(),
                    settlement.getActualReturnTicketQuantity(),
                    settlement.getOriginalTicketUnitPrice(),
                    settlement.getReconciledTicketUnitPrice()
            );
            item = rebuilt.stream().filter(i -> i.getType() == type).findFirst().orElse(null);
        }
        if (item == null || item.getDirection() == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Không xác định được chiều chênh lệch (âm/dương).");
        }
        return item;
    }

    private void applyDetectedDiscrepancies(
            SupplierSettlementModel settlement,
            int importQtyDiff,
            int returnQtyDiff,
            BigDecimal unitPriceDiff,
            boolean importValMismatch,
            boolean returnValMismatch
    ) {
        boolean importQtyMismatch = importQtyDiff != 0;
        boolean returnQtyMismatch = returnQtyDiff != 0;
        boolean unitPriceAdjusted = unitPriceDiff != null && unitPriceDiff.signum() != 0;

        List<SettlementDiscrepancyItem> items = new ArrayList<>();
        SettlementDiscrepancyItem importItem = SettlementDiscrepancyItem.ofQuantity(
                SupplierSettlementDiscrepancyType.IMPORT_QUANTITY, importQtyDiff
        );
        if (importItem != null) {
            items.add(importItem);
        }
        SettlementDiscrepancyItem returnItem = SettlementDiscrepancyItem.ofQuantity(
                SupplierSettlementDiscrepancyType.RETURN_QUANTITY, returnQtyDiff
        );
        if (returnItem != null) {
            items.add(returnItem);
        }
        SettlementDiscrepancyItem priceItem = SettlementDiscrepancyItem.ofUnitPrice(unitPriceDiff);
        if (priceItem != null) {
            items.add(priceItem);
        }

        settlement.setDiscrepancyItems(items);
        List<SupplierSettlementDiscrepancyType> types = new ArrayList<>();
        for (SettlementDiscrepancyItem item : items) {
            types.add(item.getType());
        }
        settlement.setDiscrepancyTypes(types);
        settlement.setImportQuantityMismatch(importQtyMismatch);
        settlement.setImportValueMismatch(importValMismatch);
        settlement.setReturnQuantityMismatch(returnQtyMismatch);
        settlement.setReturnValueMismatch(returnValMismatch);
        settlement.setUnitPriceDiscrepancyResolved(!unitPriceAdjusted);
        settlement.setImportDiscrepancyResolved(!importQtyMismatch);
        settlement.setReturnDiscrepancyResolved(!returnQtyMismatch);
    }

    private void advancePhaseAfterResolution(SupplierSettlementModel settlement) {
        if (settlement.needsImportResolution()) {
            settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.RESOLVING_IMPORT_DISCREPANCY);
            return;
        }
        if (settlement.needsReturnResolution()) {
            settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.RESOLVING_RETURN_DISCREPANCY);
            return;
        }
        if (settlement.needsUnitPriceResolution()) {
            settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.DISCREPANCY_DETECTED);
            return;
        }
        settlement.setReconciliationPhase(SupplierSettlementReconciliationPhase.READY_FOR_RECALCULATION);
    }

    private List<SettlementMatchingAdjustmentItem> resolvePaymentDifferenceAdjustments(
            BigDecimal ticketNet,
            List<SettlementMatchingAdjustmentItem> items,
            BigDecimal actualPaid
    ) {
        if (items == null) {
            return null;
        }
        // Receipt variance is not a settlement adjustment. It is surfaced as a
        // payment discrepancy after recalculation. Ignore legacy automatic rows
        // so they cannot force the final settlement total to equal the receipt.
        return items.stream()
                .filter(Objects::nonNull)
                .filter(item -> !Boolean.TRUE.equals(item.autoGenerated()))
                .toList();
    }

    private BigDecimal persistMatchingAdditionalCosts(
            Long settlementId,
            List<SettlementMatchingAdjustmentItem> items,
            UUID actorId
    ) {
        if (items == null) {
            return sumSettlementGroupAdjustments(settlementId);
        }
        supplierSettlementAdjustmentRepositoryPort.deleteBySettlementIdAndGroupType(
                settlementId,
                SupplierSettlementAdjustmentGroupType.SETTLEMENT
        );
        BigDecimal total = BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);
        for (SettlementMatchingAdjustmentItem item : items) {
            if (item == null) {
                continue;
            }
            if (item.additionalCost() == null) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Số tiền chi phí phát sinh là bắt buộc.");
            }
            if (item.additionalCost().compareTo(BigDecimal.ZERO) == 0) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Số tiền chi phí phát sinh phải khác 0.");
            }
            if (item.additionalCostType() == null || !MONETARY_REASON_CODES.contains(item.additionalCostType())) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Loại chi phí phát sinh phải là SHIPPING_FEE, LATE_PENALTY, DISCOUNT hoặc OTHER."
                );
            }
            if (item.additionalCostReason() == null || item.additionalCostReason().isBlank()) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Lý do chi phí phát sinh là bắt buộc.");
            }
            boolean isOther = item.additionalCostType() == SupplierSettlementAdjustmentReasonCode.OTHER;
            String customName = isOther && item.additionalCostCustomName() != null
                    ? item.additionalCostCustomName().trim()
                    : null;
            if (isOther && (customName == null || customName.isBlank())) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Tên khoản chi phí là bắt buộc khi chọn loại Khác."
                );
            }
            BigDecimal amount = ImportCostCalculator.scaleMoney(item.additionalCost());
            saveAdjustment(
                    settlementId,
                    null,
                    SupplierSettlementAdjustmentGroupType.SETTLEMENT,
                    item.additionalCostType(),
                    amount,
                    item.additionalCostReason().trim(),
                    customName,
                    Boolean.TRUE.equals(item.autoGenerated()),
                    actorId
            );
            total = total.add(amount);
        }
        return ImportCostCalculator.scaleMoney(total);
    }

    private BigDecimal sumSettlementGroupAdjustments(Long settlementId) {
        return ImportCostCalculator.scaleMoney(
                supplierSettlementAdjustmentRepositoryPort.findBySettlementId(settlementId).stream()
                        .filter(a -> a.getGroupType() == SupplierSettlementAdjustmentGroupType.SETTLEMENT)
                        .map(a -> a.getAmount() != null ? a.getAmount() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
        );
    }

    private void saveAdjustment(
            Long settlementId,
            Long serialId,
            SupplierSettlementAdjustmentGroupType groupType,
            SupplierSettlementAdjustmentReasonCode reasonCode,
            BigDecimal amount,
            String note,
            UUID actorId
    ) {
        saveAdjustment(settlementId, serialId, groupType, reasonCode, amount, note, null, false, actorId);
    }

    private void saveAdjustment(
            Long settlementId,
            Long serialId,
            SupplierSettlementAdjustmentGroupType groupType,
            SupplierSettlementAdjustmentReasonCode reasonCode,
            BigDecimal amount,
            String note,
            String customName,
            UUID actorId
    ) {
        saveAdjustment(settlementId, serialId, groupType, reasonCode, amount, note, customName, false, actorId);
    }

    private void saveAdjustment(
            Long settlementId,
            Long serialId,
            SupplierSettlementAdjustmentGroupType groupType,
            SupplierSettlementAdjustmentReasonCode reasonCode,
            BigDecimal amount,
            String note,
            String customName,
            boolean autoGenerated,
            UUID actorId
    ) {
        SupplierSettlementAdjustmentModel model = SupplierSettlementAdjustmentModel.builder()
                .supplierSettlementId(settlementId)
                .lotteryTicketSerialId(serialId)
                .groupType(groupType)
                .reasonCode(reasonCode != null ? reasonCode : SupplierSettlementAdjustmentReasonCode.OTHER)
                .customName(customName)
                .autoGenerated(autoGenerated)
                .note(note)
                .resolvedBy(actorId)
                .build();
        model.applyAmount(amount != null ? amount : BigDecimal.ZERO);
        supplierSettlementAdjustmentRepositoryPort.save(model);
    }

    private BigDecimal resolveSerialImportCost(Long serialId) {
        // Monetary impact of serial-linked resolutions is primarily reflected via ticket state
        // after recalculateAmounts; amount here is audit metadata (0 when not supplied).
        return BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE);
    }

    private List<SettlementResolvableSerialResponse> mapResolvableRows(List<SettlementResolvableSerialRow> rows) {
        List<SettlementResolvableSerialResponse> result = new ArrayList<>();
        for (SettlementResolvableSerialRow row : rows) {
            result.add(SettlementResolvableSerialResponse.builder()
                    .serialId(row.serialId())
                    .serialNumber(row.serialNumber())
                    .status(row.status())
                    .ticketCondition(row.ticketCondition())
                    .stationName(row.stationName())
                    .importCost(ImportCostCalculator.scaleMoney(row.importCost()))
                    .importBatchId(row.importBatchId())
                    .importBatchCode(row.importBatchCode())
                    .build());
        }
        return result;
    }

    private SupplierSettlementAdjustmentResponse toAdjustmentResponse(SupplierSettlementAdjustmentModel model) {
        return SupplierSettlementAdjustmentResponse.builder()
                .id(model.getId())
                .supplierSettlementId(model.getSupplierSettlementId())
                .lotteryTicketSerialId(model.getLotteryTicketSerialId())
                .groupType(model.getGroupType())
                .reasonCode(model.getReasonCode())
                .reasonLabel(model.getReasonCode() != null ? model.getReasonCode().getLabel() : null)
                .amount(model.getAmount())
                .customName(model.getCustomName())
                .autoGenerated(model.isAutoGenerated())
                .note(model.getNote())
                .resolvedBy(model.getResolvedBy())
                .createdAt(model.getCreatedAt())
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
                .reconciliationPhase(SupplierSettlementReconciliationPhase.MATCHING)
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

    private SettlementImportFileCheckTicketResponse toFileCheckTicket(SettlementImportedSerialRow row) {
        return SettlementImportFileCheckTicketResponse.builder()
                .serialId(row.serialId())
                .serialNumber(row.serialNumber())
                .numbers(row.numbers())
                .lotteryStationId(row.lotteryStationId())
                .stationName(row.stationName())
                .importBatchId(row.importBatchId())
                .importBatchCode(row.importBatchCode())
                .build();
    }

    private FileCheckDiff diffFileAndSystem(
            List<SettlementImportFileCheckTicketResponse> fileTickets,
            List<SettlementImportFileCheckTicketResponse> systemTickets
    ) {
        Map<String, Deque<SettlementImportFileCheckTicketResponse>> byStationSerial = new LinkedHashMap<>();
        Map<String, Deque<SettlementImportFileCheckTicketResponse>> bySerial = new LinkedHashMap<>();
        for (SettlementImportFileCheckTicketResponse ticket : fileTickets) {
            byStationSerial.computeIfAbsent(stationSerialKey(ticket), key -> new ArrayDeque<>()).add(ticket);
            bySerial.computeIfAbsent(normalizeSerial(ticket.serialNumber()), key -> new ArrayDeque<>()).add(ticket);
        }

        Set<SettlementImportFileCheckTicketResponse> consumed =
                java.util.Collections.newSetFromMap(new IdentityHashMap<>());
        List<SettlementImportFileCheckTicketResponse> onlyInSystem = new ArrayList<>();
        int matched = 0;

        for (SettlementImportFileCheckTicketResponse system : systemTickets) {
            SettlementImportFileCheckTicketResponse hit = pollUnconsumed(
                    byStationSerial.get(stationSerialKey(system)), consumed);
            if (hit == null) {
                hit = pollUnconsumed(bySerial.get(normalizeSerial(system.serialNumber())), consumed);
            }
            if (hit != null) {
                consumed.add(hit);
                matched++;
            } else {
                onlyInSystem.add(system);
            }
        }

        List<SettlementImportFileCheckTicketResponse> onlyInFile = fileTickets.stream()
                .filter(ticket -> !consumed.contains(ticket))
                .toList();
        return new FileCheckDiff(matched, onlyInSystem, onlyInFile);
    }

    private SettlementImportFileCheckTicketResponse pollUnconsumed(
            Deque<SettlementImportFileCheckTicketResponse> queue,
            Set<SettlementImportFileCheckTicketResponse> consumed
    ) {
        if (queue == null) {
            return null;
        }
        while (!queue.isEmpty()) {
            SettlementImportFileCheckTicketResponse next = queue.poll();
            if (next != null && !consumed.contains(next)) {
                return next;
            }
        }
        return null;
    }

    private List<SettlementImportFileCheckStationSummaryResponse> buildFileCheckStationSummaries(
            ImportBatchOriginalFileBundle fileSide,
            List<SettlementImportFileCheckTicketResponse> systemTickets,
            List<SettlementImportFileCheckTicketResponse> onlyInSystem,
            List<SettlementImportFileCheckTicketResponse> onlyInFile
    ) {
        Map<Long, String> names = new LinkedHashMap<>();
        Map<Long, Integer> fileQty = new LinkedHashMap<>();
        Map<Long, Integer> systemQty = new LinkedHashMap<>();
        Map<Long, Integer> onlySystemQty = new LinkedHashMap<>();
        Map<Long, Integer> onlyFileQty = new LinkedHashMap<>();

        if (fileSide.importsTickets()) {
            for (SettlementImportFileCheckTicketResponse ticket : fileSide.tickets()) {
                Long stationId = ticket.lotteryStationId();
                names.putIfAbsent(stationId, stationLabel(ticket.stationName()));
                fileQty.merge(stationId, 1, Integer::sum);
            }
        } else {
            for (ImportBatchOriginalFileBundle.StationQuantity row : fileSide.declaredStationQuantities()) {
                names.putIfAbsent(row.lotteryStationId(), stationLabel(row.stationName()));
                fileQty.merge(row.lotteryStationId(), row.quantity(), Integer::sum);
            }
        }
        for (SettlementImportFileCheckTicketResponse ticket : systemTickets) {
            names.putIfAbsent(ticket.lotteryStationId(), stationLabel(ticket.stationName()));
            systemQty.merge(ticket.lotteryStationId(), 1, Integer::sum);
        }
        for (SettlementImportFileCheckTicketResponse ticket : onlyInSystem) {
            onlySystemQty.merge(ticket.lotteryStationId(), 1, Integer::sum);
        }
        for (SettlementImportFileCheckTicketResponse ticket : onlyInFile) {
            onlyFileQty.merge(ticket.lotteryStationId(), 1, Integer::sum);
        }

        if (!fileSide.importsTickets()) {
            for (Long stationId : names.keySet()) {
                int system = systemQty.getOrDefault(stationId, 0);
                int file = fileQty.getOrDefault(stationId, 0);
                onlySystemQty.put(stationId, Math.max(0, system - file));
                onlyFileQty.put(stationId, Math.max(0, file - system));
            }
        }

        return names.entrySet().stream()
                .map(entry -> SettlementImportFileCheckStationSummaryResponse.builder()
                        .lotteryStationId(entry.getKey())
                        .stationName(entry.getValue())
                        .fileQty(fileQty.getOrDefault(entry.getKey(), 0))
                        .systemQty(systemQty.getOrDefault(entry.getKey(), 0))
                        .onlyInSystemQty(onlySystemQty.getOrDefault(entry.getKey(), 0))
                        .onlyInFileQty(onlyFileQty.getOrDefault(entry.getKey(), 0))
                        .build())
                .toList();
    }

    private static String stationSerialKey(SettlementImportFileCheckTicketResponse ticket) {
        return ticket.lotteryStationId() + "|" + normalizeSerial(ticket.serialNumber());
    }

    private static String normalizeSerial(String serial) {
        return serial == null ? "" : serial.trim().toUpperCase(Locale.ROOT);
    }

    private static String stationLabel(String name) {
        return name == null || name.isBlank() ? "Chưa phân đài" : name;
    }

    private record FileCheckDiff(
            int matchedCount,
            List<SettlementImportFileCheckTicketResponse> onlyInSystem,
            List<SettlementImportFileCheckTicketResponse> onlyInFile
    ) {
    }
}
