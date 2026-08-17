package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.config.ChatAssignmentProperties;
import com.daiphat.coreapi.application.dto.response.chat.ChatConversationSocketEvent;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.mapper.chat.ChatApplicationMapper;
import com.daiphat.coreapi.application.port.in.chat.ChatLiveAssignmentPort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.chat.ChatConversationEventPublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ChatMessagePublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ChatOperatorPresencePort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationSocketEventType;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatLiveAssignmentService implements ChatLiveAssignmentPort {

    static final String LIVE_OPERATOR_INDEX = "uk_conversations_one_live_operator";

    private final ConversationRepositoryPort conversationRepositoryPort;
    private final MessageRepositoryPort messageRepositoryPort;
    private final UserLookupServicePort userLookupServicePort;
    private final ChatApplicationMapper chatApplicationMapper;
    private final ChatConversationEventPublisherPort chatConversationEventPublisherPort;
    private final ChatMessagePublisherPort chatMessagePublisherPort;
    private final ChatAssignmentProperties chatAssignmentProperties;
    private final ChatOperatorPresencePort chatOperatorPresencePort;

    @Override
    public ConversationModel assignWaitingConversationToOperator(ConversationModel conversation, UUID operatorId) {
        if (conversation == null || operatorId == null) {
            throw new DomainException(ErrorCode.CONVERSATION_CANNOT_ASSIGN);
        }
        if (!conversation.isAssignable()) {
            throw new DomainException(ErrorCode.CONVERSATION_CANNOT_ASSIGN);
        }

        UserModel operator = userLookupServicePort.findActiveByIdOrThrow(operatorId);
        assertHasCapacity(operatorId, conversation.getId());
        conversation.assignToOperator(operatorId);

        ConversationModel savedConversation;
        try {
            savedConversation = conversationRepositoryPort.save(conversation);
        } catch (DataIntegrityViolationException exception) {
            if (isLiveAssignmentConstraint(exception)) {
                throw new DomainException(ErrorCode.CONVERSATION_OPERATOR_AT_CAPACITY);
            }
            throw exception;
        }

        saveSystemDividerMessage(
                savedConversation.getId(),
                ConversationModel.operatorAcceptanceCopy(operator.getFullName())
        );
        publishConversationEvent(ConversationSocketEventType.CONVERSATION_TAKEN, savedConversation, null);
        publishConversationEvent(ConversationSocketEventType.CONVERSATION_ASSIGNED, savedConversation, null);
        return savedConversation;
    }

    @Override
    public Optional<ConversationModel> tryDispatchNextForFreedOperator(UUID operatorId, Long excludeConversationId) {
        if (operatorId == null || !chatOperatorPresencePort.isOperatorOnline(operatorId)) {
            return Optional.empty();
        }
        if (!hasCapacity(operatorId)) {
            return Optional.empty();
        }

        Optional<ConversationModel> next = conversationRepositoryPort
                .findNextWaitingForOperatorForUpdate(excludeConversationId);
        if (next.isEmpty() || !next.get().isAssignable()) {
            return Optional.empty();
        }

        try {
            return Optional.of(assignWaitingConversationToOperator(next.get(), operatorId));
        } catch (DomainException exception) {
            if (exception.getErrorCode() == ErrorCode.CONVERSATION_OPERATOR_AT_CAPACITY
                    || exception.getErrorCode() == ErrorCode.CONVERSATION_CANNOT_ASSIGN
                    || exception.getErrorCode() == ErrorCode.CONVERSATION_ALREADY_ASSIGNED) {
                return Optional.empty();
            }
            throw exception;
        }
    }

    @Override
    public Optional<ConversationModel> tryAssignIdleOnlineOperator(ConversationModel waitingConversation) {
        if (waitingConversation == null || waitingConversation.getId() == null) {
            return Optional.empty();
        }

        ConversationModel locked = conversationRepositoryPort.findByIdForUpdate(waitingConversation.getId())
                .orElse(waitingConversation);
        if (!locked.isAssignable()) {
            return Optional.empty();
        }

        for (UserModel operator : chatOperatorPresencePort.findOnlineOperators()) {
            if (operator.getId() == null || !hasCapacity(operator.getId())) {
                continue;
            }
            try {
                return Optional.of(assignWaitingConversationToOperator(locked, operator.getId()));
            } catch (DomainException exception) {
                if (exception.getErrorCode() == ErrorCode.CONVERSATION_OPERATOR_AT_CAPACITY
                        || exception.getErrorCode() == ErrorCode.CONVERSATION_CANNOT_ASSIGN
                        || exception.getErrorCode() == ErrorCode.CONVERSATION_ALREADY_ASSIGNED) {
                    locked = conversationRepositoryPort.findByIdForUpdate(waitingConversation.getId())
                            .orElse(locked);
                    continue;
                }
                throw exception;
            }
        }
        return Optional.empty();
    }

    private void assertHasCapacity(UUID operatorId, Long conversationId) {
        if (!hasCapacity(operatorId, conversationId)) {
            throw new DomainException(ErrorCode.CONVERSATION_OPERATOR_AT_CAPACITY);
        }
    }

    private boolean hasCapacity(UUID operatorId) {
        return hasCapacity(operatorId, null);
    }

    private boolean hasCapacity(UUID operatorId, Long conversationId) {
        long liveCount = conversationRepositoryPort.countLiveAssignments(operatorId);
        if (conversationId != null) {
            ConversationModel current = conversationRepositoryPort.findById(conversationId).orElse(null);
            if (current != null
                    && operatorId.equals(current.getAssignedOperatorId())
                    && current.getStatus() != null
                    && ConversationModel.LIVE_ASSIGNMENT_STATUSES.contains(current.getStatus())) {
                liveCount = Math.max(0, liveCount - 1);
            }
        }
        return liveCount < chatAssignmentProperties.resolvedMaxConcurrentLive();
    }

    private boolean isLiveAssignmentConstraint(DataIntegrityViolationException exception) {
        String message = exception.getMostSpecificCause() != null
                ? exception.getMostSpecificCause().getMessage()
                : exception.getMessage();
        return message != null && message.contains(LIVE_OPERATOR_INDEX);
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
                .lastAssignedOperatorId(conversation.getLastAssignedOperatorId())
                .closedBy(conversation.getClosedBy())
                .reason(reason)
                .customerLastReadAt(conversation.getCustomerLastReadAt())
                .createdAt(LocalDateTime.now())
                .build();
        chatConversationEventPublisherPort.publishToOperators(event);
        chatConversationEventPublisherPort.publishToConversation(conversation.getId(), event);
        chatConversationEventPublisherPort.publishToCustomer(conversation.getCustomerId(), event);
    }

    private void saveSystemDividerMessage(Long conversationId, String content) {
        MessageModel savedMessage = messageRepositoryPort.save(MessageModel.systemDivider(conversationId, content));
        ConversationModel conversation = conversationRepositoryPort.findById(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.CONVERSATION_NOT_FOUND));
        ChatMessageSocketResponse response = chatApplicationMapper.toChatMessageSocketResponse(savedMessage);
        chatMessagePublisherPort.publishToConversation(conversationId, response);
        chatMessagePublisherPort.publishToCustomer(conversation.getCustomerId(), response);
    }
}
