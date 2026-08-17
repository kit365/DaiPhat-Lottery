package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateVendorAllocationDraftRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorReturnInspectionRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorNoReturnRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReturnVendorAllocationSerialsRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReplaceVendorAllocationReturnsRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.SettleVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationBatchResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationCandidateResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationSuggestionResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorConfirmationQuoteResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorSettlementPreviewResponse;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface VendorAllocationServicePort {
    List<VendorAllocationCandidateResponse> getCandidates(Long profileId, LocalDate businessDate);
    /**
     * Builds a quote for one denomination only. The denomination belongs to the inbound
     * use-case contract, so an implementation cannot silently ignore it.
     */
    VendorAllocationSuggestionResponse getSuggestion(
            Long profileId, LocalDate businessDate, Integer requestedQuantity, BigDecimal faceValue);
    default VendorAllocationSuggestionResponse getSuggestion(
            Long profileId, LocalDate businessDate, Integer requestedQuantity) {
        return getSuggestion(profileId, businessDate, requestedQuantity, null);
    }
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
            String search,
            int page,
            int size);
    VendorAllocationBatchResponse confirm(Long id, ConfirmVendorAllocationRequest request, UUID operatorId);
    VendorConfirmationQuoteResponse getConfirmationQuote(Long id);
    VendorAllocationBatchResponse openReturnSession(Long id);
    VendorAllocationBatchResponse recordReturns(Long id, ReturnVendorAllocationSerialsRequest request);
    VendorAllocationBatchResponse replaceReturns(Long id, ReplaceVendorAllocationReturnsRequest request);
    VendorAllocationBatchResponse removeReturn(Long id, Long serialId);
    VendorAllocationBatchResponse confirmReturnInspection(Long id, ConfirmVendorReturnInspectionRequest request, UUID operatorId);
    VendorAllocationBatchResponse confirmNoReturnedTickets(Long id, ConfirmVendorNoReturnRequest request, UUID operatorId);
    VendorAllocationBatchResponse reopenReturnInspection(Long id);
    VendorSettlementPreviewResponse previewSettlement(Long id);
    VendorAllocationBatchResponse settle(Long id, SettleVendorAllocationRequest request, UUID operatorId);
    void cancel(Long id);
    int expireDrafts();
}
