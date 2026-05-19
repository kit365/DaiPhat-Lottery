package com.daiphat.accountservice.application.dto.response.base;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    @JsonView(Views.Public.class)
    @Builder.Default
    boolean isSuccess = true;
    
    @JsonView(Views.Public.class)
    @Builder.Default
    LocalDateTime timestamp = LocalDateTime.now();
    
    @JsonView(Views.Public.class)
    String message;

    @JsonView(Views.Public.class)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    T data;
}
