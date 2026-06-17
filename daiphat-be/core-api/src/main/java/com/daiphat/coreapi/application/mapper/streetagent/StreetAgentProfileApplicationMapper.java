package com.daiphat.coreapi.application.mapper.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.CreateStreetAgentProfileRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentProfileResponse;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface StreetAgentProfileApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "depositAdjustmentReason", ignore = true)
    @Mapping(target = "status", source = "status", qualifiedByName = "stringToStatus")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    StreetAgentProfileModel toModel(CreateStreetAgentProfileRequest request);

    @Mapping(target = "status", expression = "java(model.getStatus() != null ? model.getStatus().getCode() : null)")
    StreetAgentProfileResponse toResponse(StreetAgentProfileModel model);

    @Named("stringToStatus")
    default StreetAgentProfileStatus stringToStatus(String status) {
        return StreetAgentProfileStatus.fromCode(status);
    }
}
