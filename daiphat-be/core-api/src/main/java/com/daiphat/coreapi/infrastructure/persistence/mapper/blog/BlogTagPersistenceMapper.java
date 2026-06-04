package com.daiphat.coreapi.infrastructure.persistence.mapper.blog;

import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogTagEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlogTagPersistenceMapper {
    BlogTagEntity toEntity(BlogTagModel domain);
    BlogTagModel toDomain(BlogTagEntity entity);
}
