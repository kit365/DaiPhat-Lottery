package com.daiphat.accountservice.domain.model;

import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
// Model chứa logic nghiệp vụ
public class UserModel {
    private UUID id;
    private String firstName;
    private String lastName;
    private String zodiac;
    private String fortune;
    private String username;
    private String email;
    private String password;
    private String phoneNumber;
    private Integer age;

    private RoleModel role;
    private String status;

    // Security & Compliance flags
    private boolean emailVerified;
    private boolean twoFactorEnabled;
    private boolean agreedToTerms;

    // Rate Limit & Account Locking
    @Builder.Default
    private Integer failedLoginAttempts = 0;
    private LocalDateTime lockedUntil;
    private LocalDateTime lastFailedLoginAt;

    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Relationships
    @Builder.Default
    private List<UserImageModel> images = new ArrayList<>();

    @Builder.Default
    private List<UserAddressModel> addresses = new ArrayList<>();

    public void banUser() {
        this.status = "BANNED";
    }

    public void initializeRegistration() {
        this.id = UUID.randomUUID();
        this.status = "ACTIVE";

        // Defaults for security
        this.emailVerified = false;
        this.twoFactorEnabled = false;
        this.failedLoginAttempts = 0;
    }

    /**
     * Mở khóa tài khoản (Unlock). Reset lại toàn bộ "vết đen" của user.
     */
    public void unlockAccount() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
        this.lastFailedLoginAt = null;
    }

    /**
     * Khóa tài khoản trong một khoảng thời gian nhất định (tính bằng phút).
     */
    public void lockAccount(int minutes) {
        this.lockedUntil = LocalDateTime.now().plusMinutes(minutes);
    }

    /**
     * Kiểm tra xem tài khoản có đang bị khóa không.
     */
    public boolean isAccountLocked() {
        return this.lockedUntil != null && this.lockedUntil.isAfter(LocalDateTime.now());
    }

    /**
     * Ghi nhận một lần đăng nhập thất bại.
     */
    public void recordFailedLogin() {
        this.failedLoginAttempts = (this.failedLoginAttempts == null ? 0 : this.failedLoginAttempts) + 1;
        this.lastFailedLoginAt = LocalDateTime.now();
    }

    /**
     * Cập nhật ID định danh từ Identity Provider (Keycloak).
     */
    public void updateKeycloakId(UUID keycloakId) {
        this.id = keycloakId;
    }
}
