package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.mapper.lotteries.SupplierSettlementApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.SupplierSettlementRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
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
            "supplierCode", "lotterySupplier.code"
    );

    private final SupplierSettlementRepositoryPort supplierSettlementRepositoryPort;
    private final SupplierSettlementApplicationMapper supplierSettlementApplicationMapper;

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
        supplierSettlementRepositoryPort.save(settlement);
        log.debug(
                "Recalculated supplier settlement id={} totalImportValue={} totalReturnValue={} remainingAmount={}",
                settlementId,
                totalImportValue,
                totalReturnValue,
                settlement.getRemainingAmount()
        );
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
                .totalImportValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .totalReturnValue(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .totalPaidAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .remainingAmount(BigDecimal.ZERO.setScale(ImportCostCalculator.COST_SCALE))
                .status(SupplierSettlementStatus.OPEN)
                .build();

        SupplierSettlementModel saved = supplierSettlementRepositoryPort.save(created);
        log.info(
                "Created supplier settlement id={} supplierId={} periodFrom={} periodTo={}",
                saved.getId(),
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
