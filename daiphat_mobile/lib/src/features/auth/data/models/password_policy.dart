class PasswordRequirement {
  final String id;
  final String description;
  final String? regex;

  const PasswordRequirement({
    required this.id,
    required this.description,
    this.regex,
  });

  factory PasswordRequirement.fromJson(Map<String, dynamic> json) {
    return PasswordRequirement(
      id: json['id'] as String? ?? '',
      description: json['description'] as String? ?? '',
      regex: json['regex'] as String?,
    );
  }
}

class PasswordPolicy {
  final List<PasswordRequirement> requirements;
  final int minLength;
  final int maxLength;

  const PasswordPolicy({
    required this.requirements,
    required this.minLength,
    required this.maxLength,
  });

  factory PasswordPolicy.fromJson(Map<String, dynamic> json) {
    final requirementsJson = json['requirements'] as List<dynamic>? ?? const [];
    return PasswordPolicy(
      requirements: requirementsJson
          .whereType<Map<String, dynamic>>()
          .map(PasswordRequirement.fromJson)
          .toList(),
      minLength: (json['minLength'] as num?)?.toInt() ?? 6,
      maxLength: (json['maxLength'] as num?)?.toInt() ?? 100,
    );
  }

  bool isPasswordValid(String password) {
    final isLengthMet =
        password.length >= minLength && password.length <= maxLength;
    final isReqsMet = requirements
        .where((req) => req.regex != null && req.regex!.isNotEmpty)
        .every((req) => RegExp(req.regex!).hasMatch(password));
    return isLengthMet && isReqsMet;
  }
}
