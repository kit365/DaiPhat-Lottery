package com.daiphat.accountservice.application.mapper;

import com.daiphat.accountservice.application.dto.response.RoleResponseDTO;
import com.daiphat.accountservice.domain.model.PermissionModel;
import com.daiphat.accountservice.domain.model.RoleModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RoleApplicationMapper {

    @Mapping(target = "permissions", expression = "java(mapPermissions(domain.getPermissions()))")
    RoleResponseDTO toResponse(RoleModel domain);

    default Set<String> mapPermissions(Set<PermissionModel> permissions) {
        if (permissions == null) return Collections.emptySet();
        return permissions.stream()
                .map(PermissionModel::getCode)
                .collect(Collectors.toSet());
    }
}
