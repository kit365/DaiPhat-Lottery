package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.chat.ChatAiPort;
import com.daiphat.coreapi.application.service.chat.fortune.DreamFortuneInterpreter;
import com.daiphat.coreapi.application.service.chat.ticket.ChatTicketInventoryService;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("FortuneConsultIntentStrategy")
class FortuneConsultIntentStrategyTest {

    @Mock
    private ChatAiPort chatAiPort;
    @Mock
    private ChatMessageProperties chatMessageProperties;
    @Mock
    private ChatTicketInventoryService chatTicketInventoryService;

    private FortuneConsultIntentStrategy strategy;

    @BeforeEach
    void setUp() {
        strategy = new FortuneConsultIntentStrategy(
                chatAiPort,
                chatMessageProperties,
                chatTicketInventoryService,
                new DreamFortuneInterpreter()
        );
    }

    @Test
    void resolve_dreamPig_searchesInventoryByLuckySuffix() {
        when(chatAiPort.generateFortune(any(), any())).thenReturn(null);

        LotteryTicketResponse ticket = LotteryTicketResponse.builder()
                .id(11L)
                .stationId(3L)
                .stationName("Bến Tre")
                .numbers("334422")
                .drawDate(LocalDate.now())
                .priceSnapshot(BigDecimal.valueOf(10_000))
                .build();

        when(chatTicketInventoryService.findAvailable(anyString(), isNull(), eq("today"), anyInt()))
                .thenAnswer(invocation -> {
                    String fragment = invocation.getArgument(0);
                    return "22".equals(fragment) ? List.of(ticket) : List.of();
                });

        ChatTicketInventoryService.TicketInventoryReply formatted =
                new ChatTicketInventoryService.TicketInventoryReply(
                        "Dưới đây là 1 vé đang bán khớp đuôi số 02:\n\nTICKET_SUGGEST:[{\"id\":11,\"numbers\":\"334422\"}]",
                        "Dưới đây là 1 vé đang bán khớp đuôi số 02:"
                );
        when(chatTicketInventoryService.formatReply(anyList(), eq("02"), eq(true))).thenReturn(formatted);
        when(chatTicketInventoryService.prependLeadingText(anyString(), eq(formatted)))
                .thenAnswer(inv -> {
                    String lead = inv.getArgument(0);
                    ChatTicketInventoryService.TicketInventoryReply body = inv.getArgument(1);
                    String tokenPart = body.content().contains("TICKET_SUGGEST:")
                            ? body.content().substring(body.content().indexOf("TICKET_SUGGEST:"))
                            : body.content();
                    return new ChatTicketInventoryService.TicketInventoryReply(
                            lead + "\n\n" + tokenPart,
                            lead
                    );
                });

        ChatIntentOutcome outcome = strategy.resolve(context("tôi nằm mơ thấy con heo"));

        assertThat(outcome).isInstanceOf(ChatIntentOutcome.BotReply.class);
        ChatIntentOutcome.BotReply reply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(reply.intent()).isEqualTo(ChatIntent.OTHER_KNOWLEDGE.name());
        assertThat(reply.content()).contains("heo");
        assertThat(reply.content()).contains("02");
        assertThat(reply.displayContent()).contains("Dưới đây là vài vé đang bán khớp đuôi số");
        assertThat(reply.displayContent()).contains("chỉ mang tính tham khảo");
        assertThat(reply.content()).doesNotContain("Đang tìm vé");
        assertThat(reply.content()).doesNotContain("tham khảo vui");
        assertThat(reply.content()).doesNotContain("Mình sẽ");
        assertThat(reply.content()).doesNotContain("hệ thống");
        assertThat(reply.content()).contains("TICKET_SUGGEST:");
        assertThat(reply.content()).contains("334422");
    }

    @Test
    void resolve_dreamCow_usesBoLabelNotTrau() {
        when(chatAiPort.generateFortune(any(), any())).thenReturn(null);
        when(chatTicketInventoryService.findAvailable(anyString(), isNull(), eq("today"), anyInt()))
                .thenReturn(List.of());
        ChatTicketInventoryService.TicketInventoryReply formatted =
                new ChatTicketInventoryService.TicketInventoryReply(
                        "Hiện Đại Phát chưa có vé khớp đuôi số 09.",
                        "Hiện Đại Phát chưa có vé khớp đuôi số 09."
                );
        when(chatTicketInventoryService.formatReply(anyList(), eq("09"), eq(true))).thenReturn(formatted);
        when(chatTicketInventoryService.prependLeadingText(anyString(), eq(formatted)))
                .thenAnswer(inv -> {
                    String lead = inv.getArgument(0);
                    return new ChatTicketInventoryService.TicketInventoryReply(lead, lead);
                });

        ChatIntentOutcome outcome = strategy.resolve(context("tôi nằm mơ thấy con bò"));

        ChatIntentOutcome.BotReply reply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(reply.content()).contains("bò");
        assertThat(reply.content()).doesNotContain("trâu");
        assertThat(reply.content()).doesNotContain("Đang tìm vé");
    }

    private ChatIntentContext context(String message) {
        return ChatIntentContext.builder()
                .conversation(ConversationModel.builder().id(99L).build())
                .customerMessage(MessageModel.builder()
                        .id(2L)
                        .content(message)
                        .senderType(MessageSenderType.CUSTOMER)
                        .build())
                .classification(ChatClassifyResponse.builder()
                        .intent(ChatIntent.OTHER_KNOWLEDGE.name())
                        .confidence(0.82)
                        .build())
                .build();
    }
}
