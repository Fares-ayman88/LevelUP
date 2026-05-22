import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

enum SocialIconType { google, apple }

class SocialIcon extends StatelessWidget {
  const SocialIcon({
    super.key,
    required this.type,
    this.size = 44,
  });

  final SocialIconType type;
  final double size;

  @override
  Widget build(BuildContext context) {
    final String assetPath = type == SocialIconType.apple
        ? 'assets/auth_buttons/apple.svg'
        : 'assets/auth_buttons/google.svg';
    return SizedBox(
      width: size,
      height: size,
      child: SvgPicture.asset(
        assetPath,
        width: size,
        height: size,
        fit: BoxFit.contain,
      ),
    );
  }
}
