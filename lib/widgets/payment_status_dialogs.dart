import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PaymentPendingDialog extends StatelessWidget {
  const PaymentPendingDialog({super.key, required this.onReturnHome});

  final VoidCallback onReturnHome;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(30),
          boxShadow: const [
            BoxShadow(
              color: Color(0x2A2D3A5A),
              blurRadius: 24,
              offset: Offset(0, 18),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 86,
              height: 86,
              decoration: const BoxDecoration(
                color: Color(0xFFEAF0FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.schedule_rounded,
                size: 44,
                color: Color(0xFF0D65FF),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Payment Verification',
              style: GoogleFonts.poppins(
                fontSize: 19,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF202244),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Your payment is being verified.\nWe will notify you once it is approved.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF7D818F),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 18),
            _DialogPrimaryButton(
              label: 'RETURN TO HOME',
              onTap: onReturnHome,
            ),
          ],
        ),
      ),
    );
  }
}

class PaymentApprovedDialog extends StatelessWidget {
  const PaymentApprovedDialog({
    super.key,
    required this.onReturnHome,
    this.onWatchCourse,
    this.onReceipt,
  });

  final VoidCallback onReturnHome;
  final VoidCallback? onWatchCourse;
  final VoidCallback? onReceipt;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(30),
          boxShadow: const [
            BoxShadow(
              color: Color(0x2A2D3A5A),
              blurRadius: 24,
              offset: Offset(0, 18),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 140,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 94,
                    height: 94,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEAF3FF),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: const Color(0xFFD7E6FF),
                        width: 1.2,
                      ),
                    ),
                  ),
                  const Icon(
                    Icons.verified_rounded,
                    size: 52,
                    color: Color(0xFF0D65FF),
                  ),
                  const Positioned(
                    left: 18,
                    top: 18,
                    child: Icon(
                      Icons.star,
                      size: 18,
                      color: Color(0xFFF6B445),
                    ),
                  ),
                  const Positioned(
                    right: 18,
                    top: 26,
                    child: Icon(
                      Icons.star,
                      size: 14,
                      color: Color(0xFF1F7C64),
                    ),
                  ),
                  const Positioned(
                    left: 26,
                    bottom: 22,
                    child: Icon(
                      Icons.circle,
                      size: 10,
                      color: Color(0xFFE04B4B),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Congratulations',
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF202244),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Your payment was approved.\nYou can start the course now.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 13.5,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF7D818F),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            if (onWatchCourse != null)
              InkWell(
                borderRadius: BorderRadius.circular(8),
                onTap: onWatchCourse,
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  child: Text(
                    'Watch the Course',
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF1F7C64),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ),
            if (onReceipt != null) ...[
              const SizedBox(height: 12),
              _DialogPrimaryButton(
                label: 'E - Receipt',
                onTap: onReceipt!,
              ),
            ],
            if (onWatchCourse != null || onReceipt != null)
              const SizedBox(height: 12),
            _DialogPrimaryButton(
              label: 'RETURN TO HOME',
              onTap: onReturnHome,
            ),
          ],
        ),
      ),
    );
  }
}

class PaymentRejectedDialog extends StatelessWidget {
  const PaymentRejectedDialog({super.key, required this.onReturnHome});

  final VoidCallback onReturnHome;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.fromLTRB(22, 24, 22, 22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(30),
          boxShadow: const [
            BoxShadow(
              color: Color(0x2A2D3A5A),
              blurRadius: 24,
              offset: Offset(0, 18),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 86,
              height: 86,
              decoration: const BoxDecoration(
                color: Color(0xFFFCECEC),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.close_rounded,
                size: 42,
                color: Color(0xFFE04B4B),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Payment Rejected',
              style: GoogleFonts.poppins(
                fontSize: 19,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF202244),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Your payment could not be verified.\nPlease contact support or try again.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF7D818F),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 18),
            _DialogPrimaryButton(
              label: 'RETURN TO HOME',
              onTap: onReturnHome,
            ),
          ],
        ),
      ),
    );
  }
}

class _DialogPrimaryButton extends StatelessWidget {
  const _DialogPrimaryButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF0D65FF),
      borderRadius: BorderRadius.circular(34),
      child: InkWell(
        borderRadius: BorderRadius.circular(34),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 14.5,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
