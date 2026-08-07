package com.daiphat.coreapi.infrastructure.persistence.entity.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyMatchPosition;
import com.daiphat.coreapi.domain.model.enums.streetagent.LuckyPatternType;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "lucky_pattern_configs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class LuckyPatternConfigEntity extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Enumerated(EnumType.STRING) @Column(name = "pattern_type", nullable = false, length = 30)
    private LuckyPatternType patternType;
    @Column(name = "exact_numbers", columnDefinition = "TEXT")
    private String exactNumbers;
    @Column(name = "match_digits", length = 100)
    private String matchDigits;
    @Enumerated(EnumType.STRING) @Column(name = "match_position", length = 20)
    private LuckyMatchPosition matchPosition;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(name = "badge_label", nullable = false, length = 50)
    private String badgeLabel;
    @Column(name = "badge_color", length = 30)
    private String badgeColor;
    @Column(nullable = false)
    private Integer priority;
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
