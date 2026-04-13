package com.daiphat.accountservice.application.dto.response;
 
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
 
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordPolicyResponseDTO {
    private List<PasswordRequirementDTO> requirements;
    private int minLength;
    private int maxLength;
}
