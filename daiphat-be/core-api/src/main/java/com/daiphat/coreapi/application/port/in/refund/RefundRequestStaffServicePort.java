package com.daiphat.coreapi.application.port.in.refund;

import com.daiphat.coreapi.application.dto.request.refund.RejectRefundRequestRequest;
import com.daiphat.coreapi.application.dto.request.refund.TransferRefundRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestAdminDetailResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.UUID;

public interface RefundRequestStaffServicePort {

    PageResponse<RefundRequestResponse> getRequestsForStaff(
            int page,
            int limit,
            String status,
            UUID orderId,
            String search);

    RefundRequestAdminDetailResponse getByIdForStaff(Long id);

    RefundRequestResponse approve(Long id, UUID staffId);

    RefundRequestResponse reject(Long id, UUID staffId, RejectRefundRequestRequest request);

    RefundRequestResponse markTransferred(Long id, UUID staffId, TransferRefundRequestRequest request);

    StorageResult uploadTransferEvidence(UploadRequest request);

    int expireOverdueRequests();
}
