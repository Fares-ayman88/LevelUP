import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:image_gallery_saver/image_gallery_saver.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:printing/printing.dart';
import 'package:pdf/widgets.dart' as pw;

import '../app_state/transaction_catalog.dart';

class ReceiptArgs {
  const ReceiptArgs({required this.item});

  final TransactionItem item;
}

class ReceiptScreen extends StatefulWidget {
  const ReceiptScreen({super.key});

  @override
  State<ReceiptScreen> createState() => _ReceiptScreenState();
}

class _ReceiptScreenState extends State<ReceiptScreen> {
  static const Color _background = Color(0xFFF5F9FF);
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF7D818F);

  final GlobalKey _repaintKey = GlobalKey();
  final GlobalKey _menuKey = GlobalKey();

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

  Future<Uint8List?> _captureReceipt() async {
    try {
      final RenderRepaintBoundary? boundary =
          _repaintKey.currentContext?.findRenderObject()
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

  Future<bool> _ensureGalleryPermission() async {
    final PermissionStatus photos = await Permission.photos.request();
    if (photos.isGranted || photos.isLimited) return true;
    final PermissionStatus storage = await Permission.storage.request();
    return storage.isGranted;
  }

  Future<void> _downloadReceipt() async {
    final bool allowed = await _ensureGalleryPermission();
    if (!allowed) {
      _showToast('Gallery permission denied');
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 80));
    final Uint8List? bytes = await _captureReceipt();
    if (bytes == null) {
      _showToast('Failed to capture receipt');
      return;
    }
    final String name = 'receipt_${DateTime.now().millisecondsSinceEpoch}';
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

  Future<void> _printReceipt() async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    final Uint8List? bytes = await _captureReceipt();
    if (bytes == null) {
      _showToast('Failed to capture receipt');
      return;
    }
    try {
      await Printing.layoutPdf(
        onLayout: (format) async {
          final pw.Document doc = pw.Document();
          final pw.MemoryImage image = pw.MemoryImage(bytes);
          doc.addPage(
            pw.Page(
              pageFormat: format,
              build: (context) =>
                  pw.Center(child: pw.Image(image, fit: pw.BoxFit.contain)),
            ),
          );
          return doc.save();
        },
      );
    } catch (_) {
      _showToast('Print failed');
    }
  }

  Future<void> _shareReceipt() async {
    await Future<void>.delayed(const Duration(milliseconds: 80));
    final Uint8List? bytes = await _captureReceipt();
    if (bytes == null) {
      _showToast('Failed to capture receipt');
      return;
    }
    try {
      await Printing.sharePdf(bytes: bytes, filename: 'receipt.pdf');
    } catch (_) {
      _showToast('Share failed');
    }
  }

  Future<void> _copyText(String value) async {
    await Clipboard.setData(ClipboardData(text: value));
    _showToast('Copied to clipboard');
  }

  Future<void> _openActionMenu() async {
    final BuildContext? menuContext = _menuKey.currentContext;
    if (menuContext == null) return;
    final RenderBox button = menuContext.findRenderObject() as RenderBox;
    final OverlayState overlayState = Overlay.of(context);
    final RenderBox overlay =
        overlayState.context.findRenderObject() as RenderBox;
    final Offset topLeft = button.localToGlobal(Offset.zero, ancestor: overlay);
    final Offset bottomRight = button.localToGlobal(
      button.size.bottomRight(Offset.zero),
      ancestor: overlay,
    );
    final RelativeRect position = RelativeRect.fromRect(
      Rect.fromPoints(topLeft, bottomRight),
      Offset.zero & overlay.size,
    );
    final int? selected = await showMenu<int>(
      context: context,
      position: position,
      color: Colors.white,
      elevation: 12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      items: [
        PopupMenuItem(
          value: 0,
          child: _MenuRow(label: 'Share', icon: Icons.send),
        ),
        PopupMenuItem(
          value: 1,
          child: _MenuRow(label: 'Download', icon: Icons.download_rounded),
        ),
        PopupMenuItem(
          value: 2,
          child: _MenuRow(label: 'Print', icon: Icons.print_rounded),
        ),
      ],
    );
    if (selected == null) return;
    if (selected == 0) {
      _shareReceipt();
    } else if (selected == 1) {
      _downloadReceipt();
    } else if (selected == 2) {
      _printReceipt();
    }
  }

  String _formatDate(DateTime? value) {
    final DateTime date = value ?? DateTime.now();
    const List<String> months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final String year = date.year.toString();
    final String month = months[date.month - 1];
    final String day = date.day.toString();
    final String hour = date.hour.toString().padLeft(2, '0');
    final String minute = date.minute.toString().padLeft(2, '0');
    return '$month $day, $year / $hour:$minute';
  }

  String _resolveReceiptCode(TransactionItem item) {
    final String code = item.receiptCode.trim();
    if (code.isNotEmpty) return code;
    return item.id;
  }

  List<String> _resolveBarcode(TransactionItem item) {
    final String left = item.barcodeLeft.trim();
    final String right = item.barcodeRight.trim();
    if (left.isNotEmpty && right.isNotEmpty) {
      return [left, right];
    }
    final String digits = item.id.replaceAll(RegExp(r'\D'), '');
    if (digits.length >= 16) {
      return [digits.substring(0, 8), digits.substring(8, 16)];
    }
    final String padded = digits.padRight(16, '0');
    return [padded.substring(0, 8), padded.substring(8, 16)];
  }

  @override
  Widget build(BuildContext context) {
    final ReceiptArgs args =
        ModalRoute.of(context)?.settings.arguments as ReceiptArgs;
    final TransactionItem item = args.item;
    final String receiptCode = _resolveReceiptCode(item);
    final List<String> barcodeNumbers = _resolveBarcode(item);
    final Color statusColor = item.status == TransactionStatus.paid
        ? const Color(0xFF1F7C64)
        : item.status == TransactionStatus.rejected
        ? const Color(0xFFE74C3C)
        : const Color(0xFFE2702B);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: Column(
            children: [
              Row(
                children: [
                  InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: () => Navigator.of(context).pop(),
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Icon(Icons.arrow_back, size: 26, color: _title),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'E-Receipt',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    key: _menuKey,
                    onPressed: _openActionMenu,
                    icon: const Icon(Icons.more_horiz, color: _title),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              RepaintBoundary(
                key: _repaintKey,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(6, 12, 6, 18),
                  decoration: BoxDecoration(
                    color: _background,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Align(
                        alignment: Alignment.center,
                        child: SvgPicture.asset(
                          'assets/e_receipt/ICON.svg',
                          width: 92,
                          height: 90,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Align(
                        alignment: Alignment.center,
                        child: ClipRect(
                          child: Align(
                            alignment: Alignment.topCenter,
                            heightFactor: 0.74,
                            child: SvgPicture.asset(
                              'assets/e_receipt/BAR CODE.svg',
                              width: 270,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              barcodeNumbers[0],
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _title,
                              ),
                            ),
                            Text(
                              barcodeNumbers[1],
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: _title,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),
                      _ReceiptRow(
                        label: 'Name',
                        value: _ValueText(
                          text: item.userName.isNotEmpty
                              ? item.userName
                              : item.userEmail,
                        ),
                      ),
                      _ReceiptRow(
                        label: 'Email ID',
                        value: _ValueText(text: item.userEmail),
                      ),
                      _ReceiptRow(
                        label: 'Course',
                        value: _ValueText(text: item.courseTitle),
                      ),
                      _ReceiptRow(
                        label: 'Category',
                        value: _ValueText(text: item.courseCategory),
                      ),
                      const SizedBox(height: 8),
                      _ReceiptRow(
                        label: 'TransactionID',
                        value: _CopyableValue(
                          text: receiptCode,
                          onCopy: () => _copyText(receiptCode),
                        ),
                      ),
                      _ReceiptRow(
                        label: 'Price',
                        value: _ValueText(text: item.priceLabel),
                      ),
                      _ReceiptRow(
                        label: 'Date',
                        value: _ValueText(
                          text: _formatDate(item.updatedAt ?? item.createdAt),
                        ),
                      ),
                      _ReceiptRow(
                        label: 'Status',
                        value: _StatusPill(
                          text: item.status.label,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  const _ReceiptRow({required this.label, required this.value});

  final String label;
  final Widget value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: _ReceiptScreenState._title,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Align(alignment: Alignment.centerRight, child: value),
          ),
        ],
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: Row(
        children: [
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: _ReceiptScreenState._title,
            ),
          ),
          const Spacer(),
          Icon(icon, size: 18, color: _ReceiptScreenState._title),
        ],
      ),
    );
  }
}

class _ValueText extends StatelessWidget {
  const _ValueText({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: TextAlign.right,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: GoogleFonts.poppins(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: _ReceiptScreenState._textMuted,
      ),
    );
  }
}

class _CopyableValue extends StatelessWidget {
  const _CopyableValue({required this.text, required this.onCopy});

  final String text;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: Text(
            text,
            textAlign: TextAlign.right,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: _ReceiptScreenState._textMuted,
            ),
          ),
        ),
        const SizedBox(width: 6),
        InkWell(
          onTap: onCopy,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.all(2),
            child: SvgPicture.asset(
              'assets/e_receipt/copy TransactionID.svg',
              width: 14,
              height: 16,
            ),
          ),
        ),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: GoogleFonts.poppins(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
    );
  }
}
