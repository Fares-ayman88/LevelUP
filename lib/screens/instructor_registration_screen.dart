import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/instructor_requests.dart';
import '../app_state/user_profile.dart';
import '../routes.dart';
import 'instructor_documents_screen.dart';

class InstructorRegistrationScreen extends StatefulWidget {
  const InstructorRegistrationScreen({super.key});

  @override
  State<InstructorRegistrationScreen> createState() =>
      _InstructorRegistrationScreenState();
}

class _InstructorRegistrationScreenState
    extends State<InstructorRegistrationScreen> {
  static const Color _title = Color(0xFF1C2140);
  static const Color _muted = Color(0xFF7D8194);
  static const Color _primary = Color(0xFF0D65FF);

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _categoryController = TextEditingController();
  final TextEditingController _coursesController = TextEditingController();
  final TextEditingController _experienceController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    final User? user = FirebaseAuth.instance.currentUser;
    final String displayName = (user?.displayName ?? '').trim();
    final String email = (user?.email ?? '').trim();
    if (displayName.isNotEmpty) {
      _nameController.text = displayName;
    } else if (UserProfile.userName.trim().isNotEmpty) {
      _nameController.text = UserProfile.userName.trim();
    }
    if (email.isNotEmpty) {
      _emailController.text = email;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _categoryController.dispose();
    _coursesController.dispose();
    _experienceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _showMessage(String message) {
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

  String _resolveError(Object error) {
    if (error is FirebaseException) {
      switch (error.code) {
        case 'permission-denied':
          return 'Permission denied. Check Firestore rules.';
        case 'unauthenticated':
        case 'not-authenticated':
          return 'Please sign in again.';
        case 'unavailable':
        case 'network-request-failed':
          return 'Network error. Check your connection.';
        case 'deadline-exceeded':
          return 'Request timed out. Try again.';
        case 'unauthorized':
          return 'Storage permission denied. Check Storage rules.';
        case 'object-not-found':
          return 'File not found on device.';
        default:
          return error.message ?? 'Could not send request. Try again.';
      }
    }
    if (error is TimeoutException) {
      return 'Request timed out. Try again.';
    }
    if (error is PlatformException) {
      return error.message ?? 'Could not send request. Try again.';
    }
    return 'Could not send request. Try again.';
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _showMessage('Sign in first.');
      return;
    }
    final String name = _nameController.text.trim();
    final String email = _emailController.text.trim();
    final String phone = _phoneController.text.trim();
    final String category = _categoryController.text.trim();
    final String coursesTaken = _coursesController.text.trim();
    final String experienceYears = _experienceController.text.trim();
    final String notes = _notesController.text.trim();
    if (name.isEmpty || email.isEmpty || phone.isEmpty || category.isEmpty) {
      _showMessage('Please fill all fields.');
      return;
    }
    setState(() => _submitting = true);
    try {
      await InstructorRequestService.submitRequest(
        user: user,
        name: name,
        email: email,
        phone: phone,
        category: category,
        coursesTaken: coursesTaken,
        experienceYears: experienceYears,
        notes: notes,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed(
        AppRoutes.instructorDocuments,
        arguments: InstructorDocumentsArgs(
          name: name,
          email: email,
          phone: phone,
          category: category,
          coursesTaken: coursesTaken,
          experienceYears: experienceYears,
          notes: notes,
        ),
      );
    } catch (error, stack) {
      debugPrint('Submit instructor request failed: $error');
      debugPrintStack(stackTrace: stack);
      if (!mounted) return;
      _showMessage(_resolveError(error));
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 28),
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
                      child: Icon(Icons.arrow_back, color: _title),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Instructor Registration',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'Join our team',
                style: GoogleFonts.poppins(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: _title,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Complete the form below to submit your professional application.',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: _muted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'We will collect your documents later via WhatsApp.',
                style: GoogleFonts.poppins(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: _muted,
                ),
              ),
              const SizedBox(height: 20),
              _LabeledField(
                label: 'Full Name',
                child: _InputField(
                  controller: _nameController,
                  hintText: 'John Doe',
                ),
              ),
              _LabeledField(
                label: 'Email Address',
                child: _InputField(
                  controller: _emailController,
                  hintText: 'john@example.com',
                  keyboardType: TextInputType.emailAddress,
                ),
              ),
              _LabeledField(
                label: 'Mobile Number',
                child: _InputField(
                  controller: _phoneController,
                  hintText: '+20 100 000 0000',
                  keyboardType: TextInputType.phone,
                ),
              ),
              _LabeledField(
                label: 'Specialization / Category',
                child: _InputField(
                  controller: _categoryController,
                  hintText: 'Graphic Design',
                ),
              ),
              _LabeledField(
                label: 'Courses Taken',
                child: _InputField(
                  controller: _coursesController,
                  hintText: 'List your courses or certifications',
                  maxLines: 2,
                  minLines: 2,
                  height: null,
                ),
              ),
              _LabeledField(
                label: 'Years of Experience',
                child: _InputField(
                  controller: _experienceController,
                  hintText: 'e.g. 2',
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                ),
              ),
              _LabeledField(
                label: 'Notes / Message',
                child: _InputField(
                  controller: _notesController,
                  hintText: 'Anything you want us to know',
                  maxLines: 3,
                  minLines: 3,
                  height: null,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              Colors.white,
                            ),
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Submit Application',
                              style: GoogleFonts.poppins(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 10),
                            const Icon(Icons.arrow_forward, size: 18),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'By submitting, you agree to our Instructor Terms.',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: _muted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: _InstructorRegistrationScreenState._title,
            ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _InputField extends StatelessWidget {
  const _InputField({
    required this.controller,
    required this.hintText,
    this.keyboardType,
    this.inputFormatters,
    this.maxLines = 1,
    this.minLines,
    this.height = 54,
  });

  final TextEditingController controller;
  final String hintText;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final int maxLines;
  final int? minLines;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      padding: EdgeInsets.symmetric(
        horizontal: 14,
        vertical: maxLines > 1 ? 10 : 0,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE1E6F2)),
      ),
      alignment: maxLines > 1 ? Alignment.topLeft : Alignment.center,
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        maxLines: maxLines,
        minLines: minLines,
        style: GoogleFonts.poppins(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: _InstructorRegistrationScreenState._title,
        ),
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: hintText,
          hintStyle: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: const Color(0xFFB1B7C7),
          ),
        ),
      ),
    );
  }
}
