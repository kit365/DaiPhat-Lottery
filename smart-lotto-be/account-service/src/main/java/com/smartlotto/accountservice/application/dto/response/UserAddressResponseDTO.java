package com.smartlotto.accountservice.application.dto.response;

import com.smartlotto.accountservice.domain.valueobject.ContactInfo;
import com.smartlotto.accountservice.domain.valueobject.Coordinates;
import lombok.Builder;
import java.util.UUID;

@Builder
public record UserAddressResponseDTO(
    UUID id,
    ContactInfo contact,
    Coordinates location,
    String address,
    boolean defaultAddress
) {}
