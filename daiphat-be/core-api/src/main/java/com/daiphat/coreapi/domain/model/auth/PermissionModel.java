package com.daiphat.coreapi.domain.model.auth;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PermissionModel {
    private String code;
    private String name;
    private String description;
    private String module;
    private Integer position;
}
