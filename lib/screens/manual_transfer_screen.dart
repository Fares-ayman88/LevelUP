import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../app_state/transaction_catalog.dart';
import '../widgets/payment_status_dialogs.dart';
import 'course_detail_screen.dart';

class ManualTransferArgs {
  const ManualTransferArgs({
    required this.course,
    required this.paymentMethod,
    required this.totalLabel,
  });

  final CourseDetailArgs course;
  final String paymentMethod;
  final String totalLabel;
}

class ManualTransferScreen extends StatefulWidget {
  const ManualTransferScreen({super.key});

  @override
  State<ManualTransferScreen> createState() => _ManualTransferScreenState();
}

class _ManualTransferScreenState extends State<ManualTransferScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _primary = Color(0xFF0D65FF);

  static const String _vodafoneNumber = '01055117991';
  static const String _vodafoneName = 'Ahmed S**** A****** M******';
  static const String _instaPayNumber = '01148822933';
  static const String _instaPayName = 'Ahmed S*** A******* M*****';

  final TextEditingController _senderController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  XFile? _attachment;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _senderController.dispose();
    super.dispose();
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

  Future<void> _pickAttachment() async {
    try {
      final XFile? file = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (!mounted) return;
      if (file == null) return;
      setState(() => _attachment = file);
    } catch (_) {
      _showToast('Attachment failed. Try again.');
    }
  }

  Future<void> _submit(ManualTransferArgs args) async {
    if (_submitting) return;
    final String sender = _senderController.text.trim();
    if (sender.isEmpty) {
      _showToast('Enter sender number.');
      return;
    }
    if (_attachment == null) {
      _showToast('Attach transfer screenshot.');
      return;
    }
    setState(() => _submitting = true);
    TransactionItem? created;
    try {
      created = await TransactionCatalog.createTransaction(
        courseId: args.course.courseId,
        courseTitle: args.course.title,
        courseCategory: args.course.category,
        priceLabel: args.totalLabel,
        courseCoverImagePath: args.course.coverImagePath,
        paymentMethod: args.paymentMethod,
        senderNumber: sender,
        attachmentPath: _attachment?.path,
      );
    } on FirebaseException catch (error, stackTrace) {
      debugPrint(
        '[ManualTransfer] submit failed: ${error.code} ${error.message}',
      );
      debugPrintStack(stackTrace: stackTrace);
      if (!mounted) return;
      _showToast(_resolveSubmitError(error));
      setState(() => _submitting = false);
      return;
    } catch (error, stackTrace) {
      debugPrint('[ManualTransfer] submit failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      if (!mounted) return;
      _showToast('Could not submit payment: ${_shortError(error)}');
      setState(() => _submitting = false);
      return;
    }
    if (!mounted) return;
    if (created == null) {
      _showToast('Please sign in to continue.');
      setState(() => _submitting = false);
      return;
    }
    try {
      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        barrierColor: Colors.black.withValues(alpha: 0.45),
        builder: (_) => PaymentPendingDialog(
          onReturnHome: () => Navigator.of(context).pop(),
        ),
      );
      if (!mounted) return;
      Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (error, stackTrace) {
      debugPrint('[ManualTransfer] pending dialog failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      if (!mounted) return;
      _showToast('Payment submitted, but confirmation screen failed.');
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ManualTransferArgs args =
        ModalRoute.of(context)?.settings.arguments as ManualTransferArgs;
    final bool isInstaPay = args.paymentMethod.toLowerCase().contains('insta');
    final String walletNumber = isInstaPay ? _instaPayNumber : _vodafoneNumber;
    final String walletName = isInstaPay ? _instaPayName : _vodafoneName;
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = constraints.maxWidth.clamp(0, 420);
            final double horizontalPadding =
                (constraints.maxWidth - maxContentWidth) / 2;
            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding + 20,
                18,
                horizontalPadding + 20,
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
                        'Manual Transfer',
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
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
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Send the amount to',
                          style: GoogleFonts.poppins(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: _muted,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          walletNumber,
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: _title,
                            letterSpacing: 0.4,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          walletName,
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: _muted,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Text(
                              args.paymentMethod,
                              style: GoogleFonts.poppins(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: _primary,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              args.totalLabel,
                              style: GoogleFonts.poppins(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: _title,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Sender Number',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF3C4466),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFF),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E6F4)),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    child: TextField(
                      controller: _senderController,
                      keyboardType: TextInputType.phone,
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF202244),
                      ),
                      decoration: InputDecoration(
                        hintText: '01xxxxxxxxx',
                        hintStyle: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF9AA1B8),
                        ),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Transfer Screenshot',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF3C4466),
                    ),
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: _pickAttachment,
                    child: Container(
                      height: 120,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFFE2E6F4)),
                      ),
                      child: _attachment == null
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.cloud_upload_outlined,
                                    color: _primary,
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Upload attachment',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: _primary,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : ClipRRect(
                              borderRadius: BorderRadius.circular(18),
                              child: Image.file(
                                File(_attachment!.path),
                                fit: BoxFit.cover,
                                width: double.infinity,
                                height: double.infinity,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _submitting ? null : () => _submit(args),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: _submitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              'Submit Transfer',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
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
