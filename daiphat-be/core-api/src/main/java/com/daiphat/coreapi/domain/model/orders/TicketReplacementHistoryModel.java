package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.model.enums.order.TicketIncidentReason;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketReplacementHistoryModel {
    private Long id;
    private UUID orderId;
    private Long orderDetailId;
    private Long oldTicketSerialId;
    private Long newTicketSerialId;
    private String faultedBy;
    private TicketIncidentReason reason;
    private String damagedReason;
    private String damagedEvidenceUrl;
    private String note;
    private UUID handledBy;
    private LocalDateTime createdAt;
}
