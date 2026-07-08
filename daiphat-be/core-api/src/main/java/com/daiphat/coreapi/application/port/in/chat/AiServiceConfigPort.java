package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.domain.model.enums.chat.AiIntentConfigKey;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;

public interface AiServiceConfigPort {

    boolean isChatbotEnabled();

    boolean isIntentEnabled(ChatIntent intent);

    boolean shouldFallbackToHuman(ChatIntent intent);

    double switchIntentThreshold();

    double confidence(ChatIntent intent, AiIntentConfigKey key);

    double stationFuzzyMatchThreshold();

    double stationFuzzyAmbiguityGap();
}
