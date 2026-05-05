import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';

import '../app_state/admin_access.dart';
import '../app_state/instructor_requests.dart';

class InstructorRequestsScreen extends StatefulWidget {
  const InstructorRequestsScreen({super.key});

  @override
  State<InstructorRequestsScreen> createState() =>
      _InstructorRequestsScreenState();
}

class _InstructorRequestsScreenState extends State<InstructorRequestsScreen> {
  static const Color _title = Color(0xFF202244);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _danger = Color(0xFFE74C3C);
  static const Color _card = Color(0xFFFFFFFF);
  static const Color _primary = Color(0xFF0D65FF);
  final Set<String> _processing = <String>{};
  bool _showApproved = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  String _formatDate(DateTime? value) {
    if (value == null) return '';
    final String y = value.year.toString();
    final String m = value.month.toString().padLeft(2, '0');
    final String d = value.day.toString().padLeft(2, '0');
    final String h = value.hour.toString().padLeft(2, '0');
    final String min = value.minute.toString().padLeft(2, '0');
    return '$y-$m-$d $h:$min';
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

  Future<void> _approve(InstructorRequest request) async {
    if (_processing.contains(request.userId)) return;
    setState(() => _processing.add(request.userId));
    try {
      await InstructorRequestService.approve(request);
      if (!mounted) return;
      _showToast('Instructor approved.');
    } on FirebaseException catch (e) {
      if (!mounted) return;
      final String message =
          e.message ?? 'Could not approve instructor (${e.code}).';
      _showToast(message);
    } catch (e) {
      if (!mounted) return;
      _showToast('Could not approve instructor.');
      debugPrint('Approve instructor failed: $e');
    } finally {
      if (mounted) {
        setState(() => _processing.remove(request.userId));
      }
    }
  }

  Future<void> _reject(InstructorRequest request) async {
    if (_processing.contains(request.userId)) return;
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Reject request?'),
          content: Text(
            'Reject instructor request for '
            '${request.name.isNotEmpty ? request.name : request.email}?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: _danger,
                foregroundColor: Colors.white,
              ),
              child: const Text('Reject'),
            ),
          ],
        );
      },
    );
    if (confirm != true) return;
    setState(() => _processing.add(request.userId));
    try {
      await InstructorRequestService.reject(request);
      if (!mounted) return;
      _showToast('Request rejected.');
    } on FirebaseException catch (e) {
      if (!mounted) return;
      final String message =
          e.message ?? 'Could not reject request (${e.code}).';
      _showToast(message);
    } catch (e) {
      if (!mounted) return;
      _showToast('Could not reject request.');
      debugPrint('Reject instructor failed: $e');
    } finally {
      if (mounted) {
        setState(() => _processing.remove(request.userId));
      }
    }
  }

  Future<void> _revoke(InstructorRequest request) async {
    if (_processing.contains(request.userId)) return;
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Remove instructor access?'),
          content: Text(
            'Revoke instructor access for '
            '${request.name.isNotEmpty ? request.name : request.email}?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: _danger,
                foregroundColor: Colors.white,
              ),
              child: const Text('Revoke'),
            ),
          ],
        );
      },
    );
    if (confirm != true) return;
    setState(() => _processing.add(request.userId));
    try {
      await InstructorRequestService.revoke(request);
      if (!mounted) return;
      _showToast('Instructor access revoked.');
    } on FirebaseException catch (e) {
      if (!mounted) return;
      final String message =
          e.message ?? 'Could not revoke instructor (${e.code}).';
      _showToast(message);
    } catch (e) {
      if (!mounted) return;
      _showToast('Could not revoke instructor.');
      debugPrint('Revoke instructor failed: $e');
    } finally {
      if (mounted) {
        setState(() => _processing.remove(request.userId));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isAdmin = AdminAccess.isAdmin();
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final double maxContentWidth = constraints.maxWidth > 520
                ? 520
                : constraints.maxWidth;
            final double horizontalPadding =
                (constraints.maxWidth - maxContentWidth) / 2;

            if (!isAdmin) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'Access denied.',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: _muted,
                    ),
                  ),
                ),
              );
            }

            return Column(
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding + 16,
                    16,
                    horizontalPadding + 16,
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
                      Expanded(
                        child: Text(
                          'Instructor Requests',
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: _title,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    horizontalPadding + 16,
                    0,
                    horizontalPadding + 16,
                    6,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () =>
                              setState(() => _showApproved = false),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _showApproved
                                ? Colors.white
                                : _primary,
                            foregroundColor: _showApproved
                                ? _primary
                                : Colors.white,
                            side: BorderSide(color: _primary, width: 1.1),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: Text(
                            'Pending',
                            style: GoogleFonts.poppins(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => setState(() => _showApproved = true),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _showApproved
                                ? _primary
                                : Colors.white,
                            foregroundColor: _showApproved
                                ? Colors.white
                                : _primary,
                            side: BorderSide(color: _primary, width: 1.1),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: Text(
                            'Approved',
                            style: GoogleFonts.poppins(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: StreamBuilder<List<InstructorRequest>>(
                    stream: InstructorRequestService.streamForStatus(
                      _showApproved ? 'approved' : 'pending',
                    ),
                    builder: (context, snapshot) {
                      final List<InstructorRequest> requests =
                          snapshot.data ?? const [];
                      if (requests.isEmpty) {
                        return Center(
                          child: Text(
                            _showApproved
                                ? 'No approved instructors.'
                                : 'No pending instructor requests.',
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: _muted,
                            ),
                          ),
                        );
                      }
                      return ListView.separated(
                        padding: EdgeInsets.fromLTRB(
                          horizontalPadding + 16,
                          12,
                          horizontalPadding + 16,
                          24,
                        ),
                        itemCount: requests.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final InstructorRequest request = requests[index];
                          final String title = request.name.isNotEmpty
                              ? request.name
                              : 'Instructor Candidate';
                          final String subtitle = request.email.isNotEmpty
                              ? request.email
                              : request.userId;
                          final String category =
                              request.category.trim().isEmpty
                              ? 'General'
                              : request.category.trim();
                          final bool busy = _processing.contains(
                            request.userId,
                          );

                          return Container(
                            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                            decoration: BoxDecoration(
                              color: _card,
                              borderRadius: BorderRadius.circular(18),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x1C7C8BB4),
                                  blurRadius: 18,
                                  offset: Offset(0, 12),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            title,
                                            style: GoogleFonts.poppins(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: const Color(0xFF1C2140),
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            subtitle,
                                            style: GoogleFonts.poppins(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: _muted,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Category: $category',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: _muted,
                                            ),
                                          ),
                                          if (request.experienceYears
                                              .trim()
                                              .isNotEmpty)
                                            Padding(
                                              padding: const EdgeInsets.only(
                                                top: 4,
                                              ),
                                              child: Text(
                                                'Experience: ${request.experienceYears} years',
                                                style: GoogleFonts.poppins(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: _muted,
                                                ),
                                              ),
                                            ),
                                          if (request.coursesTaken
                                              .trim()
                                              .isNotEmpty)
                                            Padding(
                                              padding: const EdgeInsets.only(
                                                top: 4,
                                              ),
                                              child: Text(
                                                'Courses: ${request.coursesTaken}',
                                                style: GoogleFonts.poppins(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: _muted,
                                                ),
                                              ),
                                            ),
                                          if (request.notes.trim().isNotEmpty)
                                            Padding(
                                              padding: const EdgeInsets.only(
                                                top: 4,
                                              ),
                                              child: Text(
                                                'Notes: ${request.notes}',
                                                style: GoogleFonts.poppins(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: _muted,
                                                ),
                                              ),
                                            ),
                                          if (request.phone.trim().isNotEmpty)
                                            Padding(
                                              padding: const EdgeInsets.only(
                                                top: 4,
                                              ),
                                              child: Text(
                                                'Phone: ${request.phone}',
                                                style: GoogleFonts.poppins(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: _muted,
                                                ),
                                              ),
                                            ),
                                          if (request.requestedAt != null)
                                            Text(
                                              'Requested: ${_formatDate(request.requestedAt)}',
                                              style: GoogleFonts.poppins(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                                color: _muted,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                if (_showApproved)
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: busy
                                              ? null
                                              : () => _revoke(request),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: _danger,
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(14),
                                            ),
                                          ),
                                          child: Text(
                                            busy
                                                ? 'Working...'
                                                : 'Remove Access',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  )
                                else
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton(
                                          onPressed: busy
                                              ? null
                                              : () => _reject(request),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: _danger,
                                            side: const BorderSide(
                                              color: _danger,
                                            ),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(14),
                                            ),
                                          ),
                                          child: Text(
                                            busy ? 'Working...' : 'Reject',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: busy
                                              ? null
                                              : () => _approve(request),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(
                                              0xFF1F7C64,
                                            ),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(14),
                                            ),
                                          ),
                                          child: Text(
                                            busy ? 'Working...' : 'Approve',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white,
                                            ),
                                          ),
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
