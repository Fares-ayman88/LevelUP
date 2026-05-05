import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../app_state/user_profile.dart';
import '../routes.dart';

const Color _background = Color(0xFFF4F7FF);
const Color _primary = Color(0xFF0D65FF);
const double _contentMaxWidth = 420;

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

class FillProfileScreen extends StatefulWidget {
  const FillProfileScreen({super.key});

  @override
  State<FillProfileScreen> createState() => _FillProfileScreenState();
}

class _FillProfileScreenState extends State<FillProfileScreen> {
  Country _selectedCountry = const Country(
    name: 'United States',
    dialCode: '+1',
    flag: '\u{1F1FA}\u{1F1F8}',
  );
  String _selectedGender = '';
  File? _avatarFile;
  final ImagePicker _picker = ImagePicker();

  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _nickNameController = TextEditingController();
  final TextEditingController _dateOfBirthController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController(
    text: '724-848-1225',
  );

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _nickNameController.dispose();
    _dateOfBirthController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
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
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Could not open $source. Please check permissions and try again.',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
          ),
        ),
      );
    }
  }

  void _openCreatePin() {
    UserProfile.userName = _fullNameController.text.trim();
    Navigator.of(context).pushNamed(AppRoutes.createPin);
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

            return Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  horizontalPadding,
                  16,
                  horizontalPadding,
                  24,
                ),
                physics: const BouncingScrollPhysics(),
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
                                color: Color(0xFF1C2040),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Fill Your Profile',
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF1C2040),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      Center(
                        child: _AvatarWithEdit(
                          imageFile: _avatarFile,
                          onTap: _pickAvatar,
                        ),
                      ),
                      const SizedBox(height: 32),
                      _ProfileField(
                        controller: _fullNameController,
                        hintText: 'Full Name',
                      ),
                      const SizedBox(height: 16),
                      _ProfileField(
                        controller: _nickNameController,
                        hintText: 'Nick Name',
                      ),
                      const SizedBox(height: 16),
                      _DateField(
                        controller: _dateOfBirthController,
                        hintText: 'Date of Birth',
                        onFormat: _formatDob,
                      ),
                      const SizedBox(height: 16),
                      _ProfileField(
                        controller: _emailController,
                        hintText: 'Email',
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
                        hintText: 'Gender',
                        onTap: _pickGender,
                      ),
                      const SizedBox(height: 32),
                      _ContinueButton(
                        width: maxContentWidth,
                        onTap: _openCreatePin,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AvatarWithEdit extends StatelessWidget {
  const _AvatarWithEdit({required this.imageFile, required this.onTap});

  final File? imageFile;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ImageProvider? avatarImage = imageFile == null
        ? null
        : FileImage(imageFile!);

    return SizedBox(
      width: 158,
      height: 158,
      child: Stack(
        children: [
          GestureDetector(
            onTap: onTap,
            child: Container(
              width: 158,
              height: 158,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _background,
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x14697AA0),
                    blurRadius: 28,
                    offset: Offset(0, 14),
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
            right: 14,
            bottom: 14,
            child: GestureDetector(
              onTap: onTap,
              child: Container(
                width: 42,
                height: 42,
                decoration: const BoxDecoration(
                  color: Color(0xFF0B9D84),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x330B9D84),
                      blurRadius: 12,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.edit_outlined,
                  size: 18,
                  color: Colors.white,
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
  });

  final TextEditingController controller;
  final String hintText;
  final IconData? leading;
  final TextInputType? keyboardType;

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
            color: const Color(0xFF9AA1B8),
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
          hintText: '$hintText (DD/MM/YYYY)',
          hintStyle: GoogleFonts.poppins(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF9AA1B8),
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
                    color: value.isEmpty
                        ? const Color(0xFF9AA1B8)
                        : const Color(0xFF363F5A),
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

class _ContinueButton extends StatelessWidget {
  const _ContinueButton({required this.width, required this.onTap});

  final double width;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const double baseWidth = 366;
    const double baseHeight = 76;
    final double height = width * (baseHeight / baseWidth);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(40),
        onTap: onTap,
        child: Ink.image(
          image: const AssetImage('assets/fill_profile/BUTTON (3).png'),
          width: width,
          height: height,
          fit: BoxFit.contain,
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
                color: const Color(0xFF1C2040),
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
                    color: const Color(0xFF8A91A6),
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
                color: const Color(0xFF1C2040),
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
                color: const Color(0xFF1C2040),
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
