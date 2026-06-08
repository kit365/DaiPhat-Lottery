package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.blog.BlogPostRepositoryPort;
import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.blog.BlogPostPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.blogs.BlogPostRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.BlogPostSpecification;
import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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
    public Optional<BlogPostModel> findPublishedBySlug(String slug) {
        return blogPostRepository.findBySlugAndStatusAndIsDeletedFalse(slug, PostStatus.PUBLISHED)
                .map(blogPostPersistenceMapper::toDomain);
    }

    @Override
    public List<BlogPostModel> findRelatedPublishedPosts(Long categoryId, Long excludedPostId, Pageable pageable) {
        return blogPostRepository.findByCategoryIdAndStatusAndIsDeletedFalseAndIdNot(
                        categoryId,
                        PostStatus.PUBLISHED,
                        excludedPostId,
                        pageable
                )
                .stream()
                .map(blogPostPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public boolean existsBySlug(String slug) {
        return blogPostRepository.existsBySlug(slug);
    }

    @Override
    public boolean existsBySlugAndIdNot(String slug, Long id) {
        return blogPostRepository.existsBySlugAndIdNot(slug, id);
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
    public boolean existsById(Long id) {
        return blogPostRepository.existsById(id);
    }

    @Override
    public void incrementViewCount(Long id) {
        blogPostRepository.incrementViewCount(id);
    }

    @Override
    @Transactional
    public void incrementViewCountBy(Long id, Integer increment) {
        blogPostRepository.incrementViewCountBy(id, increment);
    }

    @Override
    public void clearCategoryForPosts(List<Long> categoryIds) {
        var entities = blogPostRepository.findByCategoryIdIn(categoryIds);
        for (var entity : entities) {
            entity.setCategory(null);
        }
        blogPostRepository.saveAll(entities);
    }

    @Override
    public void removeTagFromPosts(Long tagId) {
        var entities = blogPostRepository.findByTagsId(tagId);
        for (var entity : entities) {
            entity.getTags().removeIf(tag -> tag.getId().equals(tagId));
        }
        blogPostRepository.saveAll(entities);
    }

    @Override
    public long countPublishedPostsByCategoryId(Long categoryId) {
        return blogPostRepository.countByCategoryIdAndStatusAndIsDeletedFalse(categoryId, PostStatus.PUBLISHED);
    }

    @Override
    public long countByStatus(String status) {
        PostStatus postStatus = PostStatus.fromCode(status);
        return blogPostRepository.countByStatusAndIsDeletedFalse(postStatus);
    }

    @Override
    public long countAll() {
        return blogPostRepository.countByIsDeletedFalse();
    }

    @Override
    @Transactional
    public int publishDueScheduledPosts(LocalDateTime now) {
        return blogPostRepository.publishDueScheduledPosts(
                PostStatus.SCHEDULED,
                PostStatus.PUBLISHED,
                now
        );
    }

    @Override
    public List<Long> findDueScheduledPostIds(LocalDateTime now) {
        return blogPostRepository.findDueScheduledPostIds(PostStatus.SCHEDULED, now);
    }
}
