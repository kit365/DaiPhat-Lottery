package com.daiphat.coreapi.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteStaffRequest {
    @NotBlank(message = "Role code is required")
    private String roleCode;
}
