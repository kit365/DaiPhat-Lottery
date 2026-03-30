package com.smartlotto.accountservice.application.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponseDTO<T> {
    @Builder.Default
    String code = "SUCCESS";
    
    @Builder.Default
    boolean isSuccess = true;
    
    @Builder.Default
    LocalDateTime timestamp = LocalDateTime.now();
    
    String message;
    T data;
}

