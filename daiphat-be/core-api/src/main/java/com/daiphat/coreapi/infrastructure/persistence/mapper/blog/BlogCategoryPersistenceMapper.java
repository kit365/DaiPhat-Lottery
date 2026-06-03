package com.daiphat.coreapi.infrastructure.persistence.mapper.blog;

import com.daiphat.coreapi.domain.model.blogs.BlogCategoryModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogCategoryEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlogCategoryPersistenceMapper {
    BlogCategoryEntity toEntity(BlogCategoryModel domain);
    BlogCategoryModel toDomain(BlogCategoryEntity entity);
}
