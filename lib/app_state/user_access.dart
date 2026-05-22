import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import 'static_admins.dart';
import '../enums/user_role.dart';

class UserAccessState {
  const UserAccessState({
    required this.userId,
    required this.role,
    required this.approved,
    required this.status,
    required this.loaded,
  });

  final String? userId;
  final UserRole role;
  final bool approved;
  final String status;
  final bool loaded;

  bool get isAdmin => role == UserRole.admin;
  bool get isInstructor => role == UserRole.instructor;
  bool get isInstructorApproved => isInstructor && approved;
  bool get isActive => status.isEmpty || status.toLowerCase() == 'active';

  UserAccessState copyWith({
    String? userId,
    UserRole? role,
    bool? approved,
    String? status,
    bool? loaded,
  }) {
    return UserAccessState(
      userId: userId ?? this.userId,
      role: role ?? this.role,
      approved: approved ?? this.approved,
      status: status ?? this.status,
      loaded: loaded ?? this.loaded,
    );
  }

  static UserAccessState signedOut() {
    return const UserAccessState(
      userId: null,
      role: UserRole.student,
      approved: false,
      status: '',
      loaded: false,
    );
  }
}

class UserAccess {
  static final ValueNotifier<UserAccessState> current =
      ValueNotifier<UserAccessState>(UserAccessState.signedOut());
  static final ValueNotifier<bool> _isAdmin =
      ValueNotifier<bool>(false);

  static ValueListenable<bool> get isAdminListenable => _isAdmin;
  static bool get isAdmin => _isAdmin.value;

  static StreamSubscription<User?>? _authSubscription;
  static StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>?
      _userDocSubscription;

  static void bindAuth() {
    if (_authSubscription != null) return;
    _authSubscription = FirebaseAuth.instance
        .authStateChanges()
        .listen(_handleAuth);
  }

  static Future<UserAccessState> refreshCurrent() async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      final UserAccessState state = UserAccessState.signedOut();
      _setState(state);
      return state;
    }
    final bool isStaticAdmin =
        StaticAdmins.isAdminEmail((user.email ?? '').trim());
    try {
      await _ensureUserDoc(user);
    } catch (_) {}
    try {
      final DocumentSnapshot<Map<String, dynamic>> snapshot =
          await FirebaseFirestore.instance
              .collection('users')
              .doc(user.uid)
              .get();
      final UserAccessState state = _fromSnapshot(user, snapshot);
      _setState(state);
      return state;
    } catch (_) {
      final UserAccessState fallback = UserAccessState(
        userId: user.uid,
        role: isStaticAdmin ? UserRole.admin : UserRole.student,
        approved: isStaticAdmin,
        status: isStaticAdmin ? 'active' : '',
        loaded: true,
      );
      _setState(fallback);
      return fallback;
    }
  }

  static Future<void> _handleAuth(User? user) async {
    await _userDocSubscription?.cancel();
    _userDocSubscription = null;
    if (user == null) {
      _setState(UserAccessState.signedOut());
      return;
    }
    final bool isStaticAdmin =
        StaticAdmins.isAdminEmail((user.email ?? '').trim());
    _setState(
      UserAccessState(
        userId: user.uid,
        role: isStaticAdmin ? UserRole.admin : UserRole.student,
        approved: isStaticAdmin,
        status: isStaticAdmin ? 'active' : '',
        loaded: false,
      ),
    );
    try {
      await _ensureUserDoc(user);
    } catch (_) {}
    _userDocSubscription = FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .snapshots()
        .listen(
      (snapshot) {
        _setState(_fromSnapshot(user, snapshot));
      },
      onError: (_) {
        final bool isStaticAdminFallback =
            StaticAdmins.isAdminEmail((user.email ?? '').trim());
        _setState(
          UserAccessState(
            userId: user.uid,
            role: isStaticAdminFallback ? UserRole.admin : UserRole.student,
            approved: isStaticAdminFallback,
            status: isStaticAdminFallback ? 'active' : '',
            loaded: true,
          ),
        );
      },
    );
  }

  static Future<void> _ensureUserDoc(User user) async {
    final DocumentReference<Map<String, dynamic>> doc =
        FirebaseFirestore.instance.collection('users').doc(user.uid);
    final DocumentSnapshot<Map<String, dynamic>> snapshot =
        await doc.get();
    final Map<String, dynamic> data = snapshot.data() ?? {};
    final Map<String, dynamic> payload = {};
    final bool isStaticAdmin =
        StaticAdmins.isAdminEmail((user.email ?? '').trim());

    // Keep static admin accounts consistent across devices/sessions.
    if (isStaticAdmin) {
      if ((data['role'] ?? '').toString().trim().toLowerCase() != 'admin') {
        payload['role'] = 'admin';
      }
      if (data['approved'] != true) {
        payload['approved'] = true;
      }
      if ((data['status'] ?? '').toString().trim().toLowerCase() != 'active') {
        payload['status'] = 'active';
      }
    }

    // Only sync neutral profile fields for non-static users.
    // Role assignment for regular users must be handled by trusted services.
    if (!snapshot.exists) {
      payload['createdAt'] = FieldValue.serverTimestamp();
    }

    final String email = (user.email ?? '').trim();
    if (email.isNotEmpty &&
        (data['email'] ?? '').toString().trim() != email) {
      payload['email'] = email;
    }
    final String displayName = (user.displayName ?? '').trim();
    final String storedName = (data['name'] ?? '').toString().trim();
    if (displayName.isNotEmpty && storedName.isEmpty) {
      payload['name'] = displayName;
    }
    final String photoUrl = (user.photoURL ?? '').trim();
    final String storedPhoto = (data['photoUrl'] ??
            data['photoURL'] ??
            data['avatarUrl'] ??
            data['imageUrl'] ??
            '')
        .toString()
        .trim();
    if (photoUrl.isNotEmpty && storedPhoto.isEmpty) {
      payload['photoUrl'] = photoUrl;
    }

    if (payload.isEmpty) return;
    payload['updatedAt'] = FieldValue.serverTimestamp();
    await doc.set(payload, SetOptions(merge: true));
  }

  static UserAccessState _fromSnapshot(
    User user,
    DocumentSnapshot<Map<String, dynamic>> snapshot,
  ) {
    final Map<String, dynamic> data = snapshot.data() ?? {};
    final String email = (data['email'] ?? user.email ?? '').toString();
    final bool isStaticAdmin =
        StaticAdmins.isAdminEmail(email.trim());
    return UserAccessState(
      userId: user.uid,
      role: isStaticAdmin
          ? UserRole.admin
          : UserRoleX.parse(data['role']?.toString()),
      approved: isStaticAdmin ? true : data['approved'] == true,
      status: isStaticAdmin
          ? 'active'
          : (data['status'] ?? '').toString(),
      loaded: true,
    );
  }

  static void _setState(UserAccessState state) {
    current.value = state;
    final bool admin = state.isAdmin;
    if (_isAdmin.value != admin) {
      _isAdmin.value = admin;
    }
  }
}
