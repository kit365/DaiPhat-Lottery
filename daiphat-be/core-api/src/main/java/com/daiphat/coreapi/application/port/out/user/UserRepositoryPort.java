package com.daiphat.coreapi.application.port.out.user;

import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepositoryPort {
    Optional<UserModel> findByUsernameOrEmail(String usernameOrEmail);

    Optional<UserModel> findById(UUID id);

    Optional<UserModel> findByUsername(String username);

    Optional<UserModel> findByEmail(String email);

    List<UserModel> findAll();

    UserModel save(UserModel user);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsById(UUID id);

    Page<UserModel> findAll(Pageable pageable, String search, UserStatus status, List<String> roleIds);

    long countAll(String search, List<String> roleIds);

    long countByStatus(UserStatus status, String search, List<String> roleIds);

    void deleteById(UUID id);

    Optional<String> findStaffInviteTokenByEmail(String email);

    void savePendingStaffInvite(
            String email,
            String roleCode,
            String token,
            UUID invitedById,
            LocalDateTime invitedAt,
            LocalDateTime expiresAt
    );

    void approveStaffInviteByToken(String token);
}
