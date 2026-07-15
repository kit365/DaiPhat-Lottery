package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.service.chat.ticket.ChatTicketInventoryService;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Slf4j
@Component("WEB_SUGGEST")
@RequiredArgsConstructor
public class WebSuggestIntentStrategy implements ChatIntentHandlerStrategy {

    private static final String ENTITY_STATION_ID = "stationId";

    private final ChatTicketInventoryService chatTicketInventoryService;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.WEB_SUGGEST;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        Long stationId = resolveStationId(ctx);
        List<LotteryTicketResponse> tickets = chatTicketInventoryService.findAvailable(
                null,
                stationId,
                ChatTicketInventoryService.DRAW_DATE_TODAY,
                ChatTicketInventoryService.DEFAULT_LIMIT
        );
        ChatTicketInventoryService.TicketInventoryReply reply =
                chatTicketInventoryService.formatReply(tickets, null, false);
        return new ChatIntentOutcome.BotReply(
                reply.content(),
                reply.displayContent(),
                ChatIntent.WEB_SUGGEST.name()
        );
    }

    private Long resolveStationId(ChatIntentContext ctx) {
        Map<String, String> entities = ctx.getClassification() != null
                ? ctx.getClassification().getEntities()
                : null;
        if (entities == null) {
            return null;
        }
        String raw = entities.get(ENTITY_STATION_ID);
        if (raw == null || raw.isBlank()) {
            raw = entities.get("station_id");
        }
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(raw.trim());
        } catch (NumberFormatException ex) {
            log.debug("Ignoring invalid stationId entity: {}", raw);
            return null;
        }
    }
}
