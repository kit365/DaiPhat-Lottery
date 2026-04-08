package com.daiphat.accountservice.domain.valueobject;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactInfo {
    private String fullName;
    private String phone;
}
