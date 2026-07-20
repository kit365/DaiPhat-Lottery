package com.daiphat.coreapi.application.dto.request.settings;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
public record UpdateSystemConfigRequest(
        @NotBlank(message = "Tên cấu hình không được để trống")
        @Size(max = 255, message = "Tên cấu hình không được vượt quá 255 ký tự")
        String configName,

        @NotBlank(message = "Giá trị cấu hình không được để trống")
        String configValue,

        @NotBlank(message = "Mô tả không được để trống")
        @Size(max = 255, message = "Mô tả không được vượt quá 255 ký tự")
        String description
) {
}
