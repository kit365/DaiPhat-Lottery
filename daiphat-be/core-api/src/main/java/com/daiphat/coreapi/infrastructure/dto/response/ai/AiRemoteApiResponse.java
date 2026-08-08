package com.daiphat.coreapi.infrastructure.dto.response.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiRemoteApiResponse<T> {

    private boolean success;
    private String message;
    private T data;
}
