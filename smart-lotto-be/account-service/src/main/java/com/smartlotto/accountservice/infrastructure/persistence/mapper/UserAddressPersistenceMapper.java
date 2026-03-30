package com.smartlotto.accountservice.infrastructure.persistence.mapper;

import com.smartlotto.accountservice.domain.model.UserAddressModel;
import com.smartlotto.accountservice.infrastructure.persistence.entity.UserAddressEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserAddressPersistenceMapper {

    @Mapping(target = "contact", source = "entity")
    @Mapping(target = "location", source = "entity")
    @Mapping(target = "addressLine1", source = "address")
    @Mapping(target = "isDefault", source = "defaultAddress")
    UserAddressModel toDomain(UserAddressEntity entity);

    @Mapping(target = "fullName", source = "contact.fullName")
    @Mapping(target = "phone", source = "contact.phone")
    @Mapping(target = "longitude", source = "location.longitude")
    @Mapping(target = "latitude", source = "location.latitude")
    @Mapping(target = "address", expression = "java(concatenateAddress(domain))")
    @Mapping(target = "defaultAddress", source = "default")
    UserAddressEntity toEntity(UserAddressModel domain);

    default UserAddressModel.ContactInfo mapToContact(UserAddressEntity entity) {
        if (entity == null) return null;
        return UserAddressModel.ContactInfo.builder()
                .fullName(entity.getFullName())
                .phone(entity.getPhone())
                .build();
    }

    default UserAddressModel.Coordinates mapToLocation(UserAddressEntity entity) {
        if (entity == null) return null;
        return UserAddressModel.Coordinates.builder()
                .longitude(entity.getLongitude())
                .latitude(entity.getLatitude())
                .build();
    }

    default String concatenateAddress(UserAddressModel domain) {
        if (domain == null) return null;
        StringBuilder addressBuilder = new StringBuilder();
        if (domain.getAddressLine1() != null) addressBuilder.append(domain.getAddressLine1());
        if (domain.getAddressLine2() != null && !domain.getAddressLine2().isEmpty()) {
            if (!addressBuilder.isEmpty()) addressBuilder.append(", ");
            addressBuilder.append(domain.getAddressLine2());
        }
        if (domain.getCity() != null) {
            if (!addressBuilder.isEmpty()) addressBuilder.append(", ");
            addressBuilder.append(domain.getCity());
        }
        return addressBuilder.toString();
    }
}
