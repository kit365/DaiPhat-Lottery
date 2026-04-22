package com.daiphat.accountservice.application.dto.response.auth;
import com.daiphat.accountservice.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.Builder;
import java.util.Set;
import java.util.UUID;

@Builder
public record RoleResponse(
    @JsonView(Views.Public.class)
    UUID id,

    @JsonView(Views.Public.class)
    String code,

    @JsonView(Views.Public.class)
    String name,

    @JsonView(Views.Public.class)
    String description,

    @JsonView(Views.Admin.class)
    Set<String> permissions
) {
}

