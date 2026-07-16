package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatGenerateResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.chat.ChatAiPort;
import com.daiphat.coreapi.application.service.chat.fortune.DreamFortuneInterpreter;
import com.daiphat.coreapi.application.service.chat.ticket.ChatTicketInventoryService;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Component("OTHER_KNOWLEDGE")
@RequiredArgsConstructor
public class FortuneConsultIntentStrategy implements ChatIntentHandlerStrategy {

    private final ChatAiPort chatAiPort;
    private final ChatMessageProperties chatMessageProperties;
    private final ChatTicketInventoryService chatTicketInventoryService;
    private final DreamFortuneInterpreter dreamFortuneInterpreter;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.OTHER_KNOWLEDGE;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        String message = ctx.getCustomerMessage() != null ? ctx.getCustomerMessage().getContent() : null;
        Long conversationId = ctx.getConversation() != null ? ctx.getConversation().getId() : null;

        DreamFortuneInterpreter.Interpretation local = dreamFortuneInterpreter.interpret(message);
        ChatGenerateResponse ai = chatAiPort.generateFortune(message, conversationId);

        String reply = resolveReply(ai, local);
        List<String> luckyNumbers = resolveLuckyNumbers(ai, local);

        ChatTicketInventoryService.TicketInventoryReply inventory =
                findTicketsForLuckyNumbers(reply, luckyNumbers);

        return new ChatIntentOutcome.BotReply(
                inventory.content(),
                inventory.displayContent(),
                ChatIntent.OTHER_KNOWLEDGE.name()
        );
    }

    private String resolveReply(ChatGenerateResponse ai, DreamFortuneInterpreter.Interpretation local) {
        // Prefer local dream-book copy whenever numbers were resolved (catalog or any subject).
        if (local.luckyNumbers() != null && !local.luckyNumbers().isEmpty()
                && local.reply() != null && !local.reply().isBlank()) {
            return local.reply().trim();
        }
        if (ai != null && ai.getReply() != null && !ai.getReply().isBlank()) {
            return ai.getReply().trim();
        }
        if (local.reply() != null && !local.reply().isBlank()) {
            return local.reply().trim();
        }
        return chatMessageProperties.getNotUnderstood();
    }

    private List<String> resolveLuckyNumbers(
            ChatGenerateResponse ai,
            DreamFortuneInterpreter.Interpretation local
    ) {
        if (local.luckyNumbers() != null && !local.luckyNumbers().isEmpty()) {
            return local.luckyNumbers();
        }
        if (ai != null && ai.getLuckyNumbers() != null && !ai.getLuckyNumbers().isEmpty()) {
            return ai.getLuckyNumbers().stream()
                    .filter(n -> n != null && !n.isBlank())
                    .map(String::trim)
                    .toList();
        }
        return List.of();
    }

    private ChatTicketInventoryService.TicketInventoryReply findTicketsForLuckyNumbers(
            String fortuneReply,
            List<String> luckyNumbers
    ) {
        if (luckyNumbers == null || luckyNumbers.isEmpty()) {
            return chatTicketInventoryService.appendInventoryBlock(fortuneReply);
        }

        List<LotteryTicketResponse> matched = collectMatchingTickets(luckyNumbers);
        String primarySearch = luckyNumbers.getFirst();
        String numbersText = String.join(", ", luckyNumbers);
        String ticketIntro = matched.isEmpty()
                ? "Hiện Đại Phát chưa có vé đang bán khớp các đuôi số " + numbersText
                + ". Quý khách có thể thử đuôi khác, xem gợi ý hôm nay, hoặc quay lại sau nhé."
                : "Dưới đây là vài vé đang bán khớp đuôi số " + numbersText + " dành cho quý khách:";
        String lead = fortuneReply + "\n\n" + ticketIntro;

        ChatTicketInventoryService.TicketInventoryReply inventory =
                chatTicketInventoryService.formatReply(matched, primarySearch, true);
        return chatTicketInventoryService.prependLeadingText(lead, inventory);
    }

    private List<LotteryTicketResponse> collectMatchingTickets(List<String> luckyNumbers) {
        List<LotteryTicketResponse> matched = new ArrayList<>();
        Set<Long> seenIds = new LinkedHashSet<>();

        for (String fragment : luckyNumbers) {
            List<LotteryTicketResponse> found = chatTicketInventoryService.findAvailable(
                    fragment,
                    null,
                    ChatTicketInventoryService.DRAW_DATE_TODAY,
                    ChatTicketInventoryService.DEFAULT_LIMIT
            );
            for (LotteryTicketResponse ticket : WebSearchIntentStrategy.filterByMatchMode(
                    found,
                    fragment,
                    WebSearchIntentStrategy.MATCH_SUFFIX
            )) {
                Long id = ticket.id();
                if (id != null && !seenIds.add(id)) {
                    continue;
                }
                matched.add(ticket);
                if (matched.size() >= ChatTicketInventoryService.DEFAULT_LIMIT) {
                    return matched;
                }
            }
        }
        return matched;
    }
}
