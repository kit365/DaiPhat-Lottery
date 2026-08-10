package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateVendorAllocationDraftRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorReturnInspectionRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReturnVendorAllocationSerialsRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.SettleVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationBatchResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationCandidateResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationSuggestionResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorConfirmationQuoteResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorSettlementPreviewResponse;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface VendorAllocationServicePort {
    List<VendorAllocationCandidateResponse> getCandidates(Long profileId, LocalDate businessDate);
    VendorAllocationSuggestionResponse getSuggestion(Long profileId, LocalDate businessDate, Integer requestedQuantity);
    default VendorAllocationSuggestionResponse getSuggestion(Long profileId, LocalDate businessDate) {
        return getSuggestion(profileId, businessDate, null);
    }
    VendorAllocationBatchResponse createDraft(CreateVendorAllocationDraftRequest request, boolean canOverrideLuckyTicket);
    default VendorAllocationBatchResponse createDraft(CreateVendorAllocationDraftRequest request) {
        return createDraft(request, false);
    }
    VendorAllocationBatchResponse getById(Long id);
    VendorAllocationBatchResponse getOpenBatch(Long profileId);
    PageResponse<VendorAllocationBatchResponse> list(
            Long profileId,
            Collection<AllocationBatchStatus> statuses,
            LocalDate businessDateFrom,
            LocalDate businessDateTo,
            int page,
            int size);
    VendorAllocationBatchResponse confirm(Long id, ConfirmVendorAllocationRequest request, UUID operatorId);
    VendorConfirmationQuoteResponse getConfirmationQuote(Long id);
    VendorAllocationBatchResponse openReturnSession(Long id);
    VendorAllocationBatchResponse recordReturns(Long id, ReturnVendorAllocationSerialsRequest request);
    VendorAllocationBatchResponse confirmReturnInspection(Long id, ConfirmVendorReturnInspectionRequest request, UUID operatorId);
    VendorSettlementPreviewResponse previewSettlement(Long id);
    VendorAllocationBatchResponse settle(Long id, SettleVendorAllocationRequest request, UUID operatorId);
    @Deprecated
    default VendorAllocationBatchResponse settle(Long id, UUID operatorId) {
        throw new UnsupportedOperationException("Settlement requires counted cash amounts");
    }
    void cancel(Long id);
    int expireDrafts();
}
