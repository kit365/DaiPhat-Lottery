package com.daiphat.coreapi.infrastructure.persistence.entity.user;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.auth.RoleEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.StreetAgentProfileEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(unique = true, length = 100)
    private String email;
    
    @Column(unique = true, length = 20)
    private String phone;

    @Column(name = "first_name", length = 50)
    private String firstName;

    @Column(name = "last_name", length = 50)
    private String lastName;

    @Column(name = "image_public_id", length = 255)
    private String imagePublicId;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(length = 20)
    private String gender;

    @Column
    private LocalDate dob;

    @Column(length = 20)
    private String zodiac;

    private String fortune;

    @Column
    private Integer age;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleEntity role;

    @Column(length = 20)
    private String status;

    @Column(name = "fcm_token", length = 255)
    private String fcmToken;

    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY)
    private StreetAgentProfileEntity streetAgentProfile;

    // Security & Compliance flags
    @Column(name = "is_email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "is_two_factor_enabled", nullable = false)
    @Builder.Default
    private boolean twoFactorEnabled = false;

    @Column(name = "agreed_to_terms", nullable = false)
    @Builder.Default
    private boolean agreedToTerms = false;

    @Column(name = "has_password", nullable = false)
    @Builder.Default
    private boolean hasPassword = false;

    @Column(name = "password")
    private String password;

    @Column(name = "auth_version", nullable = false)
    @Builder.Default
    private long authVersion = 0L;

    // Rate Limit & Account Locking
    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private Integer failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "last_failed_login_at")
    private LocalDateTime lastFailedLoginAt;
}
