import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../app_state/mentor_catalog.dart';
import '../app_state/featured_order_store.dart';
import '../widgets/search_bottom_sheet.dart';
import '../widgets/main_bottom_nav.dart';
import '../routes.dart';
import 'mentor_profile_screen.dart';
import '../utils/image_utils.dart';

class TopMentorsScreen extends StatelessWidget {
  const TopMentorsScreen({super.key});
  static const Color _title = Color(0xFF202244);
  static const Color _textMuted = Color(0xFF8A91A6);

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: const MainBottomNav(currentIndex: 0),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 420);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return Column(
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding,
                    18,
                    horizontalPadding,
                    8,
                  ),
                  child: Row(
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
                        'Top Mentors',
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                      const Spacer(),
                      InkWell(
                        borderRadius: BorderRadius.circular(24),
                        onTap: () => showSearchBottomSheet(context),
                        child: Padding(
                          padding: const EdgeInsets.all(6),
                          child: SvgPicture.asset(
                            'assets/home/Fill 1.svg',
                            width: 20,
                            height: 20,
                            colorFilter: const ColorFilter.mode(
                              _title,
                              BlendMode.srcIn,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ValueListenableBuilder<List<MentorItem>>(
                    valueListenable: MentorCatalog.mentors,
                    builder: (context, mentors, _) {
                      final List<MentorItem> orderedMentors =
                          FeaturedOrderStore.orderMentors(mentors);
                      if (orderedMentors.isEmpty) {
                        return Center(
                          child: Text(
                            'No mentors found',
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: _textMuted,
                            ),
                          ),
                        );
                      }
                      return ListView.separated(
                        padding: EdgeInsets.fromLTRB(
                          horizontalPadding,
                          6,
                          horizontalPadding,
                          24,
                        ),
                        itemCount: orderedMentors.length,
                        separatorBuilder: (_, __) => const Divider(
                          height: 24,
                          thickness: 1,
                          color: Color(0xFFE2E8F5),
                        ),
                        itemBuilder: (context, index) {
                          final mentor = orderedMentors[index];
                          return InkWell(
                            borderRadius: BorderRadius.circular(18),
                            onTap: () => Navigator.of(context).pushNamed(
                              AppRoutes.mentorProfile,
                              arguments: MentorProfileArgs(
                                name: mentor.name,
                                subtitle: mentor.subtitle,
                                courses: mentor.courses,
                                students: mentor.students,
                                ratings: mentor.ratings,
                                imagePath: mentor.imagePath,
                                mentorId: mentor.id,
                                bio: mentor.bio,
                              ),
                            ),
                            child: Row(
                              children: [
                                Builder(
                                  builder: (context) {
                                    final DecorationImage? mentorImage =
                                        resolveDecorationImage(
                                          mentor.imagePath,
                                        );
                                    return Container(
                                      width: 62,
                                      height: 62,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEAF0FF),
                                        shape: BoxShape.circle,
                                        image: mentorImage,
                                      ),
                                      child: mentorImage == null
                                          ? const Icon(
                                              Icons.person,
                                              color: Color(0xFF7D818F),
                                            )
                                          : null,
                                    );
                                  },
                                ),
                                const SizedBox(width: 16),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      mentor.name,
                                      style: GoogleFonts.poppins(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: _title,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      mentor.category,
                                      style: GoogleFonts.poppins(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: _textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
