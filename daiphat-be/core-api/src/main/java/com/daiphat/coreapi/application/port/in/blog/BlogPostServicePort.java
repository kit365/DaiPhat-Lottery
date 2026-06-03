package com.daiphat.coreapi.application.port.in.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostTypeResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

import java.util.List;

public interface BlogPostServicePort {
    BlogPostResponse createPost(CreateBlogPostRequest request);
    StorageResult uploadImage(UploadRequest request, String folder);
    List<BlogPostTypeResponse> getBlogTypes();
}

