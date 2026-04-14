package com.daiphat.accountservice.application.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionItemDTO {
    private String code;
    private String name;
    private String description;
    private String module;
    private Integer position;
}
