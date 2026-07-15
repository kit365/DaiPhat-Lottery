package com.daiphat.coreapi.application.service.chat.ticket;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatTicketInventoryService")
class ChatTicketInventoryServiceTest {

    @Mock
    private LotteryTicketServicePort lotteryTicketServicePort;

    @InjectMocks
    private ChatTicketInventoryService service;

    @Test
    void findAvailable_delegatesToPublicTicketsWithTodayAndSearch() {
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(5), isNull(), isNull(), eq("today"), eq("68"), eq("numbers"), eq("asc")
        )).thenReturn(pageOf(List.of(ticket("126800", 1L, "Đài TP"))));

        List<LotteryTicketResponse> result = service.findAvailable("68", null, "today", 5);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).numbers()).isEqualTo("126800");
        verify(lotteryTicketServicePort).getPublicTickets(
                1, 5, null, null, "today", "68", "numbers", "asc"
        );
    }

    @Test
    void formatReply_whenTicketsFound_emitsTokenWithoutRawBuyPath() {
        List<LotteryTicketResponse> tickets = List.of(
                ticket("126800", 1L, "Đài TP"),
                ticket("336800", 2L, "Đài Đồng Nai")
        );

        ChatTicketInventoryService.TicketInventoryReply reply = service.formatReply(tickets, "68", true);

        assertThat(reply.content()).contains(ChatTicketInventoryService.TOKEN_PREFIX);
        assertThat(reply.content()).contains("\"numbers\":\"126800\"").contains("\"numbers\":\"336800\"");
        assertThat(reply.content()).doesNotContain("/buy-ticket");
        assertThat(reply.displayContent()).contains("khớp \"68\"");
        assertThat(reply.displayContent()).doesNotContain("/buy-ticket");
        assertThat(reply.displayContent()).doesNotContain("777777");
    }

    @Test
    void formatReply_whenEmptySearch_fallsBackToTodaySuggestionsToken() {
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(3), isNull(), isNull(), eq("today"), isNull(), eq("numbers"), eq("asc")
        )).thenReturn(pageOf(List.of(ticket("111222", 9L, "Đài Bến Tre"))));

        ChatTicketInventoryService.TicketInventoryReply reply = service.formatReply(List.of(), "99", true);

        assertThat(reply.displayContent()).contains("chưa có số bạn tìm");
        assertThat(reply.content()).contains(ChatTicketInventoryService.TOKEN_PREFIX);
        assertThat(reply.content()).contains("\"numbers\":\"111222\"");
        assertThat(reply.content()).contains("chưa có số bạn tìm");
        assertThat(reply.content()).doesNotContain("/buy-ticket");
    }

    @Test
    void formatReply_whenNoInventoryAtAll_asksRetryWithoutToken() {
        when(lotteryTicketServicePort.getPublicTickets(
                anyInt(), anyInt(), isNull(), isNull(), anyString(), isNull(), anyString(), anyString()
        )).thenReturn(pageOf(List.of()));

        ChatTicketInventoryService.TicketInventoryReply reply = service.formatReply(List.of(), null, false);

        assertThat(reply.content()).doesNotContain(ChatTicketInventoryService.TOKEN_PREFIX);
        assertThat(reply.displayContent()).contains("chưa có vé phù hợp");
        assertThat(reply.displayContent()).contains("Mua vé");
    }

    @Test
    void appendInventoryBlock_appendsTokenAfterFortuneText() {
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(5), isNull(), isNull(), eq("today"), isNull(), eq("numbers"), eq("asc")
        )).thenReturn(pageOf(List.of(ticket("555666", 3L, "Đài Cần Thơ"))));

        ChatTicketInventoryService.TicketInventoryReply reply =
                service.appendInventoryBlock("Đây là lời phong thủy tạm.");

        assertThat(reply.content()).startsWith("Đây là lời phong thủy tạm.");
        assertThat(reply.content()).contains(ChatTicketInventoryService.TOKEN_PREFIX);
        assertThat(reply.content()).contains("\"numbers\":\"555666\"");
        assertThat(reply.displayContent()).contains("Đây là lời phong thủy tạm.");
        assertThat(reply.displayContent()).doesNotContain("/buy-ticket");
    }

    private static PageResponse<LotteryTicketResponse> pageOf(List<LotteryTicketResponse> tickets) {
        return PageResponse.<LotteryTicketResponse>builder()
                .recordList(tickets)
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(tickets.size())
                        .totalPages(1)
                        .currentPage(1)
                        .limit(Math.max(tickets.size(), 1))
                        .isFirst(true)
                        .isLast(true)
                        .build())
                .build();
    }

    private static LotteryTicketResponse ticket(String numbers, Long stationId, String stationName) {
        return LotteryTicketResponse.builder()
                .id(stationId)
                .stationId(stationId)
                .stationName(stationName)
                .numbers(numbers)
                .drawDate(LocalDate.of(2026, 7, 15))
                .priceSnapshot(new BigDecimal("10000"))
                .quantity(1)
                .status("IN_STOCK")
                .build();
    }
}
