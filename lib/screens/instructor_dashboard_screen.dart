import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../routes.dart';

class InstructorDashboardScreen extends StatefulWidget {
  const InstructorDashboardScreen({super.key});

  @override
  State<InstructorDashboardScreen> createState() =>
      _InstructorDashboardScreenState();
}

class _InstructorDashboardScreenState extends State<InstructorDashboardScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _primary = Color(0xFF0D65FF);
  bool _welcomeChecked = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _maybeShowWelcome();
  }

  Future<void> _maybeShowWelcome() async {
    if (_welcomeChecked) return;
    _welcomeChecked = true;
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    try {
      final DocumentReference<Map<String, dynamic>> ref = FirebaseFirestore
          .instance
          .collection('users')
          .doc(user.uid);
      final DocumentSnapshot<Map<String, dynamic>> snapshot = await ref.get();
      final Map<String, dynamic> data = snapshot.data() ?? {};
      final String role = (data['role'] ?? '').toString().toLowerCase();
      final bool seen = data['instructorWelcomeSeen'] == true;
      if (role != 'instructor' || seen) return;
      if (!mounted) return;
      await Future.delayed(Duration.zero);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: const Text('Welcome Instructor!'),
            content: Text(
              'Your instructor account has been approved. '
              'You can now manage your courses and help learners.',
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: _muted,
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Got it'),
              ),
            ],
          );
        },
      );
      await ref.set({
        'instructorWelcomeSeen': true,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (_) {}
  }

  Widget _actionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1C7C8BB4),
              blurRadius: 18,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: _primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: _primary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.poppins(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: GoogleFonts.poppins(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: _muted,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 16, color: _muted),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 460);
            final double horizontalPadding = math.max(
              18,
              (constraints.maxWidth - maxContentWidth) / 2,
            );
            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                18,
                horizontalPadding,
                28,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Instructor Dashboard',
                    style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Manage your courses and stay connected with learners.',
                    style: GoogleFonts.poppins(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _muted,
                    ),
                  ),
                  const SizedBox(height: 22),
                  _actionCard(
                    icon: Icons.menu_book_outlined,
                    title: 'My Courses',
                    subtitle: 'Review enrolled students and course progress.',
                    onTap: () =>
                        Navigator.of(context).pushNamed(AppRoutes.myCourses),
                  ),
                  const SizedBox(height: 14),
                  _actionCard(
                    icon: Icons.support_agent_outlined,
                    title: 'Support Chats',
                    subtitle: 'Answer learner questions and requests.',
                    onTap: () =>
                        Navigator.of(context).pushNamed(AppRoutes.supportChats),
                  ),
                  const SizedBox(height: 14),
                  _actionCard(
                    icon: Icons.person_outline,
                    title: 'Profile',
                    subtitle: 'Update your profile and security settings.',
                    onTap: () =>
                        Navigator.of(context).pushNamed(AppRoutes.profile),
                  ),
                  const SizedBox(height: 14),
                  _actionCard(
                    icon: Icons.home_outlined,
                    title: 'Student Home',
                    subtitle: 'Browse courses as a learner.',
                    onTap: () =>
                        Navigator.of(context).pushNamed(AppRoutes.home),
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
