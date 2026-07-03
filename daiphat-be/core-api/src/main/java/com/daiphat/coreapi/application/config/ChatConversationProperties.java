package com.daiphat.coreapi.application.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "daiphat.chat.conversation.timeout")
public class ChatConversationProperties {

    /** Chờ NV nhận (queue) — chỉ nhắc "chưa có NV", không tự đóng phiên. */
    private long waitingOperatorSeconds = 86400;

    /** Khách im sau khi staff/bot đã trả lời → tự đóng. */
    private long customerSilenceMinutes = 30;

    /** Nhắc trước khi auto-close (phút 25 nếu silence = 30). */
    private long autoCloseWarningLeadMinutes = 5;

    /** Khách nhắn mà staff chưa trả lời — chỉ cảnh báo SLA, không đóng. */
    private long staffResponseSlaMinutes = 15;

    private long schedulerRateMs = 10000;
}
