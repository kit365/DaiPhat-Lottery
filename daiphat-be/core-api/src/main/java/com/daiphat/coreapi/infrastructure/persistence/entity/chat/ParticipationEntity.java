package com.daiphat.coreapi.infrastructure.persistence.entity.chat;

import com.daiphat.coreapi.domain.model.enums.chat.AssigneeType;
import com.daiphat.coreapi.domain.model.enums.chat.ParticipationRole;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "participations",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_participations_conversation_user_role",
                        columnNames = {"conversation_id", "user_id", "role"}
                )
        },
        indexes = {
                @Index(name = "idx_participations_conversation_id", columnList = "conversation_id"),
                @Index(name = "idx_participations_user_id", columnList = "user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ParticipationEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private ConversationEntity conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ParticipationRole role;

    @Column(name = "last_read_at")
    private LocalDateTime lastReadAt;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignee_type", length = 30)
    private AssigneeType assigneeType;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;
}
