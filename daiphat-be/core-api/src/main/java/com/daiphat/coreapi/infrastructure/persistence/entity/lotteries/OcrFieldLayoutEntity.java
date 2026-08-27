package com.daiphat.coreapi.infrastructure.persistence.entity.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrFieldDataType;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrNormalizedBoundingBox;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "ocr_field_layouts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OcrFieldLayoutEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_id", nullable = false)
    private Long templateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "field_name", nullable = false, length = 50)
    private OcrTemplateFieldName fieldName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "bounding_box", columnDefinition = "jsonb", nullable = false)
    private OcrNormalizedBoundingBox boundingBox;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 30)
    private OcrFieldDataType dataType;

    @Column(name = "is_required", nullable = false)
    private boolean required;

    /** Lower number = try first during OCR (1 = primary). */
    @Column(name = "priority", nullable = false)
    @Builder.Default
    private int priority = 1;
}
