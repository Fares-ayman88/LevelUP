import 'dart:math' as math;

import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/auth_utils.dart';
import '../app_state/email_verification_gate.dart';
import '../app_state/user_profile.dart';
import '../enums/user_role.dart';
import '../guards/role_guard.dart';
import '../models/user_model.dart';
import '../providers/auth_provider.dart';
import '../routes.dart';
import 'email_verification_screen.dart';
import '../widgets/social_icon.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  static const _accent = Color(0xFF0D65FF);
  static const double _contentMaxWidth = 420;

  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  void _togglePassword() {
    setState(() {
      _obscurePassword = !_obscurePassword;
    });
  }

  void _openFillProfile() {
    Navigator.of(context).pushNamed(AppRoutes.fillProfile);
  }

  void _openRoleHome(UserModel? profile) {
    final UserRole role = profile?.role ?? UserRole.student;
    final String route = RoleGuard.routeForRole(role);
    Navigator.of(context).pushNamedAndRemoveUntil(route, (route) => false);
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

  Future<bool> _verifyEmailBeforeFillProfile(String email) async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null || !await requiresEmailVerification(user)) {
      return true;
    }
    if (!mounted) return false;
    final bool? verified = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => EmailVerificationScreen(
          email: user.email ?? email,
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

  Future<void> _signUp() async {
    if (_isLoading) return;
    final String email = _emailController.text.trim();
    final String password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      _showMessage('Enter email and password to continue.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);
    try {
      final UserModel? profile = await AuthProvider.instance.signUpWithEmail(
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
      final bool verified = await _verifyEmailBeforeFillProfile(email);
      if (!verified || !mounted) return;
      _openFillProfile();
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

  Future<void> _signUpWithGoogle() async {
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
      }
      final UserModel? profile = await AuthProvider.instance.waitForProfile();
      final bool isNewUser =
          userCredential.additionalUserInfo?.isNewUser ?? false;
      if (isNewUser) {
        _openFillProfile();
      } else {
        _openRoleHome(profile);
      }
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

  Future<void> _signUpWithApple() async {
    if (_isLoading) return;
    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);
    try {
      final OAuthProvider appleProvider = OAuthProvider('apple.com');
      appleProvider.addScope('email');
      appleProvider.addScope('name');
      final UserCredential userCredential = await FirebaseAuth.instance
          .signInWithProvider(appleProvider);
      if (!mounted) return;
      final User? user = userCredential.user;
      if (user != null) {
        _syncUserProfile(user);
      }
      final UserModel? profile = await AuthProvider.instance.waitForProfile();
      final bool isNewUser =
          userCredential.additionalUserInfo?.isNewUser ?? false;
      if (!mounted) return;
      if (isNewUser) {
        _openFillProfile();
      } else {
        _openRoleHome(profile);
      }
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(
              constraints.maxWidth,
              _contentMaxWidth,
            );
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  horizontalPadding,
                  32,
                  horizontalPadding,
                  24,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Column(
                        children: [
                          _LevelUpWordmark(
                            width: math.min(constraints.maxWidth * 0.58, 180),
                          ),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                    Text(
                      'Getting Started.!',
                      style: GoogleFonts.poppins(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF1C2040),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Create an Account to Continue your allCourses',
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        color: const Color(0xFF7F869D),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 26),
                    _SignUpTextField(
                      controller: _emailController,
                      hintText: 'Email',
                      icon: Icons.mail_outline,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 18),
                    _SignUpTextField(
                      controller: _passwordController,
                      hintText: 'Password',
                      icon: Icons.lock_outline,
                      obscureText: _obscurePassword,
                      onToggleObscure: _togglePassword,
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        Image.asset(
                          'assets/sign_up/checkbox.png',
                          width: 30,
                          height: 30,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Agree to Terms & Conditions',
                          style: GoogleFonts.poppins(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF4A4E5F),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _SignUpButton(
                      width: maxContentWidth,
                      onTap: _signUp,
                      isLoading: _isLoading,
                    ),
                    const SizedBox(height: 24),
                    Center(
                      child: Text(
                        'Or Continue With',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF9AA1B8),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _SocialCircleButton(
                          type: SocialIconType.google,
                          size: 58,
                          onTap: _isLoading ? null : _signUpWithGoogle,
                        ),
                        const SizedBox(width: 18),
                        _SocialCircleButton(
                          type: SocialIconType.apple,
                          size: 58,
                          onTap: _isLoading ? null : _signUpWithApple,
                        ),
                      ],
                    ),
                    const SizedBox(height: 26),
                    Center(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Already have an Account?',
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              color: const Color(0xFF8A91A6),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: () {
                              Navigator.of(
                                context,
                              ).pushReplacementNamed(AppRoutes.signIn);
                            },
                            child: Text(
                              'SIGN IN',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: _accent,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
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

class _SignUpTextField extends StatelessWidget {
  const _SignUpTextField({
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
            color: Color(0x1A96A0C8),
            blurRadius: 22,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscureText,
        style: GoogleFonts.poppins(
          fontSize: 15,
          fontWeight: FontWeight.w500,
          color: const Color(0xFF1E2439),
        ),
        cursorColor: const Color(0xFF0D65FF),
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: hintText,
          hintStyle: GoogleFonts.poppins(
            fontSize: 15,
            color: const Color(0xFF98A2C1),
            fontWeight: FontWeight.w500,
          ),
          prefixIcon: Icon(icon, color: const Color(0xFF7C83A1), size: 24),
          prefixIconConstraints: const BoxConstraints(minWidth: 60),
          suffixIcon: onToggleObscure == null
              ? null
              : IconButton(
                  onPressed: onToggleObscure,
                  icon: Icon(
                    obscureText ? Icons.visibility_off : Icons.visibility,
                    color: const Color(0xFF7C83A1),
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

class _SignUpButton extends StatelessWidget {
  const _SignUpButton({
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
            'assets/auth_buttons/sign up.svg',
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

class _SocialCircleButton extends StatelessWidget {
  const _SocialCircleButton({required this.type, this.size = 44, this.onTap});

  final SocialIconType type;
  final double size;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 56,
        height: 56,
        child: Center(
          child: SocialIcon(type: type, size: size),
        ),
      ),
    );
  }
}
