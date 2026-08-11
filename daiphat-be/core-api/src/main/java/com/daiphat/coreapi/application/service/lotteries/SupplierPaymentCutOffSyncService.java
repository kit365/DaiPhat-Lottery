package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.shared.util.SupplierPaymentCutOffCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.Objects;

/**
 * Keeps {@code lottery_suppliers.payment_cut_off_time} in sync with
 * {@code VERIFICATION_DEADLINE + SETTLEMENT_BUFFER_TIME}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupplierPaymentCutOffSyncService {

    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final SupplierPaymentCutOffCalculator supplierPaymentCutOffCalculator;

    @Transactional
    public int syncAllSuppliers() {
        LocalTime paymentCutOff = supplierPaymentCutOffCalculator.calculate();
        List<LotterySupplierModel> suppliers = lotterySupplierRepositoryPort.findAllNotDeleted();
        int updated = 0;
        int skipped = 0;
        for (LotterySupplierModel supplier : suppliers) {
            LocalTime returnCutOff = supplier.getReturnCutOffTime();
            if (returnCutOff != null && !paymentCutOff.isAfter(returnCutOff)) {
                log.warn(
                        "Skip payment cutoff sync for supplier id={} code={}: payment {} is not after return {}",
                        supplier.getId(),
                        supplier.getCode(),
                        paymentCutOff,
                        returnCutOff
                );
                skipped++;
                continue;
            }
            if (Objects.equals(paymentCutOff, supplier.getPaymentCutOffTime())) {
                continue;
            }
            supplier.setPaymentCutOffTime(paymentCutOff);
            lotterySupplierRepositoryPort.save(supplier);
            updated++;
        }
        if (updated > 0 || skipped > 0) {
            log.info(
                    "Synced payment_cut_off_time={} for {} supplier(s); skipped {} due to return cutoff conflict",
                    paymentCutOff,
                    updated,
                    skipped
            );
        }
        return updated;
    }

    public LocalTime requirePaymentCutOffForReturn(LocalTime returnCutOffTime) {
        LocalTime paymentCutOff = supplierPaymentCutOffCalculator.calculate();
        if (returnCutOffTime != null && !paymentCutOff.isAfter(returnCutOffTime)) {
            throw new com.daiphat.coreapi.domain.exception.DomainException(
                    com.daiphat.coreapi.domain.exception.ErrorCode.INVALID_INPUT,
                    "Giờ thanh toán tính từ cấu hình (" + paymentCutOff
                            + ") phải sau Hạn trả vé (" + returnCutOffTime
                            + "). Điều chỉnh hạn trả vé hoặc VERIFICATION_DEADLINE / SETTLEMENT_BUFFER_TIME."
            );
        }
        return paymentCutOff;
    }
}
