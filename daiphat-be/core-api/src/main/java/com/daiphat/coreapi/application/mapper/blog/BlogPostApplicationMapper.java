package com.daiphat.coreapi.application.mapper.blog;

import com.daiphat.coreapi.application.dto.request.blog.CreateBlogPostRequest;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostResponse;
import com.daiphat.coreapi.application.dto.response.blog.BlogPostSummaryResponse;
import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import com.daiphat.coreapi.domain.model.enums.blog.PostStatus;
import com.daiphat.coreapi.domain.model.enums.blog.PostType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    uses = {BlogCategoryApplicationMapper.class, BlogTagApplicationMapper.class},
    imports = {PostType.class, PostStatus.class}
)
public interface BlogPostApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "tags", ignore = true)
    @Mapping(target = "type", expression = "java(PostType.fromCode(request.type()))")
    @Mapping(target = "status", expression = "java(PostStatus.fromCode(request.status()))")
    @Mapping(target = "viewCount", ignore = true)
    @Mapping(target = "publishedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    BlogPostModel toModel(CreateBlogPostRequest request);

    BlogPostResponse toResponse(BlogPostModel model);

    BlogPostSummaryResponse toSummaryResponse(BlogPostModel model);
}
