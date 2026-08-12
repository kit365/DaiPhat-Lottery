package com.daiphat.coreapi.application.dto.request.auth;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ForgotPasswordRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("TC-FORGOT-003-B: Blank email is rejected at the input boundary")
    void blankEmail_isRejectedByNotBlankValidation() {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email(" ")
                .build();

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsOnly("email")
                .hasSize(2);
    }
}
