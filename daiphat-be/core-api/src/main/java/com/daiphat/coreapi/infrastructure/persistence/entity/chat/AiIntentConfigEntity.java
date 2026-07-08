package com.daiphat.coreapi.infrastructure.persistence.entity.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.LinkedHashMap;
import java.util.Map;

@Entity
@Table(
        name = "ai_intent_configs",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_ai_intent_configs_service_intent",
                        columnNames = {"ai_service_config_id", "intent"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AiIntentConfigEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_service_config_id", nullable = false)
    private AiServiceConfigEntity aiServiceConfig;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ChatIntent intent;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private Boolean enabled;

    @Column(nullable = false)
    private Integer priority;

    @Column(name = "fallback_to_human", nullable = false)
    private Boolean fallbackToHuman;

    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    @Column(name = "config_json", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> configJson = new LinkedHashMap<>();

    @Column(nullable = false)
    private Boolean active;
}
