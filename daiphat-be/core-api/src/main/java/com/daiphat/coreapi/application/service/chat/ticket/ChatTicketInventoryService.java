package com.daiphat.coreapi.application.service.chat.ticket;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Queries available (IN_STOCK) lottery tickets from DB for chat replies.
 * Never invents ticket numbers — all suggestions come from {@link LotteryTicketServicePort#getPublicTickets}.
 * Machine replies use {@code TICKET_SUGGEST:[...]} tokens; FE renders rich cards + one-tap buy.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatTicketInventoryService {

    public static final String DRAW_DATE_TODAY = "today";
    public static final int DEFAULT_LIMIT = 5;
    public static final int FALLBACK_LIMIT = 3;
    public static final String TOKEN_PREFIX = "TICKET_SUGGEST:";

    private static final String SORT_BY_NUMBERS = "numbers";
    private static final String SORT_DIRECTION_ASC = "asc";

    private final LotteryTicketServicePort lotteryTicketServicePort;

    /**
     * Machine token in {@code content} (for FE cards) + short human {@code displayContent} (no raw URL).
     */
    public record TicketInventoryReply(String content, String displayContent) {
    }

    public List<LotteryTicketResponse> findAvailable(
            String search,
            Long stationId,
            String drawDate,
            int limit
    ) {
        int size = Math.max(1, Math.min(limit, 20));
        String resolvedDrawDate = (drawDate == null || drawDate.isBlank()) ? DRAW_DATE_TODAY : drawDate.trim();
        String resolvedSearch = (search == null || search.isBlank()) ? null : search.trim();

        try {
            PageResponse<LotteryTicketResponse> page = lotteryTicketServicePort.getPublicTickets(
                    1,
                    size,
                    stationId,
                    null,
                    resolvedDrawDate,
                    resolvedSearch,
                    SORT_BY_NUMBERS,
                    SORT_DIRECTION_ASC
            );
            if (page == null || page.getRecordList() == null) {
                return List.of();
            }
            return page.getRecordList();
        } catch (Exception ex) {
            log.warn("Failed to query public tickets for chat inventory search={}", resolvedSearch, ex);
            return List.of();
        }
    }

    /**
     * Build a token + short display reply listing only DB tickets.
     * When {@code primary} is empty and {@code search} was used, falls back to a few tickets for today.
     */
    public TicketInventoryReply formatReply(List<LotteryTicketResponse> primary, String search, boolean isSearch) {
        if (primary != null && !primary.isEmpty()) {
            String display = buildPrimaryDisplay(primary.size(), search, isSearch);
            return new TicketInventoryReply(withLeadingDisplay(display, toToken(primary)), display);
        }

        String emptyLead;
        if (isSearch && search != null && !search.isBlank()) {
            emptyLead = "Kho chưa có số bạn tìm (\"" + search.trim() + "\").";
        } else {
            emptyLead = "Hiện kho chưa có vé phù hợp để gợi ý.";
        }

        List<LotteryTicketResponse> fallback = findAvailable(null, null, DRAW_DATE_TODAY, FALLBACK_LIMIT);
        if (fallback.isEmpty()) {
            String display = emptyLead + " Bạn thử hỏi lại với đuôi số khác hoặc xem mục Mua vé trên website nhé.";
            return new TicketInventoryReply(display, display);
        }

        String display = emptyLead + " Đây là vài vé đang bán hôm nay:";
        return new TicketInventoryReply(withLeadingDisplay(display, toToken(fallback)), display);
    }

    public TicketInventoryReply appendInventoryBlock(String leadingReply) {
        List<LotteryTicketResponse> tickets = findAvailable(null, null, DRAW_DATE_TODAY, DEFAULT_LIMIT);
        if (tickets.isEmpty()) {
            String lead = leadingReply != null ? leadingReply.trim() : "";
            return new TicketInventoryReply(lead, lead);
        }

        String lead = leadingReply != null && !leadingReply.isBlank() ? leadingReply.trim() : "";
        String display = lead.isBlank()
                ? "Các vé đang bán trong kho hôm nay:"
                : lead + "\n\nCác vé đang bán trong kho hôm nay:";
        return new TicketInventoryReply(withLeadingDisplay(display, toToken(tickets)), display);
    }

    /**
     * Prepend fortune/advisory text to an inventory reply while keeping the FE ticket token intact.
     */
    public TicketInventoryReply prependLeadingText(String leadingText, TicketInventoryReply inventory) {
        String lead = leadingText != null ? leadingText.trim() : "";
        if (inventory == null) {
            return new TicketInventoryReply(lead, lead);
        }
        String bodyDisplay = inventory.displayContent() != null ? inventory.displayContent().trim() : "";
        String display = lead.isBlank() ? bodyDisplay : (bodyDisplay.isBlank() ? lead : lead + "\n\n" + bodyDisplay);

        String bodyContent = inventory.content() != null ? inventory.content() : "";
        int tokenIndex = bodyContent.indexOf(TOKEN_PREFIX);
        if (tokenIndex >= 0) {
            String token = bodyContent.substring(tokenIndex).trim();
            return new TicketInventoryReply(withLeadingDisplay(display, token), display);
        }
        return new TicketInventoryReply(display, display);
    }

    static String toToken(List<LotteryTicketResponse> tickets) {
        String jsonArray = tickets.stream()
                .map(ChatTicketInventoryService::toJsonObject)
                .collect(Collectors.joining(",", "[", "]"));
        return TOKEN_PREFIX + jsonArray;
    }

    private static String withLeadingDisplay(String display, String token) {
        if (display == null || display.isBlank()) {
            return token;
        }
        return display.trim() + "\n\n" + token;
    }

    private static String toJsonObject(LotteryTicketResponse ticket) {
        StringBuilder json = new StringBuilder("{");
        json.append("\"id\":").append(ticket.id() != null ? ticket.id() : "null");
        json.append(",\"numbers\":").append(jsonString(ticket.numbers()));
        json.append(",\"stationId\":").append(ticket.stationId() != null ? ticket.stationId() : "null");
        json.append(",\"stationName\":").append(jsonString(ticket.stationName()));
        json.append(",\"drawDate\":").append(jsonString(formatIsoDate(ticket.drawDate())));
        json.append(",\"price\":").append(ticket.priceSnapshot() != null ? ticket.priceSnapshot().toPlainString() : "null");
        json.append('}');
        return json.toString();
    }

    private static String buildPrimaryDisplay(int count, String search, boolean isSearch) {
        if (isSearch && search != null && !search.isBlank()) {
            return "Đại Phát tìm thấy " + count + " vé đang bán khớp \"" + search.trim() + "\":";
        }
        return "Đại Phát gợi ý " + count + " vé đang bán hôm nay.";
    }

    private static String formatIsoDate(LocalDate drawDate) {
        return drawDate != null ? drawDate.toString() : null;
    }

    private static String jsonString(String value) {
        if (value == null) {
            return "null";
        }
        String escaped = value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
        return "\"" + escaped + "\"";
    }
}
