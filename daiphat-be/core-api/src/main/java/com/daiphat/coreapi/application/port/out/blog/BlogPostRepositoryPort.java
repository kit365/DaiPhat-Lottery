package com.daiphat.coreapi.application.port.out.blog;

import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import java.util.Optional;

public interface BlogPostRepositoryPort {
    BlogPostModel save(BlogPostModel post);
    Optional<BlogPostModel> findById(Long id);
    boolean existsBySlug(String slug);
}
