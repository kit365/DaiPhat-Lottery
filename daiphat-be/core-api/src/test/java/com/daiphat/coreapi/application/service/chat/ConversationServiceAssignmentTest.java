package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.config.ChatAssignmentProperties;
import com.daiphat.coreapi.application.config.ChatConversationProperties;
import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.constant.chat.bot.ChatAiMessages;
import com.daiphat.coreapi.application.dto.request.chat.SendChatMessageSocketRequest;
import com.daiphat.coreapi.application.dto.response.chat.ChatConversationSocketEvent;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.dto.response.chat.CustomerChatTimelineResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationDetailResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.dto.response.chat.MessageResponse;
import com.daiphat.coreapi.application.mapper.chat.ChatApplicationMapper;
import com.daiphat.coreapi.application.port.in.chat.ChatEscalationPort;
import com.daiphat.coreapi.application.port.in.chat.ChatStaffContextPort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.chat.ChatConversationEventPublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ChatMessagePublisherPort;
import com.daiphat.coreapi.application.port.out.chat.ChatOperatorPresencePort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.application.port.in.chat.ChatBotPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationSocketEventType;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ConversationService staff assignment")
class ConversationServiceAssignmentTest {

    private static final Long CONVERSATION_ID = 10L;
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OPERATOR_A = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OPERATOR_B = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID ADMIN_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");

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
    private ChatConversationProperties chatConversationProperties;
    @Mock
    private ChatBotPort chatBotPort;
    @Mock
    private ChatEscalationPort chatEscalationPort;
    @Mock
    private ChatMessageProperties chatMessageProperties;
    @Mock
    private ChatOperatorPresencePort chatOperatorPresencePort;
    @Mock
    private ChatStaffContextPort chatStaffContextPort;

    private ConversationService conversationService;

    @BeforeEach
    void setUp() {
        lenient().when(chatMessageProperties.getHandoff()).thenReturn(ChatAiMessages.HANDOFF);
        lenient().when(chatMessageProperties.getNoOperatorOnline()).thenReturn(ChatAiMessages.NO_OPERATOR_ONLINE);
        lenient().when(chatApplicationMapper.enrichConversationResponse(any(), any(), any(), any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(chatApplicationMapper.markAsRead(any())).thenAnswer(invocation -> {
            MessageResponse response = invocation.getArgument(0);
            if (response == null || response.isRead()) {
                return response;
            }
            return MessageResponse.builder()
                    .id(response.id())
                    .conversationId(response.conversationId())
                    .parentId(response.parentId())
                    .senderId(response.senderId())
                    .senderType(response.senderType())
                    .content(response.content())
                    .intent(response.intent())
                    .confidence(response.confidence())
                    .type(response.type())
                    .fileUrl(response.fileUrl())
                    .fileName(response.fileName())
                    .isEdited(response.isEdited())
                    .editedAt(response.editedAt())
                    .isRead(true)
                    .readerCount(Math.max(response.readerCount(), 1))
                    .isDeleted(response.isDeleted())
                    .deletedAt(response.deletedAt())
                    .createdAt(response.createdAt())
                    .updatedAt(response.updatedAt())
                    .build();
        });
        lenient().when(chatApplicationMapper.toChatMessageSocketResponse(any())).thenAnswer(invocation -> {
            MessageModel model = invocation.getArgument(0);
            return ChatMessageSocketResponse.builder()
                    .id(model.getId())
                    .conversationId(model.getConversationId())
                    .parentId(model.getParentId())
                    .senderId(model.getSenderId())
                    .senderType(model.getSenderType())
                    .content(model.getContent())
                    .intent(model.getIntent())
                    .type(model.getType())
                    .createdAt(model.getCreatedAt())
                    .build();
        });
        lenient().when(chatApplicationMapper.enrichSocketResponse(any(), any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ChatAssignmentProperties chatAssignmentProperties = new ChatAssignmentProperties();
        chatAssignmentProperties.setMaxConcurrentLive(1);
        ChatLiveAssignmentService chatLiveAssignmentService = new ChatLiveAssignmentService(
                conversationRepositoryPort,
                messageRepositoryPort,
                userLookupServicePort,
                chatApplicationMapper,
                chatConversationEventPublisherPort,
                chatMessagePublisherPort,
                chatAssignmentProperties,
                chatOperatorPresencePort
        );
        conversationService = new ConversationService(
                conversationRepositoryPort,
                messageRepositoryPort,
                userLookupServicePort,
                chatApplicationMapper,
                chatConversationEventPublisherPort,
                chatMessagePublisherPort,
                chatConversationProperties,
                chatBotPort,
                chatEscalationPort,
                chatMessageProperties,
                chatLiveAssignmentService,
                chatStaffContextPort
        );

        lenient().when(chatStaffContextPort.build(any())).thenReturn(null);

        lenient().when(conversationRepositoryPort.countLiveAssignments(any())).thenReturn(0L);
        lenient().when(conversationRepositoryPort.findNextWaitingForOperatorForUpdate(any()))
                .thenReturn(Optional.empty());
        lenient().when(chatOperatorPresencePort.isOperatorOnline(any())).thenReturn(false);
        lenient().when(chatOperatorPresencePort.findOnlineOperators()).thenReturn(List.of());
    }

    @Test
    void createConversation_startsOpenWithoutAssignee() {
        UserModel customer = user("Customer");
        ConversationModel savedConversation = conversation(ConversationStatus.OPEN, null);
        savedConversation.setId(CONVERSATION_ID);

        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(customer);
        when(conversationRepositoryPort.findLatestOpenByCustomerId(CUSTOMER_ID)).thenReturn(Optional.empty());
        when(conversationRepositoryPort.findLatestClosedByCustomerId(CUSTOMER_ID)).thenReturn(Optional.empty());
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> {
            ConversationModel model = invocation.getArgument(0);
            if (model.getId() == null) {
                model.setId(CONVERSATION_ID);
            }
            return model;
        });
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(savedConversation));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.existsByConversationIdAndSenderType(CONVERSATION_ID, MessageSenderType.AI_SYSTEM))
                .thenReturn(false);
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any())).thenReturn(mockConversationResponse(ConversationStatus.OPEN, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        ConversationDetailResponse detail = conversationService.initCustomerConversation(
                CUSTOMER_ID,
                new com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest("Support", "Hello", null)
        );

        verify(chatBotPort).processCustomerMessage(any(), any());
        ArgumentCaptor<ConversationModel> conversationCaptor = ArgumentCaptor.forClass(ConversationModel.class);
        verify(conversationRepositoryPort, times(2)).save(conversationCaptor.capture());
        assertThat(conversationCaptor.getAllValues().getFirst().getStatus()).isEqualTo(ConversationStatus.OPEN);
        assertThat(conversationCaptor.getAllValues().getFirst().getAssignedOperatorId()).isNull();
        assertThat(detail.conversation().status()).isEqualTo(ConversationStatus.OPEN);
    }

    @Test
    void createConversation_withAiDisabled_delegatesToChatBot() {
        UserModel customer = user("Customer");
        ConversationModel savedConversation = conversation(ConversationStatus.OPEN, null);
        savedConversation.setId(CONVERSATION_ID);

        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(customer);
        when(conversationRepositoryPort.findLatestOpenByCustomerId(CUSTOMER_ID)).thenReturn(Optional.empty());
        when(conversationRepositoryPort.findLatestClosedByCustomerId(CUSTOMER_ID)).thenReturn(Optional.empty());
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> {
            ConversationModel model = invocation.getArgument(0);
            if (model.getId() == null) {
                model.setId(CONVERSATION_ID);
            }
            return model;
        });
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(savedConversation));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any())).thenReturn(mockConversationResponse(ConversationStatus.OPEN, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.initCustomerConversation(
                CUSTOMER_ID,
                new com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest("Support", "Hello", null)
        );

        verify(chatBotPort).processCustomerMessage(any(), any());
        verify(chatEscalationPort, never()).escalateFromBot(any(), any(), any());
    }

    @Test
    void sendMessage_withAiEnabled_skipsWhenCustomerWaitingForOperator() {
        UserModel customer = user("Customer");
        ConversationModel conversation = conversation(ConversationStatus.WAITING_FOR_OPERATOR, null);

        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(customer);
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> {
            MessageModel message = invocation.getArgument(0);
            message.setId(99L);
            return message;
        });

        ChatMessageSocketResponse response = conversationService.sendMessage(
                CUSTOMER_ID,
                new SendChatMessageSocketRequest(CONVERSATION_ID, null, "Xin chào", null)
        );

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.WAITING_FOR_OPERATOR);
        verify(chatBotPort, never()).processCustomerMessage(any(), any());
        verify(chatEscalationPort, never()).escalateFromBot(any(), any(), any());
        assertThat(response.content()).isEqualTo("Xin chào");
    }

    @Test
    void escalateConversation_customerRequest_delegatesToEscalationService() {
        ConversationModel conversation = conversation(ConversationStatus.OPEN, null);
        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(user("Customer"));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.OPEN, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.escalateConversation(CUSTOMER_ID, CONVERSATION_ID, EscalationReason.CUSTOMER_REQUEST);

        verify(chatEscalationPort).escalateFromBot(conversation, EscalationReason.CUSTOMER_REQUEST, ChatAiMessages.HANDOFF);
        verify(chatConversationEventPublisherPort, never()).publishToOperators(any());
    }

    @Test
    void cancelStaffRequest_fromWaiting_returnsToOpenAndNotifies() {
        ConversationModel conversation = conversation(ConversationStatus.WAITING_FOR_OPERATOR, null);
        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(user("Customer"));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.OPEN, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.cancelStaffRequest(CUSTOMER_ID, CONVERSATION_ID);

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.OPEN);
        ArgumentCaptor<ChatConversationSocketEvent> eventCaptor = ArgumentCaptor.forClass(ChatConversationSocketEvent.class);
        verify(chatConversationEventPublisherPort).publishToOperators(eventCaptor.capture());
        assertThat(eventCaptor.getValue().eventType())
                .isEqualTo(ConversationSocketEventType.CONVERSATION_STAFF_REQUEST_CANCELLED);
        verify(messageRepositoryPort).save(argThat((MessageModel message) ->
                message.getContent() != null
                        && message.getContent().contains("huỷ yêu cầu gặp nhân viên")));
    }

    @Test
    void cancelStaffRequest_whenAlreadyOpen_isIdempotent() {
        ConversationModel conversation = conversation(ConversationStatus.OPEN, null);
        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(user("Customer"));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.OPEN, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.cancelStaffRequest(CUSTOMER_ID, CONVERSATION_ID);

        verify(conversationRepositoryPort, never()).save(any());
        verify(chatConversationEventPublisherPort, never()).publishToOperators(any());
    }

    @Test
    void cancelStaffRequest_whenAssigned_disconnectsInsteadOfFailing() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(user("Customer"));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.OPEN, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.cancelStaffRequest(CUSTOMER_ID, CONVERSATION_ID);

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.OPEN);
        assertThat(conversation.getAssignedOperatorId()).isNull();
        verify(messageRepositoryPort).save(argThat((MessageModel message) ->
                message.getContent() != null
                        && message.getContent().contains("ngắt kết nối")));
    }

    @Test
    void disconnectStaff_whenAssigned_returnsToOpenAndNotifies() {
        ConversationModel conversation = conversation(ConversationStatus.WAITING_FOR_CUSTOMER, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(user("Customer"));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.OPEN, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.disconnectStaff(CUSTOMER_ID, CONVERSATION_ID);

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.OPEN);
        assertThat(conversation.getAssignedOperatorId()).isNull();
        verify(messageRepositoryPort).save(argThat((MessageModel message) ->
                message.getContent() != null
                        && message.getContent().contains("ngắt kết nối với nhân viên")));
        verify(chatConversationEventPublisherPort).publishToOperators(argThat(event ->
                event.eventType() == ConversationSocketEventType.CONVERSATION_STAFF_REQUEST_CANCELLED
                        && event.status() == ConversationStatus.OPEN
        ));
    }

    @Test
    void assignConversationToMe_fromOpen_assignsAtomically() {
        ConversationModel conversation = conversation(ConversationStatus.WAITING_FOR_OPERATOR, null);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(user("Operator A"));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.ACTIVE, OPERATOR_A));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.assignConversationToMe(OPERATOR_A, CONVERSATION_ID);

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.ACTIVE);
        assertThat(conversation.getAssignedOperatorId()).isEqualTo(OPERATOR_A);

        ArgumentCaptor<ChatConversationSocketEvent> eventCaptor = ArgumentCaptor.forClass(ChatConversationSocketEvent.class);
        verify(chatConversationEventPublisherPort, times(2)).publishToOperators(eventCaptor.capture());
        assertThat(eventCaptor.getAllValues())
                .extracting(ChatConversationSocketEvent::eventType)
                .containsExactly(
                        ConversationSocketEventType.CONVERSATION_TAKEN,
                        ConversationSocketEventType.CONVERSATION_ASSIGNED
                );
        verify(chatConversationEventPublisherPort, times(2)).publishToConversation(eq(CONVERSATION_ID), any());
        verify(messageRepositoryPort).save(argThat((MessageModel message) ->
                message.getType() == com.daiphat.coreapi.domain.model.enums.chat.MessageType.SYSTEM
                        && message.getContent() != null
                        && message.getContent().contains("đã tiếp nhận")));
    }

    @Test
    void assignConversationToMe_whenAlreadyTakenByAnotherOperator_throws() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_B)).thenReturn(user("Operator B"));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> conversationService.assignConversationToMe(OPERATOR_B, CONVERSATION_ID))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Hội thoại đã được nhân viên khác nhận");

        verify(conversationRepositoryPort, never()).save(any());
    }

    @Test
    void assignConversationToMe_isIdempotentForSameOperator() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(user("Operator A"));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.ACTIVE, OPERATOR_A));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.assignConversationToMe(OPERATOR_A, CONVERSATION_ID);

        verify(conversationRepositoryPort, never()).save(any());
        verify(chatConversationEventPublisherPort, never()).publishToOperators(any());
    }

    @Test
    void assignConversationToMe_whenOperatorAlreadyHasLiveChat_throwsCapacity() {
        ConversationModel waiting = conversation(ConversationStatus.WAITING_FOR_OPERATOR, null);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator("Operator A", OPERATOR_A));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(waiting));
        when(conversationRepositoryPort.countLiveAssignments(OPERATOR_A)).thenReturn(1L);

        assertThatThrownBy(() -> conversationService.assignConversationToMe(OPERATOR_A, CONVERSATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONVERSATION_OPERATOR_AT_CAPACITY);

        verify(conversationRepositoryPort, never()).save(any());
    }

    @Test
    void unassignConversation_whenOnline_dispatchesOldestWaitingExcludingCurrent() {
        ConversationModel current = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        ConversationModel next = ConversationModel.builder()
                .id(11L)
                .title("Next customer")
                .customerId(UUID.fromString("55555555-5555-5555-5555-555555555555"))
                .status(ConversationStatus.WAITING_FOR_OPERATOR)
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator("Operator A", OPERATOR_A));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(current));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(current));
        when(conversationRepositoryPort.findById(11L)).thenReturn(Optional.of(next));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(conversationRepositoryPort.findNextWaitingForOperatorForUpdate(CONVERSATION_ID))
                .thenReturn(Optional.of(next));
        when(chatOperatorPresencePort.isOperatorOnline(OPERATOR_A)).thenReturn(true);
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(any())).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.WAITING_FOR_OPERATOR, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.unassignConversation(OPERATOR_A, CONVERSATION_ID);

        assertThat(current.getAssignedOperatorId()).isNull();
        assertThat(next.getAssignedOperatorId()).isEqualTo(OPERATOR_A);
        assertThat(next.getStatus()).isEqualTo(ConversationStatus.ACTIVE);
        verify(conversationRepositoryPort).findNextWaitingForOperatorForUpdate(CONVERSATION_ID);
    }

    @Test
    void unassignConversation_returnsConversationToWaitingPool() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(user("Operator A"));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.WAITING_FOR_OPERATOR, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.unassignConversation(OPERATOR_A, CONVERSATION_ID);

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.WAITING_FOR_OPERATOR);
        assertThat(conversation.getAssignedOperatorId()).isNull();
        verify(chatConversationEventPublisherPort, times(2)).publishToOperators(any());
    }

    @Test
    void getManagementConversations_operatorSeesPoolAndOwnAssignedOnly() {
        ConversationModel pool = conversation(ConversationStatus.WAITING_FOR_OPERATOR, null);
        ConversationModel mine = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator("Operator A", OPERATOR_A));
        when(conversationRepositoryPort.findForOperatorManagement(OPERATOR_A)).thenReturn(List.of(pool, mine));
        when(chatApplicationMapper.toConversationResponse(pool))
                .thenReturn(mockConversationResponse(ConversationStatus.WAITING_FOR_OPERATOR, null));
        when(chatApplicationMapper.toConversationResponse(mine))
                .thenReturn(mockConversationResponse(ConversationStatus.ACTIVE, OPERATOR_A));
        when(userLookupServicePort.findById(OPERATOR_A)).thenReturn(Optional.of(operator("Operator A", OPERATOR_A)));

        List<ConversationResponse> responses = conversationService.getManagementConversations(OPERATOR_A);

        assertThat(responses).hasSize(2);
        verify(conversationRepositoryPort, never()).findAllForManagement();
    }

    @Test
    void getManagementConversationDetail_otherOperatorDenied() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_B)).thenReturn(operator("Operator B", OPERATOR_B));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> conversationService.getManagementConversationDetail(OPERATOR_B, CONVERSATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONVERSATION_ASSIGNED_TO_OTHER);
    }

    @Test
    void closeConversation_assignedOperator_closesAndPublishesEvent() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator("Operator A", OPERATOR_A));
        when(userLookupServicePort.findById(OPERATOR_A)).thenReturn(Optional.of(operator("Operator A", OPERATOR_A)));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.CLOSED, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.closeConversation(OPERATOR_A, CONVERSATION_ID, null);

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.CLOSED);
        assertThat(conversation.getAssignedOperatorId()).isNull();
        verify(messageRepositoryPort).save(any(MessageModel.class));
        verify(chatConversationEventPublisherPort).publishToOperators(any());
        verify(chatConversationEventPublisherPort).publishToConversation(eq(CONVERSATION_ID), any());
        verify(conversationRepositoryPort).findNextWaitingForOperatorForUpdate(CONVERSATION_ID);
    }

    @Test
    void closeConversation_adminClosingOthersChat_doesNotAutoDispatchNext() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(ADMIN_ID)).thenReturn(admin());
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.CLOSED, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.closeConversation(ADMIN_ID, CONVERSATION_ID, null);

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.CLOSED);
        assertThat(conversation.getAssignedOperatorId()).isNull();
        verify(conversationRepositoryPort, never()).findNextWaitingForOperatorForUpdate(any());
    }

    @Test
    void getManagementConversationDetail_closedConversation_returnsAlreadyClosedForStaff() {
        ConversationModel conversation = conversation(ConversationStatus.CLOSED, null);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_B)).thenReturn(operator("Operator B", OPERATOR_B));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> conversationService.getManagementConversationDetail(OPERATOR_B, CONVERSATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONVERSATION_ALREADY_CLOSED);
    }

    @Test
    void getManagementConversations_adminSeesAllConversations() {
        ConversationModel pool = conversation(ConversationStatus.WAITING_FOR_OPERATOR, null);
        ConversationModel assigned = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(ADMIN_ID)).thenReturn(admin());
        when(conversationRepositoryPort.findAllForManagement()).thenReturn(List.of(pool, assigned));
        when(chatApplicationMapper.toConversationResponse(pool))
                .thenReturn(mockConversationResponse(ConversationStatus.WAITING_FOR_OPERATOR, null));
        when(chatApplicationMapper.toConversationResponse(assigned))
                .thenReturn(mockConversationResponse(ConversationStatus.ACTIVE, OPERATOR_A));
        when(userLookupServicePort.findById(OPERATOR_A)).thenReturn(Optional.of(operator("Operator A", OPERATOR_A)));

        List<ConversationResponse> responses = conversationService.getManagementConversations(ADMIN_ID);

        assertThat(responses).hasSize(2);
        verify(conversationRepositoryPort, never()).findForOperatorManagement(any());
        verify(conversationRepositoryPort).findAllForManagement();
    }

    @Test
    void expireTimedOutConversations_notifiesWaitingOperatorWithoutClosing() {
        ConversationModel waiting = conversation(ConversationStatus.WAITING_FOR_OPERATOR, null);
        waiting.setUpdatedAt(LocalDateTime.now().minusMinutes(5));
        when(chatConversationProperties.getWaitingOperatorSeconds()).thenReturn(30L);
        when(chatConversationProperties.getCustomerSilenceMinutes()).thenReturn(30L);
        when(chatConversationProperties.getAutoCloseWarningLeadMinutes()).thenReturn(5L);
        when(chatConversationProperties.getStaffResponseSlaMinutes()).thenReturn(15L);
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(conversationRepositoryPort.findByStatusAndUpdatedAtBefore(
                eq(ConversationStatus.WAITING_FOR_OPERATOR), any()))
                .thenReturn(List.of(waiting));
        when(conversationRepositoryPort.findPendingAutoCloseWarning(any(), any()))
                .thenReturn(List.of());
        when(conversationRepositoryPort.findCustomerSilentSince(any()))
                .thenReturn(List.of());
        when(conversationRepositoryPort.findStaffResponseOverdueSince(any()))
                .thenReturn(List.of());
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(waiting));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        int expiredCount = conversationService.expireTimedOutConversations();

        assertThat(expiredCount).isZero();
        assertThat(waiting.getStatus()).isEqualTo(ConversationStatus.WAITING_FOR_OPERATOR);
        verify(messageRepositoryPort).save(any(MessageModel.class));
        verify(chatConversationEventPublisherPort, never()).publishToOperators(any());
        verify(chatConversationEventPublisherPort, never()).publishToConversation(any(), any());
    }

    @Test
    void closeConversation_otherOperatorDenied() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_B)).thenReturn(operator("Operator B", OPERATOR_B));
        when(conversationRepositoryPort.findByIdForUpdate(CONVERSATION_ID)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> conversationService.closeConversation(OPERATOR_B, CONVERSATION_ID, null))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONVERSATION_CLOSE_DENIED);
    }

    @Test
    void init_afterClosed_createsNewConversation() {
        UserModel customer = user("Customer");
        ConversationModel closedConversation = conversation(ConversationStatus.CLOSED, null);
        closedConversation.setId(CONVERSATION_ID);

        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(customer);
        when(conversationRepositoryPort.findLatestOpenByCustomerId(CUSTOMER_ID)).thenReturn(Optional.empty());
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> {
            ConversationModel model = invocation.getArgument(0);
            if (model.getId() == null) {
                model.setId(99L);
            }
            return model;
        });
        when(conversationRepositoryPort.findById(any())).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            if (CONVERSATION_ID.equals(id)) {
                return Optional.of(closedConversation);
            }
            ConversationModel created = conversation(ConversationStatus.OPEN, null);
            created.setId(id);
            return Optional.of(created);
        });
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(any())).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.OPEN, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.initCustomerConversation(
                CUSTOMER_ID,
                new com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest(
                        "Support",
                        "Hello again",
                        null
                )
        );

        assertThat(closedConversation.getStatus()).isEqualTo(ConversationStatus.CLOSED);
        verify(conversationRepositoryPort, atLeastOnce()).save(any());
        verify(chatBotPort).processCustomerMessage(any(), any());
    }

    @Test
    void init_existingOpen_savesContent() {
        UserModel customer = user("Customer");
        ConversationModel openConversation = conversation(ConversationStatus.OPEN, null);
        openConversation.setId(CONVERSATION_ID);

        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(customer);
        when(conversationRepositoryPort.findLatestOpenByCustomerId(CUSTOMER_ID))
                .thenReturn(Optional.of(openConversation));
        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(openConversation));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(any()))
                .thenReturn(mockConversationResponse(ConversationStatus.OPEN, null));
        when(chatApplicationMapper.toMessageResponses(any())).thenReturn(List.of());

        conversationService.initCustomerConversation(
                CUSTOMER_ID,
                new com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest(
                        "Support",
                        "Follow-up message",
                        null
                )
        );

        verify(messageRepositoryPort).save(any(MessageModel.class));
        verify(chatBotPort).processCustomerMessage(any(), any());
    }

    @Test
    void getManagementConversationDetail_closedConversation_deniedForStaff() {
        ConversationModel closed = conversation(ConversationStatus.CLOSED, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator("Operator A", OPERATOR_A));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(closed));

        assertThatThrownBy(() -> conversationService.getManagementConversationDetail(OPERATOR_A, CONVERSATION_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONVERSATION_ASSIGNED_TO_OTHER);
    }

    @Test
    void getMyChatTimeline_returnsOwnHistoryWithoutStaffRbac() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 3, 12, 0);
        ConversationModel closed = conversation(ConversationStatus.CLOSED, null);
        closed.setCreatedAt(now.minusDays(2));
        ConversationModel active = conversation(ConversationStatus.OPEN, null);
        active.setId(CONVERSATION_ID + 1);
        active.setCreatedAt(now.minusHours(1));

        MessageModel older = MessageModel.builder()
                .id(1L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.CUSTOMER)
                .content("Older session")
                .createdAt(now.minusDays(2))
                .build();
        MessageModel newer = MessageModel.builder()
                .id(2L)
                .conversationId(CONVERSATION_ID + 1)
                .senderType(MessageSenderType.CUSTOMER)
                .content("New session")
                .createdAt(now)
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(user("Customer"));
        when(conversationRepositoryPort.findByCustomerId(CUSTOMER_ID)).thenReturn(List.of(closed, active));
        when(messageRepositoryPort.findCustomerTimelinePage(CUSTOMER_ID, null, null, 41, null))
                .thenReturn(List.of(newer, older));
        when(messageRepositoryPort.findCustomerTimelineMessageBefore(
                eq(CUSTOMER_ID),
                eq(older.getCreatedAt()),
                eq(older.getId()),
                isNull()
        )).thenReturn(Optional.empty());
        when(chatApplicationMapper.toMessageResponse(older)).thenReturn(MessageResponse.builder().id(1L).content("Older session").build());
        when(chatApplicationMapper.toMessageResponse(newer)).thenReturn(MessageResponse.builder().id(2L).content("New session").build());

        CustomerChatTimelineResponse response = conversationService.getMyChatTimeline(CUSTOMER_ID, 40, null, null);

        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).message().content()).isEqualTo("Older session");
        assertThat(response.items().get(1).message().content()).isEqualTo("New session");
        assertThat(response.items().get(1).sessionBoundary()).isNotNull();
    }

    @Test
    void getCustomerChatTimeline_deniedWhenStaffNotEngaged() {
        ConversationModel closed = conversation(ConversationStatus.CLOSED, null);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_B)).thenReturn(operator("Operator B", OPERATOR_B));
        when(conversationRepositoryPort.findByCustomerId(CUSTOMER_ID)).thenReturn(List.of(closed));
        when(messageRepositoryPort.existsOperatorParticipation(CUSTOMER_ID, OPERATOR_B)).thenReturn(false);

        assertThatThrownBy(() -> conversationService.getCustomerChatTimeline(
                OPERATOR_B, CUSTOMER_ID, 40, null, null))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONVERSATION_VIEW_DENIED);
    }

    @Test
    void getCustomerChatTimeline_returnsAscItemsWithHasMore() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 3, 12, 0);
        ConversationModel active = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        active.setCreatedAt(now.minusDays(1));

        MessageModel older = MessageModel.builder()
                .id(1L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.CUSTOMER)
                .content("Older")
                .createdAt(now.minusHours(2))
                .build();
        MessageModel newer = MessageModel.builder()
                .id(2L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.OPERATOR)
                .content("Newer")
                .createdAt(now.minusHours(1))
                .build();
        MessageModel extraOlder = MessageModel.builder()
                .id(3L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.CUSTOMER)
                .content("Extra older")
                .createdAt(now.minusHours(3))
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator("Operator A", OPERATOR_A));
        when(conversationRepositoryPort.findByCustomerId(CUSTOMER_ID)).thenReturn(List.of(active));
        when(messageRepositoryPort.existsOperatorParticipation(CUSTOMER_ID, OPERATOR_A)).thenReturn(true);
        when(messageRepositoryPort.findOperatorParticipatedConversationIds(CUSTOMER_ID, OPERATOR_A))
                .thenReturn(List.of(CONVERSATION_ID));
        when(messageRepositoryPort.findCustomerTimelinePage(
                eq(CUSTOMER_ID),
                isNull(),
                isNull(),
                eq(3),
                argThat((Collection<Long> ids) -> ids.contains(CONVERSATION_ID))
        )).thenReturn(List.of(newer, older, extraOlder));
        when(messageRepositoryPort.findCustomerTimelineMessageBefore(
                eq(CUSTOMER_ID),
                eq(older.getCreatedAt()),
                eq(older.getId()),
                argThat((Collection<Long> ids) -> ids.contains(CONVERSATION_ID))
        )).thenReturn(Optional.empty());
        when(chatApplicationMapper.toMessageResponse(older)).thenReturn(MessageResponse.builder().id(1L).content("Older").build());
        when(chatApplicationMapper.toMessageResponse(newer)).thenReturn(MessageResponse.builder().id(2L).content("Newer").build());

        CustomerChatTimelineResponse response = conversationService.getCustomerChatTimeline(
                OPERATOR_A, CUSTOMER_ID, 2, null, null);

        assertThat(response.hasMore()).isTrue();
        assertThat(response.nextCursor()).contains("1");
        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).message().content()).isEqualTo("Older");
        assertThat(response.items().get(1).message().content()).isEqualTo("Newer");
        assertThat(response.items().get(0).sessionBoundary()).isNotNull();
        assertThat(response.items().get(0).sessionBoundary().gapLabel()).isNull();
        assertThat(response.items().get(1).sessionBoundary()).isNull();
    }

    @Test
    void getMyChatTimeline_usesCompositeCursorForOlderPages() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 4, 1, 9);
        LocalDateTime olderTime = LocalDateTime.of(2026, 7, 3, 21, 48);
        ConversationModel active = conversation(ConversationStatus.WAITING_FOR_CUSTOMER, OPERATOR_A);
        active.setId(15L);
        active.setCreatedAt(now.minusHours(1));

        MessageModel newest = MessageModel.builder()
                .id(100L)
                .conversationId(15L)
                .senderType(MessageSenderType.CUSTOMER)
                .content("Latest")
                .createdAt(now)
                .build();
        MessageModel fillerFirstPage = MessageModel.builder()
                .id(75L)
                .conversationId(15L)
                .senderType(MessageSenderType.OPERATOR)
                .content("Filler")
                .createdAt(now.minusMinutes(5))
                .build();
        MessageModel oldestInFirstPage = MessageModel.builder()
                .id(50L)
                .conversationId(15L)
                .senderType(MessageSenderType.OPERATOR)
                .content("End of first page")
                .createdAt(now.minusMinutes(10))
                .build();
        MessageModel olderSession = MessageModel.builder()
                .id(10L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.CUSTOMER)
                .content("Previous session")
                .createdAt(olderTime)
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(user("Customer"));
        when(conversationRepositoryPort.findByCustomerId(CUSTOMER_ID)).thenReturn(List.of(active));
        when(messageRepositoryPort.findCustomerTimelinePage(CUSTOMER_ID, null, null, 3, null))
                .thenReturn(List.of(newest, fillerFirstPage, oldestInFirstPage));
        when(messageRepositoryPort.findCustomerTimelinePage(
                CUSTOMER_ID,
                fillerFirstPage.getCreatedAt(),
                fillerFirstPage.getId(),
                3,
                null
        )).thenReturn(List.of(olderSession));
        when(messageRepositoryPort.findCustomerTimelineMessageBefore(
                eq(CUSTOMER_ID),
                eq(fillerFirstPage.getCreatedAt()),
                eq(fillerFirstPage.getId()),
                isNull()
        )).thenReturn(Optional.empty());
        when(messageRepositoryPort.findCustomerTimelineMessageBefore(
                eq(CUSTOMER_ID),
                eq(olderSession.getCreatedAt()),
                eq(olderSession.getId()),
                isNull()
        )).thenReturn(Optional.of(oldestInFirstPage));
        when(chatApplicationMapper.toMessageResponse(newest))
                .thenReturn(MessageResponse.builder().id(100L).content("Latest").build());
        when(chatApplicationMapper.toMessageResponse(fillerFirstPage))
                .thenReturn(MessageResponse.builder().id(75L).content("Filler").build());
        when(chatApplicationMapper.toMessageResponse(olderSession))
                .thenReturn(MessageResponse.builder().id(10L).content("Previous session").build());

        CustomerChatTimelineResponse firstPage = conversationService.getMyChatTimeline(CUSTOMER_ID, 2, null, null);
        assertThat(firstPage.hasMore()).isTrue();
        assertThat(firstPage.nextCursor()).contains("75");

        String[] cursorParts = firstPage.nextCursor().split("\\|");
        CustomerChatTimelineResponse secondPage = conversationService.getMyChatTimeline(
                CUSTOMER_ID,
                2,
                LocalDateTime.parse(cursorParts[0]),
                Long.parseLong(cursorParts[1])
        );

        assertThat(secondPage.items()).hasSize(1);
        assertThat(secondPage.items().getFirst().message().content()).isEqualTo("Previous session");
        verify(messageRepositoryPort).findCustomerTimelinePage(
                CUSTOMER_ID,
                fillerFirstPage.getCreatedAt(),
                fillerFirstPage.getId(),
                3,
                null
        );
    }

    @Test
    void getCustomerChatTimeline_assignedStaffSeesPreAssignCustomerMessages() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 4, 2, 0);
        ConversationModel active = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        active.setCreatedAt(now.minusHours(1));

        MessageModel beforeAssign = MessageModel.builder()
                .id(10L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.CUSTOMER)
                .content("Before assign")
                .createdAt(now.minusMinutes(5))
                .build();
        MessageModel afterAssign = MessageModel.builder()
                .id(11L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.OPERATOR)
                .content("After assign")
                .createdAt(now)
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator("Operator A", OPERATOR_A));
        when(conversationRepositoryPort.findByCustomerId(CUSTOMER_ID)).thenReturn(List.of(active));
        when(messageRepositoryPort.existsOperatorParticipation(CUSTOMER_ID, OPERATOR_A)).thenReturn(false);
        when(messageRepositoryPort.findOperatorParticipatedConversationIds(CUSTOMER_ID, OPERATOR_A))
                .thenReturn(List.of());
        when(messageRepositoryPort.findCustomerTimelinePage(
                eq(CUSTOMER_ID),
                isNull(),
                isNull(),
                eq(31),
                argThat((Collection<Long> ids) -> ids.contains(CONVERSATION_ID))
        )).thenReturn(List.of(afterAssign, beforeAssign));
        when(messageRepositoryPort.findCustomerTimelineMessageBefore(
                eq(CUSTOMER_ID),
                eq(beforeAssign.getCreatedAt()),
                eq(beforeAssign.getId()),
                argThat((Collection<Long> ids) -> ids.contains(CONVERSATION_ID))
        )).thenReturn(Optional.empty());
        when(chatApplicationMapper.toMessageResponse(beforeAssign))
                .thenReturn(MessageResponse.builder().id(10L).content("Before assign").build());
        when(chatApplicationMapper.toMessageResponse(afterAssign))
                .thenReturn(MessageResponse.builder().id(11L).content("After assign").build());

        CustomerChatTimelineResponse response = conversationService.getCustomerChatTimeline(
                OPERATOR_A, CUSTOMER_ID, 30, null, null);

        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).message().content()).isEqualTo("Before assign");
        assertThat(response.items().get(1).message().content()).isEqualTo("After assign");
    }

    @Test
    void getCustomerChatTimeline_adminLoadsFullHistoryWithoutConversationScope() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 4, 12, 0);
        ConversationModel active = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        MessageModel message = MessageModel.builder()
                .id(1L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.OPERATOR)
                .content("Staff reply")
                .createdAt(now)
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(ADMIN_ID)).thenReturn(admin());
        when(conversationRepositoryPort.findByCustomerId(CUSTOMER_ID)).thenReturn(List.of(active));
        when(messageRepositoryPort.existsOperatorParticipation(CUSTOMER_ID, ADMIN_ID)).thenReturn(false);
        when(messageRepositoryPort.findCustomerTimelinePage(
                eq(CUSTOMER_ID),
                isNull(),
                isNull(),
                eq(31),
                isNull()
        )).thenReturn(List.of(message));
        when(messageRepositoryPort.findCustomerTimelineMessageBefore(
                eq(CUSTOMER_ID),
                eq(message.getCreatedAt()),
                eq(message.getId()),
                isNull()
        )).thenReturn(Optional.empty());
        when(chatApplicationMapper.toMessageResponse(message))
                .thenReturn(MessageResponse.builder().id(1L).content("Staff reply").build());

        CustomerChatTimelineResponse response = conversationService.getCustomerChatTimeline(
                ADMIN_ID, CUSTOMER_ID, 30, null, null);

        assertThat(response.items()).hasSize(1);
        verify(messageRepositoryPort, never()).findOperatorParticipatedConversationIds(any(), any());
    }

    @Test
    void getCustomerChatTimeline_excludesClosedPreviousSessionWhileStaffHasLiveChat() {
        ConversationModel live = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        ConversationModel previous = conversation(ConversationStatus.CLOSED, null);
        previous.setId(99L);
        previous.setLastAssignedOperatorId(OPERATOR_A);
        MessageModel liveMessage = MessageModel.builder()
                .id(21L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.CUSTOMER)
                .content("Current session")
                .createdAt(LocalDateTime.of(2026, 8, 10, 9, 0))
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator("Operator A", OPERATOR_A));
        when(conversationRepositoryPort.findByCustomerId(CUSTOMER_ID)).thenReturn(List.of(live, previous));
        when(messageRepositoryPort.existsOperatorParticipation(CUSTOMER_ID, OPERATOR_A)).thenReturn(true);
        when(messageRepositoryPort.findOperatorParticipatedConversationIds(CUSTOMER_ID, OPERATOR_A))
                .thenReturn(List.of(CONVERSATION_ID, 99L));
        when(messageRepositoryPort.findCustomerTimelinePage(
                eq(CUSTOMER_ID),
                isNull(),
                isNull(),
                eq(31),
                argThat((Collection<Long> ids) -> ids != null
                        && ids.contains(CONVERSATION_ID)
                        && !ids.contains(99L))
        )).thenReturn(List.of(liveMessage));
        when(messageRepositoryPort.findCustomerTimelineMessageBefore(
                eq(CUSTOMER_ID),
                eq(liveMessage.getCreatedAt()),
                eq(liveMessage.getId()),
                argThat((Collection<Long> ids) -> ids != null && !ids.contains(99L))
        )).thenReturn(Optional.empty());
        when(chatApplicationMapper.toMessageResponse(liveMessage))
                .thenReturn(MessageResponse.builder().id(21L).content("Current session").build());

        CustomerChatTimelineResponse response = conversationService.getCustomerChatTimeline(
                OPERATOR_A, CUSTOMER_ID, 30, null, null);

        assertThat(response.items()).extracting(item -> item.message().content())
                .containsExactly("Current session");
    }

    @Test
    void markMyConversationAsRead_marksAllInboundUnreadMessages() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(user("Customer"));
        when(conversationRepositoryPort.findById(CONVERSATION_ID)).thenReturn(Optional.of(conversation));
        when(messageRepositoryPort.findByConversationId(CONVERSATION_ID)).thenReturn(List.of());
        when(chatApplicationMapper.toConversationResponse(conversation))
                .thenReturn(mockConversationResponse(ConversationStatus.ACTIVE, OPERATOR_A));

        conversationService.markMyConversationAsRead(CUSTOMER_ID, CONVERSATION_ID);

        verify(messageRepositoryPort).markAllInboundUnreadMessagesAsReadByCustomer(CONVERSATION_ID);
        verify(messageRepositoryPort, never()).markInboundMessagesAsReadByCustomer(any(), any());
        verify(conversationRepositoryPort).save(conversation);
    }

    @Test
    void getMyChatTimeline_resolvesOperatorMessageAsReadFromCustomerLastReadAt() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 4, 10, 0);
        ConversationModel active = conversation(ConversationStatus.ACTIVE, OPERATOR_A);
        active.setCreatedAt(now.minusDays(1));
        active.setCustomerLastReadAt(now);

        MessageModel operatorMessage = MessageModel.builder()
                .id(1L)
                .conversationId(CONVERSATION_ID)
                .senderType(MessageSenderType.OPERATOR)
                .content("Staff reply")
                .createdAt(now.minusMinutes(5))
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(CUSTOMER_ID)).thenReturn(user("Customer"));
        when(conversationRepositoryPort.findByCustomerId(CUSTOMER_ID)).thenReturn(List.of(active));
        when(messageRepositoryPort.findCustomerTimelinePage(CUSTOMER_ID, null, null, 31, null))
                .thenReturn(List.of(operatorMessage));
        when(messageRepositoryPort.findCustomerTimelineMessageBefore(
                eq(CUSTOMER_ID),
                eq(operatorMessage.getCreatedAt()),
                eq(operatorMessage.getId()),
                isNull()
        )).thenReturn(Optional.empty());
        when(chatApplicationMapper.toMessageResponse(operatorMessage)).thenReturn(
                MessageResponse.builder()
                        .id(1L)
                        .conversationId(CONVERSATION_ID)
                        .senderType(MessageSenderType.OPERATOR)
                        .content("Staff reply")
                        .createdAt(now.minusMinutes(5))
                        .isRead(false)
                        .build()
        );

        CustomerChatTimelineResponse response = conversationService.getMyChatTimeline(CUSTOMER_ID, 30, null, null);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().getFirst().message().isRead()).isTrue();
    }

    private ConversationModel conversation(ConversationStatus status, UUID assignedOperatorId) {
        return ConversationModel.builder()
                .id(CONVERSATION_ID)
                .title("Support chat")
                .customerId(CUSTOMER_ID)
                .status(status)
                .assignedOperatorId(assignedOperatorId)
                .build();
    }

    private UserModel user(String name) {
        return UserModel.builder().id(CUSTOMER_ID).firstName(name).build();
    }

    private UserModel operator(String name, UUID id) {
        return UserModel.builder()
                .id(id)
                .firstName(name)
                .role(RoleModel.builder().code(RoleConstants.ROLE_STAFF_OPERATOR).build())
                .build();
    }

    private UserModel admin() {
        return UserModel.builder()
                .id(ADMIN_ID)
                .firstName("Admin")
                .role(RoleModel.builder().code(RoleConstants.ADMIN).build())
                .build();
    }

    private ConversationResponse mockConversationResponse(ConversationStatus status, UUID assignedOperatorId) {
        return ConversationResponse.builder()
                .id(CONVERSATION_ID)
                .title("Support chat")
                .status(status)
                .customerId(CUSTOMER_ID)
                .assignedOperatorId(assignedOperatorId)
                .build();
    }
}
