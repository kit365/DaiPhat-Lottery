package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogTagEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Collection;
import java.util.Set;

@Repository
public interface BlogTagRepository extends JpaRepository<BlogTagEntity, Long> {
    Set<BlogTagEntity> findAllByIdIn(Collection<Long> ids);
    boolean existsByName(String name);
    boolean existsBySlug(String slug);
    boolean existsByNameAndIdNot(String name, Long id);
    boolean existsBySlugAndIdNot(String slug, Long id);
    Page<BlogTagEntity> findAllByNameContainingIgnoreCase(String name, Pageable pageable);
}
