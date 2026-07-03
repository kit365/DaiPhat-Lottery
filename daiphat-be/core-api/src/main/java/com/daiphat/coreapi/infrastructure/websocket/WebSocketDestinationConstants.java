package com.daiphat.coreapi.infrastructure.websocket;

public final class WebSocketDestinationConstants {

    private WebSocketDestinationConstants() {
    }

    public static final String APP_PREFIX = "/app";
    public static final String TOPIC_PREFIX = "/topic";
    public static final String QUEUE_PREFIX = "/queue";
    public static final String USER_PREFIX = "/user";

    public static final String CHAT_SEGMENT = "/chat";
    public static final String CONVERSATIONS_SEGMENT = "/conversations";
    public static final String SEND_SEGMENT = "/send";
    public static final String OVERRUN_ALERTS_SEGMENT = "/overrun-alerts";

    public static final String CHAT_SEND_MAPPING = CHAT_SEGMENT + SEND_SEGMENT;
    public static final String CHAT_INBOX_SEGMENT = "/inbox";
    public static final String CHAT_CONVERSATION_TOPIC_PREFIX =
            TOPIC_PREFIX + CHAT_SEGMENT + CONVERSATIONS_SEGMENT + "/";
    public static final String CHAT_OPERATORS_TOPIC =
            TOPIC_PREFIX + CHAT_SEGMENT + "/operators";
    public static final String USER_CHAT_INBOX_DESTINATION =
            QUEUE_PREFIX + CHAT_SEGMENT + CHAT_INBOX_SEGMENT;
    public static final String USER_CHAT_INBOX_QUEUE =
            USER_PREFIX + USER_CHAT_INBOX_DESTINATION;
    public static final String USER_OVERRUN_ALERTS_QUEUE =
            USER_PREFIX + QUEUE_PREFIX + OVERRUN_ALERTS_SEGMENT;

    public static String conversationTopic(Long conversationId) {
        return CHAT_CONVERSATION_TOPIC_PREFIX + conversationId;
    }
}
