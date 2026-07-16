package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.application.dto.request.chat.CloseConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.SendChatMessageSocketRequest;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationDetailResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.dto.response.chat.CustomerChatTimelineResponse;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ConversationServicePort {

    ConversationDetailResponse initCustomerConversation(UUID userId, InitConversationRequest request);

    ConversationDetailResponse getMyOpenConversationDetail(UUID userId);

    ConversationDetailResponse getMyConversationDetail(UUID userId, Long conversationId);

    ConversationDetailResponse markMyConversationAsRead(UUID userId, Long conversationId);

    List<ConversationResponse> getMyConversations(UUID userId);

    List<ConversationResponse> getManagementConversations(UUID userId);

    ConversationDetailResponse getManagementConversationDetail(UUID userId, Long conversationId);

    CustomerChatTimelineResponse getCustomerChatTimeline(
            UUID userId,
            UUID customerId,
            Integer limit,
            LocalDateTime beforeCreatedAt,
            Long beforeId
    );

    CustomerChatTimelineResponse getMyChatTimeline(
            UUID userId,
            Integer limit,
            LocalDateTime beforeCreatedAt,
            Long beforeId
    );

    ChatMessageSocketResponse sendMessage(UUID userId, SendChatMessageSocketRequest request);

    ConversationDetailResponse escalateConversation(UUID actorId, Long conversationId, EscalationReason reason);

    ConversationDetailResponse cancelStaffRequest(UUID customerId, Long conversationId);

    ConversationDetailResponse assignConversationToMe(UUID operatorId, Long conversationId);

    ConversationDetailResponse unassignConversation(UUID operatorId, Long conversationId);

    ConversationDetailResponse closeConversation(
            UUID operatorId,
            Long conversationId,
            CloseConversationRequest request
    );

    int expireTimedOutConversations();
}
