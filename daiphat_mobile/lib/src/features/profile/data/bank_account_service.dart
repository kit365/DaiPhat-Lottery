import 'package:daiphat_mobile/src/features/checkout/models/refund_type.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';

class BankAccountService {
  final ApiClient _apiClient;

  BankAccountService(this._apiClient);

  Future<List<UserBankAccountResponse>> getMyAccounts() async {
    final response = await _apiClient.get('/users/me/bank-accounts');
    final data = response['data'] as List<dynamic>? ?? const [];
    return data
        .map(
          (e) => UserBankAccountResponse.fromJson(e as Map<String, dynamic>),
        )
        .toList();
  }

  Future<List<VietQrBankResponse>> getBanks() async {
    final response = await _apiClient.get('/banks');
    final data = response['data'] as List<dynamic>? ?? const [];
    return data
        .map((e) => VietQrBankResponse.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<UserBankAccountResponse> createAccount(
    CreateUserBankAccountRequest request,
  ) async {
    final response = await _apiClient.post(
      '/users/me/bank-accounts',
      data: request.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>;
    return UserBankAccountResponse.fromJson(data);
  }
}
