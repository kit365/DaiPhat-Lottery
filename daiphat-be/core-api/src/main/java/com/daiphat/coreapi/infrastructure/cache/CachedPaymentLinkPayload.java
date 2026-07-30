package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.dto.order.PaymentLinkResult;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Redis-friendly DTO (non-final) for caching PayOS create-link payload.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CachedPaymentLinkPayload {
    private Long gatewayOrderCode;
    private String checkoutUrl;
    private String qrCode;
    private String accountNumber;
    private String accountName;
    private Long amount;
    private String description;
    private String bin;
    private Long expiredAt;

    public static CachedPaymentLinkPayload from(PaymentLinkResult result) {
        return new CachedPaymentLinkPayload(
                result.gatewayOrderCode(),
                result.checkoutUrl(),
                result.qrCode(),
                result.accountNumber(),
                result.accountName(),
                result.amount(),
                result.description(),
                result.bin(),
                result.expiredAt()
        );
    }

    public PaymentLinkResult toResult() {
        return new PaymentLinkResult(
                gatewayOrderCode,
                checkoutUrl,
                qrCode,
                accountNumber,
                accountName,
                amount,
                description,
                bin,
                expiredAt
        );
    }

    public boolean hasQrCode() {
        return qrCode != null && !qrCode.isBlank();
    }
}
