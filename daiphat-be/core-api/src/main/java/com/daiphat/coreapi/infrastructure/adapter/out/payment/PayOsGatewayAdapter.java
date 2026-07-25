package com.daiphat.coreapi.infrastructure.adapter.out.payment;

import com.daiphat.coreapi.application.config.AuthProperties;
import com.daiphat.coreapi.application.config.PaymentProperties;
import com.daiphat.coreapi.application.dto.order.GatewayCallbackResult;
import com.daiphat.coreapi.application.dto.order.PaymentLinkResult;
import com.daiphat.coreapi.application.port.out.order.PaymentOrderCodePort;
import com.daiphat.coreapi.application.port.out.order.PayOsGatewayPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.model.webhooks.Webhook;
import vn.payos.model.webhooks.WebhookData;

@Component
@RequiredArgsConstructor
@Slf4j
public class PayOsGatewayAdapter implements PayOsGatewayPort {

    private static final String PAYOS_CHECKOUT_BASE = "https://pay.payos.vn/web/";
    private static final int PAYMENT_DESCRIPTION_LIMIT = 25;
    private static final long ONLINE_PAYMENT_MIN_AMOUNT = 10_000L;
    private static final int MAX_CREATE_RETRIES = 20;
    private static final String CANCEL_REASON = "Recreate payment link with fresh order code";

    private final PayOS payOS;
    private final AuthProperties authProperties;
    private final PaymentProperties paymentProperties;
    private final PaymentOrderCodePort paymentOrderCodePort;
    private final ObjectMapper objectMapper;

    @Override
    public PaymentLinkResult createOrReusePaymentLink(OrderModel order, TransactionModel transaction) {
        ensureConfigured();

        Long currentGatewayOrderCode = transaction.getGatewayOrderCode();
        if (currentGatewayOrderCode == null) {
            currentGatewayOrderCode = paymentOrderCodePort.getNext();
            transaction.setGatewayOrderCode(currentGatewayOrderCode);
        }

        long expectedAmount = transaction.getAmount().longValue();
        validateMinimumAmount(expectedAmount);
        String description = buildDescription(order.getOrderCode());
        String effectiveReturnUrl = buildPaymentRedirectUrl(
                paymentProperties.getPayos().getReturnPath(),
                order,
                transaction
        );
        String effectiveCancelUrl = buildPaymentRedirectUrl(
                paymentProperties.getPayos().getCancelPath(),
                order,
                transaction
        );

        log.info("PayOS Request - Return URL: {}, Cancel URL: {}", effectiveReturnUrl, effectiveCancelUrl);

        Long gatewayOrderCode = currentGatewayOrderCode;
        for (int attempt = 0; attempt < MAX_CREATE_RETRIES; attempt++) {
            transaction.setGatewayOrderCode(gatewayOrderCode);
            try {
                return createPaymentLink(
                        gatewayOrderCode,
                        expectedAmount,
                        description,
                        effectiveReturnUrl,
                        effectiveCancelUrl
                );
            } catch (Exception ex) {
                String message = ex.getMessage() != null ? ex.getMessage() : "";
                if (!isAlreadyExistsError(message)) {
                    log.error("PayOS create link failed for order {} with gatewayOrderCode {}: {}",
                            order.getId(), gatewayOrderCode, message);
                    throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, ex);
                }
            }

            ExistingLinkInfo existingLink = fetchExistingPaymentInfo(gatewayOrderCode);
            if (existingLink != null && existingLink.isReusableFor(expectedAmount)) {
                return new PaymentLinkResult(gatewayOrderCode, existingLink.checkoutUrl());
            }

            if (existingLink != null && existingLink.shouldCancelBeforeRecreate(expectedAmount)) {
                cancelPaymentLink(gatewayOrderCode);
            }

            gatewayOrderCode = paymentOrderCodePort.getNext();
        }

        log.error("PayOS create link exhausted {} retries for order {}", MAX_CREATE_RETRIES, order.getId());
        throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, "Could not allocate a fresh PayOS order code.");
    }

    @Override
    public boolean cancelPaymentLink(Long gatewayOrderCode) {
        if (gatewayOrderCode == null) {
            return false;
        }
        try {
            payOS.paymentRequests().cancel(gatewayOrderCode, CANCEL_REASON);
            return true;
        } catch (Exception ex) {
            log.warn("Could not cancel PayOS link for gatewayOrderCode {}: {}", gatewayOrderCode, ex.getMessage());
            return false;
        }
    }

    @Override
    public boolean isPaymentPaid(Long gatewayOrderCode) {
        ExistingLinkInfo existingLink = fetchExistingPaymentInfo(gatewayOrderCode);
        return existingLink != null && existingLink.status() == PaymentLinkStatus.PAID;
    }

    @Override
    public GatewayCallbackResult parseCallback(String rawPayload) {
        ensureConfigured();
        try {
            Webhook webhook = objectMapper.readValue(rawPayload, Webhook.class);
            WebhookData verifiedData = payOS.webhooks().verify(webhook);
            boolean success = "00".equals(verifiedData.getCode());
            String paymentRef = firstNonBlank(
                    verifiedData.getReference(),
                    verifiedData.getPaymentLinkId(),
                    String.valueOf(verifiedData.getOrderCode())
            );
            String verifiedPayload = objectMapper.writeValueAsString(verifiedData);

            return new GatewayCallbackResult(
                    success,
                    verifiedData.getOrderCode(),
                    paymentRef,
                    success ? "Thanh toán thành công qua PayOS"
                            : "Thanh toán thất bại qua PayOS. Code: " + verifiedData.getCode(),
                    verifiedData.getCode(),
                    verifiedPayload
            );
        } catch (Exception ex) {
            log.error("PayOS callback verification failed: {}", ex.getMessage());
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, ex);
        }
    }

    private PaymentLinkResult createPaymentLink(
            Long gatewayOrderCode,
            long amount,
            String description,
            String returnUrl,
            String cancelUrl
    ) {
        CreatePaymentLinkRequest request = CreatePaymentLinkRequest.builder()
                .orderCode(gatewayOrderCode)
                .amount(amount)
                .description(description)
                .returnUrl(returnUrl)
                .cancelUrl(cancelUrl)
                .build();

        CreatePaymentLinkResponse response = payOS.paymentRequests().create(request);
        return new PaymentLinkResult(gatewayOrderCode, response.getCheckoutUrl());
    }

    private ExistingLinkInfo fetchExistingPaymentInfo(Long gatewayOrderCode) {
        if (gatewayOrderCode == null) {
            return null;
        }

        try {
            PaymentLink paymentLink = payOS.paymentRequests().get(gatewayOrderCode);
            if (paymentLink == null) {
                return null;
            }
            PaymentLinkStatus status = paymentLink.getStatus();
            long amount = paymentLink.getAmount();
            String paymentLinkId = paymentLink.getId();
            String checkoutUrl = paymentLinkId.isBlank()
                    ? null
                    : PAYOS_CHECKOUT_BASE + paymentLinkId;
            return new ExistingLinkInfo(checkoutUrl, amount, status);
        } catch (Exception ex) {
            log.warn("Could not fetch PayOS link for gatewayOrderCode {}: {}", gatewayOrderCode, ex.getMessage());
            return null;
        }
    }

    private String buildDescription(String orderCode) {
        String description = "TT " + orderCode;
        return description.length() <= PAYMENT_DESCRIPTION_LIMIT
                ? description
                : description.substring(0, PAYMENT_DESCRIPTION_LIMIT);
    }

    private String buildFrontendUrl(String baseUrl, String path) {
        if (isBlank(baseUrl)) {
            throw new DomainException(ErrorCode.UNSUPPORTED_PAYMENT_TYPE, "PayOS frontend base URL is not configured.");
        }
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String normalizedPath = (path == null || path.isBlank()) ? "" : (path.startsWith("/") ? path : "/" + path);
        return normalizedBase + normalizedPath;
    }

    private String buildPaymentRedirectUrl(String path, OrderModel order, TransactionModel transaction) {
        return UriComponentsBuilder.fromUriString(buildFrontendUrl(authProperties.getFrontendUrl(), path))
                .queryParam("internalCode", order.getOrderCode())
                .queryParam("orderId", order.getId())
                .queryParam("transactionId", transaction.getId())
                .queryParam("gateway", transaction.getGateway())
                .build()
                .toUriString();
    }

    private void ensureConfigured() {
        PaymentProperties.Payos payos = paymentProperties.getPayos();
        if (isBlank(payos.getClientId()) || isBlank(payos.getApiKey()) || isBlank(payos.getChecksumKey())
                ) {
            throw new DomainException(ErrorCode.UNSUPPORTED_PAYMENT_TYPE, "PayOS is not fully configured.");
        }
    }

    private void validateMinimumAmount(long amount) {
        if (amount < ONLINE_PAYMENT_MIN_AMOUNT) {
            throw new DomainException(ErrorCode.ONLINE_PAYMENT_MIN_AMOUNT);
        }
    }

    private boolean isAlreadyExistsError(String message) {
        String normalized = message.toLowerCase();
        return normalized.contains("already exist") || normalized.contains("đã tồn tại");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private record ExistingLinkInfo(String checkoutUrl, long amount, PaymentLinkStatus status) {
        boolean isReusableFor(long expectedAmount) {
            return checkoutUrl != null
                    && amount == expectedAmount
                    && status != null
                    && status == PaymentLinkStatus.PENDING;
        }

        boolean shouldCancelBeforeRecreate(long expectedAmount) {
            return status != null
                    && status == PaymentLinkStatus.PENDING
                    && amount != expectedAmount;
        }
    }
}
