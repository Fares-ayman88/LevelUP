import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../app_state/auth_utils.dart';
import '../app_state/onboarding_store.dart';
import '../app_state/saved_courses_store.dart';
import '../app_state/user_profile.dart';
import '../enums/user_role.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/profile_image_service.dart';

enum AuthStatus {
  idle,
  loading,
  authenticating,
  authenticated,
  unauthenticated,
  error,
}

class AuthProvider extends ChangeNotifier {
  AuthProvider._(this._service);

  static final AuthProvider instance = AuthProvider._(AuthService());

  final AuthService _service;

  bool _initialized = false;
  AuthStatus _status = AuthStatus.idle;
  User? _firebaseUser;
  UserModel? _user;
  String? _errorMessage;

  StreamSubscription<User?>? _authSubscription;
  StreamSubscription<UserModel?>? _userSubscription;

  AuthStatus get status => _status;
  String? get errorMessage => _errorMessage;
  UserModel? get user => _user;
  User? get firebaseUser => _firebaseUser;

  bool get isAuthenticated => _firebaseUser != null;
  bool get isBusy => _status == AuthStatus.authenticating;

  UserRole get role => _user?.role ?? UserRole.student;
  bool get isAdmin => role == UserRole.admin;
  bool get isInstructor => role == UserRole.instructor;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    _status = AuthStatus.loading;
    notifyListeners();
    _authSubscription =
        _service.authStateChanges().listen((User? user) {
      unawaited(_handleAuthChange(user));
    });
  }

  Future<void> _handleAuthChange(User? user) async {
    await _userSubscription?.cancel();
    _userSubscription = null;
    _firebaseUser = user;
    _user = null;
    _errorMessage = null;

    if (user == null) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    _status = AuthStatus.loading;
    notifyListeners();

    final bool isDisabled = await _checkDisabledAccount(user);
    if (isDisabled) {
      _errorMessage = 'This account has been disabled.';
      await signOut(clearLocal: true);
      _status = AuthStatus.error;
      notifyListeners();
      return;
    }

    unawaited(ProfileImageService.syncFromAuthUser(user));

    _userSubscription =
        _service.streamUserProfile(user.uid).listen(_handleUserDoc, onError: (_) {
      _user = UserModel.fromAuth(user);
      _syncUserProfile(_user);
      _status = AuthStatus.authenticated;
      notifyListeners();
    });
  }

  void _handleUserDoc(UserModel? model) {
    if (_firebaseUser == null) return;
    _user = model ?? UserModel.fromAuth(_firebaseUser!);
    _syncUserProfile(_user);

    if (_user != null && !_user!.isActive) {
      _errorMessage = 'This account has been disabled.';
      unawaited(signOut(clearLocal: true));
      _status = AuthStatus.error;
      notifyListeners();
      return;
    }

    _status = AuthStatus.authenticated;
    notifyListeners();
  }

  Future<bool> _checkDisabledAccount(User user) async {
    try {
      await user.reload();
      return false;
    } on FirebaseAuthException catch (e) {
      return e.code == 'user-disabled';
    } catch (_) {
      return false;
    }
  }

  Future<UserModel?> signInWithEmail({
    required String email,
    required String password,
  }) async {
    if (isBusy) return _user;
    _status = AuthStatus.authenticating;
    _errorMessage = null;
    notifyListeners();
    try {
      await _service.signInWithEmail(email: email, password: password);
      final UserModel? profile = await waitForProfile();
      return profile ?? _fallbackFromAuth();
    } on FirebaseAuthException catch (e) {
      _errorMessage = firebaseAuthErrorMessage(e);
    } catch (_) {
      _errorMessage = 'Something went wrong. Try again.';
    } finally {
      if (_status != AuthStatus.authenticated) {
        _status =
            _firebaseUser == null ? AuthStatus.unauthenticated : _status;
      }
      notifyListeners();
    }
    return null;
  }

  Future<UserModel?> signUpWithEmail({
    required String email,
    required String password,
  }) async {
    if (isBusy) return _user;
    _status = AuthStatus.authenticating;
    _errorMessage = null;
    notifyListeners();
    try {
      await _service.signUpWithEmail(email: email, password: password);
      final UserModel? profile = await waitForProfile();
      return profile ?? _fallbackFromAuth();
    } on FirebaseAuthException catch (e) {
      _errorMessage = firebaseAuthErrorMessage(e);
    } catch (_) {
      _errorMessage = 'Something went wrong. Try again.';
    } finally {
      if (_status != AuthStatus.authenticated) {
        _status =
            _firebaseUser == null ? AuthStatus.unauthenticated : _status;
      }
      notifyListeners();
    }
    return null;
  }

  Future<UserCredential> signInWithCredential(
    AuthCredential credential,
  ) {
    return _service.signInWithCredential(credential);
  }

  Future<UserModel?> waitForProfile({
    Duration timeout = const Duration(seconds: 6),
  }) async {
    if (_user != null) return _user;
    final Completer<UserModel?> completer = Completer<UserModel?>();
    void listener() {
      if (_user != null || _firebaseUser == null) {
        removeListener(listener);
        completer.complete(_user);
      }
    }

    addListener(listener);
    return completer.future.timeout(
      timeout,
      onTimeout: () {
        removeListener(listener);
        return _user;
      },
    );
  }

  Future<void> signOut({bool clearLocal = true}) async {
    _status = AuthStatus.authenticating;
    notifyListeners();
    try {
      await GoogleSignIn.instance.signOut();
    } catch (_) {}
    try {
      await _service.signOut();
    } catch (_) {}
    if (clearLocal) {
      await _clearLocalState();
    }
    _firebaseUser = null;
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<void> _clearLocalState() async {
    UserProfile.userName = '';
    await SavedCoursesStore.reset();
    await OnboardingStore.reset();
  }

  void _syncUserProfile(UserModel? model) {
    if (model == null) return;
    final String trimmed = model.name.trim();
    if (trimmed.isNotEmpty) {
      UserProfile.userName = trimmed;
      return;
    }
    final String email = model.email.trim();
    if (email.contains('@')) {
      UserProfile.userName = email.split('@').first;
    }
  }

  UserModel? _fallbackFromAuth() {
    final User? current = _firebaseUser;
    if (current == null) return null;
    return UserModel.fromAuth(current);
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    _userSubscription?.cancel();
    super.dispose();
  }
}
