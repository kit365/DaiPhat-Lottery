package com.daiphat.coreapi.infrastructure.persistence.mapper.streetagent;

import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.StreetAgentProfileEntity;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface StreetAgentProfilePersistenceMapper {
    StreetAgentProfileEntity toEntity(StreetAgentProfileModel domain);
    StreetAgentProfileModel toDomain(StreetAgentProfileEntity entity);
}
