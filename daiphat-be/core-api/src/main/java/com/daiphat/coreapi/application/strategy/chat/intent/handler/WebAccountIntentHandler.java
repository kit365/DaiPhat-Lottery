package com.daiphat.coreapi.application.strategy.chat.intent.handler;

import com.daiphat.coreapi.application.dto.chat.account.ChatAccountLookupOutcome;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.application.strategy.chat.intent.ChatIntentHandler;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component("WEB_ACCOUNT")
@RequiredArgsConstructor
public class WebAccountIntentHandler implements ChatIntentHandler {

    private final OrderServicePort orderServicePort;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.WEB_ACCOUNT;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        ChatAccountLookupOutcome outcome = lookup(ctx.getConversation().getCustomerId());
        return new ChatIntentOutcome.BotReply(buildReply(outcome), ChatIntent.WEB_ACCOUNT.name());
    }

    private ChatAccountLookupOutcome lookup(UUID customerId) {
        try {
            PageResponse<OrderResponse> page = orderServicePort.getMyOrders(
                    ChatWebAccountMessages.ORDER_LOOKUP_PAGE,
                    ChatWebAccountMessages.ORDER_LOOKUP_SIZE,
                    null,
                    null,
                    null,
                    null,
                    null,
                    ChatWebAccountMessages.ORDER_LOOKUP_SORT_BY,
                    ChatWebAccountMessages.ORDER_LOOKUP_DIRECTION,
                    customerId
            );
            List<OrderResponse> orders = page.getRecordList() != null
                    ? page.getRecordList()
                    : Collections.emptyList();
            if (orders.isEmpty()) {
                return new ChatAccountLookupOutcome.NoOrders();
            }
            return new ChatAccountLookupOutcome.LatestOrderFound(orders.getFirst());
        } catch (DomainException ex) {
            log.warn("Unable to fetch customer orders for chat: customerId={}", customerId, ex);
            return new ChatAccountLookupOutcome.LookupFailed(ex);
        } catch (Exception ex) {
            log.warn("Unexpected error fetching customer orders for chat: customerId={}", customerId, ex);
            return new ChatAccountLookupOutcome.LookupFailed(ex);
        }
    }

    private String buildReply(ChatAccountLookupOutcome outcome) {
        return switch (outcome) {
            case ChatAccountLookupOutcome.NoOrders ignored -> ChatWebAccountMessages.NO_ORDERS_MESSAGE;
            case ChatAccountLookupOutcome.LookupFailed ignored -> ChatWebAccountMessages.LOOKUP_FAILED_MESSAGE;
            case ChatAccountLookupOutcome.LatestOrderFound latest -> formatLatestOrder(latest.order());
        };
    }

    private String formatLatestOrder(OrderResponse latest) {
        StringBuilder reply = new StringBuilder(ChatWebAccountMessages.LATEST_ORDER_PREFIX);
        reply.append(latest.orderCode());
        if (latest.status() != null) {
            reply.append(ChatWebAccountMessages.LATEST_ORDER_STATUS_SEPARATOR).append(latest.status().name());
        }
        if (latest.createdAt() != null) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern(ChatWebAccountMessages.DATE_TIME_PATTERN);
            reply.append(ChatWebAccountMessages.LATEST_ORDER_CREATED_AT_PREFIX)
                    .append(latest.createdAt().format(formatter))
                    .append(ChatWebAccountMessages.LATEST_ORDER_CREATED_AT_SUFFIX);
        }
        reply.append(ChatWebAccountMessages.LATEST_ORDER_FOOTER);
        return reply.toString();
    }
}
