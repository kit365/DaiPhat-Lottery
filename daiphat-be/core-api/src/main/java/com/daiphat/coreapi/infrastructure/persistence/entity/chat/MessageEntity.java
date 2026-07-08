package com.daiphat.coreapi.infrastructure.persistence.entity.chat;

import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "messages",
        indexes = {
                @Index(name = "idx_messages_conversation_id", columnList = "conversation_id"),
                @Index(name = "idx_messages_sender_id", columnList = "sender_id"),
                @Index(name = "idx_messages_parent_id", columnList = "parent_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MessageEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private ConversationEntity conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private MessageEntity parent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private UserEntity sender;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false, length = 30)
    private MessageSenderType senderType;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(length = 100)
    private String intent;

    @Column(precision = 5, scale = 4)
    private BigDecimal confidence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageType type;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "is_edited", nullable = false)
    @Builder.Default
    private boolean isEdited = false;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "reader_count", nullable = false)
    @Builder.Default
    private Integer readerCount = 0;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;
}
