package com.daiphat.coreapi.application.port.in.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.request.blog.UpdateBlogPostRequest;
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
    BlogPostResponse getPostById(Long id);
    BlogPostResponse updatePost(Long id, UpdateBlogPostRequest request);
    StorageResult uploadImage(UploadRequest request, String folder);
    List<BlogPostTypeResponse> getBlogTypes();
    List<BlogPostStatusResponse> getBlogStatuses();
    PageResponse<BlogPostSummaryResponse> getPublicPosts(
            int page,
            int limit,
            String search,
            Long categoryId,
            String sortBy,
            String direction
    );

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

    int publishDueScheduledPosts();
}
