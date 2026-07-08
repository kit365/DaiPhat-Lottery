package com.daiphat.coreapi.infrastructure.persistence.entity.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationCloseReason;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.LastMessageFrom;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ConversationEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ConversationStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private UserEntity customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_operator_id")
    private UserEntity assignedOperator;

    @Column(name = "customer_last_read_at")
    private LocalDateTime customerLastReadAt;

    @Column(name = "operator_last_read_at")
    private LocalDateTime operatorLastReadAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_message_from", length = 20)
    private LastMessageFrom lastMessageFrom;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;

    @Column(name = "closed_by")
    private UUID closedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "close_reason", length = 30)
    private ConversationCloseReason closeReason;

    @Column(name = "auto_close_warning_sent_at")
    private LocalDateTime autoCloseWarningSentAt;

    @Column(name = "last_assigned_operator_id")
    private UUID lastAssignedOperatorId;
}
