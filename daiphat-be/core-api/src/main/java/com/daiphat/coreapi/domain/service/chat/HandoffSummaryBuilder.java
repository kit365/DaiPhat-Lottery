package com.daiphat.coreapi.domain.service.chat;

import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds a short Vietnamese handoff summary for staff from recent bot-session messages.
 * Machine UI tokens are mapped to human labels; raw schedule tokens are never shown.
 */
public final class HandoffSummaryBuilder {

    private static final int MAX_CUSTOMER_LINES = 3;
    private static final int MAX_BOT_LINES = 2;
    private static final int MAX_CONTENT_CHARS = 120;

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

        List<String> recentCustomer = takeLast(customerLines, MAX_CUSTOMER_LINES);
        List<String> recentBot = takeLast(botLines, MAX_BOT_LINES);

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
        String trimmed = content.trim();
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
        if (trimmed.startsWith("TICKET_") || trimmed.startsWith("ORDER_") || trimmed.startsWith("WEB_")) {
            return "Đã hiển thị thông tin hỗ trợ trên giao diện chatbot";
        }
        if (trimmed.length() > MAX_CONTENT_CHARS) {
            return trimmed.substring(0, MAX_CONTENT_CHARS - 1) + "…";
        }
        return trimmed;
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

    private static List<String> takeLast(List<String> source, int limit) {
        if (source == null || source.isEmpty() || limit <= 0) {
            return List.of();
        }
        int from = Math.max(0, source.size() - limit);
        return source.subList(from, source.size());
    }
}
