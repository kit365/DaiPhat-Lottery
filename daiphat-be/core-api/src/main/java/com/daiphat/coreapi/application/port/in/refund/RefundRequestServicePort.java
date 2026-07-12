package com.daiphat.coreapi.application.port.in.refund;

import com.daiphat.coreapi.application.dto.request.refund.AttachRefundBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.CreateRefundRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;

import java.util.List;
import java.util.UUID;

public interface RefundRequestServicePort {

    RefundRequestResponse create(UUID userId, CreateRefundRequestRequest request);

    PageResponse<RefundRequestResponse> getMyRequests(
            UUID userId, int page, int limit, String status, UUID orderId, String search);

    RefundRequestResponse getById(Long id, UUID userId);

    RefundRequestResponse cancel(Long id, UUID userId);

    RefundRequestResponse attachBankAccount(Long id, UUID userId, AttachRefundBankAccountRequest request);

    List<EnumOptionResponse> getRefundRequestStatuses();

    List<EnumOptionResponse> getRefundTypes();
}
