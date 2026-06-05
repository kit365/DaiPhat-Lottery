package com.daiphat.coreapi.application.port.out.blog;

import java.util.Map;

public interface BlogViewCachePort {
    void incrementViewCount(Long id);
    boolean hasViewCount(Long id);
    Map<Long, Integer> getAndClearViewsToSync();
}
