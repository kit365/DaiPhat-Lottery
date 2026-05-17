package com.daiphat.accountservice.application.event;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StaffInviteEvent {
    private final String email;
    private final String fullName;
    private final String token;
    private final String roleName;
}
