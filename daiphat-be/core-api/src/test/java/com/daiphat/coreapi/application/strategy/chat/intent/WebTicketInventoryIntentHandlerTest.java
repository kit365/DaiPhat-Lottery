package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.service.chat.flow.search.WebSearchFlowService;
import com.daiphat.coreapi.application.service.chat.ticket.ChatTicketInventoryService;
import com.daiphat.coreapi.application.strategy.chat.intent.WebSearchIntentStrategy;
import com.daiphat.coreapi.application.strategy.chat.intent.WebSuggestIntentStrategy;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSearchPendingSlot;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WebSearch / WebSuggest intent strategies")
class WebTicketInventoryIntentHandlerTest {

    @Mock
    private ChatTicketInventoryService chatTicketInventoryService;

    @InjectMocks
    private WebSearchIntentStrategy searchStrategy;

    @InjectMocks
    private WebSuggestIntentStrategy suggestStrategy;

    @Test
    void webSearch_usesTicketFragmentFromEntities() {
        List<LotteryTicketResponse> tickets = List.of(ticket("126868"));
        when(chatTicketInventoryService.findAvailableMatching(
                eq("68"), isNull(), eq("today"), eq(5), eq("suffix")
        )).thenReturn(tickets);
        when(chatTicketInventoryService.formatReply(tickets, "68", true))
                .thenReturn(new ChatTicketInventoryService.TicketInventoryReply(
                        "TICKET_SUGGEST:[{\"numbers\":\"126868\"}]",
                        "Đại Phát tìm thấy 1 vé đang bán khớp \"68\":"
                ));

        ChatIntentOutcome outcome = searchStrategy.resolve(context(
                "có đuôi 68 không",
                ChatIntent.WEB_SEARCH,
                Map.of("ticket_fragment", "68")
        ));

        assertThat(outcome).isInstanceOf(ChatIntentOutcome.BotReply.class);
        ChatIntentOutcome.BotReply botReply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(botReply.content()).contains("126868");
        assertThat(botReply.content()).startsWith("TICKET_SUGGEST:");
        assertThat(botReply.displayContent()).doesNotContain("/buy-ticket");
        assertThat(botReply.intent()).isEqualTo(ChatIntent.WEB_SEARCH.name());
        verify(chatTicketInventoryService).findAvailableMatching("68", null, "today", 5, "suffix");
        verify(chatTicketInventoryService).formatReply(tickets, "68", true);
    }

    @Test
    void webSearch_withoutDigits_asksForTailAndSetsPending() {
        ConversationModel conversation = ConversationModel.builder()
                .id(1L)
                .customerId(UUID.randomUUID())
                .status(ConversationStatus.OPEN)
                .build();

        ChatIntentOutcome outcome = searchStrategy.resolve(ChatIntentContext.builder()
                .conversation(conversation)
                .customerMessage(MessageModel.builder()
                        .id(2L)
                        .content("tìm vé đuôi số")
                        .senderType(MessageSenderType.CUSTOMER)
                        .build())
                .classification(ChatClassifyResponse.builder()
                        .intent(ChatIntent.WEB_SEARCH.name())
                        .confidence(0.9)
                        .entities(Map.of())
                        .build())
                .build());

        ChatIntentOutcome.BotReply botReply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(botReply.displayContent()).isEqualTo(WebSearchIntentStrategy.ASK_SUFFIX_COPY);
        assertThat(conversation.findActiveFlow(ChatIntent.WEB_SEARCH.name())).isPresent();
        assertThat(conversation.findActiveFlow(ChatIntent.WEB_SEARCH.name()).get().pendingSlot())
                .isEqualTo(ChatSearchPendingSlot.TICKET_FRAGMENT.name());
        verify(chatTicketInventoryService, never()).findAvailableMatching(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void webSearchFlow_continuesPendingWithDigits() {
        WebSearchFlowService flowService = new WebSearchFlowService(searchStrategy);
        ConversationModel conversation = ConversationModel.builder()
                .id(1L)
                .customerId(UUID.randomUUID())
                .status(ConversationStatus.OPEN)
                .build();
        searchStrategy.beginAskForFragment(conversation, "suffix");

        List<LotteryTicketResponse> tickets = List.of(ticket("126868"));
        when(chatTicketInventoryService.findAvailableMatching(
                eq("68"), isNull(), eq("today"), eq(5), eq("suffix")
        )).thenReturn(tickets);
        when(chatTicketInventoryService.formatReply(tickets, "68", true))
                .thenReturn(new ChatTicketInventoryService.TicketInventoryReply(
                        "TICKET_SUGGEST:[{\"numbers\":\"126868\"}]",
                        "match"
                ));

        var outcome = flowService.tryContinue(
                conversation,
                conversation.findActiveFlow(ChatIntent.WEB_SEARCH.name()).orElseThrow(),
                MessageModel.builder().content("68").senderType(MessageSenderType.CUSTOMER).build(),
                ChatClassifyResponse.builder().intent(ChatIntent.UNKNOWN.name()).confidence(0.2).entities(Map.of()).build()
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).content()).contains("126868");
        assertThat(conversation.findActiveFlow(ChatIntent.WEB_SEARCH.name())).isEmpty();
    }

    @Test
    void webSearchFlow_remindsWhenPendingAnswerHasNoDigits() {
        WebSearchFlowService flowService = new WebSearchFlowService(searchStrategy);
        ConversationModel conversation = ConversationModel.builder()
                .id(1L)
                .customerId(UUID.randomUUID())
                .status(ConversationStatus.OPEN)
                .build();
        searchStrategy.beginAskForFragment(conversation, "suffix");

        var outcome = flowService.tryContinue(
                conversation,
                conversation.findActiveFlow(ChatIntent.WEB_SEARCH.name()).orElseThrow(),
                MessageModel.builder().content("abc").senderType(MessageSenderType.CUSTOMER).build(),
                null
        );

        assertThat(outcome).isPresent();
        assertThat(((ChatIntentOutcome.BotReply) outcome.get()).displayContent())
                .isEqualTo(WebSearchIntentStrategy.REMIND_FRAGMENT_COPY);
        assertThat(conversation.findActiveFlow(ChatIntent.WEB_SEARCH.name())).isPresent();
        verify(chatTicketInventoryService, never()).findAvailableMatching(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void webSearch_keepsOnlyNumbersEndingWithFragment() {
        LotteryTicketResponse ending = ticket("334455");
        when(chatTicketInventoryService.findAvailableMatching(eq("55"), isNull(), eq("today"), eq(5), eq("suffix")))
                .thenReturn(List.of(ending));
        when(chatTicketInventoryService.formatReply(List.of(ending), "55", true))
                .thenReturn(new ChatTicketInventoryService.TicketInventoryReply(
                        "TICKET_SUGGEST:[{\"numbers\":\"334455\"}]",
                        "Đại Phát tìm thấy 1 vé đang bán khớp \"55\":"
                ));

        ChatIntentOutcome outcome = searchStrategy.resolve(context(
                "có số đuôi là 55 không",
                ChatIntent.WEB_SEARCH,
                Map.of("ticket_fragment", "55")
        ));

        ChatIntentOutcome.BotReply botReply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(botReply.content()).contains("334455");
        assertThat(botReply.content()).doesNotContain("556677");
        verify(chatTicketInventoryService).formatReply(List.of(ending), "55", true);
    }

    @Test
    void webSearch_whenNoEndingMatch_asksFormatReplyToSuggestAlternatives() {
        when(chatTicketInventoryService.findAvailableMatching(eq("99"), isNull(), eq("today"), eq(5), eq("suffix")))
                .thenReturn(List.of());
        when(chatTicketInventoryService.formatReply(List.of(), "99", true))
                .thenReturn(new ChatTicketInventoryService.TicketInventoryReply(
                        "fallback",
                        "Kho chưa có số bạn tìm"
                ));

        ChatIntentOutcome outcome = searchStrategy.resolve(context(
                "có đuôi 99 không",
                ChatIntent.WEB_SEARCH,
                Map.of("ticket_fragment", "99", "ticket_match_mode", "suffix")
        ));

        ChatIntentOutcome.BotReply botReply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(botReply.displayContent()).contains("Kho chưa có số bạn tìm");
        verify(chatTicketInventoryService).formatReply(List.of(), "99", true);
    }

    @Test
    void webSearch_prefixMatch_keepsNumbersStartingWithFragment() {
        LotteryTicketResponse prefix = ticket("123456");
        when(chatTicketInventoryService.findAvailableMatching(eq("12"), isNull(), eq("today"), eq(5), eq("prefix")))
                .thenReturn(List.of(prefix));
        when(chatTicketInventoryService.formatReply(List.of(prefix), "12", true))
                .thenReturn(new ChatTicketInventoryService.TicketInventoryReply(
                        "TICKET_SUGGEST:[{\"numbers\":\"123456\"}]",
                        "Đại Phát tìm thấy 1 vé đang bán khớp \"12\":"
                ));

        ChatIntentOutcome outcome = searchStrategy.resolve(context(
                "có 2 số đầu 12 không",
                ChatIntent.WEB_SEARCH,
                Map.of("ticket_fragment", "12", "ticket_match_mode", "prefix")
        ));

        ChatIntentOutcome.BotReply botReply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(botReply.content()).contains("123456");
        assertThat(botReply.content()).doesNotContain("991234");
        verify(chatTicketInventoryService).formatReply(List.of(prefix), "12", true);
    }

    @Test
    void webSearch_exactSixDigits_matchesFullNumberOnly() {
        LotteryTicketResponse exact = ticket("334455");
        when(chatTicketInventoryService.findAvailableMatching(eq("334455"), isNull(), eq("today"), eq(5), eq("exact")))
                .thenReturn(List.of(exact));
        when(chatTicketInventoryService.formatReply(List.of(exact), "334455", true))
                .thenReturn(new ChatTicketInventoryService.TicketInventoryReply(
                        "TICKET_SUGGEST:[{\"numbers\":\"334455\"}]",
                        "Đại Phát tìm thấy 1 vé đang bán khớp \"334455\":"
                ));

        ChatIntentOutcome outcome = searchStrategy.resolve(context(
                "tìm vé 334455",
                ChatIntent.WEB_SEARCH,
                Map.of("ticket_fragment", "334455", "ticket_match_mode", "exact")
        ));

        ChatIntentOutcome.BotReply botReply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(botReply.content()).contains("334455");
        verify(chatTicketInventoryService).formatReply(List.of(exact), "334455", true);
    }

    @Test
    void webSearch_suffixFiveDigits_matchesEndingOnly() {
        LotteryTicketResponse ending = ticket("556789");
        when(chatTicketInventoryService.findAvailableMatching(eq("56789"), isNull(), eq("today"), eq(5), eq("suffix")))
                .thenReturn(List.of(ending));
        when(chatTicketInventoryService.formatReply(List.of(ending), "56789", true))
                .thenReturn(new ChatTicketInventoryService.TicketInventoryReply(
                        "TICKET_SUGGEST:[{\"numbers\":\"556789\"}]",
                        "match"
                ));

        searchStrategy.resolve(context(
                "có đuôi 56789 không",
                ChatIntent.WEB_SEARCH,
                Map.of("ticket_fragment", "56789", "ticket_match_mode", "suffix")
        ));

        verify(chatTicketInventoryService).formatReply(List.of(ending), "56789", true);
    }

    @Test
    void webSearch_extractsDigitsFromMessageWhenEntityMissing() {
        when(chatTicketInventoryService.findAvailableMatching(eq("123456"), isNull(), eq("today"), eq(5), eq("exact")))
                .thenReturn(List.of());
        when(chatTicketInventoryService.formatReply(List.of(), "123456", true))
                .thenReturn(new ChatTicketInventoryService.TicketInventoryReply("empty", "empty"));

        searchStrategy.resolve(context("tìm vé 123456", ChatIntent.WEB_SEARCH, Map.of()));

        verify(chatTicketInventoryService).findAvailableMatching("123456", null, "today", 5, "exact");
    }

    @Test
    void webSuggest_queriesTodayWithoutSearch() {
        List<LotteryTicketResponse> tickets = List.of(ticket("555666"));
        when(chatTicketInventoryService.findAvailable(isNull(), isNull(), eq("today"), eq(5)))
                .thenReturn(tickets);
        when(chatTicketInventoryService.formatReply(tickets, null, false))
                .thenReturn(new ChatTicketInventoryService.TicketInventoryReply(
                        "TICKET_SUGGEST:[{\"numbers\":\"555666\"}]",
                        "Đại Phát gợi ý 1 vé đang bán hôm nay."
                ));

        ChatIntentOutcome outcome = suggestStrategy.resolve(context(
                "gợi ý vé hôm nay",
                ChatIntent.WEB_SUGGEST,
                Map.of()
        ));

        ChatIntentOutcome.BotReply botReply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(botReply.content()).contains("555666");
        assertThat(botReply.content()).startsWith("TICKET_SUGGEST:");
        assertThat(botReply.intent()).isEqualTo(ChatIntent.WEB_SUGGEST.name());
    }

    private ChatIntentContext context(String message, ChatIntent intent, Map<String, String> entities) {
        return ChatIntentContext.builder()
                .conversation(ConversationModel.builder()
                        .id(1L)
                        .customerId(UUID.randomUUID())
                        .status(ConversationStatus.OPEN)
                        .build())
                .customerMessage(MessageModel.builder()
                        .id(2L)
                        .content(message)
                        .senderType(MessageSenderType.CUSTOMER)
                        .build())
                .classification(ChatClassifyResponse.builder()
                        .intent(intent.name())
                        .confidence(0.9)
                        .entities(entities)
                        .build())
                .build();
    }

    private static LotteryTicketResponse ticket(String numbers) {
        return ticket(1L, numbers);
    }

    private static LotteryTicketResponse ticket(Long id, String numbers) {
        return LotteryTicketResponse.builder()
                .id(id)
                .stationId(1L)
                .stationName("Đài TP")
                .numbers(numbers)
                .drawDate(LocalDate.of(2026, 7, 15))
                .priceSnapshot(new BigDecimal("10000"))
                .build();
    }
}
