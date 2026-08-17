package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.dto.response.chat.MessageResponse;
import com.daiphat.coreapi.application.dto.response.chat.StaffConversationContextResponse;
import com.daiphat.coreapi.application.mapper.chat.ChatApplicationMapper;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.chat.ChatPreviousSessionViewPort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.support.SupportTicketRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatStaffContextService")
class ChatStaffContextServiceTest {

    private static final Long CURRENT_ID = 20L;
    private static final Long PREVIOUS_ID = 10L;
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OPERATOR_A = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OPERATOR_B = UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Mock
    private ConversationRepositoryPort conversationRepositoryPort;
    @Mock
    private MessageRepositoryPort messageRepositoryPort;
    @Mock
    private UserLookupServicePort userLookupServicePort;
    @Mock
    private ChatApplicationMapper chatApplicationMapper;
    @Mock
    private ChatPreviousSessionViewPort chatPreviousSessionViewPort;
    @Mock
    private SupportTicketRepositoryPort supportTicketRepositoryPort;
    @Mock
    private RefundRequestRepositoryPort refundRequestRepositoryPort;
    @Mock
    private PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;

    private ChatStaffContextService service;

    @BeforeEach
    void setUp() {
        service = new ChatStaffContextService(
                conversationRepositoryPort,
                messageRepositoryPort,
                userLookupServicePort,
                chatApplicationMapper,
                chatPreviousSessionViewPort,
                supportTicketRepositoryPort,
                refundRequestRepositoryPort,
                prizePayoutRequestRepositoryPort
        );
    }

    @Test
    void build_includesPreviousClosedSessionAndOpenWork() {
        ConversationModel current = currentConversation();
        ConversationModel previous = previousConversation();
        when(conversationRepositoryPort.findPreviousConversation(eq(CUSTOMER_ID), any()))
                .thenReturn(Optional.of(previous));
        when(userLookupServicePort.findById(OPERATOR_B)).thenReturn(Optional.of(operator(OPERATOR_B, "Bình")));
        when(supportTicketRepositoryPort.countActiveTickets(CUSTOMER_ID)).thenReturn(1L);
        when(refundRequestRepositoryPort.countAll(eq(CUSTOMER_ID), any(), any(), any(), any())).thenReturn(0L);
        when(prizePayoutRequestRepositoryPort.countPendingByCustomerId(CUSTOMER_ID)).thenReturn(2L);

        StaffConversationContextResponse context = service.build(current);

        assertThat(context.previousSession()).isNotNull();
        assertThat(context.previousSession().conversationId()).isEqualTo(PREVIOUS_ID);
        assertThat(context.previousSession().operatorName()).contains("Bình");
        assertThat(context.previousSession().closeReasonLabel()).isEqualTo("Đã giải quyết");
        assertThat(context.handoffSummary()).isEqualTo("Khách hỏi hoàn tiền");
        assertThat(context.openWork()).extracting("type").containsExactly("TICKET", "PAYOUT");
    }

    @Test
    void getPreviousSessionMessages_deniedWhenAssignedToAnotherOperator() {
        ConversationModel current = currentConversation();
        current.setStatus(ConversationStatus.ACTIVE);
        current.setAssignedOperatorId(OPERATOR_B);
        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator(OPERATOR_A, "An"));
        when(conversationRepositoryPort.findById(CURRENT_ID)).thenReturn(Optional.of(current));

        assertThatThrownBy(() -> service.getPreviousSessionMessages(OPERATOR_A, CURRENT_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.CONVERSATION_VIEW_DENIED);
        verify(chatPreviousSessionViewPort, never()).record(any(), any(), any(), any());
    }

    @Test
    void getPreviousSessionMessages_allowsQueueStaffBeforeClaim() {
        ConversationModel current = currentConversation();
        ConversationModel previous = previousConversation();
        MessageModel customerMessage = MessageModel.builder()
                .id(4L)
                .conversationId(PREVIOUS_ID)
                .senderType(MessageSenderType.CUSTOMER)
                .content("Hỏi vé")
                .type(MessageType.TEXT)
                .createdAt(LocalDateTime.of(2026, 8, 1, 10, 0))
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator(OPERATOR_A, "An"));
        when(conversationRepositoryPort.findById(CURRENT_ID)).thenReturn(Optional.of(current));
        when(conversationRepositoryPort.findPreviousConversation(eq(CUSTOMER_ID), any()))
                .thenReturn(Optional.of(previous));
        when(messageRepositoryPort.findByConversationId(PREVIOUS_ID)).thenReturn(List.of(customerMessage));
        when(chatApplicationMapper.toMessageResponse(any())).thenAnswer(invocation -> {
            MessageModel model = invocation.getArgument(0);
            return MessageResponse.builder()
                    .id(model.getId())
                    .conversationId(model.getConversationId())
                    .senderType(model.getSenderType())
                    .content(model.getContent())
                    .type(model.getType())
                    .createdAt(model.getCreatedAt())
                    .build();
        });

        List<MessageResponse> messages = service.getPreviousSessionMessages(OPERATOR_A, CURRENT_ID);

        assertThat(messages).extracting(MessageResponse::id).containsExactly(4L);
        verify(chatPreviousSessionViewPort).record(eq(OPERATOR_A), eq(CURRENT_ID), eq(PREVIOUS_ID), any());
    }

    @Test
    void getPreviousSessionMessages_recordsAuditForAssignee() {
        ConversationModel current = currentConversation();
        current.setAssignedOperatorId(OPERATOR_A);
        ConversationModel previous = previousConversation();
        MessageModel staffReply = MessageModel.builder()
                .id(1L)
                .conversationId(PREVIOUS_ID)
                .senderType(MessageSenderType.OPERATOR)
                .content("Đã ghi nhận")
                .type(MessageType.TEXT)
                .createdAt(LocalDateTime.of(2026, 8, 1, 10, 0))
                .build();
        MessageModel acceptance = MessageModel.builder()
                .id(2L)
                .conversationId(PREVIOUS_ID)
                .senderType(MessageSenderType.AI_SYSTEM)
                .content(ConversationModel.operatorAcceptanceCopy("Bình"))
                .type(MessageType.SYSTEM)
                .createdAt(LocalDateTime.of(2026, 8, 1, 9, 0))
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator(OPERATOR_A, "An"));
        when(conversationRepositoryPort.findById(CURRENT_ID)).thenReturn(Optional.of(current));
        when(conversationRepositoryPort.findPreviousConversation(eq(CUSTOMER_ID), any()))
                .thenReturn(Optional.of(previous));
        when(messageRepositoryPort.findByConversationId(PREVIOUS_ID)).thenReturn(List.of(acceptance, staffReply));
        when(chatApplicationMapper.toMessageResponse(any())).thenAnswer(invocation -> {
            MessageModel model = invocation.getArgument(0);
            return MessageResponse.builder()
                    .id(model.getId())
                    .conversationId(model.getConversationId())
                    .senderType(model.getSenderType())
                    .content(model.getContent())
                    .type(model.getType())
                    .createdAt(model.getCreatedAt())
                    .build();
        });

        List<MessageResponse> messages = service.getPreviousSessionMessages(OPERATOR_A, CURRENT_ID);

        assertThat(messages).extracting(MessageResponse::id).contains(1L, 2L);
        verify(chatPreviousSessionViewPort).record(eq(OPERATOR_A), eq(CURRENT_ID), eq(PREVIOUS_ID), any());
    }

    @Test
    void getPreviousSessionMessages_withoutAcceptanceStillReturnsTranscript() {
        ConversationModel current = currentConversation();
        current.setAssignedOperatorId(OPERATOR_A);
        ConversationModel previous = previousConversation();
        MessageModel customerMessage = MessageModel.builder()
                .id(3L)
                .conversationId(PREVIOUS_ID)
                .senderType(MessageSenderType.CUSTOMER)
                .content("Hỏi hoàn tiền")
                .type(MessageType.TEXT)
                .createdAt(LocalDateTime.of(2026, 8, 1, 10, 0))
                .build();

        when(userLookupServicePort.findActiveByIdOrThrow(OPERATOR_A)).thenReturn(operator(OPERATOR_A, "An"));
        when(conversationRepositoryPort.findById(CURRENT_ID)).thenReturn(Optional.of(current));
        when(conversationRepositoryPort.findPreviousConversation(eq(CUSTOMER_ID), any()))
                .thenReturn(Optional.of(previous));
        when(messageRepositoryPort.findByConversationId(PREVIOUS_ID)).thenReturn(List.of(customerMessage));
        when(chatApplicationMapper.toMessageResponse(any())).thenAnswer(invocation -> {
            MessageModel model = invocation.getArgument(0);
            return MessageResponse.builder()
                    .id(model.getId())
                    .conversationId(model.getConversationId())
                    .senderType(model.getSenderType())
                    .content(model.getContent())
                    .type(model.getType())
                    .createdAt(model.getCreatedAt())
                    .build();
        });

        List<MessageResponse> messages = service.getPreviousSessionMessages(OPERATOR_A, CURRENT_ID);

        assertThat(messages).extracting(MessageResponse::id).containsExactly(3L);
        verify(chatPreviousSessionViewPort).record(eq(OPERATOR_A), eq(CURRENT_ID), eq(PREVIOUS_ID), any());
    }

    private ConversationModel currentConversation() {
        return ConversationModel.builder()
                .id(CURRENT_ID)
                .customerId(CUSTOMER_ID)
                .status(ConversationStatus.WAITING_FOR_OPERATOR)
                .handoffSummary("Khách hỏi hoàn tiền")
                .createdAt(LocalDateTime.of(2026, 8, 10, 9, 0))
                .build();
    }

    private ConversationModel previousConversation() {
        return ConversationModel.builder()
                .id(PREVIOUS_ID)
                .customerId(CUSTOMER_ID)
                .status(ConversationStatus.CLOSED)
                .closeReason(ConversationCloseReason.RESOLVED)
                .lastAssignedOperatorId(OPERATOR_B)
                .closedAt(LocalDateTime.of(2026, 8, 1, 11, 0))
                .createdAt(LocalDateTime.of(2026, 8, 1, 8, 0))
                .build();
    }

    private UserModel operator(UUID id, String name) {
        return UserModel.builder()
                .id(id)
                .firstName(name)
                .role(RoleModel.builder().code(RoleConstants.ROLE_STAFF_OPERATOR).build())
                .build();
    }
}
