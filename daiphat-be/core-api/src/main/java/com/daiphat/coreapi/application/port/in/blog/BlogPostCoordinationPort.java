package com.daiphat.coreapi.application.port.in.blog;

import java.util.List;

public interface BlogPostCoordinationPort {
    void clearCategoryForPosts(List<Long> categoryIds);
    void removeTagFromPosts(Long tagId);
    long countPublishedPostsByCategoryId(Long categoryId);
}
