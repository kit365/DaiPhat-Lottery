import 'package:daiphat_mobile/src/features/bank_accounts/domain/entities/bank_account.dart';
import 'package:daiphat_mobile/src/shared/network/api_client.dart';

class BankAccountRemoteDataSource {
  static const _baseBankAccounts = '/users/me/bank-accounts';

  final ApiClient _apiClient;

  BankAccountRemoteDataSource(this._apiClient);

  Future<List<UserBankAccountResponse>> getMyAccounts() async {
    final response = await _apiClient.get(_baseBankAccounts);
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
      _baseBankAccounts,
      data: request.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>;
    return UserBankAccountResponse.fromJson(data);
  }

  Future<UserBankAccountResponse> updateAccount(
    int id,
    CreateUserBankAccountRequest request,
  ) async {
    final response = await _apiClient.put(
      '$_baseBankAccounts/$id',
      data: request.toJson(),
    );
    final data = response['data'] as Map<String, dynamic>;
    return UserBankAccountResponse.fromJson(data);
  }

  Future<void> deleteAccount(int id) async {
    await _apiClient.delete('$_baseBankAccounts/$id');
  }

  Future<UserBankAccountResponse> setDefaultAccount(int id) async {
    final response = await _apiClient.patch(
      '$_baseBankAccounts/$id/default',
    );
    final data = response['data'] as Map<String, dynamic>;
    return UserBankAccountResponse.fromJson(data);
  }
}
