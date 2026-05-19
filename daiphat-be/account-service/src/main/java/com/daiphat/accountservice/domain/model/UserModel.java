package com.daiphat.accountservice.domain.model;

import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
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
public class UserModel {
    private UUID id;
    private String firstName;
    private String lastName;
    private String username;
    private String email;
    private String phoneNumber;
    private RoleModel role;
    private UserStatus status;

    // Security & Compliance flags
    private boolean emailVerified;
    private boolean twoFactorEnabled;
    private boolean hasPassword;
    private boolean agreedToTerms;

    // Rate Limit & Account Locking
    @Builder.Default
    private Integer failedLoginAttempts = 0;
    private LocalDateTime lockedUntil;
    private LocalDateTime lastFailedLoginAt;

    // Relationships
    @Builder.Default
    private List<UserImageModel> images = new ArrayList<>();

    @Builder.Default
    private List<UserAddressModel> addresses = new ArrayList<>();

    public String getFullName() {
        String l = lastName != null ? lastName : "";
        String f = firstName != null ? firstName : "";
        String full = (l + " " + f).trim();
        return full.isEmpty() ? "User" : full;
    }

    /**
     * @deprecated Use setFirstName and setLastName directly. 
     * This method no longer attempts to split fullName to avoid swapping issues.
     */
    @Deprecated
    public void setFullName(String fullName) {
        // No-op to prevent fragile splitting logic from swapping names.
        // The application now uses explicit firstName and lastName fields.
    }

    public void banUser() {
        this.status = UserStatus.BANNED;
    }

    public void initializeRegistration() {
        this.status = UserStatus.PENDING;
        this.emailVerified = false;
        this.twoFactorEnabled = false;
        this.failedLoginAttempts = 0;
    }

    public void onboardSelfRegisteredUser(RoleModel defaultRole) {
        this.status = UserStatus.PENDING;
        this.emailVerified = false;
        this.role = defaultRole;
        this.hasPassword = true;
    }

    public void onboardOAuthUser(RoleModel role) {
        this.role = role;
        this.status = UserStatus.ACTIVE;
        this.emailVerified = true;
        this.hasPassword = false; // OAuth users use external auth
    }

    /**
     * Kiểm tra tư cách đăng nhập của User dựa trên trạng thái và bảo mật.
     * 
     * @throws DomainException nếu không đủ điều kiện.
     */
    public void validateLoginEligibility() {
        if (this.status == UserStatus.PENDING && !this.emailVerified) {
            throw new DomainException(ErrorCode.USER_INACTIVE);
        }

        if (this.status == UserStatus.BANNED) {
            throw new DomainException(ErrorCode.USER_BANNED);
        }

        if (this.status == UserStatus.LOCKED) {
            // Self-unlocking awareness will be handled by LoginAttemptService
            // to provide accurate remaining time formatting.
        } else if (this.status != UserStatus.ACTIVE && this.status != UserStatus.PENDING) {
            throw new DomainException(ErrorCode.USER_INACTIVE);
        }

        if (!this.emailVerified) {
            throw new DomainException(ErrorCode.EMAIL_NOT_VERIFIED);
        }
    }

    /**
     * Mở khóa tài khoản (Unlock). Reset lại toàn bộ "vết đen" của user.
     */
    public void unlockAccount() {
        this.status = UserStatus.ACTIVE;
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
        this.lastFailedLoginAt = null;
    }

    /**
     * Khóa tài khoản trong một khoảng thời gian nhất định (tính bằng phút).
     */
    public void lockAccount(long seconds) {
        this.status = UserStatus.LOCKED;
        this.lockedUntil = LocalDateTime.now().plusSeconds(seconds);
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

    public void activate() {
        this.status = UserStatus.ACTIVE;
        this.emailVerified = true;
    }

    public void markPasswordSet() {
        this.hasPassword = true;
    }

    public void forcePasswordChange() {
        this.hasPassword = false;
    }

    public void markEmailVerified() {
        this.emailVerified = true;
    }

    public void completeFirstTimeProfile(String phoneNumber, boolean agreedToTerms) {
        this.phoneNumber = phoneNumber;
        this.agreedToTerms = agreedToTerms;
        this.hasPassword = true;
        this.status = UserStatus.ACTIVE;
    }

    public void replaceCurrentAvatar(UserImageModel newImage) {
        if (this.images == null) {
            this.images = new ArrayList<>();
        }
        this.images.forEach(img -> img.setCurrent(false));
        newImage.setCurrent(true);
        this.images.add(newImage);
    }

    public void onboardAdminCreatedUser() {
        this.status = UserStatus.PENDING;
        this.hasPassword = false;
        this.emailVerified = true;
        this.agreedToTerms = false;
    }
}
