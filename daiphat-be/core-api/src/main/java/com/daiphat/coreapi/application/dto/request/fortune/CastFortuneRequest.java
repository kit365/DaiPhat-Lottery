package com.daiphat.coreapi.application.dto.request.fortune;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record CastFortuneRequest(
        @Min(1900)
        @Max(2100)
        Integer birthYear
) {
}
