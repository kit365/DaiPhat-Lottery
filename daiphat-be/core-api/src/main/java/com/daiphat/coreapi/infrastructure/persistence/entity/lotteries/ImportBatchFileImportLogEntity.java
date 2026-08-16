package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Records that a given upload already produced a batch for a given draw date.
 *
 * <p>The unique key (file hash, supplier, draw date, operator) blocks a double
 * submit while still letting the same weekly file be uploaded again tomorrow to
 * pick up the next draw date.
 */
@Entity
@Table(name = "import_batch_file_import_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ImportBatchFileImportLogEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_hash", nullable = false, length = 64)
    private String fileHash;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "draw_date", nullable = false)
    private LocalDate drawDate;

    @Column(name = "imported_by", nullable = false)
    private UUID importedBy;

    @Column(name = "import_batch_id", nullable = false)
    private Long importBatchId;

    @Column(name = "line_count", nullable = false)
    private int lineCount;

    /** The run that produced this batch. */
    @Column(name = "job_id")
    private Long jobId;

    /** The supplier's upload, kept as evidence for settlement disputes. */
    @Column(name = "original_file_url", length = 500)
    private String originalFileUrl;

    @Column(name = "original_file_public_id")
    private String originalFilePublicId;
}
