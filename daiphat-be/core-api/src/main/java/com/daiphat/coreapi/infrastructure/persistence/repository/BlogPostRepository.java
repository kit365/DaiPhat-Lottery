package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogPostEntity;
import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPostEntity, Long>,
        JpaSpecificationExecutor<BlogPostEntity> {
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);


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

    @Modifying
    @Query("""
            UPDATE BlogPostEntity p
            SET p.status = :publishedStatus,
                p.publishedAt = COALESCE(p.publishedAt, p.scheduledAt),
                p.scheduledAt = null
            WHERE p.status = :scheduledStatus
              AND p.isDeleted = false
              AND (
                    (p.publishedAt IS NOT NULL AND p.publishedAt <= :now)
                    OR
                    (p.publishedAt IS NULL AND p.scheduledAt IS NOT NULL AND p.scheduledAt <= :now)
              )
            """)
    int publishDueScheduledPosts(
            @Param("scheduledStatus") PostStatus scheduledStatus,
            @Param("publishedStatus") PostStatus publishedStatus,
            @Param("now") LocalDateTime now
    );

    @Query("""
            SELECT p.id
            FROM BlogPostEntity p
            WHERE p.status = :status
              AND p.isDeleted = false
              AND (
                    (p.publishedAt IS NOT NULL AND p.publishedAt <= :now)
                    OR
                    (p.publishedAt IS NULL AND p.scheduledAt IS NOT NULL AND p.scheduledAt <= :now)
              )
            """)
    List<Long> findDueScheduledPostIds(
            @Param("status") PostStatus status,
            @Param("now") LocalDateTime now
    );
}
