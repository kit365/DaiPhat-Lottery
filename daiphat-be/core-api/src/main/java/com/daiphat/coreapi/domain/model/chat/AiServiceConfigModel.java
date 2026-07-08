package com.daiphat.coreapi.domain.model.chat;

import com.daiphat.coreapi.domain.model.enums.chat.AiIntentConfigKey;
import com.daiphat.coreapi.domain.model.enums.chat.AiServiceName;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiServiceConfigModel {

    private Long id;
    private AiServiceName serviceName;
    private String description;
    private Boolean enabled;
    private Double switchIntentThreshold;
    private Boolean active;

    @Builder.Default
    private List<AiIntentConfigModel> intentConfigs = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public boolean isUsable() {
        return Boolean.TRUE.equals(active)
                && Boolean.TRUE.equals(enabled)
                && deletedAt == null;
    }

    public Optional<AiIntentConfigModel> findIntentConfig(ChatIntent intent) {
        if (intent == null || intentConfigs == null || intentConfigs.isEmpty()) {
            return Optional.empty();
        }
        return intentConfigs.stream()
                .filter(AiIntentConfigModel::isUsable)
                .filter(config -> config.getIntent() == intent)
                .min(Comparator.comparing(
                        AiIntentConfigModel::getPriority,
                        Comparator.nullsLast(Integer::compareTo)
                ));
    }

    public Optional<Double> findIntentDouble(ChatIntent intent, AiIntentConfigKey key) {
        return findIntentConfig(intent)
                .flatMap(config -> config.findDouble(key));
    }
}
