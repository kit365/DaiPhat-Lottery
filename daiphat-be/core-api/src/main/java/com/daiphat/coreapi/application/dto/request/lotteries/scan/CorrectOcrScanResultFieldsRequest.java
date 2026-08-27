package com.daiphat.coreapi.application.dto.request.lotteries.scan;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Builder;

import java.util.List;

@Builder
public record CorrectOcrScanResultFieldsRequest(
        @NotEmpty(message = "Danh sách trường cần sửa không được để trống")
        @Valid
        List<CorrectOcrScanResultFieldRequest> fields
) {}
