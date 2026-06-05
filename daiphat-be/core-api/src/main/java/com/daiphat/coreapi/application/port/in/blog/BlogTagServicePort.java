package com.daiphat.coreapi.application.port.in.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogTagRequest;
import com.daiphat.coreapi.application.dto.response.blog.BlogTagResponse;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;

import java.util.List;
import java.util.Set;
import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;

public interface BlogTagServicePort {
    List<BlogTagResponse> getAllTags();
    PageResponse<BlogTagResponse> getTags(int page, int limit, String search);
    BlogTagResponse getTagById(Long id);
    BlogTagResponse createTag(CreateBlogTagRequest request);
    BlogTagResponse updateTag(Long id, CreateBlogTagRequest request);
    void deleteTag(Long id);
    Set<BlogTagModel> getTagModelsByIds(Set<Long> ids);
}
