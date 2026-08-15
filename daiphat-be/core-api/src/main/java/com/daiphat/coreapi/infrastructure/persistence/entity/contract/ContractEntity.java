package com.daiphat.coreapi.infrastructure.persistence.entity.contract;

import com.daiphat.coreapi.domain.model.contract.ContractArticle;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
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

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ContractEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ContractType type;

    /** Customer-facing title printed on the PDF. */
    @Column(nullable = false, length = 255)
    private String title;

    /** Admin/staff label shown in the settings list. */
    @Column(name = "staff_name", nullable = false, length = 255)
    private String staffName;

    @Column(length = 500)
    private String subtitle;

    @Column(name = "party_a_role_label", nullable = false, length = 200)
    private String partyARoleLabel;

    @Column(name = "party_b_role_label", nullable = false, length = 200)
    private String partyBRoleLabel;

    @Column(name = "party_a_signature_label", nullable = false, length = 200)
    private String partyASignatureLabel;

    @Column(name = "party_b_signature_label", nullable = false, length = 200)
    private String partyBSignatureLabel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<ContractArticle> articles = new ArrayList<>();

    @Column(name = "footer_note", columnDefinition = "TEXT")
    private String footerNote;

    @Column(name = "based_on_id")
    private Long basedOnId;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private Boolean isDefault = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;
}
