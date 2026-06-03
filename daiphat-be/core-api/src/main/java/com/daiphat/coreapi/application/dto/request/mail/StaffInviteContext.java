package com.daiphat.coreapi.application.dto.request.mail;

import lombok.Builder;

@Builder
public record StaffInviteContext(
    String email,
    String fullName,
    String token,
    String roleName
) {}
