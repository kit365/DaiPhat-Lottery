package com.daiphat.accountservice.application.dto.response.user;

import com.daiphat.accountservice.application.dto.response.auth.RoleResponse;
import com.daiphat.accountservice.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Builder
public record UserResponse(
        @JsonView(Views.Public.class) UUID id,

        @JsonView(Views.Public.class) String username,

        @JsonView(Views.Public.class) String email,

        @JsonView(Views.Me.class) String firstName,

        @JsonView(Views.Me.class) String lastName,

        @JsonView(Views.Public.class) String fullName,

        @JsonView({
                Views.Me.class, Views.Admin.class }) String phone,

        @JsonView(Views.Public.class) String avatarUrl,

        @JsonView(Views.Public.class) RoleResponse role,

        @JsonView(Views.Me.class) Set<String> permissions,

        @JsonView(Views.Admin.class) String status,

        @JsonView({ Views.Me.class, Views.Admin.class }) boolean hasPassword,

        @JsonView({ Views.Me.class, Views.Admin.class }) boolean agreedToTerms,

        @JsonView({ Views.Me.class, Views.Admin.class }) boolean emailVerified,

        @JsonView({ Views.Me.class, Views.Admin.class }) boolean twoFactorEnabled,

        // Fortune/Profile info
        @JsonView(Views.Public.class) String zodiac,

        @JsonView(Views.Public.class) String fortune,

        @JsonView(Views.Public.class) Integer age,

        // Lockout info - Admin only
        @JsonView(Views.Admin.class) Integer failedLoginAttempts,

        @JsonView(Views.Admin.class) LocalDateTime lockedUntil,

        // Nested Relationships
        @JsonView(Views.Me.class) List<UserImageResponse> images,

        @JsonView(Views.Me.class) List<UserAddressResponse> addresses,

        @JsonView(Views.Public.class) LocalDateTime createdAt,

        @JsonView(Views.Public.class) LocalDateTime updatedAt) {
}
