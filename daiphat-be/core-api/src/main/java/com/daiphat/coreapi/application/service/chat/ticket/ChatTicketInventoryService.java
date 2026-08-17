package com.daiphat.coreapi.application.service.chat.ticket;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
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

    /**
     * Sentinel for the default public sellable draw date (same rule as home / buy-ticket page).
     */
    public static final String DRAW_DATE_TODAY = "today";
    public static final int DEFAULT_LIMIT = 5;
    public static final int FALLBACK_LIMIT = 3;
    public static final String TOKEN_PREFIX = "TICKET_SUGGEST:";

    public static final String MATCH_SUFFIX = "suffix";
    public static final String MATCH_PREFIX = "prefix";
    public static final String MATCH_EXACT = "exact";

    static final int UPCOMING_DRAW_WINDOW_DAYS = 7;

    private static final String SORT_BY_NUMBERS = "numbers";
    private static final String SORT_DIRECTION_ASC = "asc";
    private static final int MATCH_PAGE_SIZE = 40;
    private static final int MATCH_MAX_PAGES = 5;
    private static final int SUGGEST_PAGE_SIZE = 40;
    private static final int SUGGEST_MAX_PAGES = 15;
    /** Candidate pool size before random pick — avoids always returning the lowest numbers. */
    private static final int SUGGEST_POOL_SIZE = 120;

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
        return findAvailable(search, stationId, drawDate, limit, null);
    }

    /**
     * Suggest tickets for chat, optionally skipping IDs already shown (e.g. "Gợi ý khác").
     * Picks randomly from a pool of sellable tickets. When every remaining ticket was
     * excluded, wraps around from a fresh pool.
     */
    public List<LotteryTicketResponse> findAvailable(
            String search,
            Long stationId,
            String drawDate,
            int limit,
            Collection<Long> excludeIds
    ) {
        int target = Math.max(1, Math.min(limit, 20));
        Set<Long> excluded = toExcludeSet(excludeIds);

        List<LotteryTicketResponse> picked = collectAvailable(search, stationId, drawDate, target, excluded);
        if (!picked.isEmpty() || excluded.isEmpty()) {
            return picked;
        }

        // All remaining tickets were already suggested — start a fresh cycle.
        return collectAvailable(search, stationId, drawDate, target, Set.of());
    }

    private List<LotteryTicketResponse> collectAvailable(
            String search,
            Long stationId,
            String drawDate,
            int target,
            Set<Long> excluded
    ) {
        String resolvedDrawDate = resolveDrawDateFilter(drawDate);
        String resolvedSearch = (search == null || search.isBlank()) ? null : search.trim();
        List<LotteryTicketResponse> pool = new ArrayList<>(Math.min(SUGGEST_POOL_SIZE, SUGGEST_PAGE_SIZE));

        try {
            for (int page = 1; page <= SUGGEST_MAX_PAGES && pool.size() < SUGGEST_POOL_SIZE; page++) {
                PageResponse<LotteryTicketResponse> response = lotteryTicketServicePort.getPublicTickets(
                        page,
                        SUGGEST_PAGE_SIZE,
                        stationId,
                        null,
                        resolvedDrawDate,
                        resolvedSearch,
                        SORT_BY_NUMBERS,
                        SORT_DIRECTION_ASC
                );
                List<LotteryTicketResponse> records = response != null ? response.getRecordList() : null;
                if (records == null || records.isEmpty()) {
                    break;
                }
                for (LotteryTicketResponse ticket : records) {
                    if (ticket == null) {
                        continue;
                    }
                    Long id = ticket.id();
                    if (id != null && excluded.contains(id)) {
                        continue;
                    }
                    pool.add(ticket);
                    if (pool.size() >= SUGGEST_POOL_SIZE) {
                        break;
                    }
                }
                if (response.getPagination() != null && response.getPagination().isLast()) {
                    break;
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to query public tickets for chat inventory search={}", resolvedSearch, ex);
            return List.of();
        }

        if (pool.isEmpty()) {
            return List.of();
        }
        Collections.shuffle(pool, ThreadLocalRandom.current());
        return pool.size() <= target ? List.copyOf(pool) : List.copyOf(pool.subList(0, target));
    }

    private static Set<Long> toExcludeSet(Collection<Long> excludeIds) {
        if (excludeIds == null || excludeIds.isEmpty()) {
            return Set.of();
        }
        Set<Long> excluded = new HashSet<>();
        for (Long id : excludeIds) {
            if (id != null) {
                excluded.add(id);
            }
        }
        return excluded;
    }

    /**
     * Public search uses SQL {@code LIKE %fragment%}. This method pages through results and keeps only
     * tickets that truly match suffix/prefix/exact until {@code limit} is reached.
     */
    public List<LotteryTicketResponse> findAvailableMatching(
            String search,
            Long stationId,
            String drawDate,
            int limit,
            String matchMode
    ) {
        int target = Math.max(1, Math.min(limit, 20));
        if (search == null || search.isBlank()) {
            return findAvailable(null, stationId, drawDate, target);
        }

        String fragment = search.trim();
        String mode = normalizeMatchMode(matchMode, fragment);
        String resolvedDrawDate = resolveDrawDateFilter(drawDate);
        Map<Long, LotteryTicketResponse> matched = new LinkedHashMap<>();

        try {
            for (int page = 1; page <= MATCH_MAX_PAGES && matched.size() < target; page++) {
                PageResponse<LotteryTicketResponse> response = lotteryTicketServicePort.getPublicTickets(
                        page,
                        MATCH_PAGE_SIZE,
                        stationId,
                        null,
                        resolvedDrawDate,
                        fragment,
                        SORT_BY_NUMBERS,
                        SORT_DIRECTION_ASC
                );
                List<LotteryTicketResponse> records = response != null ? response.getRecordList() : null;
                if (records == null || records.isEmpty()) {
                    break;
                }
                for (LotteryTicketResponse ticket : records) {
                    if (ticket == null || ticket.numbers() == null || !matchesFragment(ticket.numbers(), fragment, mode)) {
                        continue;
                    }
                    Long id = ticket.id();
                    if (id != null) {
                        matched.putIfAbsent(id, ticket);
                    } else {
                        matched.put((long) matched.size(), ticket);
                    }
                    if (matched.size() >= target) {
                        break;
                    }
                }
                if (response.getPagination() != null && response.getPagination().isLast()) {
                    break;
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to query matching tickets for chat inventory search={}", fragment, ex);
            return List.of();
        }

        return matched.values().stream().limit(target).toList();
    }

    /**
     * Build a token + short display reply listing only DB tickets.
     * Empty đuôi/đầu search must not show unrelated fallback tickets — that misleads the customer.
     */
    public TicketInventoryReply formatReply(List<LotteryTicketResponse> primary, String search, boolean isSearch) {
        return formatReply(primary, search, isSearch, null, false);
    }

    public TicketInventoryReply formatReply(
            List<LotteryTicketResponse> primary,
            String search,
            boolean isSearch,
            String matchMode
    ) {
        return formatReply(primary, search, isSearch, matchMode, false);
    }

    public TicketInventoryReply formatReply(
            List<LotteryTicketResponse> primary,
            String search,
            boolean isSearch,
            String matchMode,
            boolean suggestAgain
    ) {
        String mode = normalizeMatchMode(matchMode, search);
        String matchLabel = matchLabel(mode);

        if (primary != null && !primary.isEmpty()) {
            String display = buildPrimaryDisplay(primary.size(), search, isSearch, matchLabel, suggestAgain);
            return new TicketInventoryReply(withLeadingDisplay(display, toToken(primary)), display);
        }

        if (isSearch && search != null && !search.isBlank()) {
            String display = "Hiện Đại Phát chưa có vé khớp " + matchLabel + " " + search.trim()
                    + ". Quý khách có thể thử " + matchLabel + " khác, xem mục Mua vé, hoặc quay lại sau nhé.";
            return new TicketInventoryReply(display, display);
        }

        String emptyLead = "Hiện Đại Phát chưa có vé phù hợp để gợi ý.";
        List<LotteryTicketResponse> fallback = findAvailable(null, null, DRAW_DATE_TODAY, FALLBACK_LIMIT);
        if (fallback.isEmpty()) {
            String display = emptyLead
                    + " Quý khách có thể thử đuôi số khác, xem mục Mua vé, hoặc quay lại sau nhé.";
            return new TicketInventoryReply(display, display);
        }

        String display = emptyLead + " Trong lúc đó, dưới đây là vài vé đang bán cho kỳ quay sắp tới dành cho quý khách:";
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
                ? "Dưới đây là vài vé đang bán cho kỳ quay sắp tới dành cho quý khách:"
                : lead + "\n\nDưới đây là vài vé đang bán cho kỳ quay sắp tới dành cho quý khách:";
        return new TicketInventoryReply(withLeadingDisplay(display, toToken(tickets)), display);
    }

    /**
     * Prepend fortune/advisory text to an inventory reply while keeping the FE ticket token intact.
     * When leading text is present, it becomes the only human display line — inventory captions
     * like "Gợi ý N vé..." are omitted so the UI shows reply bubble then ticket cards only.
     */
    public TicketInventoryReply prependLeadingText(String leadingText, TicketInventoryReply inventory) {
        String lead = leadingText != null ? leadingText.trim() : "";
        if (inventory == null) {
            return new TicketInventoryReply(lead, lead);
        }
        String bodyDisplay = inventory.displayContent() != null ? inventory.displayContent().trim() : "";
        String display = lead.isBlank() ? bodyDisplay : lead;

        String bodyContent = inventory.content() != null ? inventory.content() : "";
        int tokenIndex = bodyContent.indexOf(TOKEN_PREFIX);
        if (tokenIndex >= 0) {
            String token = bodyContent.substring(tokenIndex).trim();
            return new TicketInventoryReply(withLeadingDisplay(display, token), display);
        }
        return new TicketInventoryReply(display, display);
    }

    static String resolveDrawDateFilter(String drawDate) {
        if (drawDate == null || drawDate.isBlank() || DRAW_DATE_TODAY.equalsIgnoreCase(drawDate.trim())) {
            return DrawScheduleUtils.resolveDefaultSellableDrawDate().toString();
        }
        if ("tomorrow".equalsIgnoreCase(drawDate.trim())) {
            return DrawScheduleUtils.today().plusDays(1).toString();
        }
        return drawDate.trim();
    }

    public static boolean matchesFragment(String numbers, String fragment, String mode) {
        if (numbers == null || fragment == null) {
            return false;
        }
        return switch (normalizeMatchMode(mode, fragment)) {
            case MATCH_PREFIX -> numbers.startsWith(fragment);
            case MATCH_EXACT -> numbers.equals(fragment);
            default -> numbers.endsWith(fragment);
        };
    }

    public static String normalizeMatchMode(String matchMode, String fragment) {
        if (matchMode != null && !matchMode.isBlank()) {
            return matchMode.trim().toLowerCase(Locale.ROOT);
        }
        if (fragment != null && fragment.trim().length() >= 6) {
            return MATCH_EXACT;
        }
        return MATCH_SUFFIX;
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
        json.append(",\"quantity\":").append(ticket.quantity() != null ? ticket.quantity() : 0);
        json.append('}');
        return json.toString();
    }

    private static String buildPrimaryDisplay(
            int count,
            String search,
            boolean isSearch,
            String matchLabel,
            boolean suggestAgain
    ) {
        if (isSearch && search != null && !search.isBlank()) {
            return "Dưới đây là " + count + " vé đang bán khớp " + matchLabel + " " + search.trim()
                    + " dành cho quý khách:";
        }
        if (suggestAgain) {
            return "Dưới đây là " + count + " vé khác đang bán cho kỳ quay sắp tới dành cho quý khách:";
        }
        return "Dưới đây là " + count + " vé đang bán cho kỳ quay sắp tới dành cho quý khách:";
    }

    static String matchLabel(String matchMode) {
        return switch (normalizeMatchMode(matchMode, null)) {
            case MATCH_PREFIX -> "đầu số";
            case MATCH_EXACT -> "số";
            default -> "đuôi số";
        };
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
