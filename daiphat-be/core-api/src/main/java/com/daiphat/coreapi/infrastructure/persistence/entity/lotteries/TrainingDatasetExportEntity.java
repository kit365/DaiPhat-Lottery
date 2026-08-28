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
import java.util.Map;

@Entity
@Table(name = "training_dataset_export")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TrainingDatasetExportEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "filter_json", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> filterJson;

    @Column(name = "file_path", length = 1000)
    private String filePath;

    @Column(name = "row_count", nullable = false)
    private long rowCount;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "used_for_model_id")
    private Long usedForModelId;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "exported_at")
    private LocalDateTime exportedAt;
}
