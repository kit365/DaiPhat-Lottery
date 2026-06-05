package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.blog.BlogCategoryRepositoryPort;
import com.daiphat.coreapi.domain.model.blogs.BlogCategoryModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogCategoryEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.blog.BlogCategoryPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.BlogCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class BlogCategoryRepositoryAdapter implements BlogCategoryRepositoryPort {
    private final BlogCategoryRepository blogCategoryRepository;
    private final BlogCategoryPersistenceMapper blogCategoryPersistenceMapper;

    @Override
    public Optional<BlogCategoryModel> findById(Long id) {
        return blogCategoryRepository.findById(id).map(blogCategoryPersistenceMapper::toDomain);
    }

    @Override
    public BlogCategoryModel save(BlogCategoryModel category) {
        var entity = blogCategoryPersistenceMapper.toEntity(category);
        return blogCategoryPersistenceMapper.toDomain(blogCategoryRepository.save(entity));
    }

    @Override
    public Page<BlogCategoryModel> findAll(
            Pageable pageable, String search, boolean isDeleted) {
        Page<BlogCategoryEntity> entities;
        if (search != null && !search.isBlank()) {
            entities = blogCategoryRepository.findAllByIsDeletedAndNameContainingIgnoreCase(isDeleted, search, pageable);
        } else {
            entities = blogCategoryRepository.findAllByIsDeleted(isDeleted, pageable);
        }
        return entities.map(blogCategoryPersistenceMapper::toDomain);
    }

    @Override
    public List<BlogCategoryModel> findAllByIsDeletedFalse() {
        return blogCategoryRepository.findAllByIsDeletedFalse().stream()
                .map(blogCategoryPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public boolean existsBySlug(String slug) {
        return blogCategoryRepository.existsBySlug(slug);
    }

    @Override
    public boolean existsBySlugAndIdNot(String slug, Long id) {
        return blogCategoryRepository.existsBySlugAndIdNot(slug, id);
    }

    @Override
    public int findMaxDisplayOrderByParentId(Long parentId) {
        return blogCategoryRepository.findMaxDisplayOrderByParentId(parentId);
    }

    @Override
    public int findMaxDisplayOrderForRoot() {
        return blogCategoryRepository.findMaxDisplayOrderForRoot();
    }

    @Override
    public List<BlogCategoryModel> findAllByParentIdAndIsDeletedFalse(Long parentId) {
        return blogCategoryRepository.findAllByParentIdAndIsDeletedFalse(parentId).stream()
                .map(blogCategoryPersistenceMapper::toDomain)
                .toList();
    }
}
