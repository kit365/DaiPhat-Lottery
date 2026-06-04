package com.daiphat.coreapi.application.port.in.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostSummaryResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostTypeResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostStatusResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.List;

public interface BlogPostServicePort {
    BlogPostResponse createPost(CreateBlogPostRequest request);
    StorageResult uploadImage(UploadRequest request, String folder);
    List<BlogPostTypeResponse> getBlogTypes();
    List<BlogPostStatusResponse> getBlogStatuses();

    PageResponse<BlogPostSummaryResponse> getPosts(
            int page,
            int limit,
            String search,
            Long tagId,
            Long categoryId,
            String type,
            String status,
            String sortBy,
            String direction,
            boolean includeDeleted
    );

    void incrementViewCount(Long id);

    void deletePost(Long id);

    void clearCategoryForPosts(List<Long> categoryIds);
    void removeTagFromPosts(Long tagId);

    long countPublishedPostsByCategoryId(Long categoryId);
}
