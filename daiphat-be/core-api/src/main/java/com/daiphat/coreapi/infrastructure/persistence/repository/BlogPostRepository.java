package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogPostEntity;
import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPostEntity, Long>,
        JpaSpecificationExecutor<BlogPostEntity> {
    boolean existsBySlug(String slug);


    @Modifying
    @Query("UPDATE BlogPostEntity p SET p.viewCount = p.viewCount + 1 WHERE p.id = :id")
    void incrementViewCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE BlogPostEntity p SET p.viewCount = p.viewCount + :increment WHERE p.id = :id")
    void incrementViewCountBy(@Param("id") Long id, @Param("increment") Integer increment);

    List<BlogPostEntity> findByCategoryIdIn(List<Long> categoryIds);

    List<BlogPostEntity> findByTagsId(Long tagId);

    long countByCategoryIdAndStatusAndIsDeletedFalse(Long categoryId, PostStatus status);

    long countByStatusAndIsDeletedFalse(PostStatus status);

    long countByIsDeletedFalse();
}
