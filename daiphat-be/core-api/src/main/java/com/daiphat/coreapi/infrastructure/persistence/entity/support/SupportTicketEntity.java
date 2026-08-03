package com.daiphat.coreapi.infrastructure.persistence.entity.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "support_tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupportTicketEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_category_id", nullable = false)
    private TicketCategoryEntity ticketCategory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private UserEntity customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private UserEntity assignedTo;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Column(name = "ref_id", length = 100)
    private String refId;

    @Enumerated(EnumType.STRING)
    @Column(name = "ref_type", length = 50)
    private TicketRefType refType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TicketStatus status;

    @Column(columnDefinition = "TEXT")
    private String response;

    @Column(name = "resolved_reason_id")
    private Long resolvedReasonId;

    @Column(name = "rejected_reason_id")
    private Long rejectedReasonId;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(name = "customer_last_viewed_at")
    private LocalDateTime customerLastViewedAt;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "last_modified_by")
    private String lastModifiedBy;

    public Long getTicketCategoryId() {
        return ticketCategory != null ? ticketCategory.getId() : null;
    }

    public UUID getCustomerId() {
        return customer != null ? customer.getId() : null;
    }

    public UUID getAssignedToId() {
        return assignedTo != null ? assignedTo.getId() : null;
    }
}
