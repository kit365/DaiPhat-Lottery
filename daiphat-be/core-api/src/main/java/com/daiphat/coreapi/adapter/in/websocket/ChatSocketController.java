package com.daiphat.coreapi.adapter.in.websocket;

import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.chat.SendChatMessageSocketRequest;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.port.in.chat.ConversationServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.infrastructure.websocket.WebSocketDestinationConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatSocketController {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final ConversationServicePort conversationServicePort;

    @MessageMapping(WebSocketDestinationConstants.CHAT_SEND_MAPPING)
    public void sendMessage(
            @Valid @Payload SendChatMessageSocketRequest request,
            Principal principal
    ) {
        AuthenticatedUserPrincipal authenticatedUser = extractPrincipal(principal);
        ChatMessageSocketResponse response = conversationServicePort.sendMessage(authenticatedUser.getId(), request);

        simpMessagingTemplate.convertAndSend(
                WebSocketDestinationConstants.conversationTopic(request.conversationId()),
                response
        );
    }

    private AuthenticatedUserPrincipal extractPrincipal(Principal principal) {
        if (principal instanceof AuthenticatedUserPrincipal authenticatedUserPrincipal) {
            return authenticatedUserPrincipal;
        }
        if (principal instanceof org.springframework.security.core.Authentication authentication
                && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal authenticatedUserPrincipal) {
            return authenticatedUserPrincipal;
        }
        throw new DomainException(ErrorCode.UNAUTHORIZED);
    }
}
