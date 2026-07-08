package com.daiphat.coreapi.domain.model.chat;

import com.daiphat.coreapi.domain.model.enums.chat.AiIntentConfigKey;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiIntentConfigModel {

    private Long id;
    private Long aiServiceConfigId;
    private ChatIntent intent;
    private String description;
    private Boolean enabled;
    private Integer priority;
    private Boolean fallbackToHuman;
    private Map<String, Object> configJson;
    private Boolean active;
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

    public Optional<Double> findDouble(AiIntentConfigKey key) {
        if (key == null || configJson == null || configJson.isEmpty()) {
            return Optional.empty();
        }
        Object value = configJson.get(key.getJsonKey());
        if (value instanceof Number number) {
            return Optional.of(number.doubleValue());
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Optional.of(Double.parseDouble(text.trim()));
            } catch (NumberFormatException ignored) {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    public boolean hasKey(AiIntentConfigKey key) {
        return key != null
                && configJson != null
                && !configJson.isEmpty()
                && configJson.containsKey(key.getJsonKey());
    }
}
