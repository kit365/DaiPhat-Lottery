package com.daiphat.coreapi.infrastructure.persistence.repository;

import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogPostEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPostEntity, Long>,
        JpaSpecificationExecutor<BlogPostEntity> {
    boolean existsBySlug(String slug);

    /** Tăng viewCount thêm 1 bằng UPDATE trực tiếp, không cần load entity. */
    @Modifying
    @Query("UPDATE BlogPostEntity p SET p.viewCount = p.viewCount + 1 WHERE p.id = :id")
    void incrementViewCount(@Param("id") Long id);
}
