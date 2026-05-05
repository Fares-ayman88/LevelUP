import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../routes.dart';

class PasswordResetSuccessScreen extends StatefulWidget {
  const PasswordResetSuccessScreen({
    super.key,
    this.redirectDelay = const Duration(seconds: 3),
  });

  final Duration redirectDelay;

  @override
  State<PasswordResetSuccessScreen> createState() =>
      _PasswordResetSuccessScreenState();
}

class _PasswordResetSuccessScreenState
    extends State<PasswordResetSuccessScreen> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _redirectAfterDelay();
  }

  Future<void> _redirectAfterDelay() async {
    await Future<void>.delayed(widget.redirectDelay);
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed(AppRoutes.home);
  }

  @override
  Widget build(BuildContext context) {
    const Color background = Color(0xFF5A5B76);
    final double cardWidth = math.min(
      MediaQuery.of(context).size.width - 48,
      360,
    );

    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: Container(
              width: cardWidth,
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 30),
              decoration: BoxDecoration(
                color: const Color(0xFFF4F7FF),
                borderRadius: BorderRadius.circular(40),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x332E3148),
                    blurRadius: 32,
                    offset: Offset(0, 18),
                  ),
                ],
              ),
              child: Column(
                children: [
                  const _PasswordBadge(),
                  const SizedBox(height: 18),
                  Text(
                    'Congratulations',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF1B1E3B),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Your Account is Ready to Use. You will be\n'
                    'redirected to the Home Page in a Few\n'
                    'Seconds.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF6B7087),
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 22),
                  const SizedBox(
                    width: 30,
                    height: 30,
                    child: CircularProgressIndicator(
                      strokeWidth: 3,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Color(0xFF2F314C),
                      ),
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

class _PasswordBadge extends StatelessWidget {
  const _PasswordBadge();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
      height: 170,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Positioned(
            top: 12,
            left: 30,
            child: _Dot(size: 12, color: Color(0xFFFFA733)),
          ),
          const Positioned(
            top: 20,
            right: 26,
            child: Icon(Icons.star, size: 18, color: Color(0xFFF4B400)),
          ),
          const Positioned(
            bottom: 20,
            left: 30,
            child: Icon(Icons.star, size: 16, color: Color(0xFFE53935)),
          ),
          const Positioned(
            bottom: 22,
            right: 32,
            child: Icon(
              Icons.change_history,
              size: 16,
              color: Color(0xFF2E7D32),
            ),
          ),
          const Positioned(
            top: 52,
            left: 140,
            child: _Dot(size: 10, color: Color(0xFF4C8BF5)),
          ),
          Container(
            width: 110,
            height: 110,
            decoration: BoxDecoration(
              color: const Color(0xFFE7EBF7),
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1A2E3148),
                  blurRadius: 18,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: const Icon(
              Icons.settings,
              size: 72,
              color: Color(0xFF7B879F),
            ),
          ),
          Container(
            width: 78,
            height: 78,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1A2E3148),
                  blurRadius: 14,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.lock_rounded, size: 26, color: Color(0xFFE0706C)),
                  SizedBox(width: 6),
                  Icon(Icons.key_rounded, size: 26, color: Color(0xFF35B1A5)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}
