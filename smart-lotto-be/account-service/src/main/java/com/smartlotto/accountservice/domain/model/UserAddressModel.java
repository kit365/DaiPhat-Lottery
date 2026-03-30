package com.smartlotto.accountservice.domain.model;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserAddressModel {
    private UUID id;
    private UUID userId;
    
    // Value Objects
    private ContactInfo contact;
    private Coordinates location;

    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String country;
    private String zipCode;
    private boolean isDefault;

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class ContactInfo {
        private String fullName;
        private String phone;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class Coordinates {
        private Double longitude;
        private Double latitude;
    }
}
