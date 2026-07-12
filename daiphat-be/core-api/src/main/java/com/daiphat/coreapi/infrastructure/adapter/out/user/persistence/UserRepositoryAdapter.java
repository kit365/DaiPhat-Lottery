package com.daiphat.coreapi.infrastructure.adapter.out.user.persistence;

import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.infrastructure.persistence.mapper.UserPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.RoleRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.UserSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepositoryPort {

    private final UserRepository userRepository;
    private final UserPersistenceMapper userPersistenceMapper;

    @Override
    public Optional<UserModel> findByUsernameOrEmail(String usernameOrEmail) {
        return userRepository.findByUsernameIgnoreCase(usernameOrEmail)
                .or(() -> userRepository.findByEmailIgnoreCase(usernameOrEmail))
                .map(userPersistenceMapper::toDomain);
    }

    @Override
    public Optional<UserModel> findById(UUID id) {
        return userRepository.findById(id).map(userPersistenceMapper::toDomainWithRolePermissions);
    }

    @Override
    public Optional<UserModel> findByUsername(String username) {
        return userRepository.findByUsername(username).map(userPersistenceMapper::toDomainWithRolePermissions);
    }

    @Override
    public Optional<UserModel> findByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email).map(userPersistenceMapper::toDomain);
    }

    @Override
    public List<UserModel> findAll() {
        return userRepository.findAll().stream()
                .map(userPersistenceMapper::toDomainWithRolePermissions)
                .toList();
    }

    @Override
    public List<UserModel> findAllByRoleCodes(List<String> roleCodes) {
        return userRepository.findAllByRole_CodeIn(roleCodes).stream()
                .map(userPersistenceMapper::toDomainWithRolePermissions)
                .toList();
    }

    @Override
    public UserModel save(UserModel user) {
        return userPersistenceMapper.toDomain(userRepository.save(userPersistenceMapper.toEntity(user)));
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public boolean existsByPhone(String phone) {
        return userRepository.existsByPhone(phone);
    }

    @Override
    public boolean existsById(UUID id) {
        return userRepository.existsById(id);
    }

    @Override
    public Page<UserModel> findAll(Pageable pageable, String search, UserStatus status, List<String> roleIds) {
        return userRepository.findAll(UserSpecification.filterUsers(search, status, roleIds), pageable)
                .map(userPersistenceMapper::toDomainWithRolePermissions);
    }

    @Override
    public long countAll(String search, List<String> roleIds) {
        return userRepository.count(UserSpecification.filterUsers(search, null, roleIds));
    }

    @Override
    public long countByStatus(UserStatus status, String search, List<String> roleIds) {
        return userRepository.count(UserSpecification.filterUsers(search, status, roleIds));
    }

    @Override
    public void deleteById(UUID id) {
        userRepository.deleteById(id);
    }

}
