import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/instructor_requests.dart';
import '../app_state/user_access.dart';
import '../app_state/user_profile.dart';
import '../app_state/language_store.dart';
import '../app_state/app_strings.dart';
import '../app_state/theme_store.dart';
import '../providers/auth_provider.dart';
import '../routes.dart';
import '../services/profile_image_service.dart';
import '../widgets/main_bottom_nav.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  static const Color _background = Color(0xFFF5F9FF);
  static const Color _primary = Color(0xFF1F7C64);
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);

  bool _isSigningOut = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _syncAvatarIfNeeded();
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

  void _openInstructorRegistration() {
    Navigator.of(context).pushNamed(AppRoutes.instructorRegistration);
  }

  Future<void> _syncAvatarIfNeeded() async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    try {
      await ProfileImageService.syncFromAuthUser(
        user,
        displayName: UserProfile.userName.trim(),
      );
    } catch (_) {}
  }

  Future<void> _signOut() async {
    if (_isSigningOut) return;
    setState(() => _isSigningOut = true);
    try {
      await AuthProvider.instance.signOut();
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.onboarding, (route) => false);
    } catch (_) {
      _showMessage('Sign out failed. Try again.');
    } finally {
      if (mounted) {
        setState(() => _isSigningOut = false);
      }
    }
  }

  Future<void> _switchAccount() async {
    await _signOut();
  }

  String _resolveName(
    User? user,
    String fallbackName,
    Map<String, dynamic> data,
  ) {
    final String stored = (data['fullName'] ?? '').toString().trim();
    if (stored.isNotEmpty) {
      UserProfile.userName = stored;
      return stored;
    }
    final String displayName = (user?.displayName ?? '').trim();
    if (displayName.isNotEmpty) return displayName;
    if (fallbackName.isNotEmpty) return fallbackName;
    return context.tr('student');
  }

  String _resolveEmail(User? user, Map<String, dynamic> data) {
    final String stored = (data['email'] ?? '').toString().trim();
    if (stored.isNotEmpty) return stored;
    return user?.email ?? context.tr('not_set');
  }

  String _resolveAvatarUrl(User? user, Map<String, dynamic> data) {
    final String photo = (data['photoUrl'] ?? '').toString().trim();
    if (photo.isNotEmpty) return photo;
    final String avatar = (data['avatarUrl'] ?? '').toString().trim();
    if (avatar.isNotEmpty) return avatar;
    final String image = (data['imageUrl'] ?? '').toString().trim();
    if (image.isNotEmpty) return image;
    return (user?.photoURL ?? '').trim();
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final Color pageBackground = isDark ? const Color(0xFF000000) : _background;
    final Color cardColor = isDark ? const Color(0xFF111111) : Colors.white;
    final Color titleColor = isDark ? const Color(0xFFF3F3F3) : _title;
    final Color mutedColor = isDark ? const Color(0xFFB8B8B8) : _muted;
    final Color accentBorder = isDark
        ? const Color(0xFF3A3A3A)
        : const Color(0xFFB6BED6);

    final User? user = FirebaseAuth.instance.currentUser;
    final String fallbackName = UserProfile.userName.trim();
    final Stream<DocumentSnapshot<Map<String, dynamic>>>? profileStream =
        user == null
        ? null
        : FirebaseFirestore.instance
              .collection('users')
              .doc(user.uid)
              .snapshots();

    return Scaffold(
      backgroundColor: pageBackground,
      bottomNavigationBar: const MainBottomNav(currentIndex: 4),
      body: SafeArea(
        child: StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
          stream: profileStream,
          builder: (context, snapshot) {
            final Map<String, dynamic> data = snapshot.data?.data() ?? {};
            final String name = _resolveName(user, fallbackName, data);
            final String email = _resolveEmail(user, data);
            final String avatarUrl = _resolveAvatarUrl(user, data);
            final String role = (data['role'] ?? '')
                .toString()
                .trim()
                .toLowerCase();
            final bool isInstructor =
                role == 'instructor' || UserAccess.current.value.isInstructor;
            final String bio = (data['bio'] ?? '').toString().trim();

            return LayoutBuilder(
              builder: (context, constraints) {
                final double maxContentWidth = math.min(
                  constraints.maxWidth,
                  420,
                );
                final double horizontalPadding = math.max(
                  20,
                  (constraints.maxWidth - maxContentWidth) / 2,
                );

                return SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    18,
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
                            child: Padding(
                              padding: EdgeInsets.all(6),
                              child: Icon(
                                Icons.arrow_back,
                                size: 26,
                                color: titleColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            context.tr('profile'),
                            style: GoogleFonts.poppins(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: titleColor,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 22),
                      Stack(
                        alignment: Alignment.topCenter,
                        children: [
                          Container(
                            width: double.infinity,
                            margin: const EdgeInsets.only(top: 46),
                            padding: const EdgeInsets.fromLTRB(18, 70, 18, 16),
                            decoration: BoxDecoration(
                              color: cardColor,
                              borderRadius: BorderRadius.circular(22),
                              boxShadow: isDark
                                  ? const []
                                  : const [
                                      BoxShadow(
                                        color: Color(0x1C7C8BB4),
                                        blurRadius: 22,
                                        offset: Offset(0, 14),
                                      ),
                                    ],
                            ),
                            child: Column(
                              children: [
                                Text(
                                  name,
                                  style: GoogleFonts.poppins(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: titleColor,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  email,
                                  style: GoogleFonts.poppins(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w600,
                                    color: mutedColor,
                                  ),
                                ),
                                if (isInstructor) ...[
                                  const SizedBox(height: 10),
                                  Text(
                                    bio.isEmpty
                                        ? 'Add your bio from Edit Profile.'
                                        : bio,
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.poppins(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: mutedColor,
                                      height: 1.5,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 18),
                                _MenuRow(
                                  icon: Icons.person_outline,
                                  label: context.tr('edit_profile'),
                                  onTap: () => Navigator.of(
                                    context,
                                  ).pushNamed(AppRoutes.editProfile),
                                ),
                                _MenuRow(
                                  icon: Icons.notifications_none,
                                  label: context.tr('notifications'),
                                  onTap: () => Navigator.of(
                                    context,
                                  ).pushNamed(AppRoutes.notificationSettings),
                                ),
                                _MenuRow(
                                  icon: Icons.bookmark_border,
                                  label: context.tr('saved_courses'),
                                  onTap: () => Navigator.of(
                                    context,
                                  ).pushNamed(AppRoutes.savedCourses),
                                ),
                                _MenuRow(
                                  icon: Icons.security,
                                  label: context.tr('security'),
                                  onTap: () => Navigator.of(
                                    context,
                                  ).pushNamed(AppRoutes.security),
                                ),
                                ValueListenableBuilder<LanguageOption>(
                                  valueListenable: LanguageStore.current,
                                  builder: (context, selection, _) {
                                    return _MenuRow(
                                      icon: Icons.translate,
                                      label: context.tr('language'),
                                      trailing: selection.label,
                                      onTap: () => Navigator.of(
                                        context,
                                      ).pushNamed(AppRoutes.language),
                                    );
                                  },
                                ),
                                ValueListenableBuilder<bool>(
                                  valueListenable: ThemeStore.isDark,
                                  builder: (context, dark, _) {
                                    return _MenuRow(
                                      icon: Icons.dark_mode_outlined,
                                      label: context.tr('dark_mode'),
                                      onTap: () async =>
                                          ThemeStore.setDarkMode(!dark),
                                      trailing: dark ? 'ON' : 'OFF',
                                    );
                                  },
                                ),
                                _MenuRow(
                                  icon: Icons.shield_outlined,
                                  label: context.tr('terms_conditions'),
                                  onTap: () => Navigator.of(
                                    context,
                                  ).pushNamed(AppRoutes.termsConditions),
                                ),
                                _MenuRow(
                                  icon: Icons.help_outline,
                                  label: context.tr('help_center'),
                                  onTap: () => Navigator.of(
                                    context,
                                  ).pushNamed(AppRoutes.helpCenter),
                                ),
                                _MenuRow(
                                  icon: Icons.mail_outline,
                                  label: context.tr('invite_friends'),
                                  onTap: () => Navigator.of(
                                    context,
                                  ).pushNamed(AppRoutes.inviteFriends),
                                  showDivider: false,
                                ),
                              ],
                            ),
                          ),
                          InkWell(
                            borderRadius: BorderRadius.circular(48),
                            onTap: () => Navigator.of(
                              context,
                            ).pushNamed(AppRoutes.editProfile),
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                CircleAvatar(
                                  radius: 46,
                                  backgroundColor: const Color(0xFFEAF0FF),
                                  child: CircleAvatar(
                                    radius: 40,
                                    backgroundColor: cardColor,
                                    backgroundImage: avatarUrl.isNotEmpty
                                        ? NetworkImage(avatarUrl)
                                        : null,
                                    child: avatarUrl.isEmpty
                                        ? Text(
                                            name.isEmpty
                                                ? 'S'
                                                : name[0].toUpperCase(),
                                            style: GoogleFonts.poppins(
                                              fontSize: 26,
                                              fontWeight: FontWeight.w700,
                                              color: _primary,
                                            ),
                                          )
                                        : null,
                                  ),
                                ),
                                Positioned(
                                  right: -2,
                                  bottom: -2,
                                  child: Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: cardColor,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: accentBorder),
                                    ),
                                    child: const Icon(
                                      Icons.image_outlined,
                                      size: 18,
                                      color: _primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 26),
                      if (user != null)
                        ValueListenableBuilder<UserAccessState>(
                          valueListenable: UserAccess.current,
                          builder: (context, access, _) {
                            if (access.isAdmin) {
                              return const SizedBox.shrink();
                            }
                            if (access.isInstructorApproved) {
                              return const _InstructorRequestCard(
                                title: 'Instructor account',
                                subtitle: 'Your instructor access is active.',
                                buttonLabel: '',
                                showButton: false,
                              );
                            }
                            if (access.isInstructor && !access.approved) {
                              return const _InstructorRequestCard(
                                title: 'Instructor request',
                                subtitle: 'Approval is pending.',
                                buttonLabel: '',
                                showButton: false,
                              );
                            }
                            return StreamBuilder<InstructorRequest?>(
                              stream: InstructorRequestService.streamForUser(
                                user.uid,
                              ),
                              builder: (context, requestSnapshot) {
                                final InstructorRequest? request =
                                    requestSnapshot.data;
                                if (request != null && request.isPending) {
                                  return const _InstructorRequestCard(
                                    title: 'Instructor request',
                                    subtitle: 'Your request is under review.',
                                    buttonLabel: '',
                                    showButton: false,
                                  );
                                }
                                final bool rejected =
                                    request?.isRejected ?? false;
                                return _InstructorRequestCard(
                                  title: 'Become an instructor',
                                  subtitle: rejected
                                      ? 'Your last request was rejected.'
                                      : 'Request approval to teach on the app.',
                                  buttonLabel: rejected
                                      ? 'Request again'
                                      : 'Request now',
                                  showButton: true,
                                  isBusy: false,
                                  onTap: _openInstructorRegistration,
                                );
                              },
                            );
                          },
                        ),
                      if (user != null) const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: isDark
                              ? const []
                              : const [
                                  BoxShadow(
                                    color: Color(0x1C7C8BB4),
                                    blurRadius: 20,
                                    offset: Offset(0, 12),
                                  ),
                                ],
                        ),
                        child: Column(
                          children: [
                            _ActionButton(
                              label: context.tr('switch_account'),
                              onTap: _switchAccount,
                              textColor: titleColor,
                              borderColor: isDark
                                  ? const Color(0xFF383838)
                                  : const Color(0xFFCFD6E6),
                              background: cardColor,
                            ),
                            const SizedBox(height: 12),
                            _ActionButton(
                              label: _isSigningOut
                                  ? context.tr('signing_out')
                                  : context.tr('sign_out'),
                              onTap: _isSigningOut ? null : _signOut,
                              textColor: Colors.white,
                              background: const Color(0xFFE74C3C),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.showDivider = true,
  });

  final IconData icon;
  final String label;
  final String? trailing;
  final VoidCallback onTap;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final Color rowTitle = isDark
        ? const Color(0xFFF3F3F3)
        : _ProfileScreenState._title;
    final Color divider = isDark
        ? const Color(0xFF2B2B2B)
        : const Color(0xFFE4E8F4);

    return Column(
      children: [
        InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              children: [
                Icon(icon, size: 20, color: rowTitle),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: rowTitle,
                    ),
                  ),
                ),
                if (trailing != null) ...[
                  Text(
                    trailing!,
                    style: GoogleFonts.poppins(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: _ProfileScreenState._primary,
                    ),
                  ),
                  const SizedBox(width: 6),
                ],
                const Icon(
                  Icons.arrow_forward_ios,
                  size: 14,
                  color: Color(0xFF9AA1B8),
                ),
              ],
            ),
          ),
        ),
        if (showDivider) Divider(height: 1, color: divider),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.onTap,
    required this.textColor,
    required this.background,
    this.borderColor,
  });

  final String label;
  final VoidCallback? onTap;
  final Color textColor;
  final Color background;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          backgroundColor: background,
          side: borderColor == null
              ? BorderSide.none
              : BorderSide(color: borderColor!),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        child: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: textColor,
          ),
        ),
      ),
    );
  }
}

class _InstructorRequestCard extends StatelessWidget {
  const _InstructorRequestCard({
    required this.title,
    required this.subtitle,
    required this.buttonLabel,
    this.onTap,
    this.showButton = true,
    this.isBusy = false,
  });

  final String title;
  final String subtitle;
  final String buttonLabel;
  final VoidCallback? onTap;
  final bool showButton;
  final bool isBusy;

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final Color cardColor = isDark ? const Color(0xFF111111) : Colors.white;
    final Color titleColor = isDark
        ? const Color(0xFFF3F3F3)
        : _ProfileScreenState._title;
    final Color subtitleColor = isDark
        ? const Color(0xFFB8B8B8)
        : _ProfileScreenState._muted;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        boxShadow: isDark
            ? const []
            : const [
                BoxShadow(
                  color: Color(0x1C7C8BB4),
                  blurRadius: 20,
                  offset: Offset(0, 12),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.poppins(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: titleColor,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: GoogleFonts.poppins(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: subtitleColor,
              height: 1.4,
            ),
          ),
          if (showButton) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isBusy ? null : onTap,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _ProfileScreenState._primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: Text(
                  isBusy ? 'Sending...' : buttonLabel,
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
