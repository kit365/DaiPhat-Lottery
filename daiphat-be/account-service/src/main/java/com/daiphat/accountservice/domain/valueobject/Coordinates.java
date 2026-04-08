package com.daiphat.accountservice.domain.valueobject;

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
    private Double longitude;
    private Double latitude;
    
    public boolean hasCoordinates() {
        return longitude != null && latitude != null;
    }
}
