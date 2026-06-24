package com.daiphat.coreapi.application.port.in.support;

import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketCommentRequest;
import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.request.support.ResolveSupportTicketRequest;
import com.daiphat.coreapi.application.dto.request.support.UpdateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketCommentResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketStaffSummaryResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketSummaryResponse;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.List;
import java.util.UUID;

public interface SupportTicketServicePort {

    SupportTicketResponse create(UUID customerId, CreateSupportTicketRequest request, UploadRequest file);

    PageResponse<SupportTicketSummaryResponse> getMyTickets(
            UUID customerId, int page, int limit, String status, String search);

    SupportTicketResponse getByIdForCustomer(Long id, UUID customerId);

    SupportTicketResponse getByIdForStaff(Long id, UUID staffId);

    PageResponse<SupportTicketStaffSummaryResponse> getTicketsForStaff(
            int page,
            int limit,
            String statuses,
            String search,
            UUID assignedTo,
            String sortBy,
            String direction);

    SupportTicketResponse assignByStaff(Long id, UUID staffId);

    SupportTicketResponse resolveByStaff(Long id, UUID staffId, ResolveSupportTicketRequest request);

    SupportTicketResponse updateByCustomer(
            Long id, UUID customerId, UpdateSupportTicketRequest request, UploadRequest file);

    SupportTicketResponse closeByCustomer(Long id, UUID customerId);

    List<SupportTicketCommentResponse> getComments(Long id, UUID actorId, boolean isStaff);

    SupportTicketCommentResponse addComment(
            Long id,
            UUID actorId,
            boolean isStaff,
            CreateSupportTicketCommentRequest request,
            UploadRequest file);
}
