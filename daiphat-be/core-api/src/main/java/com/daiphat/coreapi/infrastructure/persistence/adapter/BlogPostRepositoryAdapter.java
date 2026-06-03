package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.blog.BlogPostRepositoryPort;
import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.blog.BlogPostPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.BlogPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class BlogPostRepositoryAdapter implements BlogPostRepositoryPort {
    private final BlogPostRepository blogPostRepository;
    private final BlogPostPersistenceMapper blogPostPersistenceMapper;

    @Override
    public BlogPostModel save(BlogPostModel post) {
        var entity = blogPostPersistenceMapper.toEntity(post);
        var savedEntity = blogPostRepository.save(entity);
        return blogPostPersistenceMapper.toDomain(savedEntity);
    }

    @Override
    public Optional<BlogPostModel> findById(Long id) {
        return blogPostRepository.findById(id).map(blogPostPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsBySlug(String slug) {
        return blogPostRepository.existsBySlug(slug);
    }
}
