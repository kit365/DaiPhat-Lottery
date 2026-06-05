package com.daiphat.coreapi.application.mapper.blog;

import com.daiphat.coreapi.application.dto.response.blog.BlogCategoryResponse;
import com.daiphat.coreapi.domain.model.blogs.BlogCategoryModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlogCategoryApplicationMapper {
    @Mapping(target = "parentId", source = "parent.id")
    @Mapping(target = "parentName", source = "parent.name")
    BlogCategoryResponse toResponse(BlogCategoryModel model);
}
