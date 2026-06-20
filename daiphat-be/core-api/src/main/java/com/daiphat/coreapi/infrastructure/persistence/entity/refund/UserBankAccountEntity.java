package com.daiphat.coreapi.infrastructure.persistence.entity.refund;

import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(
        name = "user_bank_accounts",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_bank_accounts_user_bin_account",
                        columnNames = {"user_id", "bank_bin", "bank_account_no"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBankAccountEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "bank_name", nullable = false, length = 150)
    private String bankName;

    @Column(name = "bank_logo", length = 500)
    private String bankLogo;

    @Column(name = "bank_bin", nullable = false, length = 20)
    private String bankBin;

    @Column(name = "bank_account_no", nullable = false, length = 50)
    private String bankAccountNo;

    @Column(name = "bank_account_name", nullable = false, length = 150)
    private String bankAccountName;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private boolean isDefault = false;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "last_modified_by")
    private String lastModifiedBy;

    public UUID getUserId() {
        return user != null ? user.getId() : null;
    }
}
