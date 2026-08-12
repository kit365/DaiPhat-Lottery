package com.daiphat.coreapi.application.dto.request.auth;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("TC-LOGIN-004: Blank username is rejected")
    void blankUsername_isRejectedByNotBlankValidation() {
        LoginRequest request = new LoginRequest(" ", "Password123");

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("username");
    }

    @Test
    @DisplayName("TC-LOGIN-004: Blank password is rejected")
    void blankPassword_isRejectedByNotBlankValidation() {
        LoginRequest request = new LoginRequest("customer@example.com", "");

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("password");
    }

    @Test
    @DisplayName("TC-LOGIN-004-B: Null credentials are rejected at the input boundary")
    void nullCredentials_areRejectedByNotBlankValidation() {
        LoginRequest request = new LoginRequest(null, null);

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactlyInAnyOrder("username", "password");
    }
}
