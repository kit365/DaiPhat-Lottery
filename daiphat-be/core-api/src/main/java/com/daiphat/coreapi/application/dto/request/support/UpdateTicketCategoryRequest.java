package com.daiphat.coreapi.application.dto.request.support;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTicketCategoryRequest {

    @jakarta.validation.constraints.NotBlank(message = "Tên danh mục không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Độ ưu tiên không được để trống")
    private Integer priority;

    @NotNull(message = "Trạng thái hoạt động không được để trống")
    private Boolean isActive;
}
