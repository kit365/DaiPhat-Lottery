package com.daiphat.coreapi.application.dto.response.chat;

import lombok.Builder;

import java.util.List;

@Builder
public record CustomerChatTimelineResponse(
        List<CustomerChatTimelineItem> items,
        boolean hasMore,
        String nextCursor
) {
}
