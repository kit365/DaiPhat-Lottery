package com.daiphat.coreapi.application.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình timeout/SLA hội thoại — giá trị mặc định tại {@code daiphat.chat.conversation.timeout} trong application.yml.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "daiphat.chat.conversation.timeout")
public class ChatConversationProperties {

    /** Chờ NV nhận (queue) — chỉ nhắc "chưa có NV", không tự đóng phiên. */
    private long waitingOperatorSeconds;

    /** Khách im sau khi staff/bot đã trả lời → tự đóng. */
    private long customerSilenceMinutes;

    /** Nhắc trước khi auto-close (phút 25 nếu silence = 30). */
    private long autoCloseWarningLeadMinutes;

    /** Khách nhắn mà staff chưa trả lời — chỉ cảnh báo SLA, không đóng. */
    private long staffResponseSlaMinutes;

    private long schedulerRateMs;
}
