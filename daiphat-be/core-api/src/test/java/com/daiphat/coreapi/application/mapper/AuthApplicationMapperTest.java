package com.daiphat.coreapi.application.mapper;

import com.daiphat.coreapi.application.dto.response.auth.AuthResponse;
import com.daiphat.coreapi.domain.model.auth.AuthToken;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import static org.assertj.core.api.Assertions.assertThat;

class AuthApplicationMapperTest {

    private final AuthApplicationMapper mapper = Mappers.getMapper(AuthApplicationMapper.class);

    @Test
    @DisplayName("Should map AuthToken to AuthResponse correctly")
    void toResponse_ShouldMapCorrectly() {
        // 1. Arrange
        AuthToken token = new AuthToken(
                "access-token-123",
                "refresh-token-456",
                3600L,
                604800L,
                "Bearer"
        );

        // 2. Act
        AuthResponse response = mapper.toResponse(token);

        // 3. Assert
        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("access-token-123");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token-456");
        assertThat(response.getExpiresIn()).isEqualTo(3600L);
        assertThat(response.getRefreshExpiresIn()).isEqualTo(604800L);
        assertThat(response.getTokenType()).isEqualTo("Bearer");
    }

    @Test
    @DisplayName("Should return null when mapping null AuthToken")
    void toResponse_ShouldReturnNullWhenInputIsNull() {
        assertThat(mapper.toResponse(null)).isNull();
    }
}
