package com.daiphat.coreapi.adapter.in.web.controller.publics;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.LuckyPatternConfigResponse;
import com.daiphat.coreapi.application.port.in.streetagent.LuckyPatternConfigServicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1_PUBLIC + "/lucky-pattern-configs")
@RequiredArgsConstructor
public class PublicLuckyPatternConfigController {

    private final LuckyPatternConfigServicePort luckyPatternConfigService;

    @GetMapping
    public ApiResponse<List<LuckyPatternConfigResponse>> getActive() {
        return ApiResponse.success(null, luckyPatternConfigService.getActive());
    }
}
