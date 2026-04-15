package com.daiphat.accountservice.domain.model;

import lombok.*;

import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RoleModel {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private Set<PermissionModel> permissions;
}
