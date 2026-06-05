package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.blog.BlogPostPublishQueuePort;
import com.daiphat.coreapi.application.port.out.blog.keys.BlogCacheKeyGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class RedisBlogPostPublishQueueAdapter implements BlogPostPublishQueuePort {

    private final RedisClient redisClient;
    private static final String QUEUE_KEY = BlogCacheKeyGenerator.scheduledPostsQueue();

    @Override
    public void schedulePost(Long id, LocalDateTime scheduledAt) {
        if (id == null || scheduledAt == null) return;
        long score = scheduledAt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        redisClient.zadd(QUEUE_KEY, id.toString(), (double) score);
        log.info("Scheduled blog post {} in Redis at {} (score: {})", id, scheduledAt, score);
    }

    @Override
    public void cancelScheduledPost(Long id) {
        if (id == null) return;
        redisClient.zrem(QUEUE_KEY, id.toString());
        log.info("Cancelled scheduling for blog post {} in Redis", id);
    }

    @Override
    public Set<Long> getDuePosts(LocalDateTime now) {
        if (now == null) return Collections.emptySet();
        long maxScore = now.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        Set<Object> members = redisClient.zrangeByScore(QUEUE_KEY, 0, (double) maxScore);
        if (members == null || members.isEmpty()) {
            return Collections.emptySet();
        }
        return members.stream()
                .map(obj -> Long.parseLong(obj.toString()))
                .collect(Collectors.toSet());
    }

    @Override
    public void removePosts(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) return;
        Object[] members = ids.stream().map(Object::toString).toArray();
        redisClient.zrem(QUEUE_KEY, members);
    }
}
