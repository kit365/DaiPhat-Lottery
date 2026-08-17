package com.daiphat.coreapi.application.strategy.chat.ticket;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.service.chat.ticket.ChatTicketInventoryService;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
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
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatTicketInventoryService")
class ChatTicketInventoryServiceTest {

    @Mock
    private LotteryTicketServicePort lotteryTicketServicePort;

    @InjectMocks
    private ChatTicketInventoryService service;

    private static String defaultSellableDate() {
        return DrawScheduleUtils.resolveDefaultSellableDrawDate().toString();
    }

    @Test
    void findAvailable_resolvesTodayToDefaultSellableDrawDate() {
        String sellable = defaultSellableDate();
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(40), isNull(), isNull(), eq(sellable), eq("68"), eq("numbers"), eq("asc")
        )).thenReturn(pageOf(List.of(ticket("126800", 1L, "Đài TP"))));

        List<LotteryTicketResponse> result = service.findAvailable("68", null, "today", 5);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).numbers()).isEqualTo("126800");
        verify(lotteryTicketServicePort).getPublicTickets(
                1, 40, null, null, sellable, "68", "numbers", "asc"
        );
    }

    @Test
    void findAvailable_skipsExcludedIdsAndReturnsRemainingTickets() {
        String sellable = defaultSellableDate();
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(40), isNull(), isNull(), eq(sellable), isNull(), eq("numbers"), eq("asc")
        )).thenReturn(pageOf(
                List.of(
                        ticket("020001", 1L, "A"),
                        ticket("020008", 2L, "B"),
                        ticket("020015", 3L, "C"),
                        ticket("020022", 4L, "D"),
                        ticket("020029", 5L, "E"),
                        ticket("020036", 6L, "F"),
                        ticket("020043", 7L, "G")
                ),
                true
        ));

        List<LotteryTicketResponse> result = service.findAvailable(
                null, null, "today", 5, List.of(1L, 2L, 3L, 4L, 5L)
        );

        assertThat(result).extracting(LotteryTicketResponse::id).containsExactlyInAnyOrder(6L, 7L);
        assertThat(result).extracting(LotteryTicketResponse::numbers).containsExactlyInAnyOrder("020036", "020043");
    }

    @Test
    void findAvailable_picksRandomSubsetInsteadOfSequentialOrder() {
        String sellable = defaultSellableDate();
        List<LotteryTicketResponse> inventory = new java.util.ArrayList<>();
        for (long id = 1; id <= 40; id++) {
            inventory.add(ticket(String.format("%06d", 700_000 + id), id, "A"));
        }
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(40), isNull(), isNull(), eq(sellable), isNull(), eq("numbers"), eq("asc")
        )).thenReturn(pageOf(inventory, true));

        List<LotteryTicketResponse> first = service.findAvailable(null, null, "today", 5);
        List<LotteryTicketResponse> second = service.findAvailable(null, null, "today", 5);

        assertThat(first).hasSize(5);
        assertThat(second).hasSize(5);
        // Not the first five numbers in ascending order (sequential bug).
        assertThat(first).extracting(LotteryTicketResponse::numbers)
                .isNotEqualTo(List.of("700001", "700002", "700003", "700004", "700005"));
    }

    @Test
    void findAvailableMatching_pagesUntilEnoughTrueSuffixMatches() {
        String sellable = defaultSellableDate();
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(40), isNull(), isNull(), eq(sellable), eq("68"), eq("numbers"), eq("asc")
        )).thenReturn(pageOf(
                List.of(
                        ticket("126868", 1L, "A"),
                        ticket("681234", 2L, "B"),
                        ticket("336868", 3L, "C")
                ),
                false
        ));
        when(lotteryTicketServicePort.getPublicTickets(
                eq(2), eq(40), isNull(), isNull(), eq(sellable), eq("68"), eq("numbers"), eq("asc")
        )).thenReturn(pageOf(
                List.of(
                        ticket("446868", 4L, "D"),
                        ticket("556868", 5L, "E"),
                        ticket("666868", 6L, "F")
                ),
                true
        ));

        List<LotteryTicketResponse> result = service.findAvailableMatching(
                "68", null, "today", 5, "suffix"
        );

        assertThat(result).extracting(LotteryTicketResponse::numbers)
                .containsExactly("126868", "336868", "446868", "556868", "666868");
        verify(lotteryTicketServicePort, times(2)).getPublicTickets(
                anyInt(), eq(40), isNull(), isNull(), eq(sellable), eq("68"), eq("numbers"), eq("asc")
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
        assertThat(reply.displayContent()).contains("khớp đuôi số 68");
        assertThat(reply.displayContent()).contains("quý khách");
        assertThat(reply.displayContent()).doesNotContain("/buy-ticket");
        assertThat(reply.displayContent()).doesNotContain("777777");
    }

    @Test
    void formatReply_whenEmptySearch_doesNotShowUnrelatedTickets() {
        ChatTicketInventoryService.TicketInventoryReply reply = service.formatReply(List.of(), "39", true);

        assertThat(reply.displayContent()).contains("chưa có vé khớp đuôi số 39");
        assertThat(reply.displayContent()).contains("thử đuôi số khác");
        assertThat(reply.displayContent()).doesNotContain("đang bán hôm nay dành cho quý khách");
        assertThat(reply.content()).doesNotContain(ChatTicketInventoryService.TOKEN_PREFIX);
        assertThat(reply.content()).isEqualTo(reply.displayContent());
    }

    @Test
    void formatReply_whenPrefixSearch_usesDauSoWording() {
        ChatTicketInventoryService.TicketInventoryReply found = service.formatReply(
                List.of(ticket("579361", 1L, "Bạc Liêu")),
                "57",
                true,
                "prefix"
        );
        ChatTicketInventoryService.TicketInventoryReply empty = service.formatReply(
                List.of(),
                "57",
                true,
                "prefix"
        );

        assertThat(found.displayContent()).contains("khớp đầu số 57");
        assertThat(found.displayContent()).doesNotContain("đuôi số");
        assertThat(empty.displayContent()).contains("chưa có vé khớp đầu số 57");
        assertThat(empty.displayContent()).contains("thử đầu số khác");
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
    void prependLeadingText_keepsFortuneDisplayWithoutInventoryCaption() {
        ChatTicketInventoryService.TicketInventoryReply inventory = service.formatReply(
                List.of(ticket("191919", 1L, "An Giang")),
                "09",
                true
        );

        ChatTicketInventoryService.TicketInventoryReply reply =
                service.prependLeadingText("Theo sổ mơ dân gian, giấc mơ về \"bò\".", inventory);

        assertThat(reply.displayContent()).isEqualTo("Theo sổ mơ dân gian, giấc mơ về \"bò\".");
        assertThat(reply.displayContent()).doesNotContain("Gợi ý");
        assertThat(reply.displayContent()).doesNotContain("tìm thấy");
        assertThat(reply.content()).contains(ChatTicketInventoryService.TOKEN_PREFIX);
        assertThat(reply.content()).contains("191919");
    }

    @Test
    void appendInventoryBlock_appendsTokenAfterFortuneText() {
        String sellable = defaultSellableDate();
        when(lotteryTicketServicePort.getPublicTickets(
                eq(1), eq(40), isNull(), isNull(), eq(sellable), isNull(), eq("numbers"), eq("asc")
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
        return pageOf(tickets, true);
    }

    private static PageResponse<LotteryTicketResponse> pageOf(
            List<LotteryTicketResponse> tickets,
            boolean last
    ) {
        return PageResponse.<LotteryTicketResponse>builder()
                .recordList(tickets)
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(tickets.size())
                        .totalPages(last ? 1 : 2)
                        .currentPage(1)
                        .limit(Math.max(tickets.size(), 1))
                        .isFirst(true)
                        .isLast(last)
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
