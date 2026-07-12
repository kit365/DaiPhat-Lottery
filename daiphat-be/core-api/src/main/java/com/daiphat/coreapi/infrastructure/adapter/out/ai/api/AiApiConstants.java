package com.daiphat.coreapi.infrastructure.adapter.out.ai.api;

public final class AiApiConstants {

    private static final String CHAT = "/v1/chat";

    public static final String CLASSIFY_PATH = CHAT + "/classify";
    public static final String GENERATE_PATH = CHAT + "/generate";

    private AiApiConstants() {
    }
}
