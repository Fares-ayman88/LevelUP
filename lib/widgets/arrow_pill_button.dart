import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ArrowPillButton extends StatelessWidget {
  const ArrowPillButton({
    super.key,
    required this.label,
    required this.width,
    required this.height,
    required this.onTap,
    this.backgroundColor = const Color(0xFF0D65FF),
    this.textColor = Colors.white,
    this.arrowBackground = Colors.white,
    this.arrowColor = const Color(0xFF0D65FF),
  });

  final String label;
  final double width;
  final double height;
  final VoidCallback? onTap;
  final Color backgroundColor;
  final Color textColor;
  final Color arrowBackground;
  final Color arrowColor;

  @override
  Widget build(BuildContext context) {
    final double radius = height / 2;
    final double arrowSize = height - 16;
    final Color fillColor = onTap == null
        ? backgroundColor.withValues(alpha: 0.6)
        : backgroundColor;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: Container(
          width: width,
          height: height,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: fillColor,
            borderRadius: BorderRadius.circular(radius),
          ),
          child: Row(
            children: [
              Expanded(
                child: Center(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: textColor,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                width: arrowSize,
                height: arrowSize,
                decoration: BoxDecoration(
                  color: arrowBackground,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.arrow_forward,
                  color: arrowColor,
                  size: arrowSize * 0.55,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
