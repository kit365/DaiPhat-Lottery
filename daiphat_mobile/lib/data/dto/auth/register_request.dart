class RegisterRequest {
  final String username;
  final String email;
  final String? password;
  final String firstName;
  final String lastName;
  final String? phone;
  final bool agreedToTerms;

  RegisterRequest({
    required this.username,
    required this.email,
    this.password,
    required this.firstName,
    required this.lastName,
    this.phone,
    required this.agreedToTerms,
  });

  Map<String, dynamic> toJson() {
    return {
      'username': username,
      'email': email,
      if (password != null) 'password': password,
      'firstName': firstName,
      'lastName': lastName,
      if (phone != null) 'phone': phone,
      'agreedToTerms': agreedToTerms,
    };
  }
}
