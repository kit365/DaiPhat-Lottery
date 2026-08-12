package com.daiphat.coreapi.adapter.in.web.controller.fortune;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.fortune.CastFortuneRequest;
import com.daiphat.coreapi.application.dto.response.fortune.FortuneCastResponse;
import com.daiphat.coreapi.application.port.in.fortune.FortuneCastServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/fortune/cast")
@RequiredArgsConstructor
@Validated
public class FortuneCastController {

    private final FortuneCastServicePort fortuneCastServicePort;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<FortuneCastResponse> cast(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody(required = false) CastFortuneRequest request
    ) {
        CastFortuneRequest body = request != null ? request : new CastFortuneRequest(null, null, null);
        return ApiResponse.success(
                "Fortune cast completed.",
                fortuneCastServicePort.cast(principal.getId(), body)
        );
    }

    @GetMapping("/today")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<FortuneCastResponse> today(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return fortuneCastServicePort.getToday(principal.getId())
                .map(result -> ApiResponse.success("Today's fortune cast.", result))
                .orElseGet(() -> ApiResponse.success("No fortune cast for today yet.", null));
    }
}
