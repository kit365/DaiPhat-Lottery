package com.daiphat.coreapi.application.mapper.blog;

import com.daiphat.coreapi.application.dto.response.blog.BlogTagResponse;
import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlogTagApplicationMapper {
    BlogTagResponse toResponse(BlogTagModel model);
}
