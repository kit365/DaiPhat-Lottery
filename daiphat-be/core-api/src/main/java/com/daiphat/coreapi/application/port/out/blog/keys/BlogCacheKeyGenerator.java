package com.daiphat.coreapi.application.port.out.blog.keys;

public class BlogCacheKeyGenerator {
    private static final String BLOG_PREFIX = "blog";
    private static final String POST_PREFIX = BLOG_PREFIX + ":post";

    // View buffer keys
    public static String postViews() {
        return POST_PREFIX + ":views";
    }

    public static String postViewsSync() {
        return POST_PREFIX + ":views:sync";
    }

    // Queue key
    public static String scheduledPostsQueue() {
        return "scheduled_posts";
    }
}
