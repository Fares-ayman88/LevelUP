import 'dart:async';
import 'dart:math' as math;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/auth_utils.dart';
import '../routes.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key, this.initialEmail = ''});

  final String initialEmail;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _textMuted = Color(0xFF7D818F);
  static const Color _titleColor = Color(0xFF1C2040);
  static const int _resendCooldown = 30;

  final FirebaseAuth _auth = FirebaseAuth.instance;
  late final TextEditingController _emailController;

  Timer? _cooldownTimer;
  int _secondsRemaining = 0;
  bool _sending = false;
  bool _submitted = false;
  String _submittedEmail = '';

  bool get _canResend => _secondsRemaining == 0 && !_sending;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _emailController = TextEditingController(text: widget.initialEmail.trim());
  }

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    _emailController.dispose();
    super.dispose();
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

  bool _isValidEmail(String value) {
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value);
  }

  bool _shouldHideResetError(FirebaseAuthException error) {
    return error.code == 'user-not-found';
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _secondsRemaining = _resendCooldown);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (Timer timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_secondsRemaining <= 1) {
        timer.cancel();
        setState(() => _secondsRemaining = 0);
        return;
      }
      setState(() => _secondsRemaining -= 1);
    });
  }

  void _backToSignIn() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
      return;
    }
    Navigator.of(context).pushNamedAndRemoveUntil(
      AppRoutes.signIn,
      (Route<dynamic> route) => false,
    );
  }

  Future<void> _sendResetLink() async {
    if (_sending) return;

    final String email = _emailController.text.trim().toLowerCase();
    if (email.isEmpty) {
      _showMessage('Enter the email linked to your account.');
      return;
    }
    if (!_isValidEmail(email)) {
      _showMessage('Enter a valid email address.');
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() => _sending = true);

    try {
      await _auth.sendPasswordResetEmail(email: email);
    } on FirebaseAuthException catch (e) {
      if (!_shouldHideResetError(e)) {
        _showMessage(firebaseAuthErrorMessage(e));
        if (mounted) {
          setState(() => _sending = false);
        }
        return;
      }
    } catch (_) {
      _showMessage('Could not send the reset link. Try again.');
      if (mounted) {
        setState(() => _sending = false);
      }
      return;
    }

    if (!mounted) return;

    setState(() {
      _sending = false;
      _submitted = true;
      _submittedEmail = email;
    });
    _startCooldown();
  }

  void _editEmail() {
    _cooldownTimer?.cancel();
    setState(() {
      _submitted = false;
      _secondsRemaining = 0;
    });
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
            final double gapAfterTitle = math.max(
              76,
              constraints.maxHeight * 0.16,
            );

            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                20,
                horizontalPadding,
                28,
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: () => Navigator.of(context).pop(),
                          child: const Padding(
                            padding: EdgeInsets.all(6),
                            child: Icon(
                              Icons.arrow_back,
                              size: 26,
                              color: _titleColor,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Forgot Password',
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: _titleColor,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: gapAfterTitle),
                    Center(
                      child: SizedBox(
                        width: maxContentWidth * 0.9,
                        child: Text(
                          _submitted
                              ? 'Check your email for the password reset link.'
                              : 'Enter the email you use for LevelUp.\nIf it matches an account, we will send a secure reset link.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.poppins(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: _textMuted,
                            height: 1.6,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 28),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x1C7C8BB4),
                            blurRadius: 24,
                            offset: Offset(0, 16),
                          ),
                        ],
                      ),
                      child: _submitted
                          ? _ForgotPasswordSuccessState(
                              email: _submittedEmail,
                              secondsRemaining: _secondsRemaining,
                              isSending: _sending,
                              canResend: _canResend,
                              onResend: _sendResetLink,
                              onEditEmail: _editEmail,
                              onBackToSignIn: _backToSignIn,
                            )
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Account email',
                                  style: GoogleFonts.poppins(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: _titleColor,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: const [
                                      BoxShadow(
                                        color: Color(0x1C7C8BB4),
                                        blurRadius: 24,
                                        offset: Offset(0, 16),
                                      ),
                                    ],
                                  ),
                                  child: TextField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    textInputAction: TextInputAction.done,
                                    onSubmitted: (_) => _sendResetLink(),
                                    style: GoogleFonts.poppins(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFF1C2140),
                                    ),
                                    cursorColor: _primary,
                                    decoration: InputDecoration(
                                      border: InputBorder.none,
                                      hintText: 'you@example.com',
                                      hintStyle: GoogleFonts.poppins(
                                        fontSize: 15,
                                        color: const Color(0xFFA0A7C3),
                                        fontWeight: FontWeight.w600,
                                      ),
                                      prefixIcon: const Icon(
                                        Icons.mail_outline,
                                        color: Color(0xFF8A90A8),
                                        size: 22,
                                      ),
                                      prefixIconConstraints: const BoxConstraints(
                                        minWidth: 58,
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 18,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 14),
                                Text(
                                  'Use your full email address here. Admin aliases are not supported for password reset.',
                                  style: GoogleFonts.poppins(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    color: _textMuted,
                                    height: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 28),
                                _PrimaryArrowButton(
                                  label: _sending
                                      ? 'Sending link...'
                                      : 'Send reset link',
                                  onTap: _sending ? null : _sendResetLink,
                                  color: _primary,
                                ),
                                const SizedBox(height: 12),
                                TextButton(
                                  onPressed: _backToSignIn,
                                  child: Text(
                                    'Back to sign in',
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF4C5AE0),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                    ),
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

class _ForgotPasswordSuccessState extends StatelessWidget {
  const _ForgotPasswordSuccessState({
    required this.email,
    required this.secondsRemaining,
    required this.isSending,
    required this.canResend,
    required this.onResend,
    required this.onEditEmail,
    required this.onBackToSignIn,
  });

  final String email;
  final int secondsRemaining;
  final bool isSending;
  final bool canResend;
  final VoidCallback onResend;
  final VoidCallback onEditEmail;
  final VoidCallback onBackToSignIn;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 76,
          height: 76,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: const LinearGradient(
              colors: [
                Color(0x240D65FF),
                Color(0x144F9DFF),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: const Icon(
            Icons.mark_email_read_outlined,
            size: 34,
            color: Color(0xFF0D65FF),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'If an account exists for $email, we have sent a password reset link.',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF5F6E93),
            height: 1.6,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Check Inbox, Spam, and Promotions. The email may take a minute or two to arrive.',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF7D818F),
            height: 1.55,
          ),
        ),
        const SizedBox(height: 24),
        _PrimaryArrowButton(
          label: isSending
              ? 'Sending link...'
              : (secondsRemaining > 0
                    ? 'Resend link in ${secondsRemaining}s'
                    : 'Resend reset link'),
          onTap: canResend ? onResend : null,
          color: _ForgotPasswordScreenState._primary,
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: onEditEmail,
          child: Text(
            'Use a different email',
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF1F3D7A),
            ),
          ),
        ),
        TextButton(
          onPressed: onBackToSignIn,
          child: Text(
            'Back to sign in',
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF4C5AE0),
            ),
          ),
        ),
      ],
    );
  }
}

class _PrimaryArrowButton extends StatelessWidget {
  const _PrimaryArrowButton({
    required this.label,
    required this.onTap,
    required this.color,
  });

  final String label;
  final VoidCallback? onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final double width = math.min(MediaQuery.of(context).size.width - 48, 360);
    final bool enabled = onTap != null;

    return Center(
      child: Opacity(
        opacity: enabled ? 1 : 0.58,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(40),
            onTap: onTap,
            child: Container(
              width: width,
              height: 68,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(40),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x330D65FF),
                    blurRadius: 22,
                    offset: Offset(0, 14),
                  ),
                ],
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: Container(
                      width: 46,
                      height: 46,
                      margin: const EdgeInsets.only(right: 14),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.arrow_forward, color: color),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
