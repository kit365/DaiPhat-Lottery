package com.daiphat.accountservice.domain.valueobject;

import com.daiphat.accountservice.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactInfo {
    @JsonView(Views.Public.class)
    private String fullName;
    
    @JsonView(Views.Public.class)
    private String phone;
}
