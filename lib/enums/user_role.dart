enum UserRole {
  student,
  instructor,
  admin,
}

extension UserRoleX on UserRole {
  String get code {
    switch (this) {
      case UserRole.admin:
        return 'admin';
      case UserRole.instructor:
        return 'instructor';
      case UserRole.student:
        return 'student';
    }
  }

  static UserRole parse(String? raw) {
    switch ((raw ?? '').toLowerCase()) {
      case 'admin':
        return UserRole.admin;
      case 'instructor':
        return UserRole.instructor;
      default:
        return UserRole.student;
    }
  }
}
