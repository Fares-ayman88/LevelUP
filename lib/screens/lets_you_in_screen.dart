import 'dart:math' as math;

import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/auth_utils.dart';
import '../app_state/user_profile.dart';
import '../enums/user_role.dart';
import '../guards/role_guard.dart';
import '../models/user_model.dart';
import '../providers/auth_provider.dart';
import '../routes.dart';
import '../widgets/social_icon.dart';

class LetsYouInScreen extends StatefulWidget {
  const LetsYouInScreen({super.key});

  @override
  State<LetsYouInScreen> createState() => _LetsYouInScreenState();
}

class _LetsYouInScreenState extends State<LetsYouInScreen> {
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
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

  void _openRoleHome(UserModel? profile) {
    final UserRole role = profile?.role ?? UserRole.student;
    final String route = RoleGuard.routeForRole(role);
    Navigator.of(context).pushNamedAndRemoveUntil(route, (route) => false);
  }

  Future<void> _signInWithGoogle() async {
    if (_isLoading) return;
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
      if (needsProfile) {
        Navigator.of(context).pushReplacementNamed(AppRoutes.fillProfile);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double contentWidth = math.min(constraints.maxWidth, 420);
            final double buttonWidth = math.min(contentWidth, 320);
            final double sidePadding = math.max(
              16,
              (constraints.maxWidth - contentWidth) / 2,
            );
            final double illustrationHeight = math.min(
              360,
              constraints.maxHeight * 0.45,
            );

            return Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(sidePadding, 24, sidePadding, 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      height: illustrationHeight,
                      child: Image.asset(
                        'assets/lets_you_in/rafiki.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                    const SizedBox(height: 26),
                    Text(
                      "Let's you in",
                      style: GoogleFonts.poppins(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF1B1E3B),
                      ),
                    ),
                    const SizedBox(height: 28),
                    _LetsSocialButton(
                      width: buttonWidth,
                      label: 'Continue with Google',
                      icon: const SocialIcon(
                        type: SocialIconType.google,
                        size: 58,
                      ),
                      onTap: _isLoading ? null : _signInWithGoogle,
                    ),
                    const SizedBox(height: 16),
                    _LetsSocialButton(
                      width: buttonWidth,
                      label: 'Continue with Apple',
                      icon: const SocialIcon(
                        type: SocialIconType.apple,
                        size: 58,
                      ),
                      onTap: _isLoading
                          ? null
                          : () => _showMessage(
                              'Apple sign-in is not available yet.',
                            ),
                    ),
                    const SizedBox(height: 30),
                    Text(
                      '( Or )',
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF9197AA),
                      ),
                    ),
                    const SizedBox(height: 22),
                    _LetsPrimaryButton(
                      width: buttonWidth,
                      onTap: () {
                        Navigator.of(context).pushNamed(AppRoutes.signIn);
                      },
                    ),
                    const SizedBox(height: 22),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Don't have an Account?",
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            color: const Color(0xFF8A91A6),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () {
                            Navigator.of(context).pushNamed(AppRoutes.signUp);
                          },
                          child: Text(
                            'SIGN UP',
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0D65FF),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 30),
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

class _LetsSocialButton extends StatelessWidget {
  const _LetsSocialButton({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.width,
  });

  final Widget icon;
  final String label;
  final VoidCallback? onTap;
  final double width;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(40),
        child: Container(
          width: width,
          height: 64,
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFF),
            borderRadius: BorderRadius.circular(40),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1A9AAEDB),
                blurRadius: 32,
                offset: Offset(0, 18),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 26),
          child: Row(
            children: [
              SizedBox(
                width: 72,
                child: Align(alignment: Alignment.centerLeft, child: icon),
              ),
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.poppins(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF4F5363),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LetsPrimaryButton extends StatelessWidget {
  const _LetsPrimaryButton({required this.width, required this.onTap});

  final double width;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const double baseWidth = 366;
    const double baseHeight = 76;
    final double height = width * (baseHeight / baseWidth);

    return GestureDetector(
      onTap: onTap,
      child: SvgPicture.asset(
        'assets/auth_buttons/sign in with your account.svg',
        width: width,
        height: height,
        fit: BoxFit.contain,
      ),
    );
  }
}
