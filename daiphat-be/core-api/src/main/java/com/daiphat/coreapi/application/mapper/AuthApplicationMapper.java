package com.daiphat.coreapi.application.mapper;

import com.daiphat.coreapi.application.dto.response.auth.AuthResponse;
import com.daiphat.coreapi.domain.model.auth.AuthToken;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AuthApplicationMapper {

    AuthResponse toResponse(AuthToken token);
}
