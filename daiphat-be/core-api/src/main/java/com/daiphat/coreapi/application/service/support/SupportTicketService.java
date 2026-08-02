package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketCommentRequest;
import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.request.support.ResolutionFeedbackRequest;
import com.daiphat.coreapi.application.dto.request.support.ResolveSupportTicketRequest;
import com.daiphat.coreapi.application.dto.request.support.StaffSupportTicketResponseRequest;
import com.daiphat.coreapi.application.dto.request.support.UpdateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.support.OrderComplaintEligibilityResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketCommentResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketStaffSummaryResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketSummaryResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.event.SupportTicketAssignedEvent;
import com.daiphat.coreapi.application.event.SupportTicketClosedEvent;
import com.daiphat.coreapi.application.event.SupportTicketCommentAddedEvent;
import com.daiphat.coreapi.application.event.SupportTicketCreatedEvent;
import com.daiphat.coreapi.application.event.SupportTicketRejectedEvent;
import com.daiphat.coreapi.application.event.SupportTicketReopenedEvent;
import com.daiphat.coreapi.application.mapper.support.SupportApplicationMapper;
import com.daiphat.coreapi.application.port.in.support.SupportTicketServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketCommentRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.TicketCategoryRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.support.StaffTicketResponseAction;
import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.support.SupportTicketCommentModel;
import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import com.daiphat.coreapi.shared.util.StorageUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupportTicketService implements SupportTicketServicePort {

    private final SupportTicketRepositoryPort supportTicketRepositoryPort;
    private final SupportTicketCommentRepositoryPort supportTicketCommentRepositoryPort;
    private final TicketCategoryRepositoryPort ticketCategoryRepositoryPort;
    private final OrderRepositoryPort orderRepositoryPort;
    private final UserRepositoryPort userRepositoryPort;
    private final StoragePort storagePort;
    private final SupportApplicationMapper supportApplicationMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final RefundComplaintEligibilityService refundComplaintEligibilityService;
    private final OrderComplaintEligibilityService orderComplaintEligibilityService;
    private final PrizePayoutComplaintEligibilityService prizePayoutComplaintEligibilityService;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    @Override
    @Transactional
    public SupportTicketResponse create(UUID customerId, CreateSupportTicketRequest request, UploadRequest file) {
        log.info("Creating support ticket for customer {} in category {}", customerId, request.ticketCategoryId());

        TicketCategoryModel category = getCategoryOrThrow(request.ticketCategoryId());
        validateRefForCategory(category, request.refId(), request.refType(), customerId);
        if (orderComplaintEligibilityService.requiresEvidence(category) && file == null) {
            throw new DomainException(ErrorCode.TICKET_ORDER_COMPLAINT_EVIDENCE_REQUIRED);
        }

        String attachmentUrl = uploadAttachmentIfPresent(file);

        SupportTicketModel ticket = SupportTicketModel.builder()
                .ticketCategoryId(category.getId())
                .customerId(customerId)
                .title(request.title().trim())
                .description(request.description().trim())
                .attachmentUrl(attachmentUrl)
                .refId(request.refId() != null ? request.refId().trim() : null)
                .refType(request.refType())
                .dueAt(calculateDueAt(category.getPriority()))
                .build();
        ticket.initializeForCreate();

        SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);

        SupportTicketCommentModel firstComment = SupportTicketCommentModel.builder()
                .supportTicketId(saved.getId())
                .senderId(customerId)
                .senderRole(TicketCommentSenderRole.CUSTOMER)
                .content(saved.getDescription())
                .attachmentUrl(saved.getAttachmentUrl())
                .build();
        supportTicketCommentRepositoryPort.save(firstComment);

        eventPublisher.publishEvent(SupportTicketCreatedEvent.builder()
                .ticketId(saved.getId())
                .title(saved.getTitle())
                .categoryName(category.getName())
                .customerId(customerId)
                .build());

        return toDetailResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderComplaintEligibilityResponse getOrderComplaintEligibility(UUID orderId, UUID customerId) {
        return orderComplaintEligibilityService.evaluate(orderId, customerId);
    }

    public long countActiveMyTickets(UUID customerId) {
        return supportTicketRepositoryPort.countActiveTickets(customerId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SupportTicketSummaryResponse> getMyTickets(
            UUID customerId, int page, int limit, String status, String search) {
        Pageable pageable = PageableUtils.of(page, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<SupportTicketModel> result = supportTicketRepositoryPort.findAll(
                pageable, customerId, parseStatus(status), normalizeSearch(search));
        return PageResponse.from(
                result.map(supportApplicationMapper::toSummaryResponse),
                page,
                limit);
    }

    @Override
    @Transactional(readOnly = true)
    public SupportTicketResponse getByIdForCustomer(Long id, UUID customerId) {
        SupportTicketModel ticket = getOwnedTicketOrThrow(id, customerId);
        return toDetailResponse(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public SupportTicketResponse getByIdForStaff(Long id, UUID staffId) {
        SupportTicketModel ticket = getTicketOrThrow(id);
        return toDetailResponse(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SupportTicketStaffSummaryResponse> getTicketsForStaff(
            int page,
            int limit,
            String statuses,
            String search,
            UUID assignedTo,
            String sortBy,
            String direction,
            String refType,
            Long ticketCategoryId,
            String categoryCodes) {
        Sort.Direction sortDirection = parseSortDirection(direction);
        String resolvedSortBy = resolveStaffSortField(sortBy);
        Pageable pageable = PageableUtils.of(page, limit, Sort.by(sortDirection, resolvedSortBy));
        Page<SupportTicketModel> result = supportTicketRepositoryPort.findAllForStaff(
                pageable,
                parseStatuses(statuses),
                assignedTo,
                normalizeSearch(search),
                parseRefType(refType),
                ticketCategoryId,
                parseCategoryCodes(categoryCodes));
        return PageResponse.from(
                result.map(this::toStaffSummaryResponse),
                page,
                limit);
    }

    @Override
    @Transactional
    public SupportTicketResponse assignByStaff(Long id, UUID staffId) {
        SupportTicketModel ticket = getTicketOrThrow(id);
        ticket.assignByStaff(staffId);
        SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);
        String staffName = resolveUserDisplayName(staffId);
        saveSystemComment(saved.getId(), staffName + " đã tiếp nhận ticket");
        TicketCategoryModel category = getCategoryOrThrow(saved.getTicketCategoryId());
        eventPublisher.publishEvent(SupportTicketAssignedEvent.builder()
                .ticketId(saved.getId())
                .title(saved.getTitle())
                .categoryName(category.getName())
                .customerId(saved.getCustomerId())
                .staffId(staffId)
                .staffName(staffName)
                .build());
        return toDetailResponse(saved);
    }

    @Override
    @Transactional
    public SupportTicketResponse resolveByStaff(Long id, UUID staffId, ResolveSupportTicketRequest request) {
        String resolution = request.response() != null ? request.response().trim() : "";
        return respondByStaff(
                id,
                staffId,
                new StaffSupportTicketResponseRequest(resolution, StaffTicketResponseAction.RESOLVE),
                null);
    }

    @Override
    @Transactional
    public SupportTicketResponse respondByStaff(
            Long id, UUID staffId, StaffSupportTicketResponseRequest request, UploadRequest file) {
        SupportTicketModel ticket = getTicketOrThrow(id);
        ticket.ensureCommentAllowed();
        ticket.ensureOperatorCanComment();

        StaffTicketResponseAction action = request.action();
        if (action == null) {
            throw new DomainException(ErrorCode.TICKET_STAFF_ACTION_INVALID);
        }

        List<SupportTicketCommentModel> existingComments =
                supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(id);
        // Resolve/reject may happen while waiting for customer (after operator's last reply).
        if (action == StaffTicketResponseAction.NORMAL) {
            SupportTicketModel.ensureSenderTurn(existingComments, TicketCommentSenderRole.OPERATOR);
        }

        String content = request.content() != null ? request.content().trim() : "";
        if (content.isBlank()) {
            throw new DomainException(ErrorCode.TICKET_COMMENT_CONTENT_INVALID);
        }

        String attachmentUrl = uploadAttachmentIfPresent(file);
        // Resolve reason is an internal staff note (system audit), not a chat message to customer.
        TicketCommentSenderRole commentRole = action == StaffTicketResponseAction.RESOLVE
                ? TicketCommentSenderRole.SYSTEM
                : TicketCommentSenderRole.OPERATOR;
        SupportTicketCommentModel comment = SupportTicketCommentModel.builder()
                .supportTicketId(id)
                .senderId(action == StaffTicketResponseAction.RESOLVE ? null : staffId)
                .senderRole(commentRole)
                .content(content)
                .attachmentUrl(attachmentUrl)
                .build();
        SupportTicketCommentModel savedComment = supportTicketCommentRepositoryPort.save(comment);

        switch (action) {
            case NORMAL -> {
                ticket.recordOperatorComment();
                supportTicketRepositoryPort.save(ticket);
                TicketCategoryModel category = getCategoryOrThrow(ticket.getTicketCategoryId());
                eventPublisher.publishEvent(SupportTicketCommentAddedEvent.builder()
                        .ticketId(id)
                        .title(ticket.getTitle())
                        .categoryName(category.getName())
                        .customerId(ticket.getCustomerId())
                        .assignedTo(ticket.getAssignedTo())
                        .senderRole(TicketCommentSenderRole.OPERATOR)
                        .build());
            }
            case RESOLVE -> {
                ticket.resolveByStaff(savedComment.getId(), content);
                SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);
                saveSystemComment(
                        saved.getId(),
                        "Khiếu nại đã được đánh dấu giải quyết và đóng (khách đã đồng ý).");
                TicketCategoryModel category = getCategoryOrThrow(ticket.getTicketCategoryId());
                eventPublisher.publishEvent(SupportTicketClosedEvent.builder()
                        .ticketId(saved.getId())
                        .title(saved.getTitle())
                        .categoryName(category.getName())
                        .customerId(saved.getCustomerId())
                        .autoClosed(false)
                        .build());
            }
            case REJECT -> {
                ticket.rejectByStaff(savedComment.getId(), content);
                SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);
                saveSystemComment(saved.getId(), "Ticket đã bị từ chối vì không hợp lệ hoặc không đủ điều kiện.");
                TicketCategoryModel category = getCategoryOrThrow(ticket.getTicketCategoryId());
                eventPublisher.publishEvent(SupportTicketRejectedEvent.builder()
                        .ticketId(saved.getId())
                        .title(saved.getTitle())
                        .categoryName(category.getName())
                        .customerId(saved.getCustomerId())
                        .build());
            }
            default -> throw new DomainException(ErrorCode.TICKET_STAFF_ACTION_INVALID);
        }

        return toDetailResponse(getTicketOrThrow(id));
    }

    @Override
    @Transactional
    public SupportTicketResponse submitResolutionFeedback(
            Long id, UUID customerId, ResolutionFeedbackRequest request) {
        if (request == null || request.satisfied() == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }

        SupportTicketModel ticket = getOwnedTicketOrThrow(id, customerId);
        if (Boolean.TRUE.equals(request.satisfied())) {
            ticket.acceptResolutionByCustomer();
            SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);
            saveSystemComment(saved.getId(), "Khách hàng hài lòng với phương án giải quyết. Ticket đã đóng.");
            TicketCategoryModel category = getCategoryOrThrow(ticket.getTicketCategoryId());
            eventPublisher.publishEvent(SupportTicketClosedEvent.builder()
                    .ticketId(saved.getId())
                    .title(saved.getTitle())
                    .categoryName(category.getName())
                    .customerId(saved.getCustomerId())
                    .autoClosed(false)
                    .build());
            return toDetailResponse(saved);
        }

        TicketCategoryModel category = getCategoryOrThrow(ticket.getTicketCategoryId());
        ticket.reopenAfterDissatisfaction(calculateDueAt(category.getPriority()));
        SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);
        saveSystemComment(
                saved.getId(),
                "Khách hàng chưa hài lòng với phương án giải quyết. Ticket được mở lại và đưa về hàng chờ tiếp nhận.");
        eventPublisher.publishEvent(SupportTicketReopenedEvent.builder()
                .ticketId(saved.getId())
                .title(saved.getTitle())
                .categoryName(category.getName())
                .customerId(saved.getCustomerId())
                .build());
        return toDetailResponse(saved);
    }

    @Override
    @Transactional
    public int autoCloseResolvedTickets() {
        long autoCloseHours = getAutoCloseHours();
        LocalDateTime cutoff = LocalDateTime.now().minusHours(autoCloseHours);
        List<SupportTicketModel> expired = supportTicketRepositoryPort.findResolvedBefore(cutoff);
        int closedCount = 0;
        for (SupportTicketModel ticket : expired) {
            if (ticket.getStatus() != TicketStatus.RESOLVED) {
                continue;
            }
            ticket.autoCloseResolved();
            SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);
            saveSystemComment(
                    saved.getId(),
                    "Ticket đã tự động đóng sau " + autoCloseHours
                            + " giờ không có phản hồi từ khách hàng.");
            TicketCategoryModel category = getCategoryOrThrow(ticket.getTicketCategoryId());
            eventPublisher.publishEvent(SupportTicketClosedEvent.builder()
                    .ticketId(saved.getId())
                    .title(saved.getTitle())
                    .categoryName(category.getName())
                    .customerId(saved.getCustomerId())
                    .autoClosed(true)
                    .build());
            closedCount++;
        }
        return closedCount;
    }

    private long getAutoCloseHours() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.SUPPORT_TICKET_AUTO_CLOSE_HOURS.name())
                .map(SystemConfigModel::getConfigValue)
                .map(this::parseAutoCloseHours)
                .orElseGet(() -> Long.parseLong(SystemConfigEnum.SUPPORT_TICKET_AUTO_CLOSE_HOURS.getDefaultValue()));
    }

    private Long parseAutoCloseHours(String rawValue) {
        long defaultHours = Long.parseLong(SystemConfigEnum.SUPPORT_TICKET_AUTO_CLOSE_HOURS.getDefaultValue());
        try {
            long hours = Long.parseLong(rawValue.trim());
            return hours > 0 ? hours : defaultHours;
        } catch (NumberFormatException ex) {
            return defaultHours;
        }
    }

    @Override
    @Transactional
    public SupportTicketResponse updateByCustomer(
            Long id, UUID customerId, UpdateSupportTicketRequest request, UploadRequest file) {
        SupportTicketModel ticket = getOwnedTicketOrThrow(id, customerId);
        String attachmentUrl = uploadAttachmentIfPresent(file);

        if (ticket.getStatus() == TicketStatus.OPEN) {
            TicketCategoryModel category = getCategoryOrThrow(ticket.getTicketCategoryId());
            if (request.refId() != null || request.refType() != null) {
                validateRefForCategory(
                        category,
                        request.refId() != null ? request.refId() : ticket.getRefId(),
                        request.refType() != null ? request.refType() : ticket.getRefType(),
                        customerId);
            }
            ticket.updateByCustomerWhenOpen(
                    request.title(),
                    request.description(),
                    attachmentUrl,
                    request.refId(),
                    request.refType());
        } else if (ticket.getStatus() == TicketStatus.WAITING_FOR_CUSTOMER) {
            if (hasDisallowedFieldsForWaitingUpdate(request)) {
                throw new DomainException(ErrorCode.TICKET_ATTACHMENT_ONLY_ALLOWED);
            }
            if (attachmentUrl == null) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Tệp đính kèm là bắt buộc");
            }
            ticket.updateAttachmentWhenWaitingForCustomer(attachmentUrl);
        } else {
            throw new DomainException(ErrorCode.TICKET_CANNOT_UPDATE);
        }

        SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);
        return toDetailResponse(saved);
    }

    @Override
    @Transactional
    public SupportTicketResponse closeByCustomer(Long id, UUID customerId) {
        SupportTicketModel ticket = getOwnedTicketOrThrow(id, customerId);
        ticket.closeByCustomer();
        SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);
        saveSystemComment(saved.getId(), "Khách hàng đã huỷ khiếu nại");
        return toDetailResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SupportTicketCommentResponse> getComments(Long id, UUID actorId, boolean isStaff) {
        authorizeTicketAccess(id, actorId, isStaff);
        List<SupportTicketCommentModel> comments =
                supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(id);
        return supportApplicationMapper.toCommentResponses(comments);
    }

    @Override
    @Transactional
    public SupportTicketCommentResponse addComment(
            Long id,
            UUID actorId,
            boolean isStaff,
            CreateSupportTicketCommentRequest request,
            UploadRequest file) {
        SupportTicketModel ticket = authorizeTicketAccess(id, actorId, isStaff);
        ticket.ensureCommentAllowed();

        if (isStaff) {
            ticket.ensureOperatorCanComment();
        }

        List<SupportTicketCommentModel> existingComments =
                supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(id);
        TicketCommentSenderRole senderRole =
                isStaff ? TicketCommentSenderRole.OPERATOR : TicketCommentSenderRole.CUSTOMER;
        SupportTicketModel.ensureSenderTurn(existingComments, senderRole);

        String content = request.content() != null ? request.content().trim() : "";
        if (content.isBlank()) {
            throw new DomainException(ErrorCode.TICKET_COMMENT_CONTENT_INVALID);
        }

        String attachmentUrl = uploadAttachmentIfPresent(file);

        if (isStaff) {
            ticket.recordOperatorComment();
        } else {
            ticket.recordCustomerComment();
        }

        SupportTicketCommentModel comment = SupportTicketCommentModel.builder()
                .supportTicketId(id)
                .senderId(actorId)
                .senderRole(senderRole)
                .content(content)
                .attachmentUrl(attachmentUrl)
                .build();
        SupportTicketCommentModel savedComment = supportTicketCommentRepositoryPort.save(comment);
        supportTicketRepositoryPort.save(ticket);

        TicketCategoryModel category = getCategoryOrThrow(ticket.getTicketCategoryId());
        eventPublisher.publishEvent(SupportTicketCommentAddedEvent.builder()
                .ticketId(id)
                .title(ticket.getTitle())
                .categoryName(category.getName())
                .customerId(ticket.getCustomerId())
                .assignedTo(ticket.getAssignedTo())
                .senderRole(senderRole)
                .build());

        return supportApplicationMapper.toCommentResponse(savedComment);
    }

    private SupportTicketModel authorizeTicketAccess(Long id, UUID actorId, boolean isStaff) {
        if (isStaff) {
            return getTicketOrThrow(id);
        }
        return getOwnedTicketOrThrow(id, actorId);
    }

    private void saveSystemComment(Long ticketId, String content) {
        SupportTicketCommentModel systemComment = SupportTicketCommentModel.builder()
                .supportTicketId(ticketId)
                .senderId(null)
                .senderRole(TicketCommentSenderRole.SYSTEM)
                .content(content)
                .build();
        supportTicketCommentRepositoryPort.save(systemComment);
    }

    private String resolveUserDisplayName(UUID userId) {
        return userRepositoryPort.findById(userId).map(UserModel::getFullName).orElse("Nhân viên");
    }

    private SupportTicketResponse toDetailResponse(SupportTicketModel ticket) {
        List<SupportTicketCommentModel> comments =
                supportTicketCommentRepositoryPort.findByTicketIdOrderByCreatedAtAsc(ticket.getId());
        SupportTicketResponse base = supportApplicationMapper.toTicketResponse(ticket, comments);
        if (base == null) {
            return null;
        }

        TicketCategoryModel category = ticket.getTicketCategoryId() != null
                ? ticketCategoryRepositoryPort.findById(ticket.getTicketCategoryId()).orElse(null)
                : null;
        String customerName = resolveUserDisplayName(ticket.getCustomerId());
        String assignedToName = ticket.getAssignedTo() != null
                ? resolveUserDisplayName(ticket.getAssignedTo())
                : null;

        return new SupportTicketResponse(
                base.id(),
                base.ticketCategoryId(),
                base.customerId(),
                base.assignedTo(),
                base.title(),
                base.description(),
                base.attachmentUrl(),
                base.refId(),
                base.refType(),
                base.status(),
                base.response(),
                base.resolvedReasonId(),
                base.rejectedReasonId(),
                base.resolvedAt(),
                base.dueAt(),
                base.createdAt(),
                base.updatedAt(),
                base.comments(),
                customerName,
                assignedToName,
                category != null ? category.getName() : null,
                category != null ? category.getCode() : null
        );
    }

    private SupportTicketModel getTicketOrThrow(Long id) {
        return supportTicketRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.TICKET_NOT_FOUND));
    }

    private SupportTicketModel getOwnedTicketOrThrow(Long id, UUID customerId) {
        SupportTicketModel ticket = getTicketOrThrow(id);
        if (!customerId.equals(ticket.getCustomerId())) {
            throw new DomainException(ErrorCode.TICKET_ACCESS_DENIED);
        }
        return ticket;
    }

    private TicketCategoryModel getCategoryOrThrow(Long categoryId) {
        return ticketCategoryRepositoryPort.findById(categoryId)
                .orElseThrow(() -> new DomainException(ErrorCode.TICKET_CATEGORY_NOT_FOUND));
    }

    private void validateRefForCategory(
            TicketCategoryModel category,
            String refId,
            TicketRefType refType,
            UUID customerId) {
        TicketRefType required = category.getRequiredRefType();
        if (required == null) {
            return;
        }
        if (refId == null || refId.isBlank() || refType == null) {
            throw new DomainException(ErrorCode.TICKET_REF_REQUIRED);
        }
        if (refType != required) {
            throw new DomainException(ErrorCode.TICKET_REF_INVALID);
        }
        if (required == TicketRefType.ORDER) {
            orderComplaintEligibilityService.validate(category, refId, customerId);
        } else if (required == TicketRefType.REFUND_REQUEST) {
            refundComplaintEligibilityService.validate(category, refId, customerId);
        } else if (required == TicketRefType.PRIZE_CLAIM) {
            prizePayoutComplaintEligibilityService.validate(category, refId, customerId);
        }
    }

    private String uploadAttachmentIfPresent(UploadRequest file) {
        if (file == null) {
            return null;
        }
        StorageUtils.validateImageUpload(file);
        StorageResult result = storagePort.upload(new UploadRequest(
                file.data(),
                file.fileName(),
                file.contentType(),
                StorageFolderConstants.SUPPORT_TICKET_FOLDER));
        return result.url();
    }

    private LocalDateTime calculateDueAt(int priority) {
        int hours = Math.max(priority, 1) * 24;
        return LocalDateTime.now().plusHours(hours);
    }

    private static boolean hasDisallowedFieldsForWaitingUpdate(UpdateSupportTicketRequest request) {
        return (request.title() != null && !request.title().isBlank())
                || (request.description() != null && !request.description().isBlank())
                || request.refId() != null
                || request.refType() != null;
    }

    private static TicketStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return TicketStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new DomainException(ErrorCode.TICKET_INVALID_STATUS);
        }
    }

    private static String normalizeSearch(String search) {
        return (search == null || search.isBlank()) ? null : search.trim();
    }

    private SupportTicketStaffSummaryResponse toStaffSummaryResponse(SupportTicketModel ticket) {
        return new SupportTicketStaffSummaryResponse(
                ticket.getId(),
                ticket.getTicketCategoryId(),
                ticket.getTitle(),
                ticket.getStatus(),
                ticket.getCustomerId(),
                resolveUserDisplayName(ticket.getCustomerId()),
                ticket.getAssignedTo(),
                ticket.getAssignedTo() != null ? resolveUserDisplayName(ticket.getAssignedTo()) : null,
                ticket.getRefId(),
                ticket.getRefType(),
                ticket.getDueAt(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt());
    }

    private static List<TicketStatus> parseStatuses(String statuses) {
        if (statuses == null || statuses.isBlank()) {
            return List.of(TicketStatus.OPEN, TicketStatus.IN_PROGRESS);
        }
        List<TicketStatus> parsed = new ArrayList<>();
        Arrays.stream(statuses.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .forEach(value -> {
                    try {
                        parsed.add(TicketStatus.valueOf(value.toUpperCase()));
                    } catch (IllegalArgumentException ex) {
                        throw new DomainException(ErrorCode.TICKET_INVALID_STATUS);
                    }
                });
        return parsed.isEmpty() ? List.of(TicketStatus.OPEN, TicketStatus.IN_PROGRESS) : parsed;
    }

    private static Sort.Direction parseSortDirection(String direction) {
        if (direction == null || direction.isBlank()) {
            return Sort.Direction.ASC;
        }
        try {
            return Sort.Direction.fromString(direction.trim());
        } catch (IllegalArgumentException ex) {
            return Sort.Direction.ASC;
        }
    }

    private static String resolveStaffSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "dueAt";
        }
        return switch (sortBy.trim()) {
            case "createdAt" -> "createdAt";
            case "dueAt" -> "dueAt";
            case "updatedAt" -> "updatedAt";
            default -> "dueAt";
        };
    }

    private static TicketRefType parseRefType(String refType) {
        if (refType == null || refType.isBlank()) {
            return null;
        }
        try {
            return TicketRefType.valueOf(refType.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new DomainException(ErrorCode.TICKET_REF_INVALID);
        }
    }

    private static List<String> parseCategoryCodes(String categoryCodes) {
        if (categoryCodes == null || categoryCodes.isBlank()) {
            return null;
        }
        List<String> parsed = Arrays.stream(categoryCodes.split(","))
                .map(String::trim)
                .filter(code -> !code.isBlank())
                .map(String::toUpperCase)
                .toList();
        return parsed.isEmpty() ? null : parsed;
    }
}
