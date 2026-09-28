package com.daiphat.coreapi.application.port.in.refund;

import com.daiphat.coreapi.application.dto.request.refund.AttachRefundBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.CompleteCounterRefundRequest;
import com.daiphat.coreapi.application.dto.request.refund.CreateUserBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.RequestBankInfoUpdateRequest;
import com.daiphat.coreapi.application.dto.request.refund.StaffCancelOrderWithRefundRequest;
import com.daiphat.coreapi.application.dto.request.refund.TransferRefundRequestRequest;
import com.daiphat.coreapi.application.dto.request.refund.VerifyRefundCounterIdentityRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestAdminDetailResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.dto.response.refund.UserBankAccountResponse;
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

    RefundRequestResponse requestBankInfoUpdate(Long id, UUID staffId, RequestBankInfoUpdateRequest request);

    RefundRequestResponse cancelOrderWithRefund(UUID orderId, UUID staffId, StaffCancelOrderWithRefundRequest request);

    RefundRequestResponse createPartialRefund(
            UUID orderId,
            UUID staffId,
            com.daiphat.coreapi.application.dto.request.order.CreatePartialRefundRequest request
    );

    RefundRequestResponse attachBankAccount(Long id, UUID staffId, AttachRefundBankAccountRequest request);

    StorageResult uploadTransferEvidence(UploadRequest request);

    StorageResult uploadCounterIdentityImage(UploadRequest request);

    RefundRequestAdminDetailResponse.RefundCounterIdentitySummary verifyCounterIdentity(
            Long id, UUID staffId, VerifyRefundCounterIdentityRequest request);

    RefundRequestResponse completeCounterRefund(Long id, UUID staffId, CompleteCounterRefundRequest request);

    /** Staff adds a bank account for the refund's customer while resolving it at the counter. */
    UserBankAccountResponse createCustomerBankAccount(Long id, UUID staffId, CreateUserBankAccountRequest request);
}
