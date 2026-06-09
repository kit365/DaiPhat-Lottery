class User {
  final String id;
  final String username;
  final String accessToken;
  final String? email;
  final String? fullName;
  final String? avatarUrl;
  final String? phone;
  final String? dob;
  final String? gender;
  final String? address;

  const User({
    required this.id,
    required this.username,
    required this.accessToken,
    this.email,
    this.fullName,
    this.avatarUrl,
    this.phone,
    this.dob,
    this.gender,
    this.address,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] ?? '').toString(),
      username: json['username'] as String? ?? '',
      accessToken: '',
      email: json['email'] as String?,
      fullName: json['fullName'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      phone: (json['phone'] ?? json['phoneNumber']) as String?,
      dob: json['dob'] as String?,
      gender: json['gender'] as String?,
      address: json['address'] as String?,
    );
  }

  User copyWith({
    String? id,
    String? username,
    String? accessToken,
    String? email,
    String? fullName,
    String? avatarUrl,
    String? phone,
    String? dob,
    String? gender,
    String? address,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      accessToken: accessToken ?? this.accessToken,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      phone: phone ?? this.phone,
      dob: dob ?? this.dob,
      gender: gender ?? this.gender,
      address: address ?? this.address,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'accessToken': accessToken,
      'email': email,
      'fullName': fullName,
      'avatarUrl': avatarUrl,
      'phone': phone,
      'dob': dob,
      'gender': gender,
      'address': address,
    };
  }
}
