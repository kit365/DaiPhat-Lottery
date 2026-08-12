package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotterySupplierResponse;
import com.daiphat.coreapi.application.mapper.lotteries.LotterySupplierApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class LotterySupplierService implements LotterySupplierServicePort {

    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final LotterySupplierApplicationMapper lotterySupplierApplicationMapper;
    private final SupplierPaymentCutOffSyncService supplierPaymentCutOffSyncService;

    @Override
    @Transactional
    public LotterySupplierResponse create(CreateLotterySupplierRequest request) {
        String code = normalizeCode(request.code());
        if (lotterySupplierRepositoryPort.existsByCode(code)) {
            throw new DomainException(ErrorCode.LOTTERY_SUPPLIER_CODE_DUPLICATE);
        }

        validateNonNegativeAmounts(request.paymentTermDays(), request.defaultImportCost());
        LocalTime paymentCutOffTime = supplierPaymentCutOffSyncService
                .requirePaymentCutOffForReturn(request.returnCutOffTime());

        LotterySupplierModel model = lotterySupplierApplicationMapper.toModel(request);
        model.setPaymentCutOffTime(paymentCutOffTime);
        if (Boolean.TRUE.equals(request.isActive())) {
            model.requireActivationReady();
        }
        LotterySupplierModel saved = lotterySupplierRepositoryPort.save(model);
        log.info("Created lottery supplier id={} code={}", saved.getId(), saved.getCode());
        return lotterySupplierApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public LotterySupplierResponse update(Long id, UpdateLotterySupplierRequest request) {
        LotterySupplierModel model = getModelOrThrow(id);
        String code = normalizeCode(request.code());
        if (lotterySupplierRepositoryPort.existsByCodeAndIdNot(code, id)) {
            throw new DomainException(ErrorCode.LOTTERY_SUPPLIER_CODE_DUPLICATE);
        }

        validateNonNegativeAmounts(request.paymentTermDays(), request.defaultImportCost());
        LocalTime paymentCutOffTime = supplierPaymentCutOffSyncService
                .requirePaymentCutOffForReturn(request.returnCutOffTime());

        lotterySupplierApplicationMapper.updateModel(model, request);
        model.setPaymentCutOffTime(paymentCutOffTime);
        if (Boolean.TRUE.equals(request.isActive())) {
            model.requireActivationReady();
        }
        LotterySupplierModel saved = lotterySupplierRepositoryPort.save(model);
        return lotterySupplierApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public LotterySupplierResponse getById(Long id) {
        return lotterySupplierApplicationMapper.toResponse(getModelOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public LotterySupplierModel getActiveModelById(Long id) {
        LotterySupplierModel model = getModelOrThrow(id);
        if (!model.isActive()) {
            throw new DomainException(ErrorCode.LOTTERY_SUPPLIER_INACTIVE);
        }
        return model;
    }

    @Override
    @Transactional(readOnly = true)
    public void ensureActiveSupplierConfigured() {
        if (!lotterySupplierRepositoryPort.existsActive()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_NO_SUPPLIER_CONFIGURED);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LotterySupplierResponse> getAll(
            int page,
            int size,
            String search,
            Boolean isActive,
            String sortBy,
            String direction
    ) {
        PageRequest pageRequest = PageRequest.of(
                Math.max(page - 1, 0),
                size,
                SortUtils.createSort(sortBy, direction)
        );
        Page<LotterySupplierResponse> responsePage = lotterySupplierRepositoryPort
                .findAll(pageRequest, search, isActive)
                .map(lotterySupplierApplicationMapper::toResponse);
        return PageResponse.from(responsePage, page, size);
    }

    private LotterySupplierModel getModelOrThrow(Long id) {
        return lotterySupplierRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_SUPPLIER_NOT_FOUND));
    }

    private void validateNonNegativeAmounts(Integer paymentTermDays, BigDecimal defaultImportCost) {
        if (paymentTermDays != null && paymentTermDays < 0) {
            throw new DomainException(ErrorCode.LOTTERY_SUPPLIER_PAYMENT_TERM_INVALID);
        }
        if (defaultImportCost != null && defaultImportCost.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException(ErrorCode.LOTTERY_SUPPLIER_IMPORT_COST_INVALID);
        }
    }

    private String normalizeCode(String code) {
        return code == null ? null : code.trim().toUpperCase();
    }
}
