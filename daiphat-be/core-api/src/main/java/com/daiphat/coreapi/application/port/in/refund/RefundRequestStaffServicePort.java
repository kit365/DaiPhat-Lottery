package com.daiphat.coreapi.application.port.in.refund;

import com.daiphat.coreapi.application.dto.request.refund.AttachRefundBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.StaffCancelOrderWithRefundRequest;
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

    RefundRequestResponse markTransferred(Long id, UUID staffId, TransferRefundRequestRequest request);

    RefundRequestResponse cancelOrderWithRefund(UUID orderId, UUID staffId, StaffCancelOrderWithRefundRequest request);

    RefundRequestResponse attachBankAccount(Long id, UUID staffId, AttachRefundBankAccountRequest request);

    StorageResult uploadTransferEvidence(UploadRequest request);

    int expireOverdueRequests();
}
