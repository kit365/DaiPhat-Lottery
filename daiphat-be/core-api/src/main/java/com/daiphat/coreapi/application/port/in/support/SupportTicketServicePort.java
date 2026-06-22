package com.daiphat.coreapi.application.port.in.support;

import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.request.support.UpdateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketSummaryResponse;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.UUID;

public interface SupportTicketServicePort {

    SupportTicketResponse create(UUID customerId, CreateSupportTicketRequest request, UploadRequest file);

    PageResponse<SupportTicketSummaryResponse> getMyTickets(
            UUID customerId, int page, int limit, String status, String search);

    SupportTicketResponse getByIdForCustomer(Long id, UUID customerId);

    SupportTicketResponse getByIdForStaff(Long id, UUID staffId);

    SupportTicketResponse updateByCustomer(
            Long id, UUID customerId, UpdateSupportTicketRequest request, UploadRequest file);

    SupportTicketResponse closeByCustomer(Long id, UUID customerId);
}
