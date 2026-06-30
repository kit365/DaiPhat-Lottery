package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.SendChatMessageSocketRequest;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationDetailResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.mapper.chat.ChatApplicationMapper;
import com.daiphat.coreapi.application.port.in.chat.ConversationServicePort;
import com.daiphat.coreapi.application.port.out.chat.ChatOperatorPresencePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.ParticipationRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.ParticipationModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import com.daiphat.coreapi.domain.model.enums.chat.ParticipationRole;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConversationService implements ConversationServicePort {

    private final ConversationRepositoryPort conversationRepositoryPort;
    private final ParticipationRepositoryPort participationRepositoryPort;
    private final MessageRepositoryPort messageRepositoryPort;
    private final UserRepositoryPort userRepositoryPort;
    private final ChatOperatorPresencePort chatOperatorPresencePort;
    private final UserLookupServicePort userLookupServicePort;
    private final ChatApplicationMapper chatApplicationMapper;

    @Override
    @Transactional
    public ConversationDetailResponse initCustomerConversation(UUID userId, InitConversationRequest request) {
        UserModel customer = userLookupServicePort.findActiveByIdOrThrow(userId);

        return conversationRepositoryPort.findLatestOpenByParticipantUserId(userId)
                .map(this::toConversationDetailResponse)
                .orElseGet(() -> createConversation(customer, request));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getMyConversations(UUID userId) {
        userLookupServicePort.findActiveByIdOrThrow(userId);
        return enrichConversationResponses(
                conversationRepositoryPort.findByParticipantUserId(userId),
                userId,
                false
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationResponse> getManagementConversations(UUID userId) {
        userLookupServicePort.findActiveByIdOrThrow(userId);
        return enrichConversationResponses(
                conversationRepositoryPort.findAllForManagement(),
                userId,
                true
        );
    }

    @Override
    @Transactional
    public ConversationDetailResponse getManagementConversationDetail(UUID userId, Long conversationId) {
        userLookupServicePort.findActiveByIdOrThrow(userId);
        ConversationModel conversation = conversationRepositoryPort.findById(conversationId)
                .orElseThrow(() -> new DomainException(ErrorCode.INVALID_INPUT, "Không tìm thấy cuộc trò chuyện."));
        participationRepositoryPort.findActiveByConversationIdAndUserId(conversationId, userId)
                .ifPresent(participation -> {
                    participation.markRead(LocalDateTime.now());
                    participationRepositoryPort.save(participation);
                });
        return toConversationDetailResponse(conversation);
    }

    @Override
    @Transactional
    public ChatMessageSocketResponse sendMessage(UUID userId, SendChatMessageSocketRequest request) {
        UserModel sender = userLookupServicePort.findActiveByIdOrThrow(userId);
        ConversationModel conversation = conversationRepositoryPort.findById(request.conversationId())
                .orElseThrow(() -> new DomainException(ErrorCode.INVALID_INPUT, "Không tìm thấy cuộc trò chuyện."));

        if (conversation.getStatus() == ConversationStatus.CLOSED) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cuộc trò chuyện đã đóng.");
        }

        ParticipationModel participation = participationRepositoryPort.findByConversationId(conversation.getId()).stream()
                .filter(item -> item.isActive() && sender.getId().equals(item.getUserId()))
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.ACCESS_DENIED, "Bạn không thuộc cuộc trò chuyện này."));

        MessageModel message = MessageModel.builder()
                .conversationId(conversation.getId())
                .parentId(request.parentId())
                .senderId(sender.getId())
                .senderType(resolveSenderType(participation))
                .content(request.content())
                .type(request.type() != null ? request.type() : MessageType.TEXT)
                .build();
        message.initializeForCreate();
        message.validate();

        MessageModel savedMessage = messageRepositoryPort.save(message);
        participation.markRead(savedMessage.getCreatedAt());
        participationRepositoryPort.save(participation);

        conversation.activate();
        conversationRepositoryPort.save(conversation);

        return ChatMessageSocketResponse.builder()
                .id(savedMessage.getId())
                .conversationId(savedMessage.getConversationId())
                .parentId(savedMessage.getParentId())
                .senderId(savedMessage.getSenderId())
                .senderName(sender.getFullName())
                .content(savedMessage.getContent())
                .type(savedMessage.getType())
                .createdAt(savedMessage.getCreatedAt())
                .build();
    }

    private ConversationDetailResponse createConversation(UserModel customer, InitConversationRequest request) {
        ConversationModel conversation = ConversationModel.builder()
                .title(resolveConversationTitle(customer, request))
                .build();
        conversation.initializeForCreate();
        conversation.waitForOperator();
        conversation.validate();

        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);

        ParticipationModel customerParticipation = ParticipationModel.builder()
                .conversationId(savedConversation.getId())
                .userId(customer.getId())
                .role(ParticipationRole.CUSTOMER)
                .build();
        customerParticipation.initializeForJoin();
        customerParticipation.validate();
        participationRepositoryPort.save(customerParticipation);

        MessageModel initialMessage = MessageModel.builder()
                .conversationId(savedConversation.getId())
                .senderId(customer.getId())
                .senderType(MessageSenderType.CUSTOMER)
                .content(resolveInitialMessageContent(request))
                .type(MessageType.TEXT)
                .build();
        initialMessage.initializeForCreate();
        initialMessage.validate();
        messageRepositoryPort.save(initialMessage);

        resolveDefaultOperator().ifPresent(operator -> {
            ParticipationModel operatorParticipation = ParticipationModel.builder()
                    .conversationId(savedConversation.getId())
                    .userId(operator.getId())
                    .role(ParticipationRole.OPERATOR)
                    .build();
            operatorParticipation.initializeForJoin();
            operatorParticipation.validate();
            participationRepositoryPort.save(operatorParticipation);
            savedConversation.activate();
            conversationRepositoryPort.save(savedConversation);
        });

        return toConversationDetailResponse(savedConversation);
    }

    private java.util.Optional<UserModel> resolveDefaultOperator() {
        return chatOperatorPresencePort.findOnlineOperator()
                .or(() -> userRepositoryPort.findAllByRoleCodes(List.of(RoleConstants.ROLE_STAFF_OPERATOR)).stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .sorted((left, right) -> {
                    String leftUsername = left.getUsername() == null ? "" : left.getUsername();
                    String rightUsername = right.getUsername() == null ? "" : right.getUsername();
                    return leftUsername.compareToIgnoreCase(rightUsername);
                })
                .findFirst());
    }

    private ConversationDetailResponse toConversationDetailResponse(ConversationModel conversation) {
        List<ParticipationModel> participations = participationRepositoryPort.findByConversationId(conversation.getId());
        return ConversationDetailResponse.builder()
                .conversation(chatApplicationMapper.toConversationResponse(conversation))
                .participations(chatApplicationMapper.toParticipationResponses(participations))
                .messages(chatApplicationMapper.toMessageResponses(
                        messageRepositoryPort.findByConversationId(conversation.getId())
                ))
                .build();
    }

    private List<ConversationResponse> enrichConversationResponses(
            List<ConversationModel> conversations,
            UUID userId,
            boolean includeUnreadCount
    ) {
        return conversations.stream()
                .map(chatApplicationMapper::toConversationResponse)
                .map(response -> ConversationResponse.builder()
                        .id(response.id())
                        .title(response.title())
                        .status(response.status())
                        .unreadCount(includeUnreadCount ? resolveUnreadCount(response.id(), userId) : null)
                        .createdAt(response.createdAt())
                        .updatedAt(response.updatedAt())
                        .deletedAt(response.deletedAt())
                        .build())
                .toList();
    }

    private int resolveUnreadCount(Long conversationId, UUID userId) {
        return participationRepositoryPort.findActiveByConversationIdAndUserId(conversationId, userId)
                .map(participation -> messageRepositoryPort.countUnreadByConversationId(
                        conversationId,
                        userId,
                        participation.getLastReadAt()
                ))
                .orElseGet(() -> messageRepositoryPort.countUnreadByConversationId(conversationId, userId, null));
    }

    private String resolveConversationTitle(UserModel customer, InitConversationRequest request) {
        String requestTitle = request != null ? request.title() : null;
        if (requestTitle != null && !requestTitle.isBlank()) {
            return requestTitle.trim();
        }
        if (customer.getFullName() != null && !customer.getFullName().isBlank()) {
            return "Hỗ trợ khách hàng - " + customer.getFullName().trim();
        }
        if (customer.getEmail() != null && !customer.getEmail().isBlank()) {
            return "Hỗ trợ khách hàng - " + customer.getEmail().trim();
        }
        return "Hỗ trợ khách hàng";
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
        return "Xin chào, tôi cần được hỗ trợ.";
    }

    private MessageSenderType resolveSenderType(ParticipationModel participation) {
        return switch (participation.getRole()) {
            case CUSTOMER -> MessageSenderType.CUSTOMER;
            case OPERATOR, SUPERVISOR -> MessageSenderType.OPERATOR;
        };
    }
}
