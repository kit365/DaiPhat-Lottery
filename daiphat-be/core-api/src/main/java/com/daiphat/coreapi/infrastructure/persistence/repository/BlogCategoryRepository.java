package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Repository
public interface BlogCategoryRepository extends JpaRepository<BlogCategoryEntity, Long> {
    Page<BlogCategoryEntity> findAllByIsDeletedAndNameContainingIgnoreCase(boolean isDeleted, String name, Pageable pageable);
    Page<BlogCategoryEntity> findAllByIsDeleted(boolean isDeleted, Pageable pageable);
    List<BlogCategoryEntity> findAllByIsDeletedFalse();
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);

    @Query("SELECT COALESCE(MAX(c.displayOrder), 0) FROM BlogCategoryEntity c WHERE c.parent.id = :parentId AND c.isDeleted = false")
    int findMaxDisplayOrderByParentId(@Param("parentId") Long parentId);

    @Query("SELECT COALESCE(MAX(c.displayOrder), 0) FROM BlogCategoryEntity c WHERE c.parent IS NULL AND c.isDeleted = false")
    int findMaxDisplayOrderForRoot();

    List<BlogCategoryEntity> findAllByParentIdAndIsDeletedFalse(Long parentId);
}
