import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'static_admins.dart';

const String emailOtpVerifiedField = 'emailOtpVerified';
const String emailOtpVerifiedAtField = 'emailOtpVerifiedAt';

Future<bool> requiresEmailVerification(User user) async {
  final String email = (user.email ?? '').trim().toLowerCase();
  if (email.isEmpty) return false;
  if (StaticAdmins.isAdminEmail(email)) return false;
  final bool hasPasswordProvider = user.providerData.any(
    (UserInfo provider) => provider.providerId == 'password',
  );
  if (!hasPasswordProvider) return false;
  if (user.emailVerified) return false;
  return !await isEmailOtpVerified(user);
}

Future<bool> isEmailOtpVerified(
  User user, {
  FirebaseFirestore? firestore,
}) async {
  final FirebaseFirestore db = firestore ?? FirebaseFirestore.instance;
  try {
    final DocumentSnapshot<Map<String, dynamic>> snapshot = await db
        .collection('users')
        .doc(user.uid)
        .get();
    if (!snapshot.exists) return false;
    final Map<String, dynamic> data = snapshot.data() ?? {};
    if (data[emailOtpVerifiedField] == true) return true;
    return data[emailOtpVerifiedAtField] != null;
  } catch (_) {
    return false;
  }
}

Future<void> markEmailOtpVerified(User user, {FirebaseFirestore? firestore}) {
  final FirebaseFirestore db = firestore ?? FirebaseFirestore.instance;
  return db.collection('users').doc(user.uid).set({
    'email': (user.email ?? '').trim(),
    emailOtpVerifiedField: true,
    emailOtpVerifiedAtField: FieldValue.serverTimestamp(),
    'updatedAt': FieldValue.serverTimestamp(),
  }, SetOptions(merge: true));
}
