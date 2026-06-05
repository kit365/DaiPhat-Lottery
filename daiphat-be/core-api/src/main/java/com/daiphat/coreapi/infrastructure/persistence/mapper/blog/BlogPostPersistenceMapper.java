package com.daiphat.coreapi.infrastructure.persistence.mapper.blog;

import com.daiphat.coreapi.domain.model.blogs.BlogPostModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogPostEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    uses = {BlogCategoryPersistenceMapper.class, BlogTagPersistenceMapper.class}
)
public interface BlogPostPersistenceMapper {
    @Mapping(target = "isDeleted", source = "deleted")
    BlogPostEntity toEntity(BlogPostModel domain);

    @Mapping(target = "isDeleted", source = "deleted")
    BlogPostModel toDomain(BlogPostEntity entity);
}
