import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../app_state/user_profile.dart';
import '../app_state/user_access.dart';
import '../app_state/app_strings.dart';
import '../services/profile_image_service.dart';

const Color _primary = Color(0xFF0D65FF);
const Color _title = Color(0xFF1C2040);
const Color _muted = Color(0xFF9AA1B8);

class Country {
  const Country({
    required this.name,
    required this.dialCode,
    required this.flag,
  });

  final String name;
  final String dialCode;
  final String flag;
}

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  static const double _contentMaxWidth = 420;

  final ImagePicker _picker = ImagePicker();
  File? _avatarFile;
  String _avatarUrl = '';

  Country _selectedCountry = const Country(
    name: 'United States',
    dialCode: '+1',
    flag: '\u{1F1FA}\u{1F1F8}',
  );
  String _selectedGender = '';

  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _nickNameController = TextEditingController();
  final TextEditingController _dateOfBirthController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _bioController = TextEditingController();

  bool _suspendSave = true;
  bool _isSaving = false;
  bool _isUploadingAvatar = false;
  bool _isInstructor = false;
  Timer? _debounce;
  Map<String, dynamic> _lastSaved = {};

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _attachListeners();
    _loadProfile();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _fullNameController.dispose();
    _nickNameController.dispose();
    _dateOfBirthController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  void _attachListeners() {
    _fullNameController.addListener(_scheduleSave);
    _nickNameController.addListener(_scheduleSave);
    _dateOfBirthController.addListener(_scheduleSave);
    _emailController.addListener(_scheduleSave);
    _phoneController.addListener(_scheduleSave);
    _bioController.addListener(_scheduleSave);
  }

  Future<void> _loadProfile() async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      _suspendSave = false;
      return;
    }

    try {
      await ProfileImageService.syncFromAuthUser(
        user,
        displayName: UserProfile.userName.trim(),
      );
    } catch (_) {}

    try {
      final DocumentSnapshot<Map<String, dynamic>> snapshot =
          await FirebaseFirestore.instance
              .collection('users')
              .doc(user.uid)
              .get();
      final Map<String, dynamic> data = snapshot.data() ?? {};
      _applyProfileData(user, data);
    } catch (_) {
      _applyProfileData(user, const {});
    }
  }

  void _applyProfileData(User user, Map<String, dynamic> data) {
    _suspendSave = true;

    final String storedCountryName = (data['phoneCountryName'] ?? '')
        .toString();
    final String storedCountryCode = (data['phoneCountryCode'] ?? '')
        .toString();
    final String storedCountryFlag = (data['phoneCountryFlag'] ?? '')
        .toString();

    final String fallbackName = UserProfile.userName.trim();
    _fullNameController.text = _readValue(
      data['fullName'],
      (user.displayName ?? '').trim(),
      fallbackName,
    );
    _nickNameController.text = _readValue(data['nickName']);
    _dateOfBirthController.text = _readValue(data['dob']);
    _emailController.text = _readValue(
      data['email'],
      (user.email ?? '').trim(),
    );
    _phoneController.text = _readValue(data['phoneNumber']);
    _selectedGender = _readValue(data['gender']);
    _bioController.text = _readValue(data['bio']);
    final String role = (data['role'] ?? '').toString().trim().toLowerCase();
    _isInstructor =
        role == 'instructor' || UserAccess.current.value.isInstructor;
    _avatarUrl = _readValue(
      data['photoUrl'],
      _readValue(data['avatarUrl']),
      _readValue(data['imageUrl'], (user.photoURL ?? '').trim()),
    );

    if (storedCountryCode.isNotEmpty) {
      _selectedCountry = Country(
        name: storedCountryName.isEmpty ? 'United States' : storedCountryName,
        dialCode: storedCountryCode,
        flag: storedCountryFlag.isEmpty
            ? '\u{1F1FA}\u{1F1F8}'
            : storedCountryFlag,
      );
    }

    _lastSaved = _buildPayload();
    _suspendSave = false;

    if (mounted) {
      setState(() {});
    }
  }

  String _readValue(Object? primary, [String fallback = '', String alt = '']) {
    final String value = (primary ?? '').toString().trim();
    if (value.isNotEmpty) return value;
    if (fallback.trim().isNotEmpty) return fallback.trim();
    return alt.trim();
  }

  void _scheduleSave() {
    if (_suspendSave) return;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 700), () {
      if (mounted) {
        _saveProfile();
      }
    });
  }

  Map<String, dynamic> _buildPayload() {
    return {
      'fullName': _fullNameController.text.trim(),
      'nickName': _nickNameController.text.trim(),
      'dob': _dateOfBirthController.text.trim(),
      'email': _emailController.text.trim(),
      'phoneNumber': _phoneController.text.trim(),
      'phoneCountryCode': _selectedCountry.dialCode,
      'phoneCountryName': _selectedCountry.name,
      'phoneCountryFlag': _selectedCountry.flag,
      'gender': _selectedGender.trim(),
      if (_isInstructor) 'bio': _bioController.text.trim(),
    };
  }

  Future<void> _saveProfile({bool showFeedback = false}) async {
    if (_suspendSave) return;

    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      if (showFeedback && mounted) {
        _showMessage(context.tr('sign_in_to_update_profile'));
      }
      return;
    }

    final Map<String, dynamic> payload = _buildPayload();
    if (mapEquals(payload, _lastSaved)) return;

    if (mounted) {
      setState(() => _isSaving = true);
    }

    try {
      await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
        ...payload,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      _lastSaved = Map<String, dynamic>.from(payload);
      final String newName = payload['fullName'].toString().trim();
      if (newName.isNotEmpty) {
        UserProfile.userName = newName;
        try {
          await user.updateDisplayName(newName);
        } catch (_) {}
      }
      if (_isInstructor) {
        await _syncInstructorMentorProfile(user, payload);
      }

      if (showFeedback && mounted) {
        _showMessage(context.tr('profile_updated'));
      }
    } catch (_) {
      if (showFeedback && mounted) {
        _showMessage(context.tr('profile_save_failed'));
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
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

  String _formatDob(String input) {
    final digits = input.replaceAll(RegExp(r'[^0-9]'), '');
    final buffer = StringBuffer();
    for (int i = 0; i < digits.length && i < 8; i++) {
      if (i == 2 || i == 4) buffer.write('/');
      buffer.write(digits[i]);
    }
    return buffer.toString();
  }

  Future<void> _pickCountry() async {
    final Country? picked = await showModalBottomSheet<Country>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _CountrySheet(selected: _selectedCountry),
    );
    if (picked != null && mounted) {
      setState(() {
        _selectedCountry = picked;
      });
      _scheduleSave();
    }
  }

  Future<void> _pickGender() async {
    final String? picked = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _GenderSheet(selected: _selectedGender),
    );
    if (picked != null && mounted) {
      setState(() {
        _selectedGender = picked;
      });
      _scheduleSave();
    }
  }

  Future<void> _pickAvatar() async {
    final String? source = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => const _AvatarSheet(),
    );
    if (source == null) return;

    try {
      final XFile? file = await _picker.pickImage(
        source: source == 'camera' ? ImageSource.camera : ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 90,
      );
      if (file != null && mounted) {
        setState(() {
          _avatarFile = File(file.path);
        });
        await _uploadAvatar(File(file.path));
      }
    } catch (_) {
      if (!mounted) return;
      final String key = source == 'camera'
          ? 'camera_open_failed'
          : 'gallery_open_failed';
      _showMessage(context.tr(key));
    }
  }

  Future<void> _uploadAvatar(File file) async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    if (mounted) {
      setState(() => _isUploadingAvatar = true);
    }
    try {
      final String uploadedUrl = await ProfileImageService.uploadAvatar(
        user: user,
        imageFile: file,
        displayName: _fullNameController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _avatarUrl = uploadedUrl;
      });
      if (_isInstructor) {
        await _syncInstructorMentorProfile(user, _buildPayload());
      }
      _showMessage('Profile photo updated.');
    } catch (_) {
      if (!mounted) return;
      _showMessage('Could not upload profile photo. Try again.');
    } finally {
      if (mounted) {
        setState(() => _isUploadingAvatar = false);
      }
    }
  }

  Future<void> _syncInstructorMentorProfile(
    User user,
    Map<String, dynamic> payload,
  ) async {
    if (!_isInstructor) return;
    final DocumentReference<Map<String, dynamic>> mentorRef = FirebaseFirestore
        .instance
        .collection('mentors')
        .doc(user.uid);
    final DocumentSnapshot<Map<String, dynamic>> mentorSnap = await mentorRef
        .get();
    final Map<String, dynamic> mentorData =
        mentorSnap.data() ?? <String, dynamic>{};

    final String fullName = (payload['fullName'] ?? '').toString().trim();
    final String resolvedName = fullName.isNotEmpty
        ? fullName
        : ((user.displayName ?? '').trim().isNotEmpty
              ? user.displayName!.trim()
              : (user.email ?? 'Mentor').split('@').first);
    final String category =
        (mentorData['category'] ?? '').toString().trim().isEmpty
        ? 'General'
        : (mentorData['category'] ?? '').toString().trim();
    final String subtitle =
        (mentorData['subtitle'] ?? '').toString().trim().isEmpty
        ? '$category Mentor'
        : (mentorData['subtitle'] ?? '').toString().trim();
    final String bio = _bioController.text.trim();
    final String imageUrl = _avatarUrl.trim();

    final Map<String, dynamic> mentorPayload = <String, dynamic>{
      'name': resolvedName,
      'category': category,
      'subtitle': subtitle,
      'bio': bio,
      'updatedAt': FieldValue.serverTimestamp(),
    };
    if (!mentorSnap.exists) {
      mentorPayload['createdAt'] = FieldValue.serverTimestamp();
      mentorPayload['courses'] = '0';
      mentorPayload['students'] = '0';
      mentorPayload['ratings'] = '0';
    }
    if (imageUrl.isNotEmpty) {
      mentorPayload['imageUrl'] = imageUrl;
      mentorPayload['avatarUrl'] = imageUrl;
      mentorPayload['photoUrl'] = imageUrl;
    }
    await mentorRef.set(mentorPayload, SetOptions(merge: true));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(
              constraints.maxWidth,
              _contentMaxWidth,
            );
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                16,
                horizontalPadding,
                24,
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
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
                          context.tr('edit_profile'),
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: _title,
                          ),
                        ),
                        const Spacer(),
                        if (_isSaving)
                          Text(
                            context.tr('saving'),
                            style: GoogleFonts.poppins(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: _muted,
                            ),
                          ),
                        if (_isUploadingAvatar) ...[
                          const SizedBox(width: 10),
                          Text(
                            'Uploading photo...',
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _muted,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 28),
                    Center(
                      child: _AvatarPicker(
                        imageFile: _avatarFile,
                        imageUrl: _avatarUrl,
                        onTap: _pickAvatar,
                      ),
                    ),
                    const SizedBox(height: 28),
                    _ProfileField(
                      controller: _fullNameController,
                      hintText: context.tr('full_name'),
                    ),
                    const SizedBox(height: 16),
                    _ProfileField(
                      controller: _nickNameController,
                      hintText: context.tr('nick_name'),
                    ),
                    const SizedBox(height: 16),
                    _DateField(
                      controller: _dateOfBirthController,
                      hintText: context.tr('date_of_birth'),
                      onFormat: _formatDob,
                    ),
                    const SizedBox(height: 16),
                    _ProfileField(
                      controller: _emailController,
                      hintText: context.tr('email'),
                      leading: Icons.mail_outline,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 16),
                    _PhoneField(
                      controller: _phoneController,
                      country: _selectedCountry,
                      onSelectCountry: _pickCountry,
                    ),
                    const SizedBox(height: 16),
                    _ProfileDropdown(
                      value: _selectedGender,
                      hintText: context.tr('gender'),
                      onTap: _pickGender,
                    ),
                    if (_isInstructor) ...[
                      const SizedBox(height: 16),
                      _ProfileField(
                        controller: _bioController,
                        hintText: 'Bio',
                        leading: Icons.info_outline,
                        minLines: 3,
                        maxLines: 4,
                      ),
                    ],
                    const SizedBox(height: 30),
                    _UpdateButton(
                      isBusy: _isSaving,
                      onTap: _isSaving
                          ? null
                          : () => _saveProfile(showFeedback: true),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AvatarPicker extends StatelessWidget {
  const _AvatarPicker({
    required this.imageFile,
    required this.imageUrl,
    required this.onTap,
  });

  final File? imageFile;
  final String imageUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final String remote = imageUrl.trim();
    final ImageProvider? avatarImage = imageFile != null
        ? FileImage(imageFile!)
        : (remote.isNotEmpty ? NetworkImage(remote) : null);

    return SizedBox(
      width: 140,
      height: 140,
      child: Stack(
        children: [
          GestureDetector(
            onTap: onTap,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                border: Border.all(color: const Color(0xFF1F7C64), width: 3),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x14697AA0),
                    blurRadius: 26,
                    offset: Offset(0, 16),
                  ),
                ],
              ),
              child: ClipOval(
                child: avatarImage == null
                    ? Container(
                        color: const Color(0xFFE7ECFB),
                        child: const Icon(
                          Icons.person_outline,
                          size: 54,
                          color: Color(0xFFCBD5F0),
                        ),
                      )
                    : Image(image: avatarImage, fit: BoxFit.cover),
              ),
            ),
          ),
          Positioned(
            right: 12,
            bottom: 12,
            child: GestureDetector(
              onTap: onTap,
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1F7C64), width: 2),
                ),
                child: const Icon(
                  Icons.image_outlined,
                  size: 18,
                  color: Color(0xFF1F7C64),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileField extends StatelessWidget {
  const _ProfileField({
    required this.controller,
    required this.hintText,
    this.leading,
    this.keyboardType,
    this.minLines = 1,
    this.maxLines = 1,
  });

  final TextEditingController controller;
  final String hintText;
  final IconData? leading;
  final TextInputType? keyboardType;
  final int minLines;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C7C8BB4),
            blurRadius: 26,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        minLines: minLines,
        maxLines: maxLines,
        style: GoogleFonts.poppins(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: const Color(0xFF363F5A),
        ),
        cursorColor: _primary,
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: hintText,
          hintStyle: GoogleFonts.poppins(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: _muted,
          ),
          prefixIcon: leading == null
              ? null
              : Icon(leading, color: const Color(0xFF8A90A8), size: 22),
          prefixIconConstraints: leading == null
              ? null
              : const BoxConstraints(minWidth: 58),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 18,
            vertical: 18,
          ),
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.controller,
    required this.hintText,
    required this.onFormat,
  });

  final TextEditingController controller;
  final String hintText;
  final String Function(String) onFormat;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C7C8BB4),
            blurRadius: 26,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: TextInputType.number,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(10),
        ],
        onChanged: (value) {
          final formatted = onFormat(value);
          if (formatted != value) {
            controller.value = TextEditingValue(
              text: formatted,
              selection: TextSelection.collapsed(offset: formatted.length),
            );
          }
        },
        style: GoogleFonts.poppins(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: const Color(0xFF363F5A),
        ),
        cursorColor: _primary,
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: hintText,
          hintStyle: GoogleFonts.poppins(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: _muted,
          ),
          prefixIcon: const Icon(
            Icons.calendar_month_outlined,
            color: Color(0xFF8A90A8),
            size: 22,
          ),
          prefixIconConstraints: const BoxConstraints(minWidth: 58),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 18,
            vertical: 18,
          ),
        ),
      ),
    );
  }
}

class _PhoneField extends StatelessWidget {
  const _PhoneField({
    required this.controller,
    required this.country,
    required this.onSelectCountry,
  });

  final TextEditingController controller;
  final Country country;
  final VoidCallback onSelectCountry;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1C7C8BB4),
            blurRadius: 26,
            offset: Offset(0, 18),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: onSelectCountry,
            behavior: HitTestBehavior.opaque,
            child: Row(
              children: [
                _FlagBadge(flag: country.flag),
                const SizedBox(width: 10),
                const Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: Color(0xFF1C2040),
                  size: 26,
                ),
                const SizedBox(width: 4),
                Text(
                  country.dialCode,
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1C2140),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.phone,
              style: GoogleFonts.poppins(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF1C2140),
              ),
              cursorColor: _primary,
              decoration: const InputDecoration(
                border: InputBorder.none,
                isCollapsed: true,
                contentPadding: EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FlagBadge extends StatelessWidget {
  const _FlagBadge({required this.flag});

  final String flag;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      height: 34,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14697AA0),
            blurRadius: 14,
            offset: Offset(0, 8),
          ),
        ],
        border: Border.all(color: const Color(0xFFE4E8F3)),
      ),
      alignment: Alignment.center,
      child: Text(flag, style: const TextStyle(fontSize: 22)),
    );
  }
}

class _ProfileDropdown extends StatelessWidget {
  const _ProfileDropdown({
    required this.value,
    required this.hintText,
    required this.onTap,
  });

  final String value;
  final String hintText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1C7C8BB4),
                blurRadius: 26,
                offset: Offset(0, 18),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  value.isEmpty ? hintText : value,
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: value.isEmpty ? _muted : const Color(0xFF363F5A),
                  ),
                ),
              ),
              const Icon(
                Icons.keyboard_arrow_down_rounded,
                color: Color(0xFF3B425D),
                size: 26,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _UpdateButton extends StatelessWidget {
  const _UpdateButton({required this.onTap, required this.isBusy});

  final VoidCallback? onTap;
  final bool isBusy;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(40),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: BoxDecoration(
              color: _primary,
              borderRadius: BorderRadius.circular(40),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x330D65FF),
                  blurRadius: 18,
                  offset: Offset(0, 12),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    isBusy
                        ? AppStrings.of(context, 'updating')
                        : AppStrings.of(context, 'update'),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
                Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.arrow_forward,
                    color: _primary,
                    size: 22,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

const List<Country> _countries = [
  Country(name: 'United States', dialCode: '+1', flag: '\u{1F1FA}\u{1F1F8}'),
  Country(name: 'Egypt', dialCode: '+20', flag: '\u{1F1EA}\u{1F1EC}'),
  Country(name: 'Saudi Arabia', dialCode: '+966', flag: '\u{1F1F8}\u{1F1E6}'),
  Country(name: 'United Kingdom', dialCode: '+44', flag: '\u{1F1EC}\u{1F1E7}'),
  Country(
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '\u{1F1E6}\u{1F1EA}',
  ),
];

class _CountrySheet extends StatelessWidget {
  const _CountrySheet({required this.selected});

  final Country selected;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE0E3EF),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Select Country',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: _title,
              ),
            ),
            const SizedBox(height: 12),
            ..._countries.map(
              (country) => ListTile(
                onTap: () => Navigator.of(context).pop(country),
                leading: Text(
                  country.flag,
                  style: const TextStyle(fontSize: 24),
                ),
                title: Text(
                  country.name,
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  country.dialCode,
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _muted,
                  ),
                ),
                trailing: country.dialCode == selected.dialCode
                    ? const Icon(Icons.check, color: _primary)
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GenderSheet extends StatelessWidget {
  const _GenderSheet({required this.selected});

  final String selected;

  static const List<String> _options = [
    'Male',
    'Female',
    'Prefer not to answer',
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE0E3EF),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Select Gender',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: _title,
              ),
            ),
            const SizedBox(height: 12),
            ..._options.map(
              (option) => ListTile(
                onTap: () => Navigator.of(context).pop(option),
                title: Text(
                  option,
                  style: GoogleFonts.poppins(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                trailing: option == selected
                    ? const Icon(Icons.check, color: _primary)
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AvatarSheet extends StatelessWidget {
  const _AvatarSheet();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE0E3EF),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Profile Photo',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: _title,
              ),
            ),
            const SizedBox(height: 12),
            ListTile(
              onTap: () => Navigator.of(context).pop('camera'),
              leading: const Icon(Icons.photo_camera_outlined),
              title: Text(
                'Take a photo',
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ListTile(
              onTap: () => Navigator.of(context).pop('gallery'),
              leading: const Icon(Icons.photo_library_outlined),
              title: Text(
                'Choose from gallery',
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
