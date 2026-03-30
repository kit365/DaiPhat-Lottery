package com.smartlotto.accountservice.application.mapper;

import com.smartlotto.accountservice.application.dto.response.AuthResponseDTO;
import com.smartlotto.accountservice.domain.model.auth.KeycloakAuthResult;
import org.mapstruct.Mapper;

/**
 * Mapper chuyển đổi giữa Domain Model (KeycloakAuthResult)
 * và Application DTO (AuthResponseDTO).
 */
@Mapper(componentModel = "spring")
public interface AuthApplicationMapper {
    AuthResponseDTO toResponse(KeycloakAuthResult domain);
}
