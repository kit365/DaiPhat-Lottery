package com.daiphat.coreapi.application.mapper;

import com.daiphat.coreapi.application.dto.request.user.CreateUserRequest;
import com.daiphat.coreapi.application.dto.request.user.UpdateUserRequest;
import com.daiphat.coreapi.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.coreapi.application.dto.response.auth.RoleResponse;
import com.daiphat.coreapi.application.dto.response.user.UserResponse;
import com.daiphat.coreapi.domain.model.PermissionModel;
import com.daiphat.coreapi.domain.model.RoleModel;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.UserStatus;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(
    componentModel = "spring", 
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    imports = {Collections.class, Set.class, Collectors.class, PermissionModel.class, UserStatus.class}
)
public interface UserApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "phoneNumber", source = "phone")
    @Mapping(target = "role", ignore = true)
    UserModel mapToUserModel(UserRegistrationRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "username", source = "email")
    @Mapping(target = "phoneNumber", source = "phone")
    @Mapping(target = "role", ignore = true)
    UserModel toUserModel(CreateUserRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "phoneNumber", source = "phone")
    @Mapping(target = "role", ignore = true)
    UserModel toUserModel(UpdateUserRequest request);

    @Mapping(target = "avatarUrl", source = "imageUrl")
    @Mapping(target = "permissions", expression = "java(mapPermissions(userModel.getRole()))")
    @Mapping(target = "fullName", expression = "java(userModel.getFullName())")
    @Mapping(target = "phone", source = "phoneNumber")
    UserResponse mapToUserResponse(UserModel userModel);

    default Set<String> mapPermissions(RoleModel role) {
        if (role == null || role.getPermissions() == null) {
            return Collections.emptySet();
        }
        return role.getPermissions().stream()
                .map(PermissionModel::getCode)
                .collect(Collectors.toSet());
    }

    @Mapping(target = "permissions", expression = "java(mapPermissions(role))")
    RoleResponse mapToRoleResponse(RoleModel role);
}
