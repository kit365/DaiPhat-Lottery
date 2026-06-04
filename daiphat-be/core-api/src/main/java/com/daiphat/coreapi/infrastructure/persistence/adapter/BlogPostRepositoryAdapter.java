package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.blog.BlogPostRepositoryPort;
import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.blog.BlogPostPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.BlogPostRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.BlogPostSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @Override
    public Page<BlogPostModel> findAll(
            Pageable pageable,
            String search,
            Long tagId,
            Long categoryId,
            String type,
            String status,
            boolean includeDeleted
    ) {
        var spec = BlogPostSpecification.filter(search, tagId, categoryId, type, status, includeDeleted);
        return blogPostRepository.findAll(spec, pageable)
                .map(blogPostPersistenceMapper::toDomain);
    }

    @Override
    public void incrementViewCount(Long id) {
        blogPostRepository.incrementViewCount(id);
    }
}

