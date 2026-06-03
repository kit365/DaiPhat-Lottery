package com.daiphat.coreapi.application.event;

import lombok.Builder;

@Builder
public record StaffInviteEvent(
    String email,
    String fullName,
    String token,
    String roleName
) {}
