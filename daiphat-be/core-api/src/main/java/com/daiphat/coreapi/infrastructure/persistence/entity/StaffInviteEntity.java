package com.daiphat.coreapi.infrastructure.persistence.entity;

import com.daiphat.coreapi.domain.model.enums.InviteStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity lưu trữ thông tin lời mời nhân sự (Staff Invitations).
 */
@Entity
@Table(name = "staff_invites")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class StaffInviteEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private InviteStatus status = InviteStatus.PENDING;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(name = "invited_by_id")
    private UUID invitedById;

    @Column(name = "invited_at")
    private LocalDateTime invitedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
