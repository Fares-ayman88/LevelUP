import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/onboarding_store.dart';
import '../routes.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  static const _accent = Color(0xFF1B74FF);
  static const _inactiveDot = Color(0xFFC8D0E5);

  final PageController _controller = PageController();
  int _index = 0;

  static final List<OnboardingPageData> _pages = [
    OnboardingPageData(
      imagePath: 'assets/onboarding/rafiki3.png',
      title: 'Online Learning',
      description:
          'We Provide Classes Online Classes and Pre Recorded Leactures.!',
    ),
    OnboardingPageData(
      imagePath: 'assets/onboarding/rafiki2.png',
      title: 'Learn from Anytime',
      description: 'Booked or Same the Lectures for Future',
    ),
    OnboardingPageData(
      imagePath: 'assets/onboarding/rafiki.png',
      title: 'Get Online Certificate',
      description: 'Analyse your scores and Track your results',
    ),
  ];

  void _finish() {
    OnboardingStore.markSeen().then((_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed(AppRoutes.letsYouIn);
    });
  }

  void _next() {
    if (_index == _pages.length - 1) {
      _finish();
    } else {
      _controller.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isLast = _index == _pages.length - 1;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 36, 24, 10),
              child: Row(
                children: [
                  const Spacer(),
                  TextButton(
                    onPressed: _finish,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                    ),
                    child: Text(
                      'Skip',
                      style: GoogleFonts.poppins(
                        color: const Color(0xFF1B1E3B),
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                physics: const BouncingScrollPhysics(),
                itemCount: _pages.length,
                onPageChanged: (value) => setState(() => _index = value),
                itemBuilder: (context, index) =>
                    _OnboardingSlide(data: _pages[index]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 56),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  _DotsIndicator(
                    currentIndex: _index,
                    length: _pages.length,
                    activeColor: _accent,
                    inactiveColor: _inactiveDot,
                  ),
                  const Spacer(),
                  isLast
                      ? _GetStartedButton(onTap: _finish)
                      : _CircleNextButton(onTap: _next),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircleNextButton extends StatelessWidget {
  const _CircleNextButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 58,
        height: 58,
        decoration: BoxDecoration(
          color: const Color(0xFF1B74FF),
          shape: BoxShape.circle,
          boxShadow: const [
            BoxShadow(
              color: Color(0x1A0D65FF),
              blurRadius: 14,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: const Center(
          child: Icon(Icons.arrow_forward, color: Colors.white, size: 24),
        ),
      ),
    );
  }
}

class _GetStartedButton extends StatelessWidget {
  const _GetStartedButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SvgPicture.asset(
        'assets/auth_buttons/get started.svg',
        width: 220,
        height: 64,
        fit: BoxFit.contain,
      ),
    );
  }
}

class _DotsIndicator extends StatelessWidget {
  const _DotsIndicator({
    required this.currentIndex,
    required this.length,
    required this.activeColor,
    required this.inactiveColor,
  });

  final int currentIndex;
  final int length;
  final Color activeColor;
  final Color inactiveColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(length, (index) {
        final bool isActive = index == currentIndex;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isActive ? 22 : 10,
          height: 10,
          decoration: BoxDecoration(
            color: isActive ? activeColor : inactiveColor,
            borderRadius: BorderRadius.circular(999),
          ),
        );
      }),
    );
  }
}

class _OnboardingSlide extends StatelessWidget {
  const _OnboardingSlide({required this.data});

  final OnboardingPageData data;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double imageHeight = constraints.maxHeight * 0.48;
        final double topPadding = constraints.maxHeight * 0.06;

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              SizedBox(height: topPadding),
              SizedBox(
                height: imageHeight,
                child: FractionallySizedBox(
                  widthFactor: 1,
                  child: Image.asset(data.imagePath, fit: BoxFit.contain),
                ),
              ),
              SizedBox(height: constraints.maxHeight * 0.06),
              Text(
                data.title,
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF1B1E3B),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: constraints.maxWidth * 0.88,
                child: Text(
                  data.description,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF7D818F),
                    height: 1.6,
                  ),
                ),
              ),
              const Spacer(),
            ],
          ),
        );
      },
    );
  }
}

class OnboardingPageData {
  const OnboardingPageData({
    required this.imagePath,
    required this.title,
    required this.description,
  });

  final String imagePath;
  final String title;
  final String description;
}
