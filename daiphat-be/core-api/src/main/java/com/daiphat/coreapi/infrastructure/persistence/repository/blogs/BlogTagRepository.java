package com.daiphat.coreapi.infrastructure.persistence.repository.blogs;

import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogTagEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Collection;
import java.util.Set;

@Repository
public interface BlogTagRepository extends JpaRepository<BlogTagEntity, Long> {
    Set<BlogTagEntity> findAllByIdInAndIsDeletedFalse(Collection<Long> ids);
    boolean existsByNameAndIsDeletedFalse(String name);
    boolean existsBySlugAndIsDeletedFalse(String slug);
    boolean existsByNameAndIdNotAndIsDeletedFalse(String name, Long id);
    boolean existsBySlugAndIdNotAndIsDeletedFalse(String slug, Long id);
    Page<BlogTagEntity> findAllByIsDeletedFalseAndNameContainingIgnoreCase(String name, Pageable pageable);
    Page<BlogTagEntity> findAllByIsDeletedFalse(Pageable pageable);
    java.util.List<BlogTagEntity> findAllByIsDeletedFalse();
}
