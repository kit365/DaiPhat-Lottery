package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.application.strategy.chat.intent.handler.ChatWebAccountMessages;
import com.daiphat.coreapi.application.strategy.chat.intent.handler.WebAccountIntentHandler;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WebAccountIntentHandler")
class WebAccountIntentHandlerTest {

    @Mock
    private OrderServicePort orderServicePort;

    @InjectMocks
    private WebAccountIntentHandler handler;

    @Test
    @SuppressWarnings("unchecked")
    void resolve_whenNoOrders_returnsNoOrdersMessage() {
        ConversationModel conversation = conversation();
        MessageModel customerMessage = customerMessage();
        PageResponse<OrderResponse> page = PageResponse.<OrderResponse>builder()
                .recordList(Collections.emptyList())
                .build();

        when(orderServicePort.getMyOrders(
                ChatWebAccountMessages.ORDER_LOOKUP_PAGE,
                ChatWebAccountMessages.ORDER_LOOKUP_SIZE,
                null,
                null,
                null,
                null,
                null,
                ChatWebAccountMessages.ORDER_LOOKUP_SORT_BY,
                ChatWebAccountMessages.ORDER_LOOKUP_DIRECTION,
                conversation.getCustomerId()
        )).thenReturn(page);

        ChatIntentOutcome result = handler.resolve(ChatIntentContext.builder()
                .conversation(conversation)
                .customerMessage(customerMessage)
                .build());

        assertThat(result).isInstanceOf(ChatIntentOutcome.BotReply.class);
        ChatIntentOutcome.BotReply reply = (ChatIntentOutcome.BotReply) result;
        assertThat(reply.content()).isEqualTo(ChatWebAccountMessages.NO_ORDERS_MESSAGE);
        assertThat(reply.intent()).isEqualTo(ChatIntent.WEB_ACCOUNT.name());
        verify(orderServicePort).getMyOrders(
                ChatWebAccountMessages.ORDER_LOOKUP_PAGE,
                ChatWebAccountMessages.ORDER_LOOKUP_SIZE,
                null,
                null,
                null,
                null,
                null,
                ChatWebAccountMessages.ORDER_LOOKUP_SORT_BY,
                ChatWebAccountMessages.ORDER_LOOKUP_DIRECTION,
                conversation.getCustomerId()
        );
    }

    @Test
    void resolve_whenLookupFailed_returnsLookupFailedMessage() {
        ConversationModel conversation = conversation();
        MessageModel customerMessage = customerMessage();

        when(orderServicePort.getMyOrders(
                ChatWebAccountMessages.ORDER_LOOKUP_PAGE,
                ChatWebAccountMessages.ORDER_LOOKUP_SIZE,
                null,
                null,
                null,
                null,
                null,
                ChatWebAccountMessages.ORDER_LOOKUP_SORT_BY,
                ChatWebAccountMessages.ORDER_LOOKUP_DIRECTION,
                conversation.getCustomerId()
        )).thenThrow(new DomainException("Database error"));

        ChatIntentOutcome result = handler.resolve(ChatIntentContext.builder()
                .conversation(conversation)
                .customerMessage(customerMessage)
                .build());

        assertThat(result).isInstanceOf(ChatIntentOutcome.BotReply.class);
        ChatIntentOutcome.BotReply reply = (ChatIntentOutcome.BotReply) result;
        assertThat(reply.content()).isEqualTo(ChatWebAccountMessages.LOOKUP_FAILED_MESSAGE);
        assertThat(reply.intent()).isEqualTo(ChatIntent.WEB_ACCOUNT.name());
    }

    @Test
    @SuppressWarnings("unchecked")
    void resolve_whenLatestOrderFound_returnsLatestOrderFormattedMessage() {
        ConversationModel conversation = conversation();
        MessageModel customerMessage = customerMessage();
        LocalDateTime createdAt = LocalDateTime.of(2026, 7, 5, 12, 34);
        OrderResponse order = OrderResponse.builder()
                .orderCode("ORD12345")
                .status(OrderStatus.PAID)
                .createdAt(createdAt)
                .build();
        PageResponse<OrderResponse> page = PageResponse.<OrderResponse>builder()
                .recordList(List.of(order))
                .build();

        when(orderServicePort.getMyOrders(
                ChatWebAccountMessages.ORDER_LOOKUP_PAGE,
                ChatWebAccountMessages.ORDER_LOOKUP_SIZE,
                null,
                null,
                null,
                null,
                null,
                ChatWebAccountMessages.ORDER_LOOKUP_SORT_BY,
                ChatWebAccountMessages.ORDER_LOOKUP_DIRECTION,
                conversation.getCustomerId()
        )).thenReturn(page);

        ChatIntentOutcome result = handler.resolve(ChatIntentContext.builder()
                .conversation(conversation)
                .customerMessage(customerMessage)
                .build());

        assertThat(result).isInstanceOf(ChatIntentOutcome.BotReply.class);
        ChatIntentOutcome.BotReply reply = (ChatIntentOutcome.BotReply) result;

        String expectedReply = ChatWebAccountMessages.LATEST_ORDER_PREFIX + "ORD12345" +
                ChatWebAccountMessages.LATEST_ORDER_STATUS_SEPARATOR + "PAID" +
                ChatWebAccountMessages.LATEST_ORDER_CREATED_AT_PREFIX + "05/07/2026 12:34" +
                ChatWebAccountMessages.LATEST_ORDER_CREATED_AT_SUFFIX +
                ChatWebAccountMessages.LATEST_ORDER_FOOTER;

        assertThat(reply.content()).isEqualTo(expectedReply);
        assertThat(reply.intent()).isEqualTo(ChatIntent.WEB_ACCOUNT.name());
    }

    private ConversationModel conversation() {
        return ConversationModel.builder()
                .id(10L)
                .customerId(UUID.randomUUID())
                .status(ConversationStatus.OPEN)
                .build();
    }

    private MessageModel customerMessage() {
        return MessageModel.builder()
                .id(1L)
                .conversationId(10L)
                .senderType(MessageSenderType.CUSTOMER)
                .content("đơn hàng của tôi")
                .build();
    }
}
