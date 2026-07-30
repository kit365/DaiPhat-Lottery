package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.config.ChatConversationProperties;
import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.dto.request.chat.CloseConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.SendChatMessageSocketRequest;
import com.daiphat.coreapi.application.dto.response.chat.ChatConversationSocketEvent;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationDetailResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.dto.response.chat.CustomerChatTimelineItem;
import com.daiphat.coreapi.application.dto.response.chat.MessageResponse;
import com.daiphat.coreapi.application.dto.response.chat.CustomerChatTimelineResponse;
import com.daiphat.coreapi.application.dto.response.chat.SessionBoundaryResponse;
import com.daiphat.coreapi.application.mapper.chat.ChatApplicationMapper;
import com.daiphat.coreapi.application.port.in.chat.ConversationServicePort;
import com.daiphat.coreapi.application.port.in.chat.ChatEscalationPort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.chat.ChatConversationEventPublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ChatMessagePublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.application.port.in.chat.ChatBotPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.SessionBoundary;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationSocketEventType;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationService implements ConversationServicePort {

    private static final String DEFAULT_CONVERSATION_TITLE_PREFIX = "Hỗ trợ khách hàng - ";
    private static final String DEFAULT_CONVERSATION_TITLE = "Hỗ trợ khách hàng";
    private static final String DEFAULT_INITIAL_MESSAGE = "Xin chào, tôi cần được hỗ trợ.";
    private static final int DEFAULT_TIMELINE_LIMIT = 30;
    private static final int MAX_TIMELINE_LIMIT = 100;

    private final ConversationRepositoryPort conversationRepositoryPort;
    private final MessageRepositoryPort messageRepositoryPort;
    private final UserLookupServicePort userLookupServicePort;
    private final ChatApplicationMapper chatApplicationMapper;
    private final ChatConversationEventPublisherPort chatConversationEventPublisherPort;
    private final ChatMessagePublisherPort chatMessagePublisherPort;
    private final ChatConversationProperties chatConversationProperties;
    private final ChatBotPort chatBotPort;
    private final ChatEscalationPort chatEscalationPort;
    private final ChatMessageProperties chatMessageProperties;

    @Override
    @Transactional
    public ConversationDetailResponse initCustomerConversation(UUID userId, InitConversationRequest request) {
        UserModel customer = userLookupServicePort.findActiveByIdOrThrow(userId);

        return conversationRepositoryPort.findLatestOpenByCustomerId(userId)
                .map(existing -> handleExistingConversationOnInit(customer, existing, request))
                .orElseGet(() -> createConversation(customer, request));
    }

    @Override
    @Transactional(readOnly = true)
    public ConversationDetailResponse getMyOpenConversationDetail(UUID userId) {
        userLookupServicePort.findActiveByIdOrThrow(userId);
        return conversationRepositoryPort.findLatestOpenByCustomerId(userId)
                .map(this::toConversationDetailResponse)
                .orElse(null);
    }

    @Override
    @Transactional
    public ConversationDetailResponse getMyConversationDetail(UUID userId, Long conversationId) {
        userLookupServicePort.findActiveByIdOrThrow(userId);
        ConversationModel conversation = getConversationOrThrow(conversationId);
        assertCustomerAccess(conversation, userId);
        LocalDateTime readAt = LocalDateTime.now();
        LocalDateTime previousReadAt = conversation.getCustomerLastReadAt();
        markConversationRead(conversation, userId, readAt);
        ConversationDetailResponse response = toConversationDetailResponse(conversation);
        messageRepositoryPort.markAllInboundUnreadMessagesAsReadByCustomer(conversation.getId());
        conversationRepositoryPort.save(conversation);
        if (previousReadAt == null || readAt.isAfter(previousReadAt)) {
            publishMessageReadEvent(conversation, readAt);
        }
        return response;
    }

    @Override
    @Transactional
    public ConversationDetailResponse markMyConversationAsRead(UUID userId, Long conversationId) {
        userLookupServicePort.findActiveByIdOrThrow(userId);
        ConversationModel conversation = getConversationOrThrow(conversationId);
        assertCustomerAccess(conversation, userId);
        LocalDateTime readAt = LocalDateTime.now();
        LocalDateTime previousReadAt = conversation.getCustomerLastReadAt();
        markConversationRead(conversation, userId, readAt);
        ConversationDetailResponse response = toConversationDetailResponse(conversation);
        messageRepositoryPort.markAllInboundUnreadMessagesAsReadByCustomer(conversation.getId());
        conversationRepositoryPort.save(conversation);
        if (previousReadAt == null || readAt.isAfter(previousReadAt)) {
            publishMessageReadEvent(conversation, readAt);
        }
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getMyConversations(UUID userId) {
        userLookupServicePort.findActiveByIdOrThrow(userId);
        return enrichConversationResponses(
                conversationRepositoryPort.findByUserId(userId),
                userId,
                false
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getManagementConversations(UUID userId) {
        UserModel user = userLookupServicePort.findActiveByIdOrThrow(userId);
        List<ConversationModel> conversations = (isAdmin(user)
                ? conversationRepositoryPort.findAllForManagement()
                : conversationRepositoryPort.findForOperatorManagement(userId))
                .stream()
                // OPEN = bot-only; customer has not requested staff yet
                .filter(conversation -> !conversation.isBotOnlyOpen())
                // CLOSED sessions are archived out of the live work queue
                .filter(conversation -> conversation.getStatus() != ConversationStatus.CLOSED)
                .filter(conversation -> isAdmin(user) || conversation.isVisibleInOperatorQueue(userId))
                .sorted(managementConversationComparator())
                .toList();
        return enrichConversationResponses(conversations, userId, true);
    }

    @Override
    @Transactional
    public ConversationDetailResponse getManagementConversationDetail(UUID userId, Long conversationId) {
        UserModel user = userLookupServicePort.findActiveByIdOrThrow(userId);
        ConversationModel conversation = getConversationOrThrow(conversationId);
        assertManagementAccess(conversation, userId, isAdmin(user));
        if (userId.equals(conversation.getAssignedOperatorId())) {
            markConversationRead(conversation, userId);
            conversationRepositoryPort.save(conversation);
        }
        return toManagementConversationDetailResponse(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageResponse> getPreHandoffMessages(UUID userId, Long conversationId) {
        UserModel user = userLookupServicePort.findActiveByIdOrThrow(userId);
        ConversationModel conversation = getConversationOrThrow(conversationId);
        assertManagementAccess(conversation, userId, isAdmin(user));
        if (!isAdmin(user) && !userId.equals(conversation.getAssignedOperatorId())) {
            throw new DomainException(ErrorCode.CONVERSATION_VIEW_DENIED);
        }

        List<MessageModel> allMessages = messageRepositoryPort.findByConversationId(conversationId);
        Optional<LocalDateTime> cutoff = ConversationModel.resolveStaffMessageVisibilityCutoff(
                conversation,
                allMessages
        );

        List<MessageModel> preHandoff = allMessages.stream()
                .filter(message -> message.getCreatedAt() != null)
                .filter(message -> cutoff.isEmpty() || message.getCreatedAt().isBefore(cutoff.get()))
                .filter(message -> message.getType() != MessageType.SYSTEM)
                .toList();

        return preHandoff.stream()
                .map(message -> {
                    MessageResponse response = chatApplicationMapper.toMessageResponse(message);
                    String readable = com.daiphat.coreapi.domain.service.chat.HandoffSummaryBuilder
                            .toStaffReadableContent(message.getContent());
                    if (readable == null) {
                        return response;
                    }
                    return MessageResponse.builder()
                            .id(response.id())
                            .conversationId(response.conversationId())
                            .parentId(response.parentId())
                            .senderId(response.senderId())
                            .senderType(response.senderType())
                            .content(readable)
                            .intent(response.intent())
                            .confidence(response.confidence())
                            .type(response.type())
                            .fileUrl(response.fileUrl())
                            .fileName(response.fileName())
                            .isEdited(response.isEdited())
                            .editedAt(response.editedAt())
                            .isRead(response.isRead())
                            .readerCount(response.readerCount())
                            .isDeleted(response.isDeleted())
                            .deletedAt(response.deletedAt())
                            .createdAt(response.createdAt())
                            .updatedAt(response.updatedAt())
                            .build();
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerChatTimelineResponse getMyChatTimeline(
            UUID userId,
            Integer limit,
            LocalDateTime beforeCreatedAt,
            Long beforeId
    ) {
        userLookupServicePort.findActiveByIdOrThrow(userId);
        return buildCustomerChatTimeline(userId, limit, beforeCreatedAt, beforeId, null, true, false);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerChatTimelineResponse getCustomerChatTimeline(
            UUID userId,
            UUID customerId,
            Integer limit,
            LocalDateTime beforeCreatedAt,
            Long beforeId
    ) {
        UserModel user = userLookupServicePort.findActiveByIdOrThrow(userId);
        List<ConversationModel> customerConversations = conversationRepositoryPort.findByCustomerId(customerId);
        boolean operatorParticipated = messageRepositoryPort.existsOperatorParticipation(customerId, userId);
        if (!ConversationModel.canViewCustomerTimeline(
                userId,
                isAdmin(user),
                customerConversations,
                operatorParticipated
        )) {
            throw new DomainException(ErrorCode.CONVERSATION_VIEW_DENIED);
        }

        Collection<Long> conversationScope = null;
        if (!isAdmin(user)) {
            conversationScope = ConversationModel.resolveStaffVisibleConversationIds(
                    userId,
                    customerConversations,
                    messageRepositoryPort.findOperatorParticipatedConversationIds(customerId, userId)
            );
            if (conversationScope.isEmpty()) {
                throw new DomainException(ErrorCode.CONVERSATION_VIEW_DENIED);
            }
        }

        return buildCustomerChatTimeline(customerId, limit, beforeCreatedAt, beforeId, conversationScope, false, true);
    }

    private CustomerChatTimelineResponse buildCustomerChatTimeline(
            UUID customerId,
            Integer limit,
            LocalDateTime beforeCreatedAt,
            Long beforeId,
            Collection<Long> conversationIds,
            boolean resolveCustomerReadState,
            boolean applyStaffPrivacyFilter
    ) {
        if ((beforeCreatedAt == null) != (beforeId == null)) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Timeline cursor requires both beforeCreatedAt and beforeId."
            );
        }

        int pageSize = normalizeTimelineLimit(limit);

        List<ConversationModel> customerConversations = conversationRepositoryPort.findByCustomerId(customerId);

        List<MessageModel> fetched = messageRepositoryPort.findCustomerTimelinePage(
                customerId,
                beforeCreatedAt,
                beforeId,
                pageSize + 1,
                conversationIds
        );
        boolean hasMore = fetched.size() > pageSize;
        if (hasMore) {
            fetched = new ArrayList<>(fetched.subList(0, pageSize));
        }

        List<MessageModel> ascMessages = new ArrayList<>(fetched);
        Collections.reverse(ascMessages);

        Map<Long, ConversationModel> conversationById = customerConversations.stream()
                .collect(Collectors.toMap(ConversationModel::getId, conversation -> conversation, (left, right) -> left));
        Map<UUID, String> operatorNames = resolveTimelineOperatorNames(customerConversations);
        Map<Long, Optional<LocalDateTime>> staffVisibilityCutoffByConversation = new HashMap<>();

        Long previousConversationId = null;
        if (!ascMessages.isEmpty()) {
            MessageModel firstMessage = ascMessages.getFirst();
            previousConversationId = messageRepositoryPort
                    .findCustomerTimelineMessageBefore(
                            customerId,
                            firstMessage.getCreatedAt(),
                            firstMessage.getId(),
                            conversationIds
                    )
                    .map(MessageModel::getConversationId)
                    .orElse(null);
        }

        List<CustomerChatTimelineItem> items = new ArrayList<>();
        for (MessageModel message : ascMessages) {
            Long conversationId = message.getConversationId();
            ConversationModel currentConversation = conversationById.computeIfAbsent(
                    conversationId,
                    id -> conversationRepositoryPort.findById(id).orElse(null)
            );
            if (applyStaffPrivacyFilter
                    && !isMessageVisibleToStaff(
                    message,
                    currentConversation,
                    staffVisibilityCutoffByConversation
            )) {
                continue;
            }

            SessionBoundaryResponse sessionBoundary = null;
            if (previousConversationId == null || !previousConversationId.equals(conversationId)) {
                ConversationModel previousConversation = previousConversationId == null
                        ? null
                        : conversationById.get(previousConversationId);
                sessionBoundary = toSessionBoundaryResponse(
                        ConversationModel.buildSessionBoundary(previousConversation, currentConversation),
                        previousConversation,
                        operatorNames
                );
            }
            previousConversationId = conversationId;
            MessageResponse messageResponse = chatApplicationMapper.toMessageResponse(message);
            if (resolveCustomerReadState) {
                messageResponse = resolveCustomerMessageReadState(messageResponse, currentConversation);
            }
            items.add(CustomerChatTimelineItem.builder()
                    .message(messageResponse)
                    .sessionBoundary(sessionBoundary)
                    .build());
        }

        String nextCursor = null;
        if (hasMore && !fetched.isEmpty()) {
            MessageModel oldestInBatch = fetched.getLast();
            nextCursor = encodeTimelineCursor(oldestInBatch.getCreatedAt(), oldestInBatch.getId());
        }

        return CustomerChatTimelineResponse.builder()
                .items(items)
                .hasMore(hasMore)
                .nextCursor(nextCursor)
                .build();
    }

    @Override
    @Transactional
    public ChatMessageSocketResponse sendMessage(UUID userId, SendChatMessageSocketRequest request) {
        UserModel sender = userLookupServicePort.findActiveByIdOrThrow(userId);
        ConversationModel conversation = getConversationOrThrow(request.conversationId());

        if (conversation.getStatus() == ConversationStatus.CLOSED) {
            throw new DomainException(ErrorCode.CONVERSATION_ALREADY_CLOSED);
        }

        if (!canSendMessage(conversation, userId)) {
            throw new DomainException(ErrorCode.CONVERSATION_ACCESS_DENIED);
        }

        MessageSenderType senderType = resolveSenderType(conversation, userId);

        MessageModel message = MessageModel.builder()
                .conversationId(conversation.getId())
                .parentId(request.parentId())
                .senderId(sender.getId())
                .senderType(senderType)
                .content(request.content())
                .type(request.type() != null ? request.type() : MessageType.TEXT)
                .build();
        message.initializeForCreate();
        message.validate();

        MessageModel savedMessage = messageRepositoryPort.save(message);
        conversation.recordLastMessage(senderType, savedMessage.getCreatedAt());
        if (senderType == MessageSenderType.CUSTOMER) {
            handleCustomerMessageBotResponse(conversation, savedMessage);
            acknowledgeCustomerRead(conversation, savedMessage.getCreatedAt());
        } else {
            markConversationRead(conversation, userId, savedMessage.getCreatedAt());
        }
        updateConversationStatusAfterMessage(conversation, senderType);
        conversationRepositoryPort.save(conversation);

        ChatMessageSocketResponse response = chatApplicationMapper.enrichSocketResponse(
                chatApplicationMapper.toChatMessageSocketResponse(savedMessage),
                sender.getFullName()
        );
        chatMessagePublisherPort.publishToConversation(conversation.getId(), response);
        chatMessagePublisherPort.publishToCustomer(conversation.getCustomerId(), response);
        return response;
    }

    @Override
    @Transactional
    public ConversationDetailResponse escalateConversation(UUID actorId, Long conversationId, EscalationReason reason) {
        UserModel actor = userLookupServicePort.findActiveByIdOrThrow(actorId);
        ConversationModel conversation = conversationRepositoryPort.findByIdForUpdate(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.CONVERSATION_NOT_FOUND));

        assertCanEscalate(conversation, actorId);
        if (!isAdmin(actor) && conversation.getAssignedOperatorId() != null
                && !actorId.equals(conversation.getAssignedOperatorId())) {
            throw new DomainException(ErrorCode.CONVERSATION_ASSIGNED_TO_OTHER);
        }

        if (actorId.equals(conversation.getCustomerId())) {
            return escalateCustomerConversation(conversation, reason);
        }

        if (conversation.getStatus() == ConversationStatus.WAITING_FOR_OPERATOR) {
            return toManagementConversationDetailResponse(conversation);
        }

        if (!conversation.canEscalate()) {
            throw new DomainException(ErrorCode.CONVERSATION_CANNOT_ESCALATE);
        }

        EscalationReason resolvedReason = reason != null ? reason : EscalationReason.STAFF_MANUAL;
        List<MessageModel> priorMessages = messageRepositoryPort.findByConversationId(conversation.getId());
        conversation.recordHandoffContext(
                resolvedReason,
                com.daiphat.coreapi.domain.service.chat.HandoffSummaryBuilder.build(priorMessages, resolvedReason)
        );
        conversation.waitForOperator();
        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);
        publishConversationEvent(
                ConversationSocketEventType.CONVERSATION_ESCALATED,
                savedConversation,
                resolvedReason
        );
        return toManagementConversationDetailResponse(savedConversation);
    }

    @Override
    @Transactional
    public ConversationDetailResponse cancelStaffRequest(UUID customerId, Long conversationId) {
        userLookupServicePort.findActiveByIdOrThrow(customerId);
        ConversationModel conversation = conversationRepositoryPort.findByIdForUpdate(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.CONVERSATION_NOT_FOUND));

        assertCustomerAccess(conversation, customerId);

        if (conversation.getStatus() == ConversationStatus.OPEN
                && conversation.getAssignedOperatorId() == null) {
            return toConversationDetailResponse(conversation);
        }

        conversation.cancelStaffRequest();
        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);
        saveSystemDividerMessage(savedConversation.getId(), ConversationModel.cancelStaffRequestCopy());
        publishConversationEvent(
                ConversationSocketEventType.CONVERSATION_STAFF_REQUEST_CANCELLED,
                savedConversation,
                null
        );
        return toConversationDetailResponse(getConversationOrThrow(savedConversation.getId()));
    }

    @Override
    @Transactional
    public ConversationDetailResponse disconnectStaff(UUID customerId, Long conversationId) {
        userLookupServicePort.findActiveByIdOrThrow(customerId);
        ConversationModel conversation = conversationRepositoryPort.findByIdForUpdate(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.CONVERSATION_NOT_FOUND));

        assertCustomerAccess(conversation, customerId);
        conversation.disconnectStaff();

        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);
        saveSystemDividerMessage(savedConversation.getId(), ConversationModel.disconnectStaffCopy());
        publishConversationEvent(
                ConversationSocketEventType.CONVERSATION_STAFF_REQUEST_CANCELLED,
                savedConversation,
                null
        );
        return toConversationDetailResponse(getConversationOrThrow(savedConversation.getId()));
    }

    @Override
    @Transactional
    public ConversationDetailResponse assignConversationToMe(UUID operatorId, Long conversationId) {
        ConversationModel conversation = conversationRepositoryPort.findByIdForUpdate(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (conversation.getStatus() == ConversationStatus.CLOSED) {
            throw new DomainException(ErrorCode.CONVERSATION_ALREADY_CLOSED);
        }

        if (conversation.getAssignedOperatorId() != null) {
            if (conversation.getAssignedOperatorId().equals(operatorId)) {
                return toManagementConversationDetailResponse(conversation);
            }
            throw new DomainException(ErrorCode.CONVERSATION_ALREADY_ASSIGNED);
        }

        if (!conversation.isAssignable()) {
            throw new DomainException(ErrorCode.CONVERSATION_CANNOT_ASSIGN);
        }

        UserModel operator = userLookupServicePort.findActiveByIdOrThrow(operatorId);
        conversation.assignToOperator(operatorId);
        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);
        saveSystemDividerMessage(
                conversationId,
                ConversationModel.operatorAcceptanceCopy(operator.getFullName())
        );

        publishConversationEvent(ConversationSocketEventType.CONVERSATION_TAKEN, savedConversation, null);
        publishConversationEvent(ConversationSocketEventType.CONVERSATION_ASSIGNED, savedConversation, null);

        return toManagementConversationDetailResponse(savedConversation);
    }

    @Override
    @Transactional
    public ConversationDetailResponse unassignConversation(UUID operatorId, Long conversationId) {
        userLookupServicePort.findActiveByIdOrThrow(operatorId);
        ConversationModel conversation = conversationRepositoryPort.findByIdForUpdate(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (conversation.getAssignedOperatorId() == null) {
            return toManagementConversationDetailResponse(conversation);
        }

        if (!operatorId.equals(conversation.getAssignedOperatorId())) {
            throw new DomainException(ErrorCode.CONVERSATION_UNASSIGN_DENIED);
        }

        conversation.unassignOperator();
        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);

        publishConversationEvent(ConversationSocketEventType.CONVERSATION_UNASSIGNED, savedConversation, null);
        publishConversationEvent(ConversationSocketEventType.CONVERSATION_ESCALATED, savedConversation, EscalationReason.STAFF_MANUAL);

        return toManagementConversationDetailResponse(savedConversation);
    }

    @Override
    @Transactional
    public ConversationDetailResponse closeConversation(
            UUID operatorId,
            Long conversationId,
            CloseConversationRequest request
    ) {
        UserModel operator = userLookupServicePort.findActiveByIdOrThrow(operatorId);
        ConversationModel conversation = conversationRepositoryPort.findByIdForUpdate(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (conversation.getStatus() == ConversationStatus.CLOSED) {
            return toManagementConversationDetailResponse(conversation);
        }

        assertCanClose(conversation, operatorId, isAdmin(operator));
        ConversationCloseReason reason = request != null && request.reason() != null
                ? request.reason()
                : ConversationCloseReason.OTHER;
        conversation.closeManually(operatorId, reason);
        saveSystemDividerMessage(conversation.getId(), ConversationModel.manualCloseCustomerCopy());
        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);
        publishConversationEvent(ConversationSocketEventType.CONVERSATION_CLOSED, savedConversation, null);
        return toManagementConversationDetailResponse(savedConversation);
    }

    @Override
    @Transactional
    public int expireTimedOutConversations() {
        LocalDateTime now = LocalDateTime.now();
        int expiredCount = 0;

        notifyWaitingOperatorQueueOverdue(
                now.minusSeconds(chatConversationProperties.getWaitingOperatorSeconds())
        );
        expiredCount += sendAutoCloseWarnings(now);
        expiredCount += expireCustomerSilentConversations(now);
        alertStaffResponseOverdue(now);

        return expiredCount;
    }

    private int sendAutoCloseWarnings(LocalDateTime now) {
        ConversationModel.AutoCloseWarningWindow window = ConversationModel.autoCloseWarningWindow(
                now,
                chatConversationProperties.getCustomerSilenceMinutes(),
                chatConversationProperties.getAutoCloseWarningLeadMinutes()
        );

        int count = 0;
        for (ConversationModel conversation : conversationRepositoryPort.findPendingAutoCloseWarning(
                window.warningThreshold(),
                window.closeThreshold()
        )) {
            if (!conversation.shouldSendAutoCloseWarning(window.warningThreshold(), window.closeThreshold())) {
                continue;
            }
            saveSystemDividerMessage(conversation.getId(), ConversationModel.autoCloseWarningCopy());
            conversation.markAutoCloseWarningSent(now);
            conversationRepositoryPort.save(conversation);
            count++;
        }
        return count;
    }

    private int expireCustomerSilentConversations(LocalDateTime now) {
        LocalDateTime threshold = ConversationModel.customerSilenceThreshold(
                now,
                chatConversationProperties.getCustomerSilenceMinutes()
        );
        int count = 0;
        for (ConversationModel conversation : conversationRepositoryPort.findCustomerSilentSince(threshold)) {
            if (!conversation.isCustomerSilentSince(threshold)) {
                continue;
            }
            finalizeAutoConversationClose(conversation);
            ConversationModel savedConversation = conversationRepositoryPort.save(conversation);
            publishConversationEvent(ConversationSocketEventType.CONVERSATION_CLOSED, savedConversation, null);
            count++;
        }
        return count;
    }

    private int alertStaffResponseOverdue(LocalDateTime now) {
        LocalDateTime threshold = ConversationModel.staffResponseSlaThreshold(
                now,
                chatConversationProperties.getStaffResponseSlaMinutes()
        );
        for (ConversationModel conversation : conversationRepositoryPort.findStaffResponseOverdueSince(threshold)) {
            if (!conversation.isStaffResponseOverdueSince(threshold)) {
                continue;
            }
            log.warn(
                    "Chat SLA breach: conversation {} waiting staff response since {}",
                    conversation.getId(),
                    conversation.getLastMessageAt()
            );
        }
        return 0;
    }

    private void notifyWaitingOperatorQueueOverdue(LocalDateTime updatedBefore) {
        for (ConversationModel conversation : conversationRepositoryPort.findByStatusAndUpdatedAtBefore(
                ConversationStatus.WAITING_FOR_OPERATOR,
                updatedBefore
        )) {
            if (!conversation.isWaitingOperatorTimedOut(updatedBefore)) {
                continue;
            }
            if (conversation.getAssignedOperatorId() != null) {
                continue;
            }
            notifyNoOperatorAvailableIfNeeded(conversation);
        }
    }

    private void finalizeAutoConversationClose(ConversationModel conversation) {
        String staffName = resolveOperatorDisplayName(conversation.getAssignedOperatorId());
        conversation.closeAutomatically();
        saveSystemDividerMessage(conversation.getId(), ConversationModel.sessionCloseCopy(staffName));
    }

    private ConversationDetailResponse createConversation(UserModel customer, InitConversationRequest request) {
        ConversationModel conversation = ConversationModel.builder()
                .title(resolveConversationTitle(customer, request))
                .customerId(customer.getId())
                .build();
        conversation.initializeForCreate();
        conversation.validate();

        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);

        // Click "gặp nhân viên": escalate only — no auto customer chat bubble.
        if (Boolean.TRUE.equals(request.requestStaff())) {
            if (hasMessageContent(request)) {
                MessageModel savedInitialMessage = persistCustomerInitMessage(customer, savedConversation, request);
                acknowledgeCustomerRead(savedConversation, savedInitialMessage.getCreatedAt());
                updateConversationStatusAfterMessage(savedConversation, MessageSenderType.CUSTOMER);
            }
            requestStaffEscalation(savedConversation);
            conversationRepositoryPort.save(savedConversation);
            return toConversationDetailResponse(getConversationOrThrow(savedConversation.getId()));
        }

        MessageModel initialMessage = MessageModel.builder()
                .conversationId(savedConversation.getId())
                .senderId(customer.getId())
                .senderType(MessageSenderType.CUSTOMER)
                .content(resolveInitialMessageContent(request))
                .type(MessageType.TEXT)
                .build();
        initialMessage.initializeForCreate();
        initialMessage.validate();
        MessageModel savedInitialMessage = messageRepositoryPort.save(initialMessage);
        savedConversation.recordLastMessage(MessageSenderType.CUSTOMER, savedInitialMessage.getCreatedAt());

        acknowledgeCustomerRead(savedConversation, savedInitialMessage.getCreatedAt());
        handleCustomerMessageBotResponse(savedConversation, savedInitialMessage);
        updateConversationStatusAfterMessage(savedConversation, MessageSenderType.CUSTOMER);
        conversationRepositoryPort.save(savedConversation);

        ConversationModel conversationForResponse = getConversationOrThrow(savedConversation.getId());
        return toConversationDetailResponse(conversationForResponse);
    }

    private ConversationDetailResponse handleExistingConversationOnInit(
            UserModel customer,
            ConversationModel conversation,
            InitConversationRequest request
    ) {
        if (Boolean.TRUE.equals(request.requestStaff())) {
            persistCustomerInitMessageIfPresent(customer, conversation, request);
            requestStaffEscalation(conversation);
            conversationRepositoryPort.save(conversation);
            return toConversationDetailResponse(getConversationOrThrow(conversation.getId()));
        }

        if (conversation.canReceiveInitContent() && hasMessageContent(request)) {
            MessageModel customerMessage = persistCustomerInitMessage(customer, conversation, request);
            acknowledgeCustomerRead(conversation, customerMessage.getCreatedAt());
            handleCustomerMessageBotResponse(conversation, customerMessage);
            updateConversationStatusAfterMessage(conversation, MessageSenderType.CUSTOMER);
            conversationRepositoryPort.save(conversation);
        }

        return toConversationDetailResponse(getConversationOrThrow(conversation.getId()));
    }

    private ConversationDetailResponse escalateCustomerConversation(
            ConversationModel conversation,
            EscalationReason reason
    ) {
        if (conversation.getAssignedOperatorId() != null
                || conversation.getStatus() == ConversationStatus.WAITING_FOR_OPERATOR) {
            return toConversationDetailResponse(conversation);
        }

        requestStaffEscalation(conversation, reason);
        return toConversationDetailResponse(getConversationOrThrow(conversation.getId()));
    }

    private void requestStaffEscalation(ConversationModel conversation) {
        requestStaffEscalation(conversation, EscalationReason.CUSTOMER_REQUEST);
    }

    private void requestStaffEscalation(ConversationModel conversation, EscalationReason reason) {
        if (conversation.getAssignedOperatorId() != null
                || conversation.getStatus() == ConversationStatus.CLOSED
                || conversation.getStatus() == ConversationStatus.WAITING_FOR_OPERATOR) {
            return;
        }

        chatEscalationPort.escalateFromBot(
                conversation,
                reason != null ? reason : EscalationReason.CUSTOMER_REQUEST,
                chatMessageProperties.getHandoff()
        );
    }

    private void handleCustomerMessageBotResponse(ConversationModel conversation, MessageModel customerMessage) {
        if (conversation.getAssignedOperatorId() != null) {
            return;
        }

        if (conversation.getStatus() == ConversationStatus.WAITING_FOR_OPERATOR) {
            return;
        }

        chatBotPort.processCustomerMessage(conversation, customerMessage);
    }

    private void assertCanEscalate(ConversationModel conversation, UUID actorId) {
        if (actorId.equals(conversation.getCustomerId())) {
            return;
        }
        if (conversation.getAssignedOperatorId() != null && actorId.equals(conversation.getAssignedOperatorId())) {
            return;
        }
        if (conversation.getAssignedOperatorId() == null) {
            return;
        }
        throw new DomainException(ErrorCode.CONVERSATION_ESCALATE_DENIED);
    }

    private void assertCustomerAccess(ConversationModel conversation, UUID userId) {
        if (!userId.equals(conversation.getCustomerId())) {
            throw new DomainException(ErrorCode.CONVERSATION_ACCESS_DENIED);
        }
    }

    private void assertManagementAccess(ConversationModel conversation, UUID userId, boolean isAdmin) {
        if (isAdmin) {
            return;
        }
        if (!conversation.isVisibleInOperatorQueue(userId)) {
            throw new DomainException(ErrorCode.CONVERSATION_ASSIGNED_TO_OTHER);
        }
    }

    private void assertCanClose(ConversationModel conversation, UUID userId, boolean isAdmin) {
        if (isAdmin) {
            return;
        }
        if (conversation.getAssignedOperatorId() == null) {
            return;
        }
        if (userId.equals(conversation.getAssignedOperatorId())) {
            return;
        }
        throw new DomainException(ErrorCode.CONVERSATION_CLOSE_DENIED);
    }

    private boolean isAdmin(UserModel user) {
        return user.getRole() != null && RoleConstants.ADMIN.equals(user.getRole().getCode());
    }

    private ConversationModel getConversationOrThrow(Long conversationId) {
        return conversationRepositoryPort.findById(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.CONVERSATION_NOT_FOUND));
    }

    private boolean canSendMessage(ConversationModel conversation, UUID userId) {
        if (userId.equals(conversation.getCustomerId())) {
            return true;
        }
        return userId.equals(conversation.getAssignedOperatorId());
    }

    private void updateConversationStatusAfterMessage(ConversationModel conversation, MessageSenderType senderType) {
        if (senderType == MessageSenderType.CUSTOMER) {
            if (conversation.getAssignedOperatorId() != null
                    && conversation.getStatus() == ConversationStatus.WAITING_FOR_CUSTOMER) {
                conversation.activate();
            }
            return;
        }

        if (senderType == MessageSenderType.OPERATOR && conversation.getAssignedOperatorId() != null) {
            conversation.waitForCustomer();
        }
    }

    private void publishConversationEvent(
            ConversationSocketEventType eventType,
            ConversationModel conversation,
            EscalationReason reason
    ) {
        ChatConversationSocketEvent event = ChatConversationSocketEvent.builder()
                .eventType(eventType)
                .conversationId(conversation.getId())
                .status(conversation.getStatus())
                .assignedOperatorId(conversation.getAssignedOperatorId())
                .reason(reason)
                .customerLastReadAt(conversation.getCustomerLastReadAt())
                .createdAt(LocalDateTime.now())
                .build();

        chatConversationEventPublisherPort.publishToOperators(event);
        chatConversationEventPublisherPort.publishToConversation(conversation.getId(), event);
        chatConversationEventPublisherPort.publishToCustomer(conversation.getCustomerId(), event);
    }

    private void acknowledgeCustomerRead(ConversationModel conversation, LocalDateTime readAt) {
        LocalDateTime previousReadAt = conversation.getCustomerLastReadAt();
        markConversationRead(conversation, conversation.getCustomerId(), readAt);
        messageRepositoryPort.markInboundMessagesAsReadByCustomer(conversation.getId(), readAt);
        if (previousReadAt == null || readAt.isAfter(previousReadAt)) {
            publishMessageReadEvent(conversation, readAt);
        }
    }

    private void acknowledgeCustomerReadAll(ConversationModel conversation, LocalDateTime readAt) {
        LocalDateTime previousReadAt = conversation.getCustomerLastReadAt();
        markConversationRead(conversation, conversation.getCustomerId(), readAt);
        messageRepositoryPort.markAllInboundUnreadMessagesAsReadByCustomer(conversation.getId());
        if (previousReadAt == null || readAt.isAfter(previousReadAt)) {
            publishMessageReadEvent(conversation, readAt);
        }
    }

    private MessageResponse resolveCustomerMessageReadState(
            MessageResponse message,
            ConversationModel conversation
    ) {
        if (message.isRead()
                || message.senderType() == MessageSenderType.CUSTOMER
                || conversation == null
                || conversation.getCustomerLastReadAt() == null
                || message.createdAt() == null) {
            return message;
        }

        if (!message.createdAt().isAfter(conversation.getCustomerLastReadAt())) {
            return chatApplicationMapper.markAsRead(message);
        }

        return message;
    }

    private void publishMessageReadEvent(ConversationModel conversation, LocalDateTime readAt) {
        ChatConversationSocketEvent event = ChatConversationSocketEvent.builder()
                .eventType(ConversationSocketEventType.MESSAGE_READ)
                .conversationId(conversation.getId())
                .status(conversation.getStatus())
                .assignedOperatorId(conversation.getAssignedOperatorId())
                .customerLastReadAt(readAt)
                .createdAt(readAt)
                .build();
        chatConversationEventPublisherPort.publishToConversation(conversation.getId(), event);
    }

    private Comparator<ConversationModel> managementConversationComparator() {
        return Comparator
                .comparing((ConversationModel conversation) -> conversation.getStatus() == ConversationStatus.WAITING_FOR_OPERATOR ? 0 : 1)
                .thenComparing(ConversationModel::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ConversationModel::getId, Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private ConversationDetailResponse toManagementConversationDetailResponse(ConversationModel conversation) {
        return toConversationDetailResponse(conversation, true);
    }

    private ConversationDetailResponse toConversationDetailResponse(ConversationModel conversation) {
        return toConversationDetailResponse(conversation, false);
    }

    private ConversationDetailResponse toConversationDetailResponse(ConversationModel conversation, boolean staffView) {
        List<MessageModel> messages = messageRepositoryPort.findByConversationId(conversation.getId());
        if (staffView) {
            messages = ConversationModel.filterMessagesVisibleToStaff(conversation, messages);
        }
        List<MessageResponse> messageResponses = chatApplicationMapper.toMessageResponses(messages).stream()
                .map(message -> resolveCustomerMessageReadState(message, conversation))
                .toList();
        return ConversationDetailResponse.builder()
                .conversation(enrichSingleConversationResponse(conversation))
                .messages(messageResponses)
                .build();
    }

    private boolean isMessageVisibleToStaff(
            MessageModel message,
            ConversationModel conversation,
            Map<Long, Optional<LocalDateTime>> staffVisibilityCutoffByConversation
    ) {
        if (message == null || conversation == null || message.getConversationId() == null) {
            return false;
        }
        Optional<LocalDateTime> cutoff = staffVisibilityCutoffByConversation.computeIfAbsent(
                message.getConversationId(),
                conversationId -> ConversationModel.resolveStaffMessageVisibilityCutoff(
                        conversation,
                        messageRepositoryPort.findByConversationId(conversationId)
                )
        );
        if (cutoff.isEmpty() || message.getCreatedAt() == null) {
            return false;
        }
        return !message.getCreatedAt().isBefore(cutoff.get());
    }

    private ConversationResponse enrichSingleConversationResponse(ConversationModel conversation) {
        ConversationResponse response = chatApplicationMapper.toConversationResponse(conversation);
        String operatorName = response.assignedOperatorId() != null
                ? resolveOperatorNames(List.of(conversation)).get(response.assignedOperatorId())
                : null;
        return chatApplicationMapper.enrichConversationResponse(
                response,
                operatorName,
                response.unreadCount()
        );
    }

    private void notifyNoOperatorAvailableIfNeeded(ConversationModel conversation) {
        String message = chatMessageProperties.getNoOperatorOnline();
        if (message == null || message.isBlank()) {
            return;
        }
        boolean alreadySent = messageRepositoryPort.findByConversationId(conversation.getId()).stream()
                .anyMatch(existing -> message.equals(existing.getContent()));
        if (!alreadySent) {
            saveSystemDividerMessage(conversation.getId(), message);
        }
    }

    private void saveSystemDividerMessage(Long conversationId, String content) {
        MessageModel savedMessage = messageRepositoryPort.save(MessageModel.systemDivider(conversationId, content));
        ConversationModel conversation = getConversationOrThrow(conversationId);
        ChatMessageSocketResponse response = chatApplicationMapper.toChatMessageSocketResponse(savedMessage);
        chatMessagePublisherPort.publishToConversation(conversationId, response);
        chatMessagePublisherPort.publishToCustomer(conversation.getCustomerId(), response);
    }

    private MessageModel persistCustomerInitMessage(
            UserModel customer,
            ConversationModel conversation,
            InitConversationRequest request
    ) {
        MessageModel message = MessageModel.builder()
                .conversationId(conversation.getId())
                .senderId(customer.getId())
                .senderType(MessageSenderType.CUSTOMER)
                .content(resolveInitialMessageContent(request))
                .type(MessageType.TEXT)
                .build();
        message.initializeForCreate();
        message.validate();
        MessageModel saved = messageRepositoryPort.save(message);
        conversation.recordLastMessage(MessageSenderType.CUSTOMER, saved.getCreatedAt());
        return saved;
    }

    private void persistCustomerInitMessageIfPresent(
            UserModel customer,
            ConversationModel conversation,
            InitConversationRequest request
    ) {
        if (!hasMessageContent(request)) {
            return;
        }
        MessageModel savedMessage = persistCustomerInitMessage(customer, conversation, request);
        acknowledgeCustomerRead(conversation, savedMessage.getCreatedAt());
        updateConversationStatusAfterMessage(conversation, MessageSenderType.CUSTOMER);
    }

    /** Customer-typed body only — title alone must not become a chat bubble (click-to-staff). */
    private boolean hasMessageContent(InitConversationRequest request) {
        return request != null && request.content() != null && !request.content().isBlank();
    }

    private String resolveOperatorDisplayName(UUID operatorId) {
        if (operatorId == null) {
            return null;
        }
        return userLookupServicePort.findById(operatorId)
                .map(UserModel::getFullName)
                .orElse(null);
    }

    private List<ConversationResponse> enrichConversationResponses(
            List<ConversationModel> conversations,
            UUID userId,
            boolean includeUnreadCount
    ) {
        Map<UUID, String> operatorNames = resolveOperatorNames(conversations);
        return conversations.stream()
                .map(chatApplicationMapper::toConversationResponse)
                .map(response -> chatApplicationMapper.enrichConversationResponse(
                        response,
                        response.assignedOperatorId() != null
                                ? operatorNames.get(response.assignedOperatorId())
                                : null,
                        includeUnreadCount ? resolveUnreadCount(response.id(), userId) : null
                ))
                .toList();
    }

    private Map<UUID, String> resolveOperatorNames(List<ConversationModel> conversations) {
        Map<UUID, String> operatorNames = new HashMap<>();
        conversations.stream()
                .map(ConversationModel::getAssignedOperatorId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .forEach(operatorId -> userLookupServicePort.findById(operatorId)
                        .ifPresent(user -> operatorNames.put(operatorId, user.getFullName())));
        return operatorNames;
    }

    private Map<UUID, String> resolveTimelineOperatorNames(List<ConversationModel> conversations) {
        Map<UUID, String> operatorNames = new HashMap<>();
        conversations.forEach(conversation -> {
            if (conversation.getAssignedOperatorId() != null) {
                operatorNames.putIfAbsent(conversation.getAssignedOperatorId(), null);
            }
            if (conversation.getLastAssignedOperatorId() != null) {
                operatorNames.putIfAbsent(conversation.getLastAssignedOperatorId(), null);
            }
            if (conversation.getClosedBy() != null) {
                operatorNames.putIfAbsent(conversation.getClosedBy(), null);
            }
        });
        operatorNames.keySet().forEach(operatorId -> userLookupServicePort.findById(operatorId)
                .ifPresent(user -> operatorNames.put(operatorId, user.getFullName())));
        return operatorNames;
    }

    private SessionBoundaryResponse toSessionBoundaryResponse(
            SessionBoundary boundary,
            ConversationModel previousSession,
            Map<UUID, String> operatorNames
    ) {
        if (boundary == null) {
            return null;
        }
        ConversationCloseReason closeReason = boundary.previousCloseReason();
        return SessionBoundaryResponse.builder()
                .conversationId(boundary.conversationId())
                .sessionStartedAt(boundary.sessionStartedAt())
                .gapLabel(boundary.gapLabel())
                .previousCloseReason(closeReason)
                .previousCloseReasonLabel(closeReason != null ? closeReason.getLabel() : null)
                .previousOperatorId(boundary.previousOperatorId())
                .previousOperatorName(ConversationModel.resolvePreviousOperatorName(previousSession, operatorNames))
                .previousSessionEndedAt(boundary.previousSessionEndedAt())
                .build();
    }

    private int normalizeTimelineLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_TIMELINE_LIMIT;
        }
        return Math.min(limit, MAX_TIMELINE_LIMIT);
    }

    private String encodeTimelineCursor(LocalDateTime createdAt, Long id) {
        return createdAt + "|" + id;
    }

    private int resolveUnreadCount(Long conversationId, UUID userId) {
        return conversationRepositoryPort.findById(conversationId)
                .map(conversation -> {
                    if (conversation.getStatus() == ConversationStatus.CLOSED) {
                        return 0;
                    }

                    LocalDateTime lastReadAt = conversation.resolveLastReadAtForUser(userId);
                    UUID readerUserId = userId;
                    if (lastReadAt == null && conversation.getAssignedOperatorId() != null) {
                        lastReadAt = conversation.getOperatorLastReadAt();
                        readerUserId = conversation.getAssignedOperatorId();
                    }
                    if (lastReadAt == null) {
                        return messageRepositoryPort.countInboundUnreadForStaff(conversationId);
                    }
                    return messageRepositoryPort.countUnreadByConversationId(
                            conversationId,
                            readerUserId,
                            lastReadAt
                    );
                })
                .orElse(0);
    }

    private void markConversationRead(ConversationModel conversation, UUID userId) {
        markConversationRead(conversation, userId, LocalDateTime.now());
    }

    private void markConversationRead(ConversationModel conversation, UUID userId, LocalDateTime readAt) {
        if (userId.equals(conversation.getCustomerId())) {
            conversation.markCustomerRead(readAt);
        } else if (userId.equals(conversation.getAssignedOperatorId())) {
            conversation.markOperatorRead(readAt);
        }
    }

    private MessageSenderType resolveSenderType(ConversationModel conversation, UUID userId) {
        if (userId.equals(conversation.getCustomerId())) {
            return MessageSenderType.CUSTOMER;
        }
        if (userId.equals(conversation.getAssignedOperatorId())) {
            return MessageSenderType.OPERATOR;
        }
        throw new DomainException(ErrorCode.CONVERSATION_ACCESS_DENIED);
    }

    private String resolveConversationTitle(UserModel customer, InitConversationRequest request) {
        String requestTitle = request != null ? request.title() : null;
        if (requestTitle != null && !requestTitle.isBlank()) {
            return requestTitle.trim();
        }
        if (customer.getFullName() != null && !customer.getFullName().isBlank()) {
            return DEFAULT_CONVERSATION_TITLE_PREFIX + customer.getFullName().trim();
        }
        if (customer.getEmail() != null && !customer.getEmail().isBlank()) {
            return DEFAULT_CONVERSATION_TITLE_PREFIX + customer.getEmail().trim();
        }
        return DEFAULT_CONVERSATION_TITLE;
    }

    private String resolveInitialMessageContent(InitConversationRequest request) {
        if (request != null) {
            if (request.content() != null && !request.content().isBlank()) {
                return request.content().trim();
            }
            if (request.title() != null && !request.title().isBlank()) {
                return request.title().trim();
            }
        }
        return DEFAULT_INITIAL_MESSAGE;
    }
}
