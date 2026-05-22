import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

class CourseCompletedDialog extends StatelessWidget {
  const CourseCompletedDialog({
    super.key,
    required this.courseTitle,
    required this.onSeeCertificate,
  });

  final String courseTitle;
  final VoidCallback onSeeCertificate;

  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _primary = Color(0xFF0D65FF);

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
              height: 180,
              child: SvgPicture.asset(
                'assets/my_courses/course_completed.svg',
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Course Completed',
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: _title,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Course completed for $courseTitle. Your certificate is ready.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 13.5,
                fontWeight: FontWeight.w500,
                color: _muted,
                height: 1.5,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(5, (index) {
                final Color color = index < 4
                    ? const Color(0xFFF4B400)
                    : const Color(0xFFD4D8E6);
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: Icon(
                    Icons.star_rounded,
                    size: 20,
                    color: color,
                  ),
                );
              }),
            ),
            const SizedBox(height: 18),
            _SeeCertificateButton(
              label: 'See Certificate',
              onTap: onSeeCertificate,
            ),
          ],
        ),
      ),
    );
  }
}

class _SeeCertificateButton extends StatelessWidget {
  const _SeeCertificateButton({
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: CourseCompletedDialog._primary,
      borderRadius: BorderRadius.circular(34),
      child: InkWell(
        borderRadius: BorderRadius.circular(34),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: GoogleFonts.poppins(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 14),
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.arrow_forward,
                  size: 16,
                  color: CourseCompletedDialog._primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
