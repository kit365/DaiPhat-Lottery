package com.daiphat.coreapi.infrastructure.persistence.entity.fortune;

import com.daiphat.coreapi.domain.model.enums.fortune.FiveElement;
import com.daiphat.coreapi.domain.model.enums.fortune.FortuneProseSource;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
        name = "fortune_casts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_fortune_casts_user_cast_date", columnNames = {"user_id", "cast_date"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FortuneCastEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "cast_date", nullable = false)
    private LocalDate castDate;

    @Column(name = "sellable_draw_date", nullable = false)
    private LocalDate sellableDrawDate;

    @Column(name = "birth_year", nullable = false)
    private Integer birthYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_element", nullable = false, length = 20)
    private FiveElement userElement;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_element", nullable = false, length = 20)
    private FiveElement dayElement;

    @Column(name = "primary_tail", nullable = false, length = 2)
    private String primaryTail;

    @Column(name = "final_tail", nullable = false, length = 2)
    private String finalTail;

    @Column(name = "fallback_used", nullable = false)
    @Builder.Default
    private boolean fallbackUsed = false;

    @Column(name = "fallback_reason", length = 255)
    private String fallbackReason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "score_snapshot", columnDefinition = "jsonb")
    private String scoreSnapshot;

    @Column(name = "prose", nullable = false, columnDefinition = "TEXT")
    private String prose;

    @Enumerated(EnumType.STRING)
    @Column(name = "prose_source", nullable = false, length = 20)
    private FortuneProseSource proseSource;
}
