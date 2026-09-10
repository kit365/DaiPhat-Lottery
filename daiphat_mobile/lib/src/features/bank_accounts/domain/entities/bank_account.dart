class UserBankAccountResponse {
  final int id;
  final String bankName;
  final String? bankLogo;
  final String bankBin;
  final String bankAccountNo;
  final String bankAccountName;
  final bool isDefault;
  final String? createdAt;
  final String? updatedAt;

  const UserBankAccountResponse({
    required this.id,
    required this.bankName,
    required this.bankBin,
    required this.bankAccountNo,
    required this.bankAccountName,
    required this.isDefault,
    this.bankLogo,
    this.createdAt,
    this.updatedAt,
  });

  factory UserBankAccountResponse.fromJson(Map<String, dynamic> json) {
    return UserBankAccountResponse(
      id: (json['id'] as num?)?.toInt() ?? 0,
      bankName: json['bankName']?.toString() ?? '',
      bankLogo: json['bankLogo']?.toString(),
      bankBin: json['bankBin']?.toString() ?? '',
      bankAccountNo: json['bankAccountNo']?.toString() ?? '',
      bankAccountName: json['bankAccountName']?.toString() ?? '',
      isDefault: json['isDefault'] as bool? ?? false,
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
    );
  }
}

class CreateUserBankAccountRequest {
  final String bankBin;
  final String bankAccountNo;
  final String bankAccountName;
  final bool isDefault;
  final bool agreedToRefundTerms;

  const CreateUserBankAccountRequest({
    required this.bankBin,
    required this.bankAccountNo,
    required this.bankAccountName,
    this.isDefault = false,
    required this.agreedToRefundTerms,
  });

  Map<String, dynamic> toJson() => {
    'bankBin': bankBin,
    'bankAccountNo': bankAccountNo,
    'bankAccountName': bankAccountName,
    'isDefault': isDefault,
    'agreedToRefundTerms': agreedToRefundTerms,
  };
}

class VietQrBankResponse {
  final String code;
  final String bin;
  final String name;
  final String shortName;
  final String? logo;

  const VietQrBankResponse({
    required this.code,
    required this.bin,
    required this.name,
    required this.shortName,
    this.logo,
  });

  factory VietQrBankResponse.fromJson(Map<String, dynamic> json) {
    return VietQrBankResponse(
      code: json['code']?.toString() ?? '',
      bin: json['bin']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      shortName: json['shortName']?.toString() ?? '',
      logo: json['logo']?.toString(),
    );
  }
}
