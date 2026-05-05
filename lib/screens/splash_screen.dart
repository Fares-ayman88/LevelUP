import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
// ignore: unnecessary_import
import 'package:flutter/painting.dart';
import 'package:google_fonts/google_fonts.dart';

import '../routes.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({
    super.key,
    required this.bootstrap,
    required this.logoImage,
  });

  final Future<String?> Function() bootstrap;
  final ImageProvider logoImage;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  static const Size _designSize = Size(706, 1600);
  static const double _wordmarkTop = 1090;
  static const double _wordmarkFontSize = 56;
  static const double _wordmarkLetterSpacing = 7.0;
  static const double _wordmarkUnderlineWidth = 86;
  static const double _wordmarkUnderlineHeight = 8;
  static const double _wordmarkUnderlineSpacing = 12;
  static const Color _wordmarkPrimary = Color(0xFF1B1E3B);
  static const Color _wordmarkAccent = Color(0xFF1B74FF);
  static const List<Offset> _dotCenters = [
    Offset(296.5, 1337.1),
    Offset(352.5, 1337.1),
    Offset(408.0, 1337.1),
  ];
  static const double _inactiveDotSize = 18;
  static const Size _activeDotSize = Size(56, 16);
  static const Color _inactiveDot = Color(0xFFE1ECFE);
  static const Color _activeDot = Color(0xFF0862F4);

  late final AnimationController _controller;
  late final Animation<double> _dotPosition;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();

    _dotPosition = TweenSequence<double>([
      TweenSequenceItem<double>(
        tween: Tween<double>(begin: 0, end: 1),
        weight: 1,
      ),
      TweenSequenceItem<double>(
        tween: Tween<double>(begin: 1, end: 2),
        weight: 1,
      ),
      TweenSequenceItem<double>(
        tween: Tween<double>(begin: 2, end: 1),
        weight: 1,
      ),
      TweenSequenceItem<double>(
        tween: Tween<double>(begin: 1, end: 0),
        weight: 1,
      ),
    ]).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));

    _load();
  }

  Future<void> _load() async {
    final String? targetRoute = await widget.bootstrap();
    if (!mounted) return;
    Navigator.of(
      context,
    ).pushReplacementNamed(targetRoute ?? AppRoutes.onboarding);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final Size fitted = applyBoxFit(
              BoxFit.contain,
              _designSize,
              constraints.biggest,
            ).destination;
            final double scale = fitted.width / _designSize.width;

            return Stack(
              fit: StackFit.expand,
              children: [
                Align(
                  alignment: Alignment.topCenter,
                  child: SizedBox(
                    width: fitted.width,
                    height: fitted.height,
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: Image.asset(
                            'assets/splash_bg.jpg',
                            fit: BoxFit.fill,
                            filterQuality: FilterQuality.high,
                          ),
                        ),
                        Positioned.fill(
                          child: _AnimatedDots(
                            position: _dotPosition,
                            scale: scale,
                          ),
                        ),
                        Positioned(
                          top: _wordmarkTop * scale,
                          left: 0,
                          right: 0,
                          child: _WordmarkOverlay(scale: scale),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _AnimatedDots extends StatelessWidget {
  const _AnimatedDots({required this.position, required this.scale});

  final Animation<double> position;
  final double scale;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: position,
      builder: (context, child) {
        return Stack(
          children: List.generate(_SplashScreenState._dotCenters.length, (
            index,
          ) {
            final double distance = (position.value - index).abs();
            final double t = (1 - distance).clamp(0.0, 1.0);
            final double width =
                lerpDouble(
                  _SplashScreenState._inactiveDotSize,
                  _SplashScreenState._activeDotSize.width,
                  t,
                )! *
                scale;
            final double height =
                lerpDouble(
                  _SplashScreenState._inactiveDotSize,
                  _SplashScreenState._activeDotSize.height,
                  t,
                )! *
                scale;
            final Color color = Color.lerp(
              _SplashScreenState._inactiveDot,
              _SplashScreenState._activeDot,
              t,
            )!;
            final Offset center = _SplashScreenState._dotCenters[index];
            final double cx = center.dx * scale;
            final double cy = center.dy * scale;

            return Positioned(
              left: cx - width / 2,
              top: cy - height / 2,
              child: Container(
                width: width,
                height: height,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: t > 0.05
                      ? [
                          BoxShadow(
                            // ignore: deprecated_member_use
                            color: _SplashScreenState._activeDot.withValues(
                              alpha: 0.2 * t + 0.05,
                            ),
                            blurRadius: lerpDouble(0, 12, t)! * scale,
                            offset: Offset(0, lerpDouble(0, 6, t)! * scale),
                          ),
                        ]
                      : const [],
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

class _WordmarkOverlay extends StatelessWidget {
  const _WordmarkOverlay({required this.scale});

  final double scale;

  @override
  Widget build(BuildContext context) {
    final double fontSize = _SplashScreenState._wordmarkFontSize * scale;
    final double letterSpacing =
        _SplashScreenState._wordmarkLetterSpacing * scale;
    final double underlineWidth =
        _SplashScreenState._wordmarkUnderlineWidth * scale;
    final double underlineHeight =
        _SplashScreenState._wordmarkUnderlineHeight * scale;
    final double underlineSpacing =
        _SplashScreenState._wordmarkUnderlineSpacing * scale;

    return Column(
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
                  color: _SplashScreenState._wordmarkPrimary,
                ),
              ),
              TextSpan(
                text: 'UP',
                style: GoogleFonts.montserrat(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w700,
                  letterSpacing: letterSpacing,
                  color: _SplashScreenState._wordmarkAccent,
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: underlineSpacing),
        Container(
          width: underlineWidth,
          height: underlineHeight,
          decoration: BoxDecoration(
            color: _SplashScreenState._wordmarkAccent,
            borderRadius: BorderRadius.circular(999),
            boxShadow: [
              BoxShadow(
                // ignore: deprecated_member_use
                color: _SplashScreenState._wordmarkAccent.withOpacity(0.2),
                blurRadius: 6 * scale,
                offset: Offset(0, 3 * scale),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
