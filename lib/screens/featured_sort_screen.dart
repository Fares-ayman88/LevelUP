import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/course_catalog.dart';
import '../app_state/featured_order_store.dart';
import '../app_state/mentor_catalog.dart';

class FeaturedSortScreen extends StatefulWidget {
  const FeaturedSortScreen({super.key});

  @override
  State<FeaturedSortScreen> createState() => _FeaturedSortScreenState();
}

class _FeaturedSortScreenState extends State<FeaturedSortScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D8190);
  static const Color _chipSelected = Color(0xFF1F7C64);
  static const Color _chipUnselected = Color(0xFFEAF0FF);
  static const Color _cardBorder = Color(0xFFE2E8F5);

  bool _showCourses = true;

  @override
  void initState() {
    super.initState();
  }

  void _reorderCourses(List<CourseItem> items, int oldIndex, int newIndex) {
    final List<CourseItem> updated = List<CourseItem>.from(items);
    if (newIndex > oldIndex) newIndex -= 1;
    final CourseItem item = updated.removeAt(oldIndex);
    updated.insert(newIndex, item);
    unawaited(_persistCourseOrder(updated));
  }

  void _reorderMentors(List<MentorItem> items, int oldIndex, int newIndex) {
    final List<MentorItem> updated = List<MentorItem>.from(items);
    if (newIndex > oldIndex) newIndex -= 1;
    final MentorItem item = updated.removeAt(oldIndex);
    updated.insert(newIndex, item);
    unawaited(_persistMentorOrder(updated));
  }

  Future<void> _persistCourseOrder(List<CourseItem> ordered) async {
    try {
      await FeaturedOrderStore.persistCourseOrder(ordered);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error.toString().replaceFirst('Exception: ', '').trim(),
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _persistMentorOrder(List<MentorItem> ordered) async {
    try {
      await FeaturedOrderStore.persistMentorOrder(ordered);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error.toString().replaceFirst('Exception: ', '').trim(),
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Widget _buildHeader(double horizontalPadding) {
    return Padding(
      padding: EdgeInsets.fromLTRB(horizontalPadding, 18, horizontalPadding, 8),
      child: Row(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(24),
            onTap: () => Navigator.of(context).maybePop(),
            child: const Padding(
              padding: EdgeInsets.all(6),
              child: Icon(Icons.arrow_back, size: 26, color: _title),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Arrange Home',
            style: GoogleFonts.poppins(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: _title,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToggle(double horizontalPadding) {
    return Padding(
      padding: EdgeInsets.fromLTRB(horizontalPadding, 6, horizontalPadding, 12),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _showCourses = true),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: BoxDecoration(
                  color: _showCourses ? _chipSelected : _chipUnselected,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Text(
                  'Popular Courses',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: _showCourses ? Colors.white : _title,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _showCourses = false),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: BoxDecoration(
                  color: !_showCourses ? _chipSelected : _chipUnselected,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Text(
                  'Top Mentors',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.poppins(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: !_showCourses ? Colors.white : _title,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHint(double horizontalPadding) {
    return Padding(
      padding: EdgeInsets.fromLTRB(horizontalPadding, 0, horizontalPadding, 10),
      child: Text(
        _showCourses
            ? 'Drag to reorder. The first 5 appear in Popular Courses.'
            : 'Drag to reorder. The first 6 appear in Top Mentors.',
        style: GoogleFonts.poppins(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: _muted,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = math.min(constraints.maxWidth, 520);
            final double horizontalPadding = math.max(
              20,
              (constraints.maxWidth - maxContentWidth) / 2,
            );

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(horizontalPadding),
                _buildToggle(horizontalPadding),
                _buildHint(horizontalPadding),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(
                      horizontalPadding,
                      0,
                      horizontalPadding,
                      16,
                    ),
                    child: _showCourses
                        ? ValueListenableBuilder<List<CourseItem>>(
                            valueListenable: CourseCatalog.courses,
                            builder: (context, courses, _) {
                              final List<CourseItem> ordered =
                                  FeaturedOrderStore.orderCourses(courses);
                              if (ordered.isEmpty) {
                                return Center(
                                  child: Text(
                                    'No courses available',
                                    style: GoogleFonts.poppins(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: _muted,
                                    ),
                                  ),
                                );
                              }
                              return ReorderableListView.builder(
                                itemCount: ordered.length,
                                onReorder: (oldIndex, newIndex) =>
                                    _reorderCourses(
                                      ordered,
                                      oldIndex,
                                      newIndex,
                                    ),
                                proxyDecorator: (child, index, animation) {
                                  return Material(
                                    elevation: 6,
                                    color: Colors.transparent,
                                    shadowColor: Colors.black26,
                                    child: child,
                                  );
                                },
                                itemBuilder: (context, index) {
                                  final CourseItem course = ordered[index];
                                  return _ReorderTile(
                                    key: ValueKey(course.id),
                                    index: index,
                                    title: course.title,
                                    subtitle: course.category,
                                  );
                                },
                              );
                            },
                          )
                        : ValueListenableBuilder<List<MentorItem>>(
                            valueListenable: MentorCatalog.mentors,
                            builder: (context, mentors, _) {
                              final List<MentorItem> ordered =
                                  FeaturedOrderStore.orderMentors(mentors);
                              if (ordered.isEmpty) {
                                return Center(
                                  child: Text(
                                    'No mentors available',
                                    style: GoogleFonts.poppins(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: _muted,
                                    ),
                                  ),
                                );
                              }
                              return ReorderableListView.builder(
                                itemCount: ordered.length,
                                onReorder: (oldIndex, newIndex) =>
                                    _reorderMentors(
                                      ordered,
                                      oldIndex,
                                      newIndex,
                                    ),
                                proxyDecorator: (child, index, animation) {
                                  return Material(
                                    elevation: 6,
                                    color: Colors.transparent,
                                    shadowColor: Colors.black26,
                                    child: child,
                                  );
                                },
                                itemBuilder: (context, index) {
                                  final MentorItem mentor = ordered[index];
                                  return _ReorderTile(
                                    key: ValueKey(mentor.id),
                                    index: index,
                                    title: mentor.name,
                                    subtitle: mentor.subtitle.isEmpty
                                        ? mentor.category
                                        : mentor.subtitle,
                                  );
                                },
                              );
                            },
                          ),
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

class _ReorderTile extends StatelessWidget {
  const _ReorderTile({
    required this.index,
    required this.title,
    required this.subtitle,
    super.key,
  });

  final int index;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _FeaturedSortScreenState._cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: const Color(0xFFEAF0FF),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                '${index + 1}',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: _FeaturedSortScreenState._title,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: _FeaturedSortScreenState._title,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _FeaturedSortScreenState._muted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ReorderableDragStartListener(
            index: index,
            child: const Icon(Icons.drag_handle, color: Color(0xFF94A0B8)),
          ),
        ],
      ),
    );
  }
}
