import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/auth_utils.dart';
import '../app_state/email_verification_gate.dart';
import '../app_state/static_admins.dart';
import '../app_state/user_access.dart';
import '../app_state/user_profile.dart';
import '../enums/user_role.dart';
import '../guards/role_guard.dart';
import '../models/user_model.dart';
import '../providers/auth_provider.dart';
import '../routes.dart';
import '../services/profile_image_service.dart';
import '../widgets/social_icon.dart';
import 'email_verification_screen.dart';
import 'forgot_password_screen.dart';

enum SignInMode { standard, resetPin }

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key, this.mode = SignInMode.standard});

  final SignInMode mode;

  bool get isResetPin => mode == SignInMode.resetPin;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  static const _primary = Color(0xFF0D65FF);

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _adminKeyController = TextEditingController();
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  bool _rememberMe = false;
  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _isGrantingAdmin = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.isResetPin) return;
      final User? user = _auth.currentUser;
      if (user != null) {
        _resumeSession();
      }
    });
  }

  Future<void> _resumeSession() async {
    final User? current = _auth.currentUser;
    if (current != null && await requiresEmailVerification(current)) {
      await AuthProvider.instance.signOut(clearLocal: true);
      return;
    }
    await AuthProvider.instance.init();
    final UserModel? profile = await AuthProvider.instance.waitForProfile();
    if (!mounted) return;
    _openRoleHome(profile);
  }

  void _toggleRememberMe() {
    setState(() => _rememberMe = !_rememberMe);
  }

  void _togglePassword() {
    setState(() => _obscurePassword = !_obscurePassword);
  }

  void _openSignUp() {
    Navigator.of(context).pushNamed(AppRoutes.signUp);
  }

  void _openRoleHome(UserModel? profile) {
    final UserRole role = profile?.role ?? UserRole.student;
    final String route = RoleGuard.routeForRole(role);
    Navigator.of(context).pushNamedAndRemoveUntil(route, (route) => false);
  }

  void _completeResetPinFlow() {
    Navigator.of(context).pop(true);
  }

  void _handleSignedIn({
    required UserModel? profile,
    bool needsProfile = false,
  }) {
    if (widget.isResetPin) {
      _completeResetPinFlow();
      return;
    }
    if (needsProfile) {
      Navigator.of(context).pushReplacementNamed(AppRoutes.fillProfile);
      return;
    }
    _openRoleHome(profile);
  }

  void _openForgotPassword() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            ForgotPasswordScreen(initialEmail: _emailController.text.trim()),
      ),
    );
  }

  void _syncUserProfile(User user) {
    final String displayName = (user.displayName ?? '').trim();
    if (displayName.isNotEmpty) {
      UserProfile.userName = displayName;
      return;
    }
    final String? email = user.email;
    if (email != null && email.contains('@')) {
      UserProfile.userName = email.split('@').first;
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<bool> _verifyEmailGate({required String fallbackEmail}) async {
    final User? user = _auth.currentUser;
    if (user == null || !await requiresEmailVerification(user)) {
      return true;
    }
    if (!mounted) return false;
    final bool? verified = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => EmailVerificationScreen(
          email: user.email ?? fallbackEmail,
          sendOnOpen: true,
        ),
      ),
    );
    if (verified == true) return true;
    await AuthProvider.instance.signOut(clearLocal: true);
    if (!mounted) return false;
    _showMessage('Verify your email to continue.');
    return false;
  }

  Future<void> _openAdminAccess() async {
    if (_isGrantingAdmin) return;
    final User? user = _auth.currentUser;
    if (user == null) {
      _showMessage('Sign in first, then request admin access.');
      return;
    }
    _adminKeyController.clear();
    bool obscure = true;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Admin access'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: _adminKeyController,
                    obscureText: obscure,
                    decoration: InputDecoration(
                      labelText: 'Admin key',
                      suffixIcon: IconButton(
                        onPressed: () => setDialogState(() {
                          obscure = !obscure;
                        }),
                        icon: Icon(
                          obscure
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Enter the secret admin key to enable admin access.',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF7F869D),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(dialogContext).pop();
                    _grantAdminAccess(_adminKeyController.text.trim());
                  },
                  child: const Text('Confirm'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _grantAdminAccess(String key) async {
    if (_isGrantingAdmin) return;
    if (key.isEmpty) {
      _showMessage('Enter the admin key.');
      return;
    }
    final User? user = _auth.currentUser;
    if (user == null) {
      _showMessage('Sign in first, then request admin access.');
      return;
    }
    setState(() => _isGrantingAdmin = true);
    try {
      final HttpsCallable callable = FirebaseFunctions.instance.httpsCallable(
        'grantAdminAccess',
      );
      await callable.call({'key': key});
      await UserAccess.refreshCurrent();
      if (!mounted) return;
      _showMessage('Admin access enabled.');
    } on FirebaseFunctionsException catch (e) {
      _showMessage(e.message ?? 'Admin access failed.');
    } catch (_) {
      _showMessage('Admin access failed.');
    } finally {
      if (mounted) {
        setState(() => _isGrantingAdmin = false);
      }
    }
  }

  Future<void> _signIn() async {
    if (_isLoading) return;
    final String rawEmail = _emailController.text.trim();
    final String password = _passwordController.text;
    if (rawEmail.isEmpty || password.isEmpty) {
      _showMessage('Enter email and password to continue.');
      return;
    }
    final bool isAdminAlias =
        !rawEmail.contains('@') && StaticAdmins.isAlias(rawEmail);
    final String email = isAdminAlias
        ? StaticAdmins.emailForAlias(rawEmail)
        : rawEmail;
    String authPassword = password;
    if (isAdminAlias) {
      final String? expected = StaticAdmins.passwordForAlias(rawEmail);
      if (expected == null || expected != password) {
        _showMessage('Invalid admin credentials.');
        return;
      }
      authPassword = StaticAdmins.authPasswordForAlias(rawEmail) ?? password;
    }
    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);
    try {
      final UserModel? profile = isAdminAlias
          ? await _signInStaticAdmin(rawEmail, authPassword)
          : await AuthProvider.instance.signInWithEmail(
              email: email,
              password: password,
            );
      if (!mounted) return;
      if (profile == null) {
        _showMessage(
          AuthProvider.instance.errorMessage ??
              'Something went wrong. Try again.',
        );
        return;
      }
      if (!profile.isActive) {
        await AuthProvider.instance.signOut(clearLocal: true);
        if (!mounted) return;
        _showMessage('This account has been disabled.');
        return;
      }
      final bool verified = await _verifyEmailGate(fallbackEmail: email);
      if (!verified || !mounted) return;
      _handleSignedIn(profile: profile);
    } on FirebaseAuthException catch (e) {
      _showMessage(firebaseAuthErrorMessage(e));
    } catch (_) {
      _showMessage('Something went wrong. Try again.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<UserModel?> _signInStaticAdmin(String alias, String password) async {
    FirebaseAuthException? lastError;
    for (final String email in StaticAdmins.emailsForAlias(alias)) {
      try {
        await _auth.signInWithEmailAndPassword(
          email: email,
          password: password,
        );
        lastError = null;
      } on FirebaseAuthException catch (e) {
        lastError = e;
        final String code = e.code;
        final bool shouldAttemptCreate =
            code == 'user-not-found' || code == 'invalid-credential';
        if (shouldAttemptCreate) {
          try {
            await _auth.createUserWithEmailAndPassword(
              email: email,
              password: password,
            );
            lastError = null;
          } on FirebaseAuthException catch (createError) {
            if (createError.code == 'email-already-in-use' ||
                createError.code == 'invalid-email') {
              lastError = e;
              continue;
            }
            lastError = createError;
            rethrow;
          }
        } else if (code == 'wrong-password' || code == 'invalid-email') {
          continue;
        } else {
          rethrow;
        }
      }
      if (lastError == null) {
        break;
      }
    }
    if (lastError != null) {
      throw lastError;
    }
    try {
      final User? user = _auth.currentUser;
      if (user != null && StaticAdmins.isAdminEmail(user.email ?? '')) {
        await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
          'role': 'admin',
          'approved': true,
          'status': 'active',
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
        await UserAccess.refreshCurrent();
      }
    } catch (_) {}
    return AuthProvider.instance.waitForProfile();
  }

  Future<void> _signInWithGoogle() async {
    if (_isLoading) return;
    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);
    try {
      final GoogleSignInAccount googleUser = await _googleSignIn.authenticate();
      final GoogleSignInAuthentication googleAuth = googleUser.authentication;
      if (googleAuth.idToken == null) {
        _showMessage('Google sign-in failed. Missing token.');
        return;
      }
      final OAuthCredential credential = GoogleAuthProvider.credential(
        idToken: googleAuth.idToken,
      );
      final UserCredential userCredential = await AuthProvider.instance
          .signInWithCredential(credential);
      if (!mounted) return;
      final User? user = userCredential.user;
      if (user != null) {
        _syncUserProfile(user);
        await ProfileImageService.syncFromAuthUser(
          user,
          displayName: user.displayName,
        );
      }
      final UserModel? profile = await AuthProvider.instance.waitForProfile();
      if (!mounted) return;
      if (profile != null && !profile.isActive) {
        await AuthProvider.instance.signOut(clearLocal: true);
        if (!mounted) return;
        _showMessage('This account has been disabled.');
        return;
      }
      final bool isNewUser =
          userCredential.additionalUserInfo?.isNewUser ?? false;
      final bool needsProfile =
          isNewUser || (user?.displayName ?? '').trim().isEmpty;
      _handleSignedIn(profile: profile, needsProfile: needsProfile);
    } on FirebaseAuthException catch (e) {
      _showMessage(firebaseAuthErrorMessage(e));
    } on GoogleSignInException catch (e) {
      _showMessage(e.description ?? 'Google sign-in failed. Try again.');
    } catch (_) {
      _showMessage('Google sign-in failed. Try again.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _signInWithApple() async {
    if (_isLoading) return;
    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);
    try {
      final OAuthProvider appleProvider = OAuthProvider('apple.com');
      appleProvider.addScope('email');
      appleProvider.addScope('name');
      final UserCredential userCredential = await _auth.signInWithProvider(
        appleProvider,
      );
      if (!mounted) return;
      final User? user = userCredential.user;
      if (user != null) {
        _syncUserProfile(user);
        await ProfileImageService.syncFromAuthUser(
          user,
          displayName: user.displayName,
        );
      }

      final UserModel? profile = await AuthProvider.instance.waitForProfile();
      if (!mounted) return;
      if (profile != null && !profile.isActive) {
        await AuthProvider.instance.signOut(clearLocal: true);
        if (!mounted) return;
        _showMessage('This account has been disabled.');
        return;
      }
      final bool isNewUser =
          userCredential.additionalUserInfo?.isNewUser ?? false;
      final bool needsProfile =
          isNewUser || (user?.displayName ?? '').trim().isEmpty;
      _handleSignedIn(profile: profile, needsProfile: needsProfile);
    } on FirebaseAuthException catch (e) {
      _showMessage(firebaseAuthErrorMessage(e));
    } catch (_) {
      _showMessage('Apple sign-in failed. Try again.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _adminKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 420);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );
            final double brandWidth = math.min(
              constraints.maxWidth * 0.58,
              180,
            );

            return Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  horizontalPadding,
                  32,
                  horizontalPadding,
                  24,
                ),
                physics: const BouncingScrollPhysics(),
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: maxContentWidth),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(child: _SignInBranding(width: brandWidth)),
                      const SizedBox(height: 32),
                      Text(
                        "Let's Sign In.!",
                        style: GoogleFonts.poppins(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF1C2040),
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Login to Your Account to Continue your Courses',
                        style: GoogleFonts.poppins(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF7F869D),
                        ),
                      ),
                      const SizedBox(height: 26),
                      _SignInTextField(
                        controller: _emailController,
                        hintText: 'Email',
                        icon: Icons.mail_outline,
                        keyboardType: TextInputType.emailAddress,
                      ),
                      const SizedBox(height: 18),
                      _SignInTextField(
                        controller: _passwordController,
                        hintText: 'Password',
                        icon: Icons.lock_outline,
                        obscureText: _obscurePassword,
                        onToggleObscure: _togglePassword,
                      ),
                      const SizedBox(height: 18),
                      Row(
                        children: [
                          GestureDetector(
                            onTap: _toggleRememberMe,
                            child: Container(
                              width: 22,
                              height: 22,
                              decoration: BoxDecoration(
                                color: _rememberMe
                                    ? _primary
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(5),
                                border: Border.all(color: _primary, width: 1.5),
                              ),
                              child: _rememberMe
                                  ? const Icon(
                                      Icons.check,
                                      size: 12,
                                      color: Colors.white,
                                    )
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Remember Me',
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              color: const Color(0xFF42475C),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const Spacer(),
                          GestureDetector(
                            onTap: _openForgotPassword,
                            child: Text(
                              'Forgot Password?',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF4C5AE0),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      _SignInButton(
                        width: maxContentWidth,
                        onTap: _signIn,
                        isLoading: _isLoading,
                      ),
                      const SizedBox(height: 26),
                      Center(
                        child: Column(
                          children: [
                            Text(
                              'Or Continue With',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                color: const Color(0xFF8D94AF),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 18),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                GestureDetector(
                                  onTap: _isLoading ? null : _signInWithGoogle,
                                  child: const _SignInSocialIcon(
                                    type: SocialIconType.google,
                                    size: 58,
                                  ),
                                ),
                                const SizedBox(width: 18),
                                GestureDetector(
                                  onTap: _isLoading ? null : _signInWithApple,
                                  child: const _SignInSocialIcon(
                                    type: SocialIconType.apple,
                                    size: 58,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 26),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            "Don't have an Account?",
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              color: const Color(0xFF8A91A6),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: _openSignUp,
                            child: Text(
                              'SIGN UP',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: _primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Center(
                        child: Visibility(
                          visible: false,
                          maintainState: true,
                          maintainAnimation: true,
                          maintainSize: true,
                          maintainInteractivity: false,
                          child: TextButton(
                            onPressed: _isGrantingAdmin
                                ? null
                                : _openAdminAccess,
                            child: Text(
                              _isGrantingAdmin
                                  ? 'Enabling admin...'
                                  : 'Admin access',
                              style: GoogleFonts.poppins(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF6C74FF),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SignInBranding extends StatelessWidget {
  const _SignInBranding({this.width = 180});

  final double width;

  @override
  Widget build(BuildContext context) {
    return _LevelUpWordmark(width: width);
  }
}

class _LevelUpWordmark extends StatelessWidget {
  const _LevelUpWordmark({required this.width});

  final double width;

  @override
  Widget build(BuildContext context) {
    const double fontSize = 56;
    const double letterSpacing = 7;
    const double underlineWidth = 86;
    const double underlineHeight = 8;
    const double underlineSpacing = 12;
    const Color primary = Color(0xFF1B1E3B);
    const Color accent = Color(0xFF1B74FF);

    return SizedBox(
      width: width,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'LEVEL',
                    style: GoogleFonts.montserrat(
                      fontSize: fontSize,
                      fontWeight: FontWeight.w700,
                      letterSpacing: letterSpacing,
                      color: primary,
                    ),
                  ),
                  TextSpan(
                    text: 'UP',
                    style: GoogleFonts.montserrat(
                      fontSize: fontSize,
                      fontWeight: FontWeight.w700,
                      letterSpacing: letterSpacing,
                      color: accent,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: underlineSpacing),
            Container(
              width: underlineWidth,
              height: underlineHeight,
              decoration: BoxDecoration(
                color: accent,
                borderRadius: BorderRadius.circular(999),
                boxShadow: [
                  BoxShadow(
                    // ignore: deprecated_member_use
                    color: accent.withOpacity(0.2),
                    blurRadius: 6,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SignInTextField extends StatelessWidget {
  const _SignInTextField({
    required this.controller,
    required this.hintText,
    required this.icon,
    this.keyboardType,
    this.obscureText = false,
    this.onToggleObscure,
  });

  final TextEditingController controller;
  final String hintText;
  final IconData icon;
  final TextInputType? keyboardType;
  final bool obscureText;
  final VoidCallback? onToggleObscure;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C7C8BB4),
            blurRadius: 28,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscureText,
        style: GoogleFonts.mulish(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF1C2140),
        ),
        cursorColor: const Color(0xFF0D65FF),
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: hintText,
          hintStyle: GoogleFonts.mulish(
            fontSize: 15,
            color: const Color(0xFFA0A7C3),
            fontWeight: FontWeight.w600,
          ),
          prefixIcon: Icon(icon, color: const Color(0xFF8A90A8), size: 22),
          prefixIconConstraints: const BoxConstraints(minWidth: 58),
          suffixIcon: onToggleObscure == null
              ? null
              : IconButton(
                  splashRadius: 20,
                  onPressed: onToggleObscure,
                  icon: Icon(
                    obscureText
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: const Color(0xFF8A90A8),
                  ),
                ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 6,
            vertical: 18,
          ),
        ),
      ),
    );
  }
}

class _SignInButton extends StatelessWidget {
  const _SignInButton({
    required this.width,
    required this.onTap,
    required this.isLoading,
  });

  final double width;
  final VoidCallback onTap;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    const double baseWidth = 366;
    const double baseHeight = 76;
    final double height = width * (baseHeight / baseWidth);

    return Stack(
      alignment: Alignment.center,
      children: [
        GestureDetector(
          onTap: isLoading ? null : onTap,
          child: SvgPicture.asset(
            'assets/auth_buttons/sign in.svg',
            width: width,
            height: height,
            fit: BoxFit.contain,
          ),
        ),
        if (isLoading)
          const SizedBox(
            width: 26,
            height: 26,
            child: CircularProgressIndicator(
              strokeWidth: 2.6,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ),
      ],
    );
  }
}

class _SignInSocialIcon extends StatelessWidget {
  const _SignInSocialIcon({required this.type, this.size = 44});

  final SocialIconType type;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 56,
      height: 56,
      child: Center(
        child: SocialIcon(type: type, size: size),
      ),
    );
  }
}
