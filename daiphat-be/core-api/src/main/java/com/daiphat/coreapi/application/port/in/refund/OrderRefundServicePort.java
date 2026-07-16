package com.daiphat.coreapi.application.port.in.refund;

import com.daiphat.coreapi.application.dto.request.refund.CreateOrderRefundRequest;
import com.daiphat.coreapi.application.dto.response.refund.OrderRefundEligibilityResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;

import java.util.UUID;

public interface OrderRefundServicePort {

    RefundRequestResponse refundPaidOrder(UUID orderId, UUID customerId, CreateOrderRefundRequest request);

    OrderRefundEligibilityResponse getRefundEligibility(UUID orderId, UUID customerId);
}
