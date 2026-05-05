import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/security_store.dart';
import '../routes.dart';

const Color _textMuted = Color(0xFF7D818F);

class CreatePinScreen extends StatefulWidget {
  const CreatePinScreen({super.key});

  @override
  State<CreatePinScreen> createState() => _CreatePinScreenState();
}

class _CreatePinScreenState extends State<CreatePinScreen> {
  final PageController _pageController = PageController();
  List<int> _input = [];
  List<int>? _savedPin;
  int _step = 0; // 0 = create, 1 = confirm
  bool _mismatch = false;

  bool get _isConfirmStep => _step == 1;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _handleDigit(int digit) {
    if (_input.length >= 4) return;
    setState(() {
      _input = [..._input, digit];
      _mismatch = false;
    });

    if (_input.length == 4 && !_isConfirmStep) {
      _goToConfirm();
    }
  }

  void _handleBackspace() {
    if (_input.isEmpty) return;
    setState(() {
      _input = _input.sublist(0, _input.length - 1);
      _mismatch = false;
    });
  }

  Future<void> _goToConfirm() async {
    if (_input.length < 4) return;
    _savedPin = List<int>.from(_input);
    setState(() {
      _step = 1;
      _input = [];
      _mismatch = false;
    });
    await _pageController.animateToPage(
      1,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _goBackOneStep() async {
    if (_isConfirmStep) {
      setState(() {
        _step = 0;
        _input = _savedPin ?? [];
        _mismatch = false;
      });
      await _pageController.animateToPage(
        0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      Navigator.of(context).pop();
    }
  }

  Future<void> _onContinue() async {
    if (_input.length < 4) {
      _showToast('Enter 4 digits to continue');
      return;
    }

    if (!_isConfirmStep) {
      await _goToConfirm();
      return;
    }

    final bool matches = listEquals(_input, _savedPin);
    if (!matches) {
      setState(() {
        _mismatch = true;
        _input = [];
      });
      _showToast('Pins do not match. Try again.');
      return;
    }

    try {
      await SecurityStore.savePin(_input.join());
    } catch (_) {
      _showToast('Could not save PIN. Try again.');
      return;
    }

    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed(AppRoutes.biometricSetup);
  }

  void _showToast(String message) {
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double bottomHeight = math.min(
              420,
              math.max(320, constraints.maxHeight * 0.52),
            );

            return Column(
              children: [
                Expanded(
                  child: PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _PinStep(
                        title: 'Create New Pin',
                        description:
                            'Add a Pin Number to Make Your Account more Secure',
                        digits: _input,
                        mismatch: false,
                        onBack: _goBackOneStep,
                      ),
                      _PinStep(
                        title: 'Confirm Pin',
                        description: 'Re-enter your Pin to confirm',
                        digits: _input,
                        mismatch: _mismatch,
                        onBack: _goBackOneStep,
                      ),
                    ],
                  ),
                ),
                _PinBottomSection(
                  height: bottomHeight,
                  onDigit: _handleDigit,
                  onBackspace: _handleBackspace,
                  onContinue: _onContinue,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _PinStep extends StatelessWidget {
  const _PinStep({
    required this.title,
    required this.description,
    required this.digits,
    required this.mismatch,
    required this.onBack,
  });

  final String title;
  final String description;
  final List<int> digits;
  final bool mismatch;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final double gapAfterDescription = math.min(
          170,
          math.max(110, constraints.maxHeight * 0.14),
        );
        final double afterBoxesGap = math.min(
          32,
          math.max(18, constraints.maxHeight * 0.06),
        );

        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 36, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  GestureDetector(
                    onTap: onBack,
                    behavior: HitTestBehavior.opaque,
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Icon(
                        Icons.arrow_back,
                        size: 26,
                        color: Color(0xFF1C2040),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    title,
                    style: GoogleFonts.poppins(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF1C2040),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Center(
                child: SizedBox(
                  width: 280,
                  height: 48,
                  child: Center(
                    child: Text(
                      description,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: _textMuted,
                        height: 1.5,
                      ),
                    ),
                  ),
                ),
              ),
              SizedBox(height: gapAfterDescription),
              Center(
                child: _PinBoxes(filled: digits.length, mismatch: mismatch),
              ),
              SizedBox(height: afterBoxesGap),
              AnimatedOpacity(
                duration: const Duration(milliseconds: 200),
                opacity: mismatch ? 1 : 0,
                child: Center(
                  child: Text(
                    mismatch ? 'Pins do not match' : '',
                    style: GoogleFonts.poppins(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Colors.red.shade600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 18),
            ],
          ),
        );
      },
    );
  }
}

class _PinBoxes extends StatelessWidget {
  const _PinBoxes({required this.filled, required this.mismatch});

  final int filled;
  final bool mismatch;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(4, (index) {
        final bool hasDigit = index < filled;
        return Container(
          margin: EdgeInsets.only(right: index == 3 ? 0 : 14),
          width: 64,
          height: 66,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: mismatch ? Colors.red.shade300 : Colors.transparent,
              width: mismatch ? 1.4 : 0,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x17697AA0),
                blurRadius: 18,
                offset: Offset(0, 10),
              ),
            ],
          ),
          alignment: Alignment.center,
          child: Text(
            hasDigit ? '*' : '',
            style: GoogleFonts.poppins(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF2D3148),
            ),
          ),
        );
      }),
    );
  }
}

class _PinBottomSection extends StatelessWidget {
  const _PinBottomSection({
    required this.height,
    required this.onDigit,
    required this.onBackspace,
    required this.onContinue,
  });

  final double height;
  final ValueChanged<int> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: SizedBox(
        height: height,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final double continueWidth = math.min(
                MediaQuery.of(context).size.width - 48,
                320,
              );
              const double baseWidth = 366;
              const double baseHeight = 76;
              final double continueHeight =
                  continueWidth * (baseHeight / baseWidth);
              const double reserved = 26;
              double available =
                  constraints.maxHeight - continueHeight - reserved;
              if (available < 0) available = 0;
              double rowGap = 16;
              double buttonSize = (available - 3 * rowGap) / 4;
              const double maxButton = 68;
              const double minButton = 52;
              if (buttonSize < minButton) {
                rowGap = 10;
                buttonSize = (available - 3 * rowGap) / 4;
              }
              buttonSize = buttonSize.clamp(minButton, maxButton);
              final double keypadWidth = math.min(320, constraints.maxWidth);

              return Column(
                children: [
                  _ContinueButton(onTap: onContinue),
                  const SizedBox(height: 26),
                  Expanded(
                    child: _PinKeypad(
                      onDigit: onDigit,
                      onBackspace: onBackspace,
                      buttonSize: buttonSize,
                      rowGap: rowGap,
                      width: keypadWidth,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ContinueButton extends StatelessWidget {
  const _ContinueButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final double width = math.min(MediaQuery.of(context).size.width - 48, 320);
    const double baseWidth = 366;
    const double baseHeight = 76;
    final double height = width * (baseHeight / baseWidth);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(40),
        onTap: onTap,
        child: Ink.image(
          image: const AssetImage('assets/fill_profile/BUTTON (3).png'),
          width: width,
          height: height,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

class _PinKeypad extends StatelessWidget {
  const _PinKeypad({
    required this.onDigit,
    required this.onBackspace,
    required this.buttonSize,
    required this.rowGap,
    required this.width,
  });

  final ValueChanged<int> onDigit;
  final VoidCallback onBackspace;
  final double buttonSize;
  final double rowGap;
  final double width;

  @override
  Widget build(BuildContext context) {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['*', '0', 'back'],
    ];

    return Center(
      child: SizedBox(
        width: width,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(rows.length, (rowIndex) {
            final row = rows[rowIndex];
            return Padding(
              padding: EdgeInsets.only(top: rowIndex == 0 ? 0 : rowGap),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: row.map((value) {
                  if (value == 'back') {
                    return _KeyButton(
                      onTap: onBackspace,
                      size: buttonSize,
                      child: const Icon(
                        Icons.backspace_outlined,
                        color: Color(0xFF4A4E5F),
                        size: 22,
                      ),
                    );
                  }
                  final bool isStar = value == '*';
                  return _KeyButton(
                    onTap: isStar ? () {} : () => onDigit(int.parse(value)),
                    size: buttonSize,
                    child: Text(
                      value,
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF4A4E5F),
                      ),
                    ),
                  );
                }).toList(),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class _KeyButton extends StatelessWidget {
  const _KeyButton({
    required this.onTap,
    required this.child,
    required this.size,
  });

  final VoidCallback onTap;
  final Widget child;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(size * 0.5),
          onTap: onTap,
          child: Center(child: child),
        ),
      ),
    );
  }
}
