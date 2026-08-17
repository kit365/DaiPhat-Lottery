package com.daiphat.coreapi.application.dto.response.chat;

import lombok.Builder;

@Builder
public record StaffOpenWorkItem(
        String type,
        long count,
        String label
) {
}
