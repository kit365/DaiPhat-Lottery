package com.daiphat.coreapi.application.port.out.blog;

import java.time.LocalDateTime;
import java.util.Set;

public interface BlogPostPublishQueuePort {
    void schedulePost(Long id, LocalDateTime scheduledAt);
    void cancelScheduledPost(Long id);
    Set<Long> getDuePosts(LocalDateTime now);
    void removePosts(Set<Long> ids);
}
