package com.daiphat.coreapi.adapter.in.web.controller.chat;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.chat.ChatAiStatusResponse;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/chat/ai-status")
@RequiredArgsConstructor
public class ChatAiStatusController {

    private final AiServiceConfigPort aiServiceConfigPort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STREET_AGENT + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ChatAiStatusResponse> getStatus() {
        return ApiResponse.success(
                null,
                new ChatAiStatusResponse(aiServiceConfigPort.isChatbotEnabled())
        );
    }
}
