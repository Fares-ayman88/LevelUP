import 'package:firebase_auth/firebase_auth.dart';

String firebaseAuthErrorMessage(FirebaseAuthException error) {
  switch (error.code) {
    case 'invalid-email':
      return 'Please enter a valid email address.';
    case 'user-disabled':
      return 'This account has been disabled.';
    case 'user-not-found':
      return 'No account found for this email.';
    case 'wrong-password':
      return 'Incorrect password.';
    case 'invalid-credential':
      return 'Invalid email or password.';
    case 'email-already-in-use':
      return 'This email is already in use.';
    case 'operation-not-allowed':
      return 'Email/password sign-in is disabled in Firebase Auth.';
    case 'weak-password':
      return 'Password should be at least 6 characters.';
    case 'network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'too-many-requests':
      return 'Too many attempts. Try again later.';
    default:
      return error.message ?? 'Authentication failed. Please try again.';
  }
}
