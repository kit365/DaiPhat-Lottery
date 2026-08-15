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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Column mapping remembered for one supplier and one header layout.
 *
 * <p>This is what makes a configurable mapping worth having: without it the
 * operator would have to re-map the same columns on every upload, which is worse
 * than simply handing them a fixed template.
 */
@Entity
@Table(name = "import_batch_file_mapping_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ImportBatchFileMappingProfileEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    /** sha-256 over the normalized, sorted header labels of the file. */
    @Column(name = "header_signature", nullable = false, length = 64)
    private String headerSignature;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "mapping", nullable = false, columnDefinition = "jsonb")
    private String mapping;

    @Column(name = "use_count", nullable = false)
    private int useCount;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;
}
