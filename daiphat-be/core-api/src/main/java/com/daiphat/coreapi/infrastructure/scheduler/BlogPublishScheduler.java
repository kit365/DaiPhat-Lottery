package com.daiphat.coreapi.infrastructure.scheduler;

import com.daiphat.coreapi.application.port.in.blog.BlogPostServicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BlogPublishScheduler {

    private final BlogPostServicePort blogPostServicePort;

    @Scheduled(fixedRateString = "${daiphat.blog.schedule-publish-rate-ms}")
    public void publishScheduledPosts() {
        int publishedCount = blogPostServicePort.publishDueScheduledPosts();
        if (publishedCount > 0) {
            log.info("Published {} scheduled blog posts", publishedCount);
        } else {
            log.debug("No scheduled blog posts due for publishing");
        }
    }
}
