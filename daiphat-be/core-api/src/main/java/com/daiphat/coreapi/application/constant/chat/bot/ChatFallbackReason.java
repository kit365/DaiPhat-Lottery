package com.daiphat.coreapi.application.constant.chat.bot;

/**
 * Machine-readable reasons attached to classify / bot replies for telemetry and FE trust signals.
 */
public final class ChatFallbackReason {

    public static final String LOW_CONFIDENCE = "LOW_CONFIDENCE";
    public static final String UNKNOWN_INTENT = "UNKNOWN_INTENT";
    public static final String AI_UNAVAILABLE = "AI_UNAVAILABLE";
    public static final String AI_TIMEOUT = "AI_TIMEOUT";
    public static final String AI_ERROR = "AI_ERROR";
    public static final String REDIS_FLOW_DEGRADED = "REDIS_FLOW_DEGRADED";
    public static final String MISSING_DATA = "MISSING_DATA";
    public static final String PYTHON_REJECTED_LOW_CONFIDENCE = "PYTHON_REJECTED_LOW_CONFIDENCE";

    private ChatFallbackReason() {
    }
}
