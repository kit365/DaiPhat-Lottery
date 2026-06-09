class UpdateProfileRequest {
  final String? firstName;
  final String? lastName;
  final String? phone;
  final String? email;
  final String? dob;
  final String? gender;
  final String? address;

  const UpdateProfileRequest({
    this.firstName,
    this.lastName,
    this.phone,
    this.email,
    this.dob,
    this.gender,
    this.address,
  });

  Map<String, dynamic> toJson() {
    return {
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      if (phone != null) 'phone': phone,
      if (email != null) 'email': email,
      if (dob != null) 'dob': dob,
      if (gender != null) 'gender': gender,
      if (address != null) 'address': address,
    };
  }
}
