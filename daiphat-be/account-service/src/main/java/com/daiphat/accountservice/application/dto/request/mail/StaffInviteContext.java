package com.daiphat.accountservice.application.dto.request.mail;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StaffInviteContext {
    private final String fullName;
    private final String email;
    private final String token;
    private final String roleName;
    private final String inviteUrl;
}
