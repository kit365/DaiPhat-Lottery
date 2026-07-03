package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;

import java.util.UUID;

public interface ChatMessagePublisherPort {

    void publishToConversation(Long conversationId, ChatMessageSocketResponse message);

    void publishToCustomer(UUID customerId, ChatMessageSocketResponse message);
}
