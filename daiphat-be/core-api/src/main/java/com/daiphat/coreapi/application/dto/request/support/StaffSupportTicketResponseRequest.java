package com.daiphat.coreapi.application.dto.request.support;

import com.daiphat.coreapi.domain.model.enums.support.StaffTicketResponseAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StaffSupportTicketResponseRequest(
        @NotBlank @Size(max = 2000) String content,
        @NotNull StaffTicketResponseAction action
) {
}
