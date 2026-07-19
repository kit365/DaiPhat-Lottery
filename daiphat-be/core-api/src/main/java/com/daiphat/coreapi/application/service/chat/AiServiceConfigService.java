package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.port.out.chat.AiServiceConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.chat.AiIntentConfigModel;
import com.daiphat.coreapi.domain.model.chat.AiServiceConfigModel;
import com.daiphat.coreapi.domain.model.enums.chat.AiIntentConfigKey;
import com.daiphat.coreapi.domain.model.enums.chat.AiServiceName;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class AiServiceConfigService implements AiServiceConfigPort {

    private static final Map<ChatIntent, List<AiIntentConfigKey>> REQUIRED_INTENT_KEYS = buildRequiredIntentKeys();

    private final AiServiceConfigRepositoryPort aiServiceConfigRepositoryPort;

    public AiServiceConfigService(AiServiceConfigRepositoryPort aiServiceConfigRepositoryPort) {
        this.aiServiceConfigRepositoryPort = aiServiceConfigRepositoryPort;
    }

    @PostConstruct
    void validateStartupConfig() {
        AiServiceConfigModel config = getRequiredChatbotConfig();
        requireSwitchIntentThreshold(config);
        REQUIRED_INTENT_KEYS.forEach((intent, keys) -> {
            AiIntentConfigModel intentConfig = getRequiredIntentConfig(config, intent);
            keys.forEach(key -> requireIntentDouble(intentConfig, key));
        });
    }

    @Override
    public AiServiceConfigModel getChatbotConfig() {
        return getRequiredChatbotConfig();
    }

    @Override
    public AiServiceConfigModel updateChatbotEnabled(boolean enabled) {
        return aiServiceConfigRepositoryPort.updateEnabled(AiServiceName.CHATBOT, enabled)
                .orElseThrow(() -> new DomainException(
                        ErrorCode.AI_SERVICE_CONFIG_NOT_FOUND,
                        "Không tìm thấy cấu hình AI active cho service CHATBOT."
                ));
    }

    @Override
    public boolean isChatbotEnabled() {
        return getRequiredChatbotConfig().isUsable();
    }

    @Override
    public boolean isIntentEnabled(ChatIntent intent) {
        return Boolean.TRUE.equals(getRequiredIntentConfig(intent).getEnabled());
    }

    @Override
    public boolean shouldFallbackToHuman(ChatIntent intent) {
        return Boolean.TRUE.equals(getRequiredIntentConfig(intent).getFallbackToHuman());
    }

    @Override
    public double switchIntentThreshold() {
        return requireSwitchIntentThreshold(getRequiredChatbotConfig());
    }

    @Override
    public double confidence(ChatIntent intent, AiIntentConfigKey key) {
        return requireIntentDouble(getRequiredIntentConfig(intent), key);
    }

    @Override
    public double stationFuzzyMatchThreshold() {
        return confidence(ChatIntent.WEB_SCHEDULE, AiIntentConfigKey.STATION_FUZZY_MATCH_THRESHOLD);
    }

    @Override
    public double stationFuzzyAmbiguityGap() {
        return confidence(ChatIntent.WEB_SCHEDULE, AiIntentConfigKey.STATION_FUZZY_AMBIGUITY_GAP);
    }

    private AiServiceConfigModel getRequiredChatbotConfig() {
        return aiServiceConfigRepositoryPort.findActiveByServiceName(AiServiceName.CHATBOT)
                .orElseThrow(() -> new DomainException(
                        ErrorCode.AI_SERVICE_CONFIG_NOT_FOUND,
                        "Không tìm thấy cấu hình AI active cho service CHATBOT."
                ));
    }

    private AiIntentConfigModel getRequiredIntentConfig(ChatIntent intent) {
        return getRequiredIntentConfig(getRequiredChatbotConfig(), intent);
    }

    private AiIntentConfigModel getRequiredIntentConfig(AiServiceConfigModel config, ChatIntent intent) {
        if (intent == null) {
            throw new DomainException(ErrorCode.AI_SERVICE_CONFIG_INVALID, "Intent cấu hình AI không được để trống.");
        }
        return config.findIntentConfig(intent)
                .orElseThrow(() -> new DomainException(
                        ErrorCode.AI_SERVICE_CONFIG_NOT_FOUND,
                        "Thiếu cấu hình AI cho intent " + intent.name() + "."
                ));
    }

    private double requireSwitchIntentThreshold(AiServiceConfigModel config) {
        Double value = config.getSwitchIntentThreshold();
        if (value == null) {
            throw new DomainException(
                    ErrorCode.AI_SERVICE_CONFIG_INVALID,
                    "Thiếu switchIntentThreshold trong cấu hình AI cho service CHATBOT."
            );
        }
        return value;
    }

    private double requireIntentDouble(AiIntentConfigModel config, AiIntentConfigKey key) {
        if (key == null) {
            throw new DomainException(ErrorCode.AI_SERVICE_CONFIG_INVALID, "Khóa cấu hình AI không được để trống.");
        }
        if (!config.hasKey(key)) {
            throw new DomainException(
                    ErrorCode.AI_SERVICE_CONFIG_NOT_FOUND,
                    "Thiếu khóa cấu hình AI " + key.name() + " cho intent " + config.getIntent().name() + "."
            );
        }
        return config.findDouble(key)
                .orElseThrow(() -> new DomainException(
                        ErrorCode.AI_SERVICE_CONFIG_INVALID,
                        "Giá trị cấu hình AI " + key.name() + " không hợp lệ cho intent " + config.getIntent().name() + "."
                ));
    }

    private static Map<ChatIntent, List<AiIntentConfigKey>> buildRequiredIntentKeys() {
        Map<ChatIntent, List<AiIntentConfigKey>> keys = new EnumMap<>(ChatIntent.class);
        keys.put(ChatIntent.ESCALATE_REQUEST, List.of(AiIntentConfigKey.DEFAULT_CONFIDENCE));
        keys.put(ChatIntent.WEB_ACCOUNT, List.of(AiIntentConfigKey.DEFAULT_CONFIDENCE));
        keys.put(ChatIntent.WEB_SCHEDULE, List.of(
                AiIntentConfigKey.SLOT_ANSWER_CONFIDENCE,
                AiIntentConfigKey.WITH_ENTITY_CONFIDENCE,
                AiIntentConfigKey.WITHOUT_ENTITY_CONFIDENCE,
                AiIntentConfigKey.STATION_FUZZY_MATCH_THRESHOLD,
                AiIntentConfigKey.STATION_FUZZY_AMBIGUITY_GAP
        ));
        keys.put(ChatIntent.WEB_RESULT, List.of(
                AiIntentConfigKey.WITH_TICKET_CONFIDENCE,
                AiIntentConfigKey.WITHOUT_TICKET_CONFIDENCE
        ));
        keys.put(ChatIntent.WEB_SEARCH, List.of(AiIntentConfigKey.DEFAULT_CONFIDENCE));
        keys.put(ChatIntent.WEB_SUGGEST, List.of(AiIntentConfigKey.DEFAULT_CONFIDENCE));
        keys.put(ChatIntent.OTHER_KNOWLEDGE, List.of(AiIntentConfigKey.DEFAULT_CONFIDENCE));
        keys.put(ChatIntent.TRASH_TALK, List.of(AiIntentConfigKey.DEFAULT_CONFIDENCE));
        keys.put(ChatIntent.UNKNOWN, List.of(AiIntentConfigKey.DEFAULT_CONFIDENCE));
        return Map.copyOf(keys);
    }
}
