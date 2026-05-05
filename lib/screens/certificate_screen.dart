import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_gallery_saver/image_gallery_saver.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/user_profile.dart';

class CertificateScreen extends StatefulWidget {
  const CertificateScreen({super.key});

  @override
  State<CertificateScreen> createState() => _CertificateScreenState();
}

class _CertificateScreenState extends State<CertificateScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _accent = Color(0xFF332DA1);
  static const String _issuerSignatureName = 'Ahmed Said Mobasher';

  final GlobalKey _certificateKey = GlobalKey();
  final DateTime _issuedOn = DateTime.now();

  static const List<String> _months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  String _formatDate(DateTime value) {
    final String month = _months[value.month - 1];
    return '$month ${value.day}, ${value.year}';
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

  Future<bool> _ensureGalleryPermission() async {
    if (kIsWeb) return false;
    final PermissionStatus photos = await Permission.photos.request();
    if (photos.isGranted || photos.isLimited) return true;
    final PermissionStatus storage = await Permission.storage.request();
    return storage.isGranted;
  }

  Future<Uint8List?> _captureCertificate() async {
    try {
      final RenderRepaintBoundary? boundary =
          _certificateKey.currentContext?.findRenderObject()
              as RenderRepaintBoundary?;
      if (boundary == null) return null;
      final ui.Image image = await boundary.toImage(pixelRatio: 3);
      final ByteData? byteData = await image.toByteData(
        format: ui.ImageByteFormat.png,
      );
      return byteData?.buffer.asUint8List();
    } catch (_) {
      return null;
    }
  }

  Future<void> _downloadCertificate() async {
    if (kIsWeb) {
      _showToast('Download not supported on web');
      return;
    }
    final bool allowed = await _ensureGalleryPermission();
    if (!allowed) {
      _showToast('Gallery permission denied');
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 80));
    final Uint8List? bytes = await _captureCertificate();
    if (bytes == null) {
      _showToast('Failed to capture certificate');
      return;
    }
    final String name = 'certificate_${DateTime.now().millisecondsSinceEpoch}';
    final dynamic result = await ImageGallerySaver.saveImage(
      bytes,
      name: name,
      quality: 100,
    );
    final bool success =
        (result is Map &&
            (result['isSuccess'] == true || result['success'] == true)) ||
        (result is bool && result);
    _showToast(success ? 'Saved to gallery' : 'Save failed');
  }

  @override
  Widget build(BuildContext context) {
    final Object? args = ModalRoute.of(context)?.settings.arguments;
    final CertificateArgs data = args is CertificateArgs
        ? args
        : CertificateArgs(
            courseTitle: '3D Design Illustration',
            userName: UserProfile.userName.trim(),
            certificateId: 'SK24568086',
          );

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: _DownloadButton(onTap: _downloadCertificate),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = constraints.maxWidth > 420
                ? 420
                : constraints.maxWidth;
            final double horizontalPadding =
                (constraints.maxWidth - maxContentWidth) / 2 + 20;
            final String issuedOn = _formatDate(_issuedOn);

            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                20,
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
                      Expanded(
                        child: Text(
                          data.courseTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: _title,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  _SearchBar(muted: _muted, value: data.courseTitle),
                  const SizedBox(height: 18),
                  RepaintBoundary(
                    key: _certificateKey,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x1C7C8BB4),
                            blurRadius: 22,
                            offset: Offset(0, 14),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(24),
                        child: Stack(
                          children: [
                            Positioned(
                              right: -12,
                              top: -12,
                              child: SvgPicture.asset(
                                'assets/certificate/blue.svg',
                                width: 180,
                                height: 230,
                                fit: BoxFit.contain,
                              ),
                            ),
                            Positioned(
                              left: -12,
                              bottom: -12,
                              child: SvgPicture.asset(
                                'assets/certificate/orange.svg',
                                width: 130,
                                height: 180,
                                fit: BoxFit.contain,
                              ),
                            ),
                            Positioned.fill(
                              child: IgnorePointer(
                                child: LayoutBuilder(
                                  builder: (context, constraints) {
                                    final double watermarkSize =
                                        constraints.maxHeight * 1.7;
                                    Widget buildMark(double offsetY) {
                                      return Transform.translate(
                                        offset: Offset(0, offsetY),
                                        child: Opacity(
                                          opacity: 0.12,
                                          child: Image.asset(
                                            'assets/certificate_logo_circle.png',
                                            width: watermarkSize,
                                            height: watermarkSize,
                                            fit: BoxFit.contain,
                                            filterQuality: FilterQuality.high,
                                          ),
                                        ),
                                      );
                                    }

                                    return Stack(
                                      alignment: Alignment.center,
                                      children: [
                                        buildMark(
                                          -constraints.maxHeight * 0.07,
                                        ),
                                        buildMark(constraints.maxHeight * 0.25),
                                      ],
                                    );
                                  },
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(
                                24,
                                30,
                                24,
                                28,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  const _CertificateBrandMark(size: 68),
                                  const SizedBox(height: 14),
                                  Text(
                                    'Certificate of Completions',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.poppins(
                                      fontSize: 21,
                                      fontWeight: FontWeight.w700,
                                      color: _title,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'This Certifies that',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.poppins(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w600,
                                      color: _muted,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    data.userName,
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.poppins(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w700,
                                      color: _accent,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    'Has Successfully Completed the Wallace Training\nProgram, Entitled.',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.poppins(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w600,
                                      color: _muted,
                                      height: 1.5,
                                    ),
                                  ),
                                  const SizedBox(height: 18),
                                  Text(
                                    '${data.courseTitle} Course',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.poppins(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                      color: _title,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Issued on $issuedOn',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: _muted,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'ID: ${data.certificateId}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: _title,
                                    ),
                                  ),
                                  const SizedBox(height: 26),
                                  Image.asset(
                                    'assets/certificate/signature.png',
                                    height: 42,
                                    fit: BoxFit.contain,
                                    errorBuilder: (context, error, stackTrace) {
                                      return Text(
                                        _issuerSignatureName,
                                        style: GoogleFonts.allura(
                                          fontSize: 30,
                                          fontWeight: FontWeight.w700,
                                          color: _title,
                                        ),
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 6),
                                  Container(
                                    width: 180,
                                    height: 1,
                                    color: const Color(0xFFD5DBEC),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Level Up Team Work',
                                    style: GoogleFonts.poppins(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      color: _title,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Issued on $issuedOn',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: _muted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
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

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.muted, required this.value});

  final Color muted;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 58,
      padding: const EdgeInsets.fromLTRB(18, 6, 12, 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C7C8BB4),
            blurRadius: 22,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: muted,
              ),
            ),
          ),
          SvgPicture.asset(
            'assets/my_courses/search.svg',
            width: 42,
            height: 42,
          ),
        ],
      ),
    );
  }
}

class _DownloadButton extends StatelessWidget {
  const _DownloadButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const double barHeight = 56;
    const double pillRadius = 30;
    const double arrowSize = 38;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 16),
        child: Container(
          height: barHeight,
          decoration: BoxDecoration(
            color: _CertificateScreenState._primary,
            borderRadius: BorderRadius.circular(pillRadius),
            boxShadow: const [
              BoxShadow(
                color: Color(0x2E0D65FF),
                blurRadius: 16,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(pillRadius),
            child: InkWell(
              borderRadius: BorderRadius.circular(pillRadius),
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 22),
                child: Row(
                  children: [
                    const Spacer(),
                    Text(
                      'Download Certificate',
                      style: GoogleFonts.poppins(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      width: arrowSize,
                      height: arrowSize,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_forward,
                        size: 19,
                        color: _CertificateScreenState._primary,
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

class _CertificateBrandMark extends StatelessWidget {
  const _CertificateBrandMark({this.size = 68});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/certificate_logo_circle.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
    );
  }
}

class CertificateArgs {
  const CertificateArgs({
    required this.courseTitle,
    required this.userName,
    required this.certificateId,
  });

  final String courseTitle;
  final String userName;
  final String certificateId;
}
