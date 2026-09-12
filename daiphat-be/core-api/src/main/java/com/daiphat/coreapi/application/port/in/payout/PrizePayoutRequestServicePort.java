package com.daiphat.coreapi.application.port.in.payout;

import com.daiphat.coreapi.application.dto.request.payout.CreatePrizePayoutRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutPreviewResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.List;
import java.util.UUID;

public interface PrizePayoutRequestServicePort {

    PrizePayoutRequestResponse create(UUID customerId, CreatePrizePayoutRequestRequest request);

    StorageResult uploadRecipientIdImage(UploadRequest request);

    PrizePayoutPreviewResponse preview(UUID customerId, Long orderDetailId, Long serialId);

    PageResponse<PrizePayoutRequestResponse> getMyRequests(
            UUID customerId,
            int page,
            int limit,
            String status,
            String search);

    PrizePayoutRequestResponse getById(Long id, UUID customerId);

    PrizePayoutRequestResponse cancel(Long id, UUID customerId);

    List<EnumOptionResponse> getStatuses();

    long countPendingByCustomerId(UUID customerId);
}
