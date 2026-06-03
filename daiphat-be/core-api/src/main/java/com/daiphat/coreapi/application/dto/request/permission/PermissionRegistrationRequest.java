package com.daiphat.coreapi.application.dto.request.permission;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionRegistrationRequest {
    private List<PermissionItem> permissions;
}
