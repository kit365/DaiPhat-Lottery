package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.out.blog.BlogPostRepositoryPort;
import com.daiphat.coreapi.application.port.out.blog.BlogViewCachePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class BlogViewSyncScheduler {

    private final BlogViewCachePort blogViewCachePort;
    private final BlogPostRepositoryPort blogPostRepositoryPort;

    @Scheduled(fixedRateString = "${daiphat.blog.view-sync-rate-ms:300000}")
    public void syncBlogViews() {
        log.info("Starting blog view count synchronization scheduler");
        Map<Long, Integer> viewsToSync = blogViewCachePort.getAndClearViewsToSync();

        if (viewsToSync.isEmpty()) {
            log.info("No blog view count increments to sync");
            return;
        }

        log.info("Syncing view counts for {} blog posts from Redis to Database", viewsToSync.size());

        for (Map.Entry<Long, Integer> entry : viewsToSync.entrySet()) {
            try {
                blogPostRepositoryPort.incrementViewCountBy(entry.getKey(), entry.getValue());
                log.debug("Successfully synced view count for blog post ID {}: +{}", entry.getKey(), entry.getValue());
            } catch (Exception e) {
                log.error("Failed to sync view count to database for blog post ID: {}", entry.getKey(), e);
            }
        }

        log.info("Completed blog view count synchronization");
    }
}
