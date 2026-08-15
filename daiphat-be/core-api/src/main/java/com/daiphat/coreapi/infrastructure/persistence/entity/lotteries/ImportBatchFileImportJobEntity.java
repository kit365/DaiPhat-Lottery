package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchFileJobStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One attempt to import a supplier file: who uploaded what, when, and what came
 * out of it.
 *
 * <p>Exists so that "phiếu nhập" keeps meaning a business document. The technical
 * states of a file run - pending, failed, partially successful - belong here, not
 * on a voucher that settlement reads.
 */
@Entity
@Table(name = "import_batch_file_import_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ImportBatchFileImportJobEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_hash", nullable = false, length = 64)
    private String fileHash;

    @Column(name = "file_name")
    private String fileName;

    /** The supplier's upload, kept as evidence for settlement disputes. */
    @Column(name = "original_file_url", length = 500)
    private String originalFileUrl;

    @Column(name = "original_file_public_id")
    private String originalFilePublicId;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "imported_by", nullable = false)
    private UUID importedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ImportBatchFileJobStatus status;

    @Column(name = "imports_tickets", nullable = false)
    private boolean importsTickets;

    /** Comma-separated ISO dates the operator selected, for a readable history row. */
    @Column(name = "requested_draw_dates", length = 255)
    private String requestedDrawDates;

    @Column(name = "requested_count", nullable = false)
    private int requestedCount;

    @Column(name = "created_count", nullable = false)
    private int createdCount;

    @Column(name = "failed_count", nullable = false)
    private int failedCount;

    @Column(name = "declared_quantity", nullable = false)
    private int declaredQuantity;

    @Column(name = "imported_quantity", nullable = false)
    private int importedQuantity;

    @Column(name = "error_code", length = 30)
    private String errorCode;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;
}
