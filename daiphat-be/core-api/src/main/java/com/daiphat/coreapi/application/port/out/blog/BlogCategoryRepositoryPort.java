package com.daiphat.coreapi.application.port.out.blog;

import com.daiphat.coreapi.domain.model.blogs.BlogCategoryModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface BlogCategoryRepositoryPort {
    Optional<BlogCategoryModel> findById(Long id);
    BlogCategoryModel save(BlogCategoryModel category);
    Page<BlogCategoryModel> findAll(Pageable pageable, String search, boolean isDeleted);
    List<BlogCategoryModel> findAllByIsDeletedFalse();
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);
    void deleteById(Long id);
    int findMaxDisplayOrderByParentId(Long parentId);
    int findMaxDisplayOrderForRoot();
}
