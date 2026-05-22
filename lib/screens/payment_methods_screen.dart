import 'dart:math' as math;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/transaction_catalog.dart';
import '../routes.dart';
import '../widgets/payment_status_dialogs.dart';
import 'course_detail_screen.dart';
import 'manual_transfer_screen.dart';

class PaymentMethodsScreen extends StatefulWidget {
  const PaymentMethodsScreen({super.key});

  @override
  State<PaymentMethodsScreen> createState() => _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends State<PaymentMethodsScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF7D818F);
  static const Color _primary = Color(0xFF0D65FF);

  bool _initialized = false;
  late CourseDetailArgs _data;
  int _selectedIndex = 0;

  static const List<_PaymentMethod> _methods = [
    _PaymentMethod(
      label: 'InstaPay',
      logoText: 'InstaPay',
      assetPath: 'assets/payment/instapay_logo.jpg',
      hasFee: true,
      requiresManualTransfer: true,
      color: Color(0xFF1E6BFF),
    ),
    _PaymentMethod(
      label: 'Vodafone Cash',
      logoText: 'V',
      assetPath: 'assets/payment/vodafone_cash.png',
      hasFee: true,
      requiresManualTransfer: true,
      color: Color(0xFFE01E2D),
    ),
  ];

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    final Object? args = ModalRoute.of(context)?.settings.arguments;
    _data = args is CourseDetailArgs ? args : CourseDetailArgs.fallback();
    _initialized = true;
  }

  void _selectMethod(int index) {
    setState(() => _selectedIndex = index);
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

  String _resolveSubmitError(FirebaseException error) {
    switch (error.code) {
      case 'permission-denied':
        return 'Payment blocked by server rules (permission denied).';
      case 'unauthenticated':
        return 'Session expired. Please sign in again.';
      case 'unavailable':
        return 'No internet or Firebase is unavailable right now.';
      case 'failed-precondition':
        return 'Server precondition failed. Check Firebase setup/rules.';
      default:
        final String code = error.code.trim();
        if (code.isNotEmpty) {
          return 'Could not submit payment ($code).';
        }
        return 'Could not submit payment (firebase).';
    }
  }

  String _shortError(Object error) {
    final String raw = error.toString().trim();
    if (raw.isEmpty) return error.runtimeType.toString();
    if (raw.length <= 90) return raw;
    return '${raw.substring(0, 90)}...';
  }

  double _parsePrice(String price) {
    final RegExpMatch? match = RegExp(r'[\d.]+').firstMatch(price);
    if (match == null) return 0;
    return double.tryParse(match.group(0)!) ?? 0;
  }

  String _formatEgp(double value) {
    return 'EGP ${value.toStringAsFixed(0)}';
  }

  Future<void> _onEnroll() async {
    final double basePrice = _parsePrice(_data.price);
    final _PaymentMethod method = _methods[_selectedIndex];
    final double fees = method.hasFee ? (basePrice * 0.05).roundToDouble() : 0;
    final double total = basePrice + fees;
    if (method.requiresManualTransfer) {
      try {
        await Navigator.of(context).pushNamed(
          AppRoutes.manualTransfer,
          arguments: ManualTransferArgs(
            course: _data,
            paymentMethod: method.label,
            totalLabel: _formatEgp(total),
          ),
        );
      } catch (_) {
        _showToast('Could not open manual transfer.');
      }
      return;
    }
    TransactionItem? created;
    try {
      created = await TransactionCatalog.createTransaction(
        courseId: _data.courseId,
        courseTitle: _data.title,
        courseCategory: _data.category,
        priceLabel: _formatEgp(total),
        courseCoverImagePath: _data.coverImagePath,
        paymentMethod: method.label,
      );
    } on FirebaseException catch (error, stackTrace) {
      debugPrint(
        '[PaymentMethods] submit failed: ${error.code} ${error.message}',
      );
      debugPrintStack(stackTrace: stackTrace);
      _showToast(_resolveSubmitError(error));
      return;
    } catch (error, stackTrace) {
      debugPrint('[PaymentMethods] submit failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      _showToast('Could not submit payment: ${_shortError(error)}');
      return;
    }
    if (!mounted) return;
    if (created == null) {
      _showToast('Please sign in to continue.');
      return;
    }

    final bool? returnHome = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withValues(alpha: 0.45),
      builder: (context) => PaymentPendingDialog(
        onReturnHome: () => Navigator.of(context).pop(true),
      ),
    );
    if (!mounted) return;
    if (returnHome == true) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    final double basePrice = _parsePrice(_data.price);
    final _PaymentMethod selectedMethod = _methods[_selectedIndex];
    final double fees = selectedMethod.hasFee
        ? (basePrice * 0.05).roundToDouble()
        : 0;
    final double total = basePrice + fees;
    final String priceLabel = _formatEgp(basePrice);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: _EnrollButton(
        label: 'Enroll Course - $priceLabel',
        onTap: _onEnroll,
      ),
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
                18,
                horizontalPadding,
                24,
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
                            color: _title,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Payment Methods',
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _CourseSummaryCard(
                    category: _data.category,
                    title: _data.title,
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Select the Payment Methods you Want to Use',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: _textMuted,
                    ),
                  ),
                  const SizedBox(height: 14),
                  ...List.generate(_methods.length, (index) {
                    final method = _methods[index];
                    final bool selected = index == _selectedIndex;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _PaymentMethodTile(
                        method: method,
                        selected: selected,
                        onTap: () => _selectMethod(index),
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  _SummaryRow(label: 'Fees', value: _formatEgp(fees)),
                  const SizedBox(height: 6),
                  _SummaryRow(
                    label: 'Total',
                    value: _formatEgp(total),
                    emphasis: true,
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

class _CourseSummaryCard extends StatelessWidget {
  const _CourseSummaryCard({required this.category, required this.title});

  final String category;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 18,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(18),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  category,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFFE2702B),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1C2140),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethodTile extends StatelessWidget {
  const _PaymentMethodTile({
    required this.method,
    required this.selected,
    required this.onTap,
  });

  final _PaymentMethod method;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: selected ? _PaymentMethodsScreenState._primary : Colors.white,
          width: selected ? 1.4 : 1,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 16,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Row(
          children: [
            _LogoBadge(
              text: method.logoText,
              assetPath: method.assetPath,
              color: method.color,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                method.label,
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: _PaymentMethodsScreenState._title,
                ),
              ),
            ),
            _SelectionDot(selected: selected),
          ],
        ),
      ),
    );
  }
}

class _LogoBadge extends StatelessWidget {
  const _LogoBadge({
    required this.text,
    required this.assetPath,
    required this.color,
  });

  final String text;
  final String assetPath;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 54,
      height: 38,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      alignment: Alignment.center,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        child: Image.asset(
          assetPath,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) => Text(
            text,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectionDot extends StatelessWidget {
  const _SelectionDot({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: selected
              ? _PaymentMethodsScreenState._primary
              : const Color(0xFFB6BED6),
          width: 2,
        ),
      ),
      child: selected
          ? Center(
              child: Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: _PaymentMethodsScreenState._primary,
                  shape: BoxShape.circle,
                ),
              ),
            )
          : null,
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.emphasis = false,
  });

  final String label;
  final String value;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    final FontWeight weight = emphasis ? FontWeight.w700 : FontWeight.w600;
    final Color color = emphasis
        ? _PaymentMethodsScreenState._title
        : _PaymentMethodsScreenState._textMuted;
    return Row(
      children: [
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 13,
            fontWeight: weight,
            color: color,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: GoogleFonts.poppins(
            fontSize: 13,
            fontWeight: weight,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _EnrollButton extends StatelessWidget {
  const _EnrollButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
        child: Material(
          color: _PaymentMethodsScreenState._primary,
          borderRadius: BorderRadius.circular(40),
          child: InkWell(
            borderRadius: BorderRadius.circular(40),
            onTap: onTap,
            child: SizedBox(
              height: 58,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 22),
                child: Row(
                  children: [
                    const Spacer(),
                    Text(
                      label,
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      width: 34,
                      height: 34,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_forward,
                        size: 18,
                        color: _PaymentMethodsScreenState._primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PaymentMethod {
  const _PaymentMethod({
    required this.label,
    required this.logoText,
    required this.assetPath,
    required this.hasFee,
    required this.requiresManualTransfer,
    required this.color,
  });

  final String label;
  final String logoText;
  final String assetPath;
  final bool hasFee;
  final bool requiresManualTransfer;
  final Color color;
}
