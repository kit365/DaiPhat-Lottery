package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.service.chat.ticket.ChatTicketInventoryService;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSearchPendingSlot;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component("WEB_SEARCH")
@RequiredArgsConstructor
public class WebSearchIntentStrategy implements ChatIntentHandlerStrategy {

    static final String ENTITY_TICKET_NUMBER = "ticket_number";
    static final String ENTITY_TICKET_FRAGMENT = "ticket_fragment";
    static final String ENTITY_TICKET_MATCH_MODE = "ticket_match_mode";
    static final String MATCH_SUFFIX = ChatTicketInventoryService.MATCH_SUFFIX;
    static final String MATCH_PREFIX = ChatTicketInventoryService.MATCH_PREFIX;
    static final String MATCH_EXACT = ChatTicketInventoryService.MATCH_EXACT;
    static final String SLOT_MATCH_MODE = "ticket_match_mode";

    public static final String ASK_SUFFIX_COPY =
            "Quý khách muốn tìm đuôi mấy số ạ?";
    public static final String ASK_PREFIX_COPY =
            "Quý khách muốn tìm đầu số mấy ạ?";
    public static final String REMIND_FRAGMENT_COPY =
            "Quý khách vui lòng nhập 2 đến 6 chữ số để Đại Phát tìm vé nhé.";

    private static final Pattern TICKET_FRAGMENT_PATTERN = Pattern.compile("\\b\\d{2,6}\\b");
    private static final String ENTITY_STATION_ID = "stationId";

    private final ChatTicketInventoryService chatTicketInventoryService;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.WEB_SEARCH;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        String search = resolveSearchFragment(ctx);
        String matchMode = resolveMatchMode(ctx, search);

        if (search == null && requiresFragmentBeforeSearch(ctx)) {
            beginAskForFragment(ctx.getConversation(), matchMode);
            return askForFragmentReply(matchMode);
        }

        return searchTickets(search, matchMode, resolveStationId(ctx));
    }

    public ChatIntentOutcome searchTickets(String search, String matchMode, Long stationId) {
        String resolvedMode = normalizeMode(matchMode);
        List<LotteryTicketResponse> tickets = chatTicketInventoryService.findAvailableMatching(
                search,
                stationId,
                ChatTicketInventoryService.DRAW_DATE_TODAY,
                ChatTicketInventoryService.DEFAULT_LIMIT,
                resolvedMode
        );
        ChatTicketInventoryService.TicketInventoryReply reply =
                chatTicketInventoryService.formatReply(tickets, search, true, resolvedMode);
        return new ChatIntentOutcome.BotReply(
                reply.content(),
                reply.displayContent(),
                ChatIntent.WEB_SEARCH.name()
        );
    }

    public static ChatIntentOutcome askForFragmentReply(String matchMode) {
        String copy = MATCH_PREFIX.equals(normalizeMode(matchMode)) ? ASK_PREFIX_COPY : ASK_SUFFIX_COPY;
        return new ChatIntentOutcome.BotReply(copy, copy, ChatIntent.WEB_SEARCH.name());
    }

    public static ChatIntentOutcome remindFragmentReply() {
        return new ChatIntentOutcome.BotReply(
                REMIND_FRAGMENT_COPY,
                REMIND_FRAGMENT_COPY,
                ChatIntent.WEB_SEARCH.name()
        );
    }

    public void beginAskForFragment(ConversationModel conversation, String matchMode) {
        if (conversation == null) {
            return;
        }
        conversation.clearPendingFlow(ChatIntent.WEB_SEARCH.name());
        Map<String, String> slots = new HashMap<>();
        slots.put(SLOT_MATCH_MODE, normalizeMode(matchMode));
        PendingFlowState flow = PendingFlowState.create(ChatIntent.WEB_SEARCH.name())
                .withPendingSlot(ChatSearchPendingSlot.TICKET_FRAGMENT.name())
                .withCollectedSlots(slots);
        conversation.upsertFlow(flow);
    }

    public static boolean isTicketFragmentPending(PendingFlowState flow) {
        return flow != null
                && ChatIntent.WEB_SEARCH.name().equals(flow.intent())
                && ChatSearchPendingSlot.TICKET_FRAGMENT.name().equals(flow.pendingSlot());
    }

    public static String extractFragmentFromText(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }
        Matcher matcher = TICKET_FRAGMENT_PATTERN.matcher(message);
        String last = null;
        while (matcher.find()) {
            last = matcher.group();
        }
        return last;
    }

    public static String matchModeFromFlow(PendingFlowState flow) {
        if (flow == null || flow.collectedSlots() == null) {
            return MATCH_SUFFIX;
        }
        return normalizeMode(flow.collectedSlots().get(SLOT_MATCH_MODE));
    }

    /**
     * Public ticket search uses SQL {@code LIKE %fragment%}. Tighten to the user's intent:
     * đuôi → suffix, đầu → prefix, đủ 6 số → exact.
     */
    static List<LotteryTicketResponse> filterByMatchMode(
            List<LotteryTicketResponse> tickets,
            String search,
            String matchMode
    ) {
        if (tickets == null || tickets.isEmpty() || search == null || search.isBlank()) {
            return tickets == null ? List.of() : tickets;
        }
        String fragment = search.trim();
        String mode = normalizeMode(matchMode);

        return tickets.stream()
                .filter(ticket -> ticket.numbers() != null
                        && ChatTicketInventoryService.matchesFragment(ticket.numbers(), fragment, mode))
                .toList();
    }

    static String resolveMatchMode(ChatIntentContext ctx, String search) {
        Map<String, String> entities = ctx.getClassification() != null
                ? ctx.getClassification().getEntities()
                : null;
        if (entities != null) {
            String fromEntity = entities.get(ENTITY_TICKET_MATCH_MODE);
            if (fromEntity != null && !fromEntity.isBlank()) {
                return fromEntity.trim().toLowerCase(Locale.ROOT);
            }
        }

        String message = ctx.getCustomerMessage() != null ? ctx.getCustomerMessage().getContent() : null;
        String normalized = normalizeForCue(message);
        if (normalized == null || normalized.isBlank()) {
            return defaultModeForFragment(search);
        }

        if (containsPrefixCue(normalized)) {
            return MATCH_PREFIX;
        }
        if (containsSuffixCue(normalized)) {
            return MATCH_SUFFIX;
        }
        return defaultModeForFragment(search);
    }

    static boolean requiresFragmentBeforeSearch(ChatIntentContext ctx) {
        String message = ctx.getCustomerMessage() != null ? ctx.getCustomerMessage().getContent() : null;
        String normalized = normalizeForCue(message);
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        return containsSuffixCue(normalized) || containsPrefixCue(normalized);
    }

    private static String defaultModeForFragment(String search) {
        if (search != null && search.trim().length() >= 6) {
            return MATCH_EXACT;
        }
        return MATCH_SUFFIX;
    }

    private static String normalizeMode(String matchMode) {
        return ChatTicketInventoryService.normalizeMatchMode(matchMode, null);
    }

    private static boolean containsSuffixCue(String normalized) {
        return normalized.contains("duoi");
    }

    private static boolean containsPrefixCue(String normalized) {
        return normalized.contains("so dau")
                || normalized.contains("dau so")
                || normalized.contains(" dau ")
                || normalized.endsWith(" dau")
                || normalized.startsWith("dau ");
    }

    private static String normalizeForCue(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }
        String text = Normalizer.normalize(message, Normalizer.Form.NFC).toLowerCase(Locale.ROOT).trim();
        text = text.replace('đ', 'd');
        text = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return text.replaceAll("\\s+", " ");
    }

    String resolveSearchFragment(ChatIntentContext ctx) {
        Map<String, String> entities = ctx.getClassification() != null
                ? ctx.getClassification().getEntities()
                : null;
        if (entities != null) {
            String fromEntity = firstNonBlank(
                    entities.get(ENTITY_TICKET_FRAGMENT),
                    entities.get(ENTITY_TICKET_NUMBER)
            );
            if (fromEntity != null) {
                return fromEntity;
            }
        }
        String message = ctx.getCustomerMessage() != null ? ctx.getCustomerMessage().getContent() : null;
        return extractFragmentFromText(message);
    }

    private Long resolveStationId(ChatIntentContext ctx) {
        Map<String, String> entities = ctx.getClassification() != null
                ? ctx.getClassification().getEntities()
                : null;
        if (entities == null) {
            return null;
        }
        String raw = firstNonBlank(entities.get(ENTITY_STATION_ID), entities.get("station_id"));
        if (raw == null) {
            return null;
        }
        try {
            return Long.valueOf(raw);
        } catch (NumberFormatException ex) {
            log.debug("Ignoring invalid stationId entity: {}", raw);
            return null;
        }
    }

    private static String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first.trim();
        }
        if (second != null && !second.isBlank()) {
            return second.trim();
        }
        return null;
    }
}
