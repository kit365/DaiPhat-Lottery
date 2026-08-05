package com.daiphat.coreapi.application.port.in.payout;

import com.daiphat.coreapi.application.dto.request.payout.CompletePrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.CreateStaffPrizePayoutBatchRequest;
import com.daiphat.coreapi.application.dto.request.payout.CreateStaffPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.RejectPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutBatchCreateResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutLookupResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutPreviewResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutStaffListResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.time.LocalDate;
import java.util.UUID;

public interface PrizePayoutStaffServicePort {

    PrizePayoutStaffListResponse getRequestsForStaff(int page, int limit, String status, String search, UUID viewerStaffId);

    PrizePayoutRequestResponse getByIdForStaff(Long id, UUID viewerStaffId);

    PrizePayoutLookupResponse lookup(
            String orderCode,
            Long stationId,
            LocalDate drawDate,
            String serialNumber);

    /**
     * Stations that actually have sold tickets on {@code drawDate} (for counter lookup filters).
     */
    java.util.List<com.daiphat.coreapi.application.dto.response.payout.PrizePayoutLookupStationResponse>
            listLookupStationsByDrawDate(LocalDate drawDate);

    /** Thin wrapper: resolves one detail then maps to preview shape (prefer {@link #lookup}). */
    PrizePayoutPreviewResponse preview(Long orderDetailId, Long serialId, String serialNumber, String orderCode);

    PrizePayoutRequestResponse createInPerson(UUID staffId, CreateStaffPrizePayoutRequest request);

    PrizePayoutBatchCreateResponse createInPersonBatch(UUID staffId, CreateStaffPrizePayoutBatchRequest request);

    PrizePayoutRequestResponse approve(Long id, UUID staffId);

    PrizePayoutRequestResponse complete(Long id, UUID staffId, CompletePrizePayoutRequest request);

    PrizePayoutRequestResponse reject(Long id, UUID staffId, RejectPrizePayoutRequest request);

    StorageResult uploadTransferEvidence(UploadRequest request);

    StorageResult uploadRecipientIdImage(UploadRequest request);

    StorageResult uploadConfirmationContract(UploadRequest request);
}
