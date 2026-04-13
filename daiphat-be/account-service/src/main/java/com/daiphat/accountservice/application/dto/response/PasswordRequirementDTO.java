package com.daiphat.accountservice.application.dto.response;
 
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
 
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordRequirementDTO {
    private String id;
    private String description;
    private String regex;
}
