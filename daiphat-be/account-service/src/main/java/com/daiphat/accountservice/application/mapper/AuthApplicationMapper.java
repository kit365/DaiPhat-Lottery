package com.daiphat.accountservice.application.mapper;

import com.daiphat.accountservice.application.dto.response.auth.AuthResponse;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mapper chuyển đổi giữa Domain Model (KeycloakAuthResult)
 * và Application DTO (AuthResponse).
 */
@Mapper(componentModel = "spring", uses = {UserApplicationMapper.class})
public interface AuthApplicationMapper {
    @Mapping(target = "user", source = "userModel")
    AuthResponse toResponse(KeycloakAuthResult domain, UserModel userModel);
}
