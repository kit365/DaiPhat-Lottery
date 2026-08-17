package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.event.ChatConversationEscalatedEvent;
import com.daiphat.coreapi.application.port.in.chat.ChatAiMessagePort;
import com.daiphat.coreapi.application.port.in.chat.ChatEscalationPort;
import com.daiphat.coreapi.application.port.in.chat.ChatLiveAssignmentPort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import com.daiphat.coreapi.domain.service.chat.HandoffSummaryBuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatEscalationService implements ChatEscalationPort {

    private final ConversationRepositoryPort conversationRepositoryPort;
    private final MessageRepositoryPort messageRepositoryPort;
    private final ApplicationEventPublisher eventPublisher;
    private final ChatAiMessagePort chatAiMessagePort;
    private final ChatLiveAssignmentPort chatLiveAssignmentPort;

    @Override
    @Transactional
    public void escalateFromBot(ConversationModel conversation, EscalationReason reason, String handoffMessage) {
        if (conversation.getAssignedOperatorId() != null || conversation.getStatus() == ConversationStatus.CLOSED) {
            return;
        }

        if (handoffMessage != null && !handoffMessage.isBlank()) {
            if (reason == EscalationReason.AI_DISABLED) {
                // Stay in bot-only OPEN thread; gray system notice, no staff queue.
                chatAiMessagePort.saveSystemNoticeAndPublish(conversation, handoffMessage);
            } else {
                chatAiMessagePort.saveAndPublish(conversation, handoffMessage, null);
            }
        }

        if (!requiresOperatorQueue(reason)) {
            conversationRepositoryPort.save(conversation);
            return;
        }

        if (conversation.canEscalate()) {
            List<MessageModel> priorMessages = messageRepositoryPort.findByConversationId(conversation.getId());
            EscalationReason resolvedReason = reason != null ? reason : EscalationReason.CUSTOMER_REQUEST;
            conversation.recordHandoffContext(
                    resolvedReason,
                    HandoffSummaryBuilder.build(priorMessages, resolvedReason)
            );
            conversation.waitForOperator();
        }
        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);
        // Assign before publishing ESCALATED. The escalated socket event is AFTER_COMMIT and
        // must not overwrite an immediate CONVERSATION_TAKEN with a stale WAITING payload —
        // that left customers stuck on "Huỷ gặp nhân viên" while BE was already ACTIVE.
        var assigned = chatLiveAssignmentPort.tryAssignIdleOnlineOperator(savedConversation);
        if (assigned.isEmpty()) {
            publishEscalatedEvent(savedConversation, reason);
        }
    }

    private boolean requiresOperatorQueue(EscalationReason reason) {
        return reason != EscalationReason.AI_DISABLED;
    }

    private void publishEscalatedEvent(ConversationModel conversation, EscalationReason reason) {
        eventPublisher.publishEvent(ChatConversationEscalatedEvent.builder()
                .conversationId(conversation.getId())
                .customerId(conversation.getCustomerId())
                .status(conversation.getStatus())
                .assignedOperatorId(conversation.getAssignedOperatorId())
                .reason(reason)
                .customerLastReadAt(conversation.getCustomerLastReadAt())
                .occurredAt(LocalDateTime.now())
                .build());
    }
}
