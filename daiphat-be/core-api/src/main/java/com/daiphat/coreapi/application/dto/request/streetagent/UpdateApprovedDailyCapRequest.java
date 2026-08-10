package com.daiphat.coreapi.application.dto.request.streetagent;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Operational cap change; it never changes the signed contract ceiling. */
public record UpdateApprovedDailyCapRequest(
        @Min(value = 1, message = "Hạn mức vận hành phải lớn hơn 0") Integer approvedDailyCap,
        @NotBlank(message = "Cần nêu lý do điều chỉnh hạn mức")
        @Size(max = 500, message = "Lý do điều chỉnh không vượt quá 500 ký tự") String reason
) {}
