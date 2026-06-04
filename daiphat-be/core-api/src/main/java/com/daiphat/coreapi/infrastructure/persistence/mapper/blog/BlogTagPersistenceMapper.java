package com.daiphat.coreapi.infrastructure.persistence.mapper.blog;

import com.daiphat.coreapi.domain.model.blogs.BlogTagModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.blog.BlogTagEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BlogTagPersistenceMapper {
    @Mapping(target = "isDeleted", source = "deleted")
    BlogTagEntity toEntity(BlogTagModel domain);

    @Mapping(target = "isDeleted", source = "deleted")
    BlogTagModel toDomain(BlogTagEntity entity);
}
