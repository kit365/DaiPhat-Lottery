package com.daiphat.coreapi.domain.model.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketCategoryModel {

    private Long id;
    private String name;
    private String code;
    private String description;
    private int priority;
    private TicketRefType requiredRefType;
    private Long parentId;
}
