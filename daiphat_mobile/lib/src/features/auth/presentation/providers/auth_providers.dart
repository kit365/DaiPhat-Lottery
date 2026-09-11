import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/repositories/auth_repository.dart';
import '../../domain/usecases/auth_usecases.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  throw UnimplementedError('authRepositoryProvider must be overridden in bootstrap');
});

final changePasswordProvider = Provider<ChangePassword>((ref) {
  return ChangePassword(ref.watch(authRepositoryProvider));
});

final getPasswordPolicyProvider = Provider<GetPasswordPolicy>((ref) {
  return GetPasswordPolicy(ref.watch(authRepositoryProvider));
});
