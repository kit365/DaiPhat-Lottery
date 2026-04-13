package com.daiphat.accountservice.application.mapper;

import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import static org.assertj.core.api.Assertions.assertThat;

class AuthApplicationMapperTest {

    private final AuthApplicationMapper mapper = Mappers.getMapper(AuthApplicationMapper.class);

    @Test
    @DisplayName("Should map KeycloakAuthResult to AuthResponseDTO correctly")
    void toResponse_ShouldMapCorrectly() {
        // 1. Arrange
        KeycloakAuthResult domain = KeycloakAuthResult.builder()
                .accessToken("access-token")
                .refreshToken("refresh-token")
                .expiresIn(3600)
                .refreshExpiresIn(7200)
                .tokenType("Bearer")
                .keycloakUserId("user-123")
                .username("testuser")
                .build();

        // 2. Act
        AuthResponseDTO response = mapper.toResponse(domain);

        // 3. Assert
        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getExpiresIn()).isEqualTo(3600);
        assertThat(response.getRefreshExpiresIn()).isEqualTo(7200);
        assertThat(response.getTokenType()).isEqualTo("Bearer");
    }

    @Test
    @DisplayName("Should return null when mapping null KeycloakAuthResult")
    void toResponse_ShouldReturnNullWhenInputIsNull() {
        assertThat(mapper.toResponse(null)).isNull();
    }
}
