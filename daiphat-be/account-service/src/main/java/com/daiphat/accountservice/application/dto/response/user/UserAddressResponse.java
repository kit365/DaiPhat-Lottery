package com.daiphat.accountservice.application.dto.response.user;

import com.daiphat.accountservice.application.dto.response.base.Views;
import com.daiphat.accountservice.domain.valueobject.ContactInfo;
import com.daiphat.accountservice.domain.valueobject.Coordinates;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;
import java.util.UUID;

@Builder
public record UserAddressResponse(
    @JsonView(Views.Public.class)
    UUID id,

    @JsonView(Views.Me.class)
    ContactInfo contact,

    @JsonView(Views.Me.class)
    Coordinates location,

    @JsonView(Views.Public.class)
    String address,

    @JsonView(Views.Me.class)
    boolean defaultAddress
) {
}
