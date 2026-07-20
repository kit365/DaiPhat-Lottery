package com.daiphat.coreapi.application.dto.request.support;

import jakarta.validation.constraints.NotNull;

public record ResolutionFeedbackRequest(
        @NotNull Boolean satisfied
) {
}
