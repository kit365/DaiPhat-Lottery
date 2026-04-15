package com.daiphat.accountservice.application.mapper;

import com.daiphat.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.daiphat.accountservice.application.dto.response.*;
import com.daiphat.accountservice.domain.model.PermissionModel;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.UserAddressModel;
import com.daiphat.accountservice.domain.model.UserImageModel;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.valueobject.ContactInfo;
import com.daiphat.accountservice.domain.valueobject.Coordinates;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(
    componentModel = "spring", 
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    imports = {Collections.class, Set.class, Collectors.class, PermissionModel.class}
)
public interface UserApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "phoneNumber", source = "phone")
    UserModel mapToUserModel(UserRegistrationRequestDTO request);

    UserResponseDTO mapToUserResponse(UserModel userModel);

    @Mapping(target = "avatarUrl", expression = "java(extractAvatarUrl(userModel))")
    @Mapping(target = "permissions", expression = "java(mapPermissions(userModel.getRole()))")
    UserAuthMeResponseDTO mapToAuthMeUserResponse(UserModel userModel);

    default Set<String> mapPermissions(RoleModel role) {
        if (role == null || role.getPermissions() == null) {
            return Collections.emptySet();
        }
        return role.getPermissions().stream()
                .map(PermissionModel::getCode)
                .collect(Collectors.toSet());
    }

    AuthMeRoleResponseDTO mapToAuthMeRoleResponse(RoleModel role);

    @Mapping(target = "permissions", expression = "java(mapPermissions(role))")
    RoleResponseDTO mapToRoleResponse(RoleModel role);

    UserImageResponseDTO mapToUserImageResponse(UserImageModel userImage);

    @Mapping(target = "defaultAddress", source = "default")
    @Mapping(target = "address", expression = "java(concatenateAddress(userAddress))")
    UserAddressResponseDTO mapToUserAddressResponse(UserAddressModel userAddress);

    default String extractAvatarUrl(UserModel userModel) {
        if (userModel == null || userModel.getImages() == null) return null;
        return userModel.getImages().stream()
                .filter(UserImageModel::isCurrent)
                .map(UserImageModel::getImageUrl)
                .findFirst()
                .orElse(null);
    }

    default ContactInfo mapToContactInfo(UserAddressModel.ContactInfo contact) {
        if (contact == null) return null;
        return ContactInfo.builder()
                .fullName(contact.getFullName())
                .phone(contact.getPhone())
                .build();
    }

    default Coordinates mapToCoordinates(UserAddressModel.Coordinates location) {
        if (location == null) return null;
        return Coordinates.builder()
                .longitude(location.getLongitude())
                .latitude(location.getLatitude())
                .build();
    }

    default String concatenateAddress(UserAddressModel userAddress) {
        if (userAddress == null) return null;
        StringBuilder addressBuilder = new StringBuilder();
        if (userAddress.getAddressLine1() != null) addressBuilder.append(userAddress.getAddressLine1());
        if (userAddress.getAddressLine2() != null && !userAddress.getAddressLine2().isEmpty()) {
            if (!addressBuilder.isEmpty()) addressBuilder.append(", ");
            addressBuilder.append(userAddress.getAddressLine2());
        }
        if (userAddress.getCity() != null) {
            if (!addressBuilder.isEmpty()) addressBuilder.append(", ");
            addressBuilder.append(userAddress.getCity());
        }
        return addressBuilder.toString();
    }
}