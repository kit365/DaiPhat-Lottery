package com.daiphat.coreapi.application.port.in.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogCategoryRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryTreeResponse;

import java.util.List;

public interface BlogCategoryServicePort {
    PageResponse<BlogCategoryResponse> getCategories(int page, int limit, String search, boolean isTrash);
    List<BlogCategoryTreeResponse> getNestedCategories();
    BlogCategoryResponse getCategoryById(Long id);
    BlogCategoryResponse createCategory(CreateBlogCategoryRequest request);
    BlogCategoryResponse updateCategory(Long id, CreateBlogCategoryRequest request);
    void deleteCategory(Long id);
}
