package com.daiphat.accountservice.application.mapper;

import com.daiphat.accountservice.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.accountservice.domain.model.UserModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import static org.assertj.core.api.Assertions.assertThat;

class UserApplicationMapperTest {

    private final UserApplicationMapper mapper = Mappers.getMapper(UserApplicationMapper.class);

    @Test
    @DisplayName("Should map UserRegistrationRequest to UserModel correctly")
    void mapToUserModel_ShouldMapCorrectly() {
        // 1. Arrange
        UserRegistrationRequest request = UserRegistrationRequest.builder()
                .lastName("Nguyễn")
                .firstName("Tuấn Kiệt")
                .username("tuankiet")
                .email("kiet@daiphat.com")
                .phone("0987654321")
                .password("Pass123456@")
                .build();

        // 2. Act
        UserModel userModel = mapper.mapToUserModel(request);

        // 3. Assert
        assertThat(userModel).isNotNull();
        assertThat(userModel.getLastName()).isEqualTo("Nguyễn");
        assertThat(userModel.getFirstName()).isEqualTo("Tuấn Kiệt");
        assertThat(userModel.getUsername()).isEqualTo("tuankiet");
        assertThat(userModel.getEmail()).isEqualTo("kiet@daiphat.com");
        assertThat(userModel.getPhoneNumber()).isEqualTo("0987654321"); // Verifying @Mapping(source = "phone")
    }

    @Test
    @DisplayName("Should return null when mapping null request")
    void mapToUserModel_ShouldReturnNullWhenInputIsNull() {
        assertThat(mapper.mapToUserModel(null)).isNull();
    }
}
