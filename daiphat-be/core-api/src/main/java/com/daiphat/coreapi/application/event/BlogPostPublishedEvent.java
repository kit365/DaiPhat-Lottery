package com.daiphat.coreapi.application.event;

import lombok.Builder;

@Builder
public record BlogPostPublishedEvent(
        Long postId,
        String title
) {
}
