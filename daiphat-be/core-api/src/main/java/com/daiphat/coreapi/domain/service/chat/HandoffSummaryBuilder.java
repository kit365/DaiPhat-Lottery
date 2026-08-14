package com.daiphat.coreapi.domain.service.chat;

import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Builds a short Vietnamese handoff summary for staff from recent bot-session messages.
 * Machine UI tokens are mapped to human labels; raw schedule/ticket tokens are never shown.
 */
public final class HandoffSummaryBuilder {

    private static final int MAX_CUSTOMER_LINES = 3;
    private static final int MAX_BOT_LINES = 2;
    private static final int MAX_CONTENT_CHARS = 120;
    private static final Pattern EXCLUDE_PARAM = Pattern.compile(
            "(?i)\\|\\s*exclude=[0-9,\\s]+"
    );
    private static final Pattern TICKET_SUGGEST_TOKEN = Pattern.compile(
            "TICKET_SUGGEST:\\s*\\[",
            Pattern.CASE_INSENSITIVE
    );

    private HandoffSummaryBuilder() {
    }

    public static String build(List<MessageModel> messages, EscalationReason reason) {
        List<String> customerLines = new ArrayList<>();
        List<String> botLines = new ArrayList<>();

        if (messages != null) {
            for (MessageModel message : messages) {
                if (message == null || message.getType() == MessageType.SYSTEM) {
                    continue;
                }
                String display = toStaffReadableContent(message.getContent());
                if (display == null) {
                    continue;
                }
                if (message.getSenderType() == MessageSenderType.CUSTOMER) {
                    customerLines.add(display);
                } else if (message.getSenderType() == MessageSenderType.AI_SYSTEM) {
                    botLines.add(display);
                }
            }
        }

        List<String> recentCustomer = takeLast(collapseConsecutiveDuplicates(customerLines), MAX_CUSTOMER_LINES);
        List<String> recentBot = takeLast(collapseConsecutiveDuplicates(botLines), MAX_BOT_LINES);

        StringBuilder summary = new StringBuilder();
        summary.append("Lý do chuyển: ").append(reasonLabel(reason)).append('\n');

        if (recentCustomer.isEmpty() && recentBot.isEmpty()) {
            summary.append("Khách yêu cầu gặp nhân viên. Chưa có nội dung chat AI đáng chú ý trước đó.");
            return summary.toString().trim();
        }

        if (!recentCustomer.isEmpty()) {
            summary.append("Khách đang hỏi / cung cấp:\n");
            for (String line : recentCustomer) {
                summary.append("- ").append(line).append('\n');
            }
        }
        if (!recentBot.isEmpty()) {
            summary.append("AI đã hỗ trợ:\n");
            for (String line : recentBot) {
                summary.append("- ").append(line).append('\n');
            }
        }
        return summary.toString().trim();
    }

    public static String toStaffReadableContent(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }
        String trimmed = stripInternalParams(content.trim());
        if (trimmed.isBlank()) {
            return null;
        }
        if (trimmed.startsWith("SCHEDULE_STATION_BUNDLE:")) {
            return "Đã hiển thị lịch quay + kết quả đài theo yêu cầu";
        }
        if (trimmed.startsWith("SCHEDULE_RESULT") || trimmed.startsWith("SCHEDULE_RESULT_SUMMARY:")) {
            return "Đã hiển thị kết quả xổ số";
        }
        if (trimmed.startsWith("SCHEDULE_SHOW:") || trimmed.startsWith("SCHEDULE_STATION_READY:")) {
            return "Đã hiển thị lịch quay xổ số";
        }
        if (trimmed.startsWith("SCHEDULE_")) {
            return "Đang hỗ trợ tra cứu lịch / kết quả xổ số";
        }
        if (TICKET_SUGGEST_TOKEN.matcher(trimmed).find()
                || trimmed.startsWith("TICKET_")
                || trimmed.startsWith("ORDER_")
                || trimmed.startsWith("WEB_")) {
            return summarizeTicketSuggest(trimmed);
        }
        if (isSuggestTicketsAsk(trimmed)) {
            return "Hỏi gợi ý vé số";
        }
        if (trimmed.length() > MAX_CONTENT_CHARS) {
            return trimmed.substring(0, MAX_CONTENT_CHARS - 1) + "…";
        }
        return trimmed;
    }

    /** Removes internal FE/BE control params that must not appear in staff-facing text. */
    public static String stripInternalParams(String content) {
        if (content == null || content.isBlank()) {
            return "";
        }
        return EXCLUDE_PARAM.matcher(content).replaceAll("").trim();
    }

    private static String summarizeTicketSuggest(String content) {
        int ticketCount = countTicketSuggestItems(content);
        if (ticketCount > 0) {
            return "Đã gợi ý " + ticketCount + " vé số đang bán";
        }
        if (content.toLowerCase(Locale.ROOT).contains("chưa có vé")) {
            return "Chưa tìm thấy vé phù hợp để gợi ý";
        }
        return "Đã gợi ý vé số đang bán";
    }

    private static int countTicketSuggestItems(String content) {
        Matcher matcher = TICKET_SUGGEST_TOKEN.matcher(content);
        if (!matcher.find()) {
            return 0;
        }
        int start = matcher.end() - 1; // at '['
        int depth = 0;
        for (int i = start; i < content.length(); i++) {
            char c = content.charAt(i);
            if (c == '[') {
                depth++;
            } else if (c == ']') {
                depth--;
                if (depth == 0) {
                    String jsonArray = content.substring(start, i + 1);
                    return (int) jsonArray.chars().filter(ch -> ch == '{').count();
                }
            }
        }
        return 0;
    }

    private static boolean isSuggestTicketsAsk(String content) {
        String normalized = content.toLowerCase(Locale.ROOT).trim();
        return normalized.equals("gợi ý vé số cho tôi")
                || normalized.equals("gợi ý vé")
                || normalized.startsWith("gợi ý vé số");
    }

    private static String reasonLabel(EscalationReason reason) {
        if (reason == null) {
            return "Khách yêu cầu gặp nhân viên";
        }
        return switch (reason) {
            case CUSTOMER_REQUEST -> "Khách yêu cầu gặp nhân viên";
            case BOT_LOW_CONFIDENCE -> "AI chưa chắc chắn câu trả lời";
            case AI_SERVICE_UNAVAILABLE -> "AI tạm thời không khả dụng";
            case AI_DISABLED -> "AI đang tắt";
            case STAFF_MANUAL -> "Nhân viên chủ động nhận / chuyển";
        };
    }

    private static List<String> collapseConsecutiveDuplicates(List<String> source) {
        if (source == null || source.isEmpty()) {
            return List.of();
        }
        List<String> collapsed = new ArrayList<>();
        String current = null;
        int count = 0;
        for (String line : source) {
            if (line == null || line.isBlank()) {
                continue;
            }
            if (current != null && current.equals(line)) {
                count++;
                continue;
            }
            if (current != null) {
                collapsed.add(formatCountedLine(current, count));
            }
            current = line;
            count = 1;
        }
        if (current != null) {
            collapsed.add(formatCountedLine(current, count));
        }
        return collapsed;
    }

    private static String formatCountedLine(String line, int count) {
        if (count <= 1) {
            return line;
        }
        return line + " (" + count + " lần)";
    }

    private static List<String> takeLast(List<String> source, int limit) {
        if (source == null || source.isEmpty() || limit <= 0) {
            return List.of();
        }
        int from = Math.max(0, source.size() - limit);
        return source.subList(from, source.size());
    }
}
