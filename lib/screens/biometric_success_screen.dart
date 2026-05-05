import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../guards/role_guard.dart';
import '../providers/auth_provider.dart';

class BiometricSuccessScreen extends StatefulWidget {
  const BiometricSuccessScreen({
    super.key,
    required this.label,
    this.redirectDelay = const Duration(seconds: 3),
  });

  final String label;
  final Duration redirectDelay;

  @override
  State<BiometricSuccessScreen> createState() => _BiometricSuccessScreenState();
}

class _BiometricSuccessScreenState extends State<BiometricSuccessScreen> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _redirectAfterDelay();
  }

  Future<void> _redirectAfterDelay() async {
    await Future<void>.delayed(widget.redirectDelay);
    if (!mounted) return;
    final String route = RoleGuard.routeForRole(AuthProvider.instance.role);
    Navigator.of(context).pushReplacementNamed(route);
  }

  String get _headerTitle {
    if (widget.label == 'Biometric') return 'Enable Biometric';
    return 'Set Your ${widget.label}';
  }

  @override
  Widget build(BuildContext context) {
    const Color background = Color(0xFF5A5B76);
    final double cardMaxWidth = math.min(
      MediaQuery.of(context).size.width - 40,
      360,
    );

    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 420);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                20,
                horizontalPadding,
                28,
              ),
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
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        _headerTitle,
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 48),
                  Center(
                    child: Container(
                      width: cardMaxWidth,
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
                          const _SuccessBadge(),
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
                            'Your account is ready to use. You will be '
                            'redirected to the Home Page in a few seconds.',
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
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SuccessBadge extends StatelessWidget {
  const _SuccessBadge();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 180,
      height: 160,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Positioned(
            top: 10,
            left: 18,
            child: _Dot(size: 12, color: Color(0xFFFFA733)),
          ),
          const Positioned(
            top: 18,
            right: 20,
            child: Icon(Icons.star, size: 18, color: Color(0xFFF4B400)),
          ),
          const Positioned(
            bottom: 22,
            left: 20,
            child: Icon(Icons.star, size: 16, color: Color(0xFFE53935)),
          ),
          const Positioned(
            bottom: 18,
            right: 28,
            child: Icon(
              Icons.change_history,
              size: 16,
              color: Color(0xFF2E7D32),
            ),
          ),
          const Positioned(
            top: 46,
            left: 128,
            child: _Dot(size: 10, color: Color(0xFF4C8BF5)),
          ),
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1A2E3148),
                  blurRadius: 18,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: const Icon(
              Icons.check_rounded,
              size: 56,
              color: Color(0xFF34A853),
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
