package com.daiphat.coreapi.infrastructure.persistence.mapper.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.StreetAgentProfileEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface StreetAgentProfilePersistenceMapper {
    @Mapping(target = "user", ignore = true)
    StreetAgentProfileEntity toEntity(StreetAgentProfileModel domain);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "email", source = "user.email")
    StreetAgentProfileModel toDomain(StreetAgentProfileEntity entity);
}
