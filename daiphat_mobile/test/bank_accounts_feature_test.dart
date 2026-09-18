import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:daiphat_mobile/src/features/bank_accounts/domain/entities/bank_account.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/domain/repositories/bank_accounts_repository.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/domain/usecases/bank_account_usecases.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/presentation/providers/bank_accounts_providers.dart';
import 'package:daiphat_mobile/src/features/bank_accounts/presentation/views/bank_accounts_view.dart';

class _FakeBankAccountsRepository implements BankAccountsRepository {
  CreateUserBankAccountRequest? request;
  int? id;

  final account = const UserBankAccountResponse(
    id: 9,
    bankName: 'Test Bank',
    bankBin: '970000',
    bankAccountNo: '123456',
    bankAccountName: 'NGUYEN VAN A',
    isDefault: true,
  );

  @override
  Future<UserBankAccountResponse> createAccount(CreateUserBankAccountRequest request) async {
    this.request = request;
    return account;
  }

  @override
  Future<void> deleteAccount(int id) async => this.id = id;

  @override
  Future<List<VietQrBankResponse>> getBanks() async => const [];

  @override
  Future<List<UserBankAccountResponse>> getMyAccounts() async => [account];

  @override
  Future<UserBankAccountResponse> setDefaultAccount(int id) async {
    this.id = id;
    return account;
  }

  @override
  Future<UserBankAccountResponse> updateAccount(
    int id,
    CreateUserBankAccountRequest request,
  ) async {
    this.id = id;
    this.request = request;
    return account;
  }
}

void main() {
  test('bank account parser keeps numeric id and default state', () {
    final account = UserBankAccountResponse.fromJson({
      'id': 9.0,
      'bankName': 'Test Bank',
      'bankBin': '970000',
      'bankAccountNo': '123456',
      'bankAccountName': 'NGUYEN VAN A',
      'isDefault': true,
    });

    expect(account.id, 9);
    expect(account.isDefault, isTrue);
  });

  test('bank account parser accepts default fallback key from Jackson serializer', () {
    final account = UserBankAccountResponse.fromJson({
      'id': 10,
      'bankName': 'Test Bank',
      'bankBin': '970000',
      'bankAccountNo': '654321',
      'bankAccountName': 'TRAN VAN B',
      'default': true,
    });

    expect(account.id, 10);
    expect(account.isDefault, isTrue);
  });

  test('bank account use cases preserve mutation payloads', () async {
    final repository = _FakeBankAccountsRepository();
    const request = CreateUserBankAccountRequest(
      bankBin: '970000',
      bankAccountNo: '123456',
      bankAccountName: 'NGUYEN VAN A',
      agreedToRefundTerms: true,
    );

    await CreateBankAccount(repository)(request);
    expect(repository.request?.bankAccountNo, '123456');

    await UpdateBankAccount(repository)(9, request);
    expect(repository.id, 9);

    await DeleteBankAccount(repository)(9);
    expect(repository.id, 9);
  });

  testWidgets('BankAccountsView renders default badge with check icon and copy button', (tester) async {
    final repository = _FakeBankAccountsRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          bankAccountsRepositoryProvider.overrideWithValue(repository),
        ],
        child: const MaterialApp(
          home: BankAccountsView(),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Mặc định'), findsOneWidget);
    expect(find.byIcon(Icons.star_rounded), findsOneWidget);
    expect(find.byIcon(Icons.verified_rounded), findsOneWidget);
    expect(find.byIcon(Icons.copy_rounded), findsOneWidget);
    expect(find.text('Tài khoản chính'), findsOneWidget);
    expect(find.text('NGUYEN VAN A'), findsOneWidget);
  });

  testWidgets('BankAccountsView treats solitary account as default even if isDefault flag was false', (tester) async {
    final repository = _FakeBankAccountsRepository();
    // Repository returns single account with isDefault = false
    final nonDefaultSingleAccount = const UserBankAccountResponse(
      id: 9,
      bankName: 'Test Bank',
      bankBin: '970000',
      bankAccountNo: '123456',
      bankAccountName: 'NGUYEN VAN A',
      isDefault: false,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          bankAccountsRepositoryProvider.overrideWithValue(_CustomAccountsRepo([nonDefaultSingleAccount])),
        ],
        child: const MaterialApp(
          home: BankAccountsView(),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Because it is the only account, it MUST show as default
    expect(find.text('Mặc định'), findsOneWidget);
    expect(find.text('Tài khoản chính'), findsOneWidget);
    expect(find.text('Đặt mặc định'), findsNothing);
  });

  testWidgets('BankAccountsView allows bank name to wrap to multiple lines', (tester) async {
    const longBankName = 'Ngân hàng TMCP Công thương Việt Nam';
    final longNameAccount = const UserBankAccountResponse(
      id: 1,
      bankName: longBankName,
      bankBin: '970415',
      bankAccountNo: '9805507',
      bankAccountName: 'NGO TUAN KIET',
      isDefault: true,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          bankAccountsRepositoryProvider.overrideWithValue(_CustomAccountsRepo([longNameAccount])),
        ],
        child: const MaterialApp(
          home: BankAccountsView(),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    final textWidgetFinder = find.text(longBankName);
    expect(textWidgetFinder, findsOneWidget);

    final textWidget = tester.widget<Text>(textWidgetFinder);
    expect(textWidget.maxLines, greaterThan(1));
    expect(textWidget.overflow, TextOverflow.ellipsis);
  });
}

class _CustomAccountsRepo extends _FakeBankAccountsRepository {
  final List<UserBankAccountResponse> _accounts;
  _CustomAccountsRepo(this._accounts);

  @override
  Future<List<UserBankAccountResponse>> getMyAccounts() async => _accounts;
}
