package com.daiphat.coreapi.application.dto.response.chat;

import lombok.Builder;

import java.util.List;

@Builder
public record StaffConversationContextResponse(
        PreviousStaffSessionBrief previousSession,
        String handoffSummary,
        List<StaffOpenWorkItem> openWork
) {
}
