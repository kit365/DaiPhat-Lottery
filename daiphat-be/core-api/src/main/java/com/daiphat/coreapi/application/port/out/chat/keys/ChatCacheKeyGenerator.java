package com.daiphat.coreapi.application.port.out.chat.keys;

public final class ChatCacheKeyGenerator {

    private static final String CHAT_PREFIX = "chat";
    private static final String FLOW_PREFIX = CHAT_PREFIX + ":flow";

    private ChatCacheKeyGenerator() {
    }

    public static String activeFlows(Long conversationId) {
        if (conversationId == null) {
            throw new IllegalArgumentException("conversationId is required");
        }
        return FLOW_PREFIX + ":" + conversationId;
    }
}
