package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.infrastructure.persistence.entity.auth.RoleEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.refund.UserBankAccountEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.RoleRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.refund.UserBankAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

/** Stable identities for the rolling official demo dataset. */
@Component
@Order(21)
@RequiredArgsConstructor
@ConditionalOnProperty(value = "daiphat.official-demo.seed.enabled", havingValue = "true")
public class OfficialDemoAccountSeedInitializer implements ApplicationRunner {

    private static final String ACTOR = "official-demo-seed";
    private static final String BANK_NAME = "Ngân hàng TMCP Ngoại thương Việt Nam";
    private static final String BANK_BIN = "970436";

    private static final List<Account> STAFF = List.of(
            new Account("nguyenhoangan1", "nguyenhoangan1@daiphat.com", "AnNH123A",
                    "An", "Nguyễn Hoàng", "0903800121", "MALE", LocalDate.of(1991, 4, 12), null),
            new Account("tranthiminhchau2", "tranthiminhchau2@daiphat.com", "ChauTTM123A",
                    "Châu", "Trần Thị Minh", "0903800122", "FEMALE", LocalDate.of(1993, 8, 21), null),
            new Account("lequocbao3", "lequocbao3@daiphat.com", "BaoLQ123A",
                    "Bảo", "Lê Quốc", "0903800123", "MALE", LocalDate.of(1990, 11, 8), null)
    );

    private static final List<Account> MEMBERS = List.of(
            new Account("phamngoclinh1", "phamngoclinh1@daiphat.com", "LinhPN123A",
                    "Linh", "Phạm Ngọc", "0903800131", "FEMALE", LocalDate.of(1996, 3, 16), "0123456789012"),
            new Account("vominhquan2", "vominhquan2@daiphat.com", "QuanVM123A",
                    "Quân", "Võ Minh", "0903800132", "MALE", LocalDate.of(1994, 6, 5), "0123456789013"),
            new Account("dangthikimngan3", "dangthikimngan3@daiphat.com", "NganDTK123A",
                    "Ngân", "Đặng Thị Kim", "0903800133", "FEMALE", LocalDate.of(1998, 12, 2), "0123456789014")
    );

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserBankAccountRepository userBankAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        RoleEntity staffRole = roleRepository.findByCode(RoleConstants.ROLE_STAFF_OPERATOR)
                .orElseThrow(() -> new IllegalStateException("Missing STAFF role"));
        RoleEntity memberRole = roleRepository.findByCode(RoleConstants.ROLE_MEMBER)
                .orElseThrow(() -> new IllegalStateException("Missing MEMBER role"));
        for (Account account : STAFF) {
            upsertAccount(account, staffRole);
        }
        for (Account account : MEMBERS) {
            UserEntity member = upsertAccount(account, memberRole);
            ensureBankAccount(member, account);
        }
    }

    private UserEntity upsertAccount(Account account, RoleEntity role) {
        LocalDateTime now = LocalDateTime.now(clock);
        UserEntity user = userRepository.findByUsername(account.username())
                .orElseGet(() -> UserEntity.builder()
                        .username(account.username())
                        .createdAt(now)
                        .createdBy(ACTOR)
                        .build());
        // UserEntity auditing replaces createdBy with SYSTEM on insert. Match the
        // reserved username *and* email so a real account with that username is
        // never silently repurposed on a later restart.
        if (user.getId() != null && !account.email().equalsIgnoreCase(user.getEmail())) {
            throw new IllegalStateException("Demo username belongs to a non-demo user: " + account.username());
        }
        user.setRole(role);
        user.setEmail(account.email());
        user.setPassword(passwordEncoder.encode(account.password()));
        user.setFirstName(account.firstName());
        user.setLastName(account.lastName());
        user.setPhone(account.phone());
        user.setGender(account.gender());
        user.setDob(account.dob());
        user.setAge(Period.between(account.dob(), LocalDate.now(clock)).getYears());
        user.setStatus("ACTIVE");
        user.setEmailVerified(true);
        user.setAgreedToTerms(true);
        user.setHasPassword(true);
        user.setFailedLoginAttempts(0);
        user.setUpdatedAt(now);
        user.setLastModifiedBy(ACTOR);
        return userRepository.save(user);
    }

    private void ensureBankAccount(UserEntity member, Account account) {
        List<UserBankAccountEntity> accounts =
                userBankAccountRepository.findByUser_IdOrderByIsDefaultDescCreatedAtAsc(member.getId());
        UserBankAccountEntity bankAccount = accounts.stream()
                .filter(existing -> BANK_BIN.equals(existing.getBankBin())
                        && account.bankAccountNo().equals(existing.getBankAccountNo()))
                .findFirst()
                .orElseGet(() -> UserBankAccountEntity.builder()
                        .user(member)
                        .createdBy(ACTOR)
                        .build());
        bankAccount.setBankName(BANK_NAME);
        bankAccount.setBankBin(BANK_BIN);
        bankAccount.setBankAccountNo(account.bankAccountNo());
        bankAccount.setBankAccountName((account.lastName() + " " + account.firstName()).toUpperCase());
        bankAccount.setDefault(accounts.isEmpty() || bankAccount.isDefault());
        bankAccount.setLastModifiedBy(ACTOR);
        userBankAccountRepository.save(bankAccount);
    }

    private record Account(String username, String email, String password, String firstName,
                           String lastName, String phone, String gender, LocalDate dob, String bankAccountNo) {
    }
}
