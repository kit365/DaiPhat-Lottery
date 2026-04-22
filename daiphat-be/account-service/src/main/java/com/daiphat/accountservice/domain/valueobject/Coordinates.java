package com.daiphat.accountservice.domain.valueobject;

import com.daiphat.accountservice.application.dto.response.base.Views;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.*;

/**
 * Value Object cho tọa độ địa lý.
 * Bất biến (Immutable) và không có định danh riêng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Coordinates {
    @JsonView(Views.Public.class)
    private Double longitude;
    
    @JsonView(Views.Public.class)
    private Double latitude;
    
    public boolean hasCoordinates() {
        return longitude != null && latitude != null;
    }
}
