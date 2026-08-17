package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalTime;

/**
 * Validates supplier payment cut-off against return cut-off.
 * Each supplier owns its own {@code paymentCutOffTime} (no global system-config sync).
 */
@Service
@RequiredArgsConstructor
public class SupplierPaymentCutOffSyncService {

    public LocalTime requirePaymentCutOffAfterReturn(LocalTime paymentCutOffTime, LocalTime returnCutOffTime) {
        if (paymentCutOffTime == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Giờ thanh toán NCC không được để trống.");
        }
        if (returnCutOffTime != null && !paymentCutOffTime.isAfter(returnCutOffTime)) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Giờ thanh toán NCC (" + paymentCutOffTime
                            + ") phải sau Hạn trả vé (" + returnCutOffTime + ")."
            );
        }
        return paymentCutOffTime;
    }
}
