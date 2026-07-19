package com.daiphat.coreapi.adapter.in.web.controller.chat;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.chat.UpdateAiServiceStatusRequest;
import com.daiphat.coreapi.application.dto.response.chat.AiServiceConfigResponse;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1_ADMIN + "/chat/ai-config")
@RequiredArgsConstructor
public class AiServiceConfigController {

    private final AiServiceConfigPort aiServiceConfigPort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'chat:view')")
    public ApiResponse<AiServiceConfigResponse> getChatbotConfig() {
        return ApiResponse.success(
                null,
                AiServiceConfigResponse.from(aiServiceConfigPort.getChatbotConfig())
        );
    }

    @PatchMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'chat:manage')")
    public ApiResponse<AiServiceConfigResponse> updateChatbotStatus(
            @Valid @RequestBody UpdateAiServiceStatusRequest request) {
        return ApiResponse.success(
                request.enabled() ? "Đã bật trợ lý AI." : "Đã tắt trợ lý AI.",
                AiServiceConfigResponse.from(aiServiceConfigPort.updateChatbotEnabled(request.enabled()))
        );
    }
}
