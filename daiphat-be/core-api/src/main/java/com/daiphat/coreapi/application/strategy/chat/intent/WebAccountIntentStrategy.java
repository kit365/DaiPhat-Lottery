package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.dto.chat.account.ChatAccountLookupOutcome;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
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
public class WebAccountIntentStrategy implements ChatIntentHandlerStrategy {

    private static final int ORDER_LOOKUP_PAGE = 1;
    private static final int ORDER_LOOKUP_SIZE = 1;
    private static final String ORDER_LOOKUP_SORT_BY = "createdAt";
    private static final String ORDER_LOOKUP_DIRECTION = "DESC";
    private static final String DATE_TIME_PATTERN = "dd/MM/yyyy HH:mm";

    private final OrderServicePort orderServicePort;
    private final ChatMessageProperties chatMessageProperties;

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
                    ORDER_LOOKUP_PAGE,
                    ORDER_LOOKUP_SIZE,
                    null,
                    null,
                    null,
                    null,
                    null,
                    ORDER_LOOKUP_SORT_BY,
                    ORDER_LOOKUP_DIRECTION,
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
            case ChatAccountLookupOutcome.NoOrders ignored -> chatMessageProperties.getAccount().getNoOrders();
            case ChatAccountLookupOutcome.LookupFailed ignored -> chatMessageProperties.getAccount().getLookupFailed();
            case ChatAccountLookupOutcome.LatestOrderFound latest -> formatLatestOrder(latest.order());
        };
    }

    private String formatLatestOrder(OrderResponse latest) {
        ChatMessageProperties.AccountMessages accountMessages = chatMessageProperties.getAccount();
        StringBuilder reply = new StringBuilder(accountMessages.getLatestOrderPrefix());
        reply.append(latest.orderCode());
        if (latest.status() != null) {
            reply.append(accountMessages.getLatestOrderStatusSeparator()).append(latest.status().name());
        }
        if (latest.createdAt() != null) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern(DATE_TIME_PATTERN);
            reply.append(accountMessages.getLatestOrderCreatedAtPrefix())
                    .append(latest.createdAt().format(formatter))
                    .append(accountMessages.getLatestOrderCreatedAtSuffix());
        }
        reply.append(accountMessages.getLatestOrderFooter());
        return reply.toString();
    }
}
