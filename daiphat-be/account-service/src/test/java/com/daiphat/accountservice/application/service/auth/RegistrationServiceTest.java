package com.daiphat.accountservice.application.service.auth;
import com.daiphat.accountservice.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.accountservice.application.event.UserRegisteredEvent;
import com.daiphat.accountservice.application.mapper.UserApplicationMapper;
import com.daiphat.accountservice.application.port.in.auth.RegistrationServicePort;
import com.daiphat.accountservice.application.port.in.auth.RoleServicePort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.application.port.out.auth.cache.VerificationCachePort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionStatus;

import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;


@ExtendWith(MockitoExtension.class)
class RegistrationServiceTest extends AuthTestBase {

    private RegistrationServicePort registrationService;
    private Validator validator;
 
    // Specific Mocks for Registration
    @Mock private UserRepositoryPort userRepositoryPort;
    @Mock private RoleServicePort roleService;
    @Mock private UserApplicationMapper userApplicationMapper;
    @Mock private VerificationCachePort verificationCachePort;
    @Mock private TransactionTemplate transactionTemplate;

    @BeforeEach
    protected void setUp() {
        super.setUp();
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }

        lenient().when(roleService.getDefaultRole()).thenReturn(
                RoleModel.builder()
                        .id(UUID.randomUUID())
                        .code("ROLE_USER")
                        .name("User")
                        .build()
        );

        registrationService = new RegistrationService(
                userRepositoryPort,
                identityManagementPort,
                roleService,
                userApplicationMapper,
                verificationCachePort,
                authProperties,
                lockManager,
                transactionTemplate,
                loginAttemptService,
                rateLimiterService,
                eventPublisher,
                userLookupService,
                userValidationService
        );
    }

    private UserRegistrationRequest createValidRequest() {
        return UserRegistrationRequest.builder()
                .username("daiphat_user")
                .email("test@daiphat.com")
                .password("Password123!")
                .firstName("Dai")
                .lastName("Phat")
                .phone("0987654321")
                .agreedToTerms(true)
                .build();
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "001: Đăng ký thành công với tất cả thông tin hợp lệ")
    void register_Success() {
        // GIVEN
        UserRegistrationRequest request = createValidRequest();
        UserModel mockUser = mock(UserModel.class);

        when(userApplicationMapper.mapToUserModel(request)).thenReturn(mockUser);
        when(identityManagementPort.createUser(any(), anyString(), eq(false))).thenReturn(UUID.randomUUID());

        // Mock transaction execution
        doAnswer(invocation -> {
            Consumer<TransactionStatus> callback = invocation.getArgument(0);
            callback.accept(null);
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        // WHEN
        assertDoesNotThrow(() -> registrationService.register(request));

        // THEN
        verify(userRepositoryPort).save(mockUser);
        verify(eventPublisher).publishEvent(any(UserRegisteredEvent.class));
        verify(lockManager).unlock(anyString());
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "002: Đăng ký thất bại - Username đã tồn tại")
    void register_Fail_UsernameExisted() {
        // GIVEN
        UserRegistrationRequest request = createValidRequest();
        doThrow(new DomainException(ErrorCode.USERNAME_EXISTED))
                .when(userValidationService).ensureUsernameAvailable(request.username(), null);

        // WHEN
        DomainException exception = assertThrows(DomainException.class, () -> registrationService.register(request));

        // THEN
        assertEquals(ErrorCode.USERNAME_EXISTED, exception.getErrorCode());
        verify(userRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "003: Đăng ký thất bại - Email đã tồn tại")
    void register_Fail_EmailExisted() {
        // GIVEN
        UserRegistrationRequest request = createValidRequest();
        doThrow(new DomainException(ErrorCode.EMAIL_EXISTED))
                .when(userValidationService).ensureEmailAvailable(request.email(), null);

        // WHEN
        DomainException exception = assertThrows(DomainException.class, () -> registrationService.register(request));

        // THEN
        assertEquals(ErrorCode.EMAIL_EXISTED, exception.getErrorCode());
        verify(userRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "004: Đăng ký thất bại - Số điện thoại đã tồn tại")
    void register_Fail_PhoneExisted() {
        // GIVEN
        UserRegistrationRequest request = createValidRequest();
        doThrow(new DomainException(ErrorCode.PHONE_EXISTED))
                .when(userValidationService).ensurePhoneAvailable(request.phone(), null);

        // WHEN
        DomainException exception = assertThrows(DomainException.class, () -> registrationService.register(request));

        // THEN
        assertEquals(ErrorCode.PHONE_EXISTED, exception.getErrorCode());
        verify(userRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "013: Đăng ký - Luồng xác minh email thành công")
    void verifyEmail_Success() {
        // GIVEN
        String token = "valid-token";
        String email = "test@daiphat.com";
        UserModel mockUser = mock(UserModel.class);

        when(verificationCachePort.getEmailByVerificationToken(token)).thenReturn(java.util.Optional.of(email));
        when(userLookupService.findByEmailOrThrow(email)).thenReturn(mockUser);
        when(mockUser.isEmailVerified()).thenReturn(false);
        when(mockUser.getId()).thenReturn(UUID.randomUUID());

        // Mock transaction execution
        doAnswer(invocation -> {
            Consumer<TransactionStatus> callback = invocation.getArgument(0);
            callback.accept(null);
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        // WHEN
        assertDoesNotThrow(() -> registrationService.verifyEmail(token));

        // THEN
        verify(mockUser).activate();
        verify(userRepositoryPort).save(mockUser);
        verify(identityManagementPort).verifyEmail(any());
        verify(verificationCachePort).deleteVerificationToken(token);
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "016: Đăng ký - Ngăn chặn SQL Injection (Xử lý như chuỗi bình thường)")
    void register_Success_PreventSqlInjection() {
        // GIVEN
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .username("' OR '1'='1") // SQL Injection attempt
                .build();
        UserModel mockUser = mock(UserModel.class);

        when(userApplicationMapper.mapToUserModel(request)).thenReturn(mockUser);
        when(identityManagementPort.createUser(any(), anyString(), eq(false))).thenReturn(UUID.randomUUID());

        doAnswer(invocation -> {
            Consumer<org.springframework.transaction.TransactionStatus> callback = invocation.getArgument(0);
            callback.accept(null);
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        assertDoesNotThrow(() -> registrationService.register(request));

        verify(userRepositoryPort).save(mockUser);
        verify(identityManagementPort).createUser(any(), anyString(), eq(false));
    }


    @Test
    @DisplayName(TC_REG_PREFIX + "005: Đăng ký - Định dạng email không hợp lệ")
    void validation_Fail_InvalidEmailFormat() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .email("abcdef")
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_EMAIL_INVALID)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "006: Đăng ký - Định dạng số điện thoại không hợp lệ")
    void validation_Fail_InvalidPhoneFormat() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .phone("abc123")
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_PHONE_PATTERN)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "007: Đăng ký - Trường Họ để trống")
    void validation_Fail_EmptyLastName() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .lastName("")
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_LASTNAME_REQUIRED)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "008: Đăng ký - Trường Tên để trống")
    void validation_Fail_EmptyFirstName() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .firstName("")
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_FIRSTNAME_REQUIRED)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "009: Đăng ký - Trường Username để trống")
    void validation_Fail_EmptyUsername() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .username("")
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_USERNAME_REQUIRED)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "010: Đăng ký - Trường Email để trống")
    void validation_Fail_EmptyEmail() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .email("")
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_EMAIL_REQUIRED)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "011: Đăng ký - Trường Số điện thoại để trống")
    void validation_Fail_EmptyPhone() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .phone("")
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_PHONE_REQUIRED)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "012: Đăng ký - Xác thực độ mạnh mật khẩu")
    void validation_Fail_WeakPassword() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .password("123456") // Weak password
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_PASSWORD_PATTERN)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "015: Đăng ký - Chấp nhận Điều khoản & Điều kiện")
    void validation_Fail_TermsNotAgreed() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .agreedToTerms(false) // Terms not agreed
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_TERMS_REQUIRED)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "017: Đăng ký - Username có khoảng trắng")
    void validation_Fail_UsernameWithSpace() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .username("daiphat user") // Space in middle
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_USERNAME_PATTERN)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "018: Đăng ký - Username viết hoa")
    void validation_Fail_UsernameWithUppercase() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .username("DaiPhat") // Uppercase letters
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_USERNAME_PATTERN)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "019: Đăng ký - Verification link hết hạn")
    void verifyEmail_Fail_TokenExpired() {
        // GIVEN
        String token = "expired-token";
        when(verificationCachePort.getEmailByVerificationToken(token)).thenReturn(java.util.Optional.empty());

        // WHEN
        DomainException exception = assertThrows(DomainException.class, () -> registrationService.verifyEmail(token));

        // THEN
        assertEquals(ErrorCode.VERIFY_TOKEN_EXPIRED, exception.getErrorCode());
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "020: Đăng ký - Gửi lại email xác thực thành công")
    void resendVerificationEmail_Success() {
        // GIVEN
        String oldToken = "old-verification-token";
        UserModel mockUser = mock(UserModel.class);
        when(userLookupService.findByEmailOrThrow(DEFAULT_EMAIL)).thenReturn(mockUser);
        when(mockUser.isEmailVerified()).thenReturn(false);
        when(verificationCachePort.getOldTokenByEmail(DEFAULT_EMAIL)).thenReturn(java.util.Optional.of(oldToken));

        // WHEN
        assertDoesNotThrow(() -> registrationService.resendVerificationEmail(DEFAULT_EMAIL));

        // THEN
        verify(rateLimiterService).checkAndRecord(eq(DEFAULT_EMAIL), eq(com.daiphat.accountservice.application.port.out.auth.keys.AuthAction.RESEND_VERIFICATION));
        verify(verificationCachePort).deleteVerificationToken(oldToken);
        verify(verificationCachePort).saveVerificationToken(anyString(), eq(DEFAULT_EMAIL), any());
        verify(eventPublisher).publishEvent(any(UserRegisteredEvent.class));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "021: Đăng ký - Trạng thái PENDING mặc định")
    void register_Success_InitialStatusPending() {
        // GIVEN
        UserRegistrationRequest request = createValidRequest();
        UserModel realUser = new UserModel();
        
        when(userApplicationMapper.mapToUserModel(request)).thenReturn(realUser);
        when(identityManagementPort.createUser(any(), anyString(), eq(false))).thenReturn(UUID.randomUUID());
        
        doAnswer(invocation -> {
            Consumer<org.springframework.transaction.TransactionStatus> callback = invocation.getArgument(0);
            callback.accept(null);
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        // WHEN
        registrationService.register(request);

        // THEN
        assertEquals(UserStatus.PENDING, realUser.getStatus());
        assertFalse(realUser.isEmailVerified());
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "022: Đăng ký - Password quá dài (Max 128)")
    void validation_Fail_PasswordTooLong() {
        UserRegistrationRequest request = createValidRequest().toBuilder()
                .password("A".repeat(10000)) // Extreme length as requested
                .build();

        Set<ConstraintViolation<UserRegistrationRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().equals(UserRegistrationRequest.MSG_PASSWORD_LENGTH)));
    }

    @Test
    @DisplayName(TC_REG_PREFIX + "023: Đăng ký - Rollback khi gặp sự cố")
    void register_Fail_RollbackOnIdentityError() {
        // GIVEN
        UserRegistrationRequest request = createValidRequest();
        UserModel mockUser = mock(UserModel.class);
        UUID keycloakId = UUID.randomUUID();
        
        when(userApplicationMapper.mapToUserModel(request)).thenReturn(mockUser);
        
        // Simulating failure AFTER identity creation but BEFORE DB save
        when(identityManagementPort.createUser(any(), anyString(), eq(false))).thenReturn(keycloakId);
        doThrow(new DomainException(ErrorCode.INTERNAL_SERVER_ERROR)).when(transactionTemplate).executeWithoutResult(any());

        // WHEN & THEN
        assertThrows(DomainException.class, () -> registrationService.register(request));
        
        // VERIFY ROLLBACK
        verify(identityManagementPort).deleteUser(keycloakId);
    }
}
