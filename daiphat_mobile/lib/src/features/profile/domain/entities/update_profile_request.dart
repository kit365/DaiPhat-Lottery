class UpdateProfileRequest {
  final String? firstName;
  final String? lastName;
  final String? phone;
  final String? email;
  final String? dob;
  final String? gender;

  const UpdateProfileRequest({
    this.firstName,
    this.lastName,
    this.phone,
    this.email,
    this.dob,
    this.gender,
  });

  Map<String, dynamic> toJson() {
    return {
      if (firstName != null && firstName!.trim().isNotEmpty)
        'firstName': firstName!.trim(),
      if (lastName != null && lastName!.trim().isNotEmpty)
        'lastName': lastName!.trim(),
      if (phone != null && phone!.trim().isNotEmpty) 'phone': phone!.trim(),
      if (dob != null && dob!.trim().isNotEmpty) 'dob': dob!.trim(),
      if (gender != null && gender!.trim().isNotEmpty)
        'gender': gender!.trim(),
    };
  }
}
