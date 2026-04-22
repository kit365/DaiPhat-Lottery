package com.daiphat.accountservice.application.dto.request.permission;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionItem {
    private String code;
    private String name;
    private String description;
    private String module;
    private Integer position;
}
