class AuthToken {
  final String accessToken;
  final int? expiresIn;
  final int? refreshExpiresIn;
  final String? tokenType;

  const AuthToken({
    required this.accessToken,
    this.expiresIn,
    this.refreshExpiresIn,
    this.tokenType,
  });

  factory AuthToken.fromJson(Map<String, dynamic> json) {
    return AuthToken(
      accessToken:
          json['access_token'] as String? ??
          json['accessToken'] as String? ??
          '',
      expiresIn: (json['expires_in'] as num?)?.toInt(),
      refreshExpiresIn: (json['refresh_expires_in'] as num?)?.toInt(),
      tokenType: json['token_type'] as String?,
    );
  }
}
