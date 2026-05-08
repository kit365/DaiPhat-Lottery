package com.daiphat.accountservice.infrastructure.persistence.specification;

import com.daiphat.accountservice.domain.model.enums.UserStatus;
import com.daiphat.accountservice.infrastructure.persistence.entity.RoleEntity_;
import com.daiphat.accountservice.infrastructure.persistence.entity.UserEntity;
import com.daiphat.accountservice.infrastructure.persistence.entity.UserEntity_;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class UserSpecification {

    public static Specification<UserEntity> filterUsers(String search, UserStatus status, List<String> roleIds) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String likePattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get(UserEntity_.username)), likePattern),
                        cb.like(cb.lower(root.get(UserEntity_.email)), likePattern),
                        cb.like(cb.lower(root.get(UserEntity_.firstName)), likePattern),
                        cb.like(cb.lower(root.get(UserEntity_.lastName)), likePattern),
                        cb.like(cb.lower(root.get(UserEntity_.phone)), likePattern)
                ));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get(UserEntity_.status), status.name()));
            }

            if (roleIds != null && !roleIds.isEmpty()) {
                List<UUID> uuids = new ArrayList<>();
                List<String> codes = new ArrayList<>();
                for (String roleId : roleIds) {
                    try {
                        uuids.add(UUID.fromString(roleId));
                    } catch (Exception e) {
                        codes.add(roleId);
                    }
                }
                
                Predicate rolePredicate = null;
                if (!uuids.isEmpty()) {
                    rolePredicate = root.get(UserEntity_.role).get(RoleEntity_.id).in(uuids);
                }
                if (!codes.isEmpty()) {
                    Predicate codePredicate = root.get(UserEntity_.role).get(RoleEntity_.code).in(codes);
                    if (rolePredicate != null) {
                        rolePredicate = cb.or(rolePredicate, codePredicate);
                    } else {
                        rolePredicate = codePredicate;
                    }
                }
                if (rolePredicate != null) {
                    predicates.add(rolePredicate);
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
