package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.blog.BlogTagRepositoryPort;
import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.blog.BlogTagPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.BlogTagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class BlogTagRepositoryAdapter implements BlogTagRepositoryPort {
    private final BlogTagRepository blogTagRepository;
    private final BlogTagPersistenceMapper blogTagPersistenceMapper;

    @Override
    public Optional<BlogTagModel> findById(Long id) {
        return blogTagRepository.findById(id).map(blogTagPersistenceMapper::toDomain);
    }

    @Override
    public Set<BlogTagModel> findAllByIds(Set<Long> ids) {
        return blogTagRepository.findAllByIdInAndIsDeletedFalse(ids).stream()
                .map(blogTagPersistenceMapper::toDomain)
                .collect(Collectors.toSet());
    }

    @Override
    public BlogTagModel save(BlogTagModel tag) {
        var entity = blogTagPersistenceMapper.toEntity(tag);
        return blogTagPersistenceMapper.toDomain(blogTagRepository.save(entity));
    }

    @Override
    public List<BlogTagModel> findAll() {
        return blogTagRepository.findAllByIsDeletedFalse().stream()
                .map(blogTagPersistenceMapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public boolean existsByName(String name) {
        return blogTagRepository.existsByNameAndIsDeletedFalse(name);
    }

    @Override
    public boolean existsBySlug(String slug) {
        return blogTagRepository.existsBySlugAndIsDeletedFalse(slug);
    }

    @Override
    public boolean existsByNameAndIdNot(String name, Long id) {
        return blogTagRepository.existsByNameAndIdNotAndIsDeletedFalse(name, id);
    }

    @Override
    public boolean existsBySlugAndIdNot(String slug, Long id) {
        return blogTagRepository.existsBySlugAndIdNotAndIsDeletedFalse(slug, id);
    }

    @Override
    public Page<BlogTagModel> findAll(Pageable pageable, String search) {
        var entities = (search != null && !search.isBlank())
                ? blogTagRepository.findAllByIsDeletedFalseAndNameContainingIgnoreCase(search, pageable)
                : blogTagRepository.findAllByIsDeletedFalse(pageable);
        return entities.map(blogTagPersistenceMapper::toDomain);
    }
}
