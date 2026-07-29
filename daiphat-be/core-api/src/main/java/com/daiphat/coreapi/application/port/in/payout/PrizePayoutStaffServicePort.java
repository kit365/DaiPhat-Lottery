package com.daiphat.coreapi.application.port.in.payout;

import com.daiphat.coreapi.application.dto.request.payout.CompletePrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.RejectPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutStaffListResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.UUID;

public interface PrizePayoutStaffServicePort {

    PrizePayoutStaffListResponse getRequestsForStaff(int page, int limit, String status, String search);

    PrizePayoutRequestResponse getByIdForStaff(Long id);

    PrizePayoutRequestResponse complete(Long id, UUID staffId, CompletePrizePayoutRequest request);

    PrizePayoutRequestResponse reject(Long id, UUID staffId, RejectPrizePayoutRequest request);

    StorageResult uploadTransferEvidence(UploadRequest request);
}
