package com.daiphat.coreapi.infrastructure.websocket;

import com.daiphat.coreapi.application.dto.response.chat.ChatConversationSocketEvent;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.chat.ChatConversationEventPublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ChatMessagePublisherPort;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ChatConversationEventPublisher implements ChatConversationEventPublisherPort, ChatMessagePublisherPort {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final UserLookupServicePort userLookupServicePort;

    @Override
    public void publishToOperators(ChatConversationSocketEvent event) {
        simpMessagingTemplate.convertAndSend(WebSocketDestinationConstants.CHAT_OPERATORS_TOPIC, event);
    }

    @Override
    public void publishToConversation(Long conversationId, ChatConversationSocketEvent event) {
        simpMessagingTemplate.convertAndSend(WebSocketDestinationConstants.conversationTopic(conversationId), event);
    }

    @Override
    public void publishToCustomer(UUID customerId, ChatConversationSocketEvent event) {
        sendToCustomerInbox(customerId, event);
    }

    @Override
    public void publishToConversation(Long conversationId, ChatMessageSocketResponse message) {
        simpMessagingTemplate.convertAndSend(WebSocketDestinationConstants.conversationTopic(conversationId), message);
    }

    @Override
    public void publishToCustomer(UUID customerId, ChatMessageSocketResponse message) {
        sendToCustomerInbox(customerId, message);
    }

    private void sendToCustomerInbox(UUID customerId, Object payload) {
        userLookupServicePort.findActiveByIdOrThrow(customerId);
        simpMessagingTemplate.convertAndSendToUser(
                customerId.toString(),
                WebSocketDestinationConstants.USER_CHAT_INBOX_DESTINATION,
                payload
        );
    }
}
