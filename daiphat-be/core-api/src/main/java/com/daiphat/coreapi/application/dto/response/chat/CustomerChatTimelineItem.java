package com.daiphat.coreapi.application.dto.response.chat;

import lombok.Builder;

@Builder
public record CustomerChatTimelineItem(
        MessageResponse message,
        SessionBoundaryResponse sessionBoundary
) {
}
