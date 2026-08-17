package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.config.ChatAssignmentProperties;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.mapper.chat.ChatApplicationMapper;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.chat.ChatConversationEventPublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ChatMessagePublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ChatOperatorPresencePort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatLiveAssignmentService")
class ChatLiveAssignmentServiceTest {

    private static final Long CONVERSATION_ID = 10L;
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OPERATOR_A = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock
    private ConversationRepositoryPort conversationRepositoryPort;
    @Mock
    private MessageRepositoryPort messageRepositoryPort;
    @Mock
    private UserLookupServicePort userLookupServicePort;
    @Mock
    private ChatApplicationMapper chatApplicationMapper;
    @Mock
    private ChatConversationEventPublisherPort chatConversationEventPublisherPort;
    @Mock
    private ChatMessagePublisherPort chatMessagePublisherPort;
    @Mock
    private ChatOperatorPresencePort chatOperatorPresencePort;

    private ChatLiveAssignmentService service;

    @BeforeEach
    void setUp() {
        ChatAssignmentProperties properties = new ChatAssignmentProperties();
        properties.setMaxConcurrentLive(1);
        service = new ChatLiveAssignmentService(
                conversationRepositoryPort,
                messageRepositoryPort,
                userLookupServicePort,
                chatApplicationMapper,
                chatConversationEventPublisherPort,
                chatMessagePublisherPort,
                properties,
                chatOperatorPresencePort
        );
    }

    @Test
    void assignWaitingConversationToOperator_whenAtCapacity_throws() {
        ConversationModel waiting = waitingConversation();
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator());
        when(conversationRepositoryPort.countLiveAssignments(OPERATOR_A)).thenReturn(1L);

        assertThatThrownBy(() -> service.assignWaitingConversationToOperator(waiting, OPERATOR_A))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONVERSATION_OPERATOR_AT_CAPACITY);
        verify(conversationRepositoryPort, never()).save(any());
    }

    @Test
    void assignWaitingConversationToOperator_whenUniqueIndexViolated_mapsToCapacity() {
        ConversationModel waiting = waitingConversation();
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator());
        when(conversationRepositoryPort.countLiveAssignments(OPERATOR_A)).thenReturn(0L);
        when(conversationRepositoryPort.save(any())).thenThrow(
                new DataIntegrityViolationException(
                        "duplicate",
                        new RuntimeException("duplicate key value violates unique constraint \"uk_conversations_one_live_operator\"")
                )
        );

        assertThatThrownBy(() -> service.assignWaitingConversationToOperator(waiting, OPERATOR_A))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONVERSATION_OPERATOR_AT_CAPACITY);
    }

    @Test
    void tryDispatchNextForFreedOperator_whenOffline_skips() {
        when(chatOperatorPresencePort.isOperatorOnline(OPERATOR_A)).thenReturn(false);

        assertThat(service.tryDispatchNextForFreedOperator(OPERATOR_A, CONVERSATION_ID)).isEmpty();
        verify(conversationRepositoryPort, never()).findNextWaitingForOperatorForUpdate(any());
    }

    @Test
    void tryAssignIdleOnlineOperator_assignsFirstIdleStaff() {
        ConversationModel waiting = waitingConversation();
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(waiting));
        when(conversationRepositoryPort.countLiveAssignments(OPERATOR_A)).thenReturn(0L);
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(waiting));
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator());
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(chatApplicationMapper.toChatMessageSocketResponse(any(MessageModel.class)))
                .thenReturn(ChatMessageSocketResponse.builder().id(1L).conversationId(CONVERSATION_ID).build());
        when(chatOperatorPresencePort.findOnlineOperators()).thenReturn(List.of(operator()));

        Optional<ConversationModel> assigned = service.tryAssignIdleOnlineOperator(waiting);

        assertThat(assigned).isPresent();
        assertThat(assigned.get().getAssignedOperatorId()).isEqualTo(OPERATOR_A);
        assertThat(assigned.get().getStatus()).isEqualTo(ConversationStatus.ACTIVE);
    }

    private ConversationModel waitingConversation() {
        return ConversationModel.builder()
                .id(CONVERSATION_ID)
                .title("Support")
                .customerId(CUSTOMER_ID)
                .status(ConversationStatus.WAITING_FOR_OPERATOR)
                .build();
    }

    private UserModel operator() {
        return UserModel.builder()
                .id(OPERATOR_A)
                .username("op-a")
                .firstName("Operator A")
                .status(UserStatus.ACTIVE)
                .role(RoleModel.builder().code(RoleConstants.ROLE_STAFF_OPERATOR).build())
                .build();
    }
}
