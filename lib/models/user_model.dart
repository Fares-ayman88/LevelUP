import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../app_state/static_admins.dart';
import '../enums/user_role.dart';

class UserModel {
  const UserModel({
    required this.uid,
    required this.email,
    required this.name,
    required this.role,
    required this.status,
    required this.approved,
    this.createdAt,
    this.updatedAt,
  });

  final String uid;
  final String email;
  final String name;
  final UserRole role;
  final String status;
  final bool approved;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isAdmin => role == UserRole.admin;
  bool get isInstructor => role == UserRole.instructor;
  bool get isStudent => role == UserRole.student;
  bool get isActive => status.isEmpty || status.toLowerCase() == 'active';

  UserModel copyWith({
    String? uid,
    String? email,
    String? name,
    UserRole? role,
    String? status,
    bool? approved,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      uid: uid ?? this.uid,
      email: email ?? this.email,
      name: name ?? this.name,
      role: role ?? this.role,
      status: status ?? this.status,
      approved: approved ?? this.approved,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  factory UserModel.fromFirestore(
    String uid,
    Map<String, dynamic> data,
  ) {
    final String email = (data['email'] ?? '').toString().trim();
    final bool isStaticAdmin = StaticAdmins.isAdminEmail(email);
    final UserRole parsedRole = UserRoleX.parse(data['role']?.toString());
    return UserModel(
      uid: uid,
      email: email,
      name: (data['name'] ?? data['fullName'] ?? '').toString(),
      role: isStaticAdmin ? UserRole.admin : parsedRole,
      status: isStaticAdmin ? 'active' : (data['status'] ?? '').toString(),
      approved: isStaticAdmin ? true : data['approved'] == true,
      createdAt: _toDateTime(data['createdAt']),
      updatedAt: _toDateTime(data['updatedAt']),
    );
  }

  factory UserModel.fromAuth(User user) {
    final String email = (user.email ?? '').trim();
    final String displayName = (user.displayName ?? '').trim();
    final bool isStaticAdmin = StaticAdmins.isAdminEmail(email);
    return UserModel(
      uid: user.uid,
      email: email,
      name: displayName,
      role: isStaticAdmin ? UserRole.admin : UserRole.student,
      status: 'active',
      approved: isStaticAdmin,
      createdAt: null,
      updatedAt: null,
    );
  }

  static DateTime? _toDateTime(Object? value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return null;
  }
}
