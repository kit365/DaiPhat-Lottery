package com.smartlotto.accountservice.application.mapper;

import com.smartlotto.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.smartlotto.accountservice.application.dto.response.RoleResponseDTO;
import com.smartlotto.accountservice.application.dto.response.UserAddressResponseDTO;
import com.smartlotto.accountservice.application.dto.response.UserImageResponseDTO;
import com.smartlotto.accountservice.application.dto.response.UserResponseDTO;
import com.smartlotto.accountservice.domain.model.RoleModel;
import com.smartlotto.accountservice.domain.model.UserAddressModel;
import com.smartlotto.accountservice.domain.model.UserImageModel;
import com.smartlotto.accountservice.domain.model.UserModel;
import com.smartlotto.accountservice.domain.valueobject.ContactInfo;
import com.smartlotto.accountservice.domain.valueobject.Coordinates;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserApplicationMapper {

    @Mapping(target = "id", ignore = true)
    UserModel mapToUserModel(UserRegistrationRequestDTO request);

    UserResponseDTO mapToUserResponse(UserModel userModel);

    RoleResponseDTO mapToRoleResponse(RoleModel role);

    UserImageResponseDTO mapToUserImageResponse(UserImageModel userImage);

    @Mapping(target = "defaultAddress", source = "default")
    @Mapping(target = "address", expression = "java(concatenateAddress(userAddress))")
    UserAddressResponseDTO mapToUserAddressResponse(UserAddressModel userAddress);

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