package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.service.chat.ticket.ChatTicketInventoryService;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component("WEB_SUGGEST")
@RequiredArgsConstructor
public class WebSuggestIntentStrategy implements ChatIntentHandlerStrategy {

    private static final String ENTITY_STATION_ID = "stationId";
    private static final String ENTITY_EXCLUDE_IDS = "excludeIds";
    /** FE appends previously shown ticket ids: {@code gợi ý vé số cho tôi|exclude=1,2,3}. */
    private static final Pattern EXCLUDE_IDS_PATTERN = Pattern.compile(
            "(?i)\\|exclude=([0-9,\\s]+)"
    );

    private final ChatTicketInventoryService chatTicketInventoryService;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.WEB_SUGGEST;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        Long stationId = resolveStationId(ctx);
        List<Long> excludeIds = resolveExcludeIds(ctx);
        List<LotteryTicketResponse> tickets = chatTicketInventoryService.findAvailable(
                null,
                stationId,
                ChatTicketInventoryService.DRAW_DATE_TODAY,
                ChatTicketInventoryService.DEFAULT_LIMIT,
                excludeIds
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

    private List<Long> resolveExcludeIds(ChatIntentContext ctx) {
        Set<Long> ids = new LinkedHashSet<>();
        Map<String, String> entities = ctx.getClassification() != null
                ? ctx.getClassification().getEntities()
                : null;
        if (entities != null) {
            parseExcludeCsv(entities.get(ENTITY_EXCLUDE_IDS), ids);
            parseExcludeCsv(entities.get("exclude_ids"), ids);
        }
        if (ctx.getCustomerMessage() != null) {
            String content = ctx.getCustomerMessage().getContent();
            if (content != null && !content.isBlank()) {
                Matcher matcher = EXCLUDE_IDS_PATTERN.matcher(content);
                if (matcher.find()) {
                    parseExcludeCsv(matcher.group(1), ids);
                }
            }
        }
        return ids.isEmpty() ? List.of() : new ArrayList<>(ids);
    }

    private static void parseExcludeCsv(String raw, Set<Long> into) {
        if (raw == null || raw.isBlank()) {
            return;
        }
        for (String part : raw.split(",")) {
            String token = part.trim();
            if (token.isEmpty()) {
                continue;
            }
            try {
                into.add(Long.valueOf(token));
            } catch (NumberFormatException ignored) {
                // skip malformed tokens from FE / entities
            }
        }
    }
}
