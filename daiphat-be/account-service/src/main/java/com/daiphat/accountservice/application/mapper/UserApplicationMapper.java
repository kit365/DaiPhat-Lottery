package com.daiphat.accountservice.application.mapper;

import com.daiphat.accountservice.application.dto.identity.KeycloakUserDTO;
import com.daiphat.accountservice.application.dto.request.user.CreateUserRequest;
import com.daiphat.accountservice.application.dto.request.user.UpdateUserRequest;
import com.daiphat.accountservice.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.accountservice.application.dto.response.auth.RoleResponse;
import com.daiphat.accountservice.application.dto.response.user.UserAddressResponse;
import com.daiphat.accountservice.application.dto.response.user.UserImageResponse;
import com.daiphat.accountservice.application.dto.response.user.UserResponse;
import com.daiphat.accountservice.domain.model.PermissionModel;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.UserAddressModel;
import com.daiphat.accountservice.domain.model.UserImageModel;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.valueobject.ContactInfo;
import com.daiphat.accountservice.domain.valueobject.Coordinates;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
import com.daiphat.accountservice.domain.model.auth.OAuthUserInfo;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Mapper(
    componentModel = "spring", 
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    imports = {Collections.class, Set.class, Collectors.class, PermissionModel.class, UserStatus.class, UUID.class}
)
public interface UserApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "phoneNumber", source = "phone")
    UserModel mapToUserModel(UserRegistrationRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "username", source = "email")
    @Mapping(target = "phoneNumber", source = "phone")
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "images", ignore = true)
    @Mapping(target = "addresses", ignore = true)
    UserModel toUserModel(CreateUserRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "phoneNumber", source = "phone")
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "images", ignore = true)
    @Mapping(target = "addresses", ignore = true)
    UserModel toUserModel(UpdateUserRequest request);

    @Mapping(target = "id", source = "externalId")
    @Mapping(target = "status", expression = "java(UserStatus.ACTIVE)")
    @Mapping(target = "emailVerified", expression = "java(true)")
    @Mapping(target = "hasPassword", expression = "java(false)")
    @Mapping(target = "agreedToTerms", expression = "java(false)")
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "images", ignore = true)
    @Mapping(target = "addresses", ignore = true)
    UserModel toUserModel(OAuthUserInfo userInfo);

    @Mapping(target = "id", expression = "java(dto.getId() != null ? UUID.fromString(dto.getId()) : null)")
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "images", ignore = true)
    @Mapping(target = "addresses", ignore = true)
    UserModel toUserModel(KeycloakUserDTO dto);

    @Mapping(target = "enabled", expression = "java(true)")
    @Mapping(target = "emailVerified", source = "emailVerified")
    @Mapping(target = "credentials", ignore = true)
    @Mapping(target = "attributes", ignore = true)
    KeycloakUserDTO toKeycloakDTO(UserModel user);

    @Mapping(target = "avatarUrl", expression = "java(extractAvatarUrl(userModel))")
    @Mapping(target = "permissions", expression = "java(mapPermissions(userModel.getRole()))")
    @Mapping(target = "fullName", expression = "java(userModel.getFullName())")
    @Mapping(target = "phone", source = "phoneNumber") // Map phoneNumber to phone for FE
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

    @Mapping(target = "id", expression = "java(UUID.randomUUID())")
    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "imageUrl", source = "imageUrl")
    @Mapping(target = "current", expression = "java(true)")
    UserImageModel toUserImageModel(String imageUrl, UUID userId);

    UserImageResponse mapToUserImageResponse(UserImageModel userImage);

    @Mapping(target = "defaultAddress", source = "default")
    @Mapping(target = "address", expression = "java(concatenateAddress(userAddress))")
    UserAddressResponse mapToUserAddressResponse(UserAddressModel userAddress);

    default String extractAvatarUrl(UserModel userModel) {
        if (userModel == null || userModel.getImages() == null) {
            return null;
        }
        return userModel.getImages().stream()
                .filter(UserImageModel::isCurrent)
                .map(UserImageModel::getImageUrl)
                .findFirst()
                .orElse(null);
    }

    default ContactInfo mapToContactInfo(UserAddressModel.ContactInfo contact) {
        if (contact == null) {
            return null;
        }
        return ContactInfo.builder()
                .fullName(contact.getFullName())
                .phone(contact.getPhone())
                .build();
    }

    default Coordinates mapToCoordinates(UserAddressModel.Coordinates location) {
        if (location == null) {
            return null;
        }
        return Coordinates.builder()
                .longitude(location.getLongitude())
                .latitude(location.getLatitude())
                .build();
    }

    default String concatenateAddress(UserAddressModel userAddress) {
        if (userAddress == null) {
            return null;
        }
        StringBuilder addressBuilder = new StringBuilder();
        if (userAddress.getAddressLine1() != null) {
            addressBuilder.append(userAddress.getAddressLine1());
        }
        if (userAddress.getAddressLine2() != null && !userAddress.getAddressLine2().isEmpty()) {
            if (!addressBuilder.isEmpty()) {
                addressBuilder.append(", ");
            }
            addressBuilder.append(userAddress.getAddressLine2());
        }
        if (userAddress.getCity() != null) {
            if (!addressBuilder.isEmpty()) {
                addressBuilder.append(", ");
            }
            addressBuilder.append(userAddress.getCity());
        }
        return addressBuilder.toString();
    }
}