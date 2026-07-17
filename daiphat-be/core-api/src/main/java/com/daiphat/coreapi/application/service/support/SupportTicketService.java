package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketCommentRequest;
import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.request.support.ResolveSupportTicketRequest;
import com.daiphat.coreapi.application.dto.request.support.UpdateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketCommentResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketStaffSummaryResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketSummaryResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.event.SupportTicketAssignedEvent;
import com.daiphat.coreapi.application.event.SupportTicketCommentAddedEvent;
import com.daiphat.coreapi.application.event.SupportTicketCreatedEvent;
import com.daiphat.coreapi.application.event.SupportTicketResolvedEvent;
import com.daiphat.coreapi.application.mapper.support.SupportApplicationMapper;
import com.daiphat.coreapi.application.port.in.support.SupportTicketServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketCommentRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.TicketCategoryRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
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

    @Override
    @Transactional
    public SupportTicketResponse create(UUID customerId, CreateSupportTicketRequest request, UploadRequest file) {
        log.info("Creating support ticket for customer {} in category {}", customerId, request.ticketCategoryId());

        TicketCategoryModel category = getCategoryOrThrow(request.ticketCategoryId());
        validateRefForCategory(category, request.refId(), request.refType(), customerId);

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
                .customerId(customerId)
                .build());

        return toDetailResponse(saved);
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
        eventPublisher.publishEvent(SupportTicketAssignedEvent.builder()
                .ticketId(saved.getId())
                .customerId(saved.getCustomerId())
                .staffId(staffId)
                .staffName(staffName)
                .build());
        return toDetailResponse(saved);
    }

    @Override
    @Transactional
    public SupportTicketResponse resolveByStaff(Long id, UUID staffId, ResolveSupportTicketRequest request) {
        SupportTicketModel ticket = getTicketOrThrow(id);
        String resolution = request.response() != null ? request.response().trim() : "";
        if (resolution.isBlank()) {
            throw new DomainException(ErrorCode.TICKET_RESOLUTION_INVALID);
        }
        ticket.resolveByStaff(resolution);
        SupportTicketModel saved = supportTicketRepositoryPort.save(ticket);
        saveSystemComment(saved.getId(), "Ticket đã được giải quyết");
        eventPublisher.publishEvent(SupportTicketResolvedEvent.builder()
                .ticketId(saved.getId())
                .customerId(saved.getCustomerId())
                .build());
        return toDetailResponse(saved);
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
        saveSystemComment(saved.getId(), "Khách hàng đã đóng ticket");
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

        eventPublisher.publishEvent(SupportTicketCommentAddedEvent.builder()
                .ticketId(id)
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
            validateOrderRef(refId, customerId);
        } else if (required == TicketRefType.REFUND_REQUEST) {
            refundComplaintEligibilityService.validate(category, refId, customerId);
        }
    }

    private void validateOrderRef(String refId, UUID customerId) {
        UUID orderId;
        try {
            orderId = UUID.fromString(refId.trim());
        } catch (IllegalArgumentException ex) {
            throw new DomainException(ErrorCode.TICKET_REF_INVALID);
        }
        OrderModel order = orderRepositoryPort.findById(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.TICKET_REF_INVALID));
        if (!customerId.equals(order.getUserId())) {
            throw new DomainException(ErrorCode.TICKET_REF_ORDER_MISMATCH);
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
