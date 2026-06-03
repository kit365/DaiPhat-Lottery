package com.daiphat.coreapi.domain.model;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.UserStatus;
import lombok.*;

import java.time.LocalDateTime;
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
    private String address;
    private String imagePublicId;
    private String imageUrl;
    private RoleModel role;
    private UserStatus status;
    private String zodiac;
    private String fortune;
    private Integer age;

    // Security & Compliance flags
    private boolean emailVerified;
    private boolean twoFactorEnabled;
    private boolean hasPassword;
    private boolean agreedToTerms;
    private String password;

    // Rate Limit & Account Locking
    @Builder.Default
    private Integer failedLoginAttempts = 0;
    private LocalDateTime lockedUntil;
    private LocalDateTime lastFailedLoginAt;

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
        this.password = null;
    }


    public void validateLoginEligibility() {
        if (this.status == UserStatus.PENDING && !this.emailVerified) {
            throw new DomainException(ErrorCode.USER_INACTIVE);
        }

        if (this.status == UserStatus.BANNED) {
            throw new DomainException(ErrorCode.USER_BANNED);
        }

        if (this.status == UserStatus.LOCKED) {
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

    public void updateIdentityId(UUID identityId) {
        this.id = identityId;
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

    public void setLocalPassword(String password) {
        if (password == null || password.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Password is required");
        }
        this.password = password;
        this.hasPassword = true;
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

    public void replaceAvatar(String publicId, String url) {
        this.imagePublicId = publicId;
        this.imageUrl = url;
    }

    public void clearAvatar() {
        this.imagePublicId = null;
        this.imageUrl = null;
    }

    public void onboardAdminCreatedUser() {
        this.status = UserStatus.PENDING;
        this.hasPassword = false;
        this.emailVerified = true;
        this.agreedToTerms = false;
    }
}
