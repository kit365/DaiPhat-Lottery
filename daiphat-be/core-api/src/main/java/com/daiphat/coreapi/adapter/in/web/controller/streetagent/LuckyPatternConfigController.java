package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.streetagent.UpsertLuckyPatternConfigRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.LuckyPatternConfigResponse;
import com.daiphat.coreapi.application.port.in.streetagent.LuckyPatternConfigServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lucky-pattern-configs")
@RequiredArgsConstructor
public class LuckyPatternConfigController {
    private final LuckyPatternConfigServicePort luckyPatternConfigService;

    @GetMapping
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<List<LuckyPatternConfigResponse>> getAll() { return ApiResponse.success(null, luckyPatternConfigService.getAll()); }

    @PostMapping
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<LuckyPatternConfigResponse> create(@Valid @RequestBody UpsertLuckyPatternConfigRequest request) {
        return ApiResponse.success("Đã tạo cấu hình số đẹp.", luckyPatternConfigService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<LuckyPatternConfigResponse> update(@PathVariable Long id, @Valid @RequestBody UpsertLuckyPatternConfigRequest request) {
        return ApiResponse.success("Đã cập nhật cấu hình số đẹp.", luckyPatternConfigService.update(id, request));
    }

    @PostMapping("/recompute")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<Void> recompute() { luckyPatternConfigService.recomputeAll(); return ApiResponse.success("Đã đánh dấu lại số đẹp cho vé tồn.", null); }
}
