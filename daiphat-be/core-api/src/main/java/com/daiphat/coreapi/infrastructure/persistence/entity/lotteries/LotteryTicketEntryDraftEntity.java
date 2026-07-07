package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.TicketEntryDraftSectionPayload;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "lottery_ticket_entry_drafts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LotteryTicketEntryDraftEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_batch_line_id", nullable = false)
    private ImportBatchLineEntity importBatchLine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operator_id", nullable = false)
    private UserEntity operator;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "draft_payload", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private List<TicketEntryDraftSectionPayload> draftPayload = new ArrayList<>();
}
