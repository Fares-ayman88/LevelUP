import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:file_picker/file_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:pocketbase/pocketbase.dart';

import '../app_state/admin_access.dart';
import '../app_state/category_catalog.dart';
import '../app_state/course_catalog.dart';
import '../app_state/mentor_catalog.dart';
import '../app_state/transaction_catalog.dart';
import '../app_state/user_profile.dart';
import '../services/pocketbase_config.dart';
import '../services/pocketbase_service.dart';
import '../utils/image_utils.dart';
import '../utils/youtube_utils.dart';

class AdminCoursesScreen extends StatefulWidget {
  const AdminCoursesScreen({super.key, this.isMentorMode = false});

  final bool isMentorMode;

  @override
  State<AdminCoursesScreen> createState() => _AdminCoursesScreenState();
}

class _AdminCoursesScreenState extends State<AdminCoursesScreen> {
  static const Color _background = Color(0xFFF5F9FF);
  static const Color _title = Color(0xFF202244);
  static const Color _primary = Color(0xFF0D65FF);
  static const Color _muted = Color(0xFF7D818F);
  static const Color _danger = Color(0xFFE74C3C);

  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _oldPriceController = TextEditingController();
  final TextEditingController _ratingController = TextEditingController();
  final TextEditingController _studentsController = TextEditingController();
  final TextEditingController _sectionsCountController =
      TextEditingController();
  final TextEditingController _hoursController = TextEditingController();
  final TextEditingController _newCategoryController = TextEditingController();
  final FocusNode _newCategoryFocus = FocusNode();
  final TextEditingController _newMentorController = TextEditingController();
  final FocusNode _newMentorFocus = FocusNode();
  final ImagePicker _mentorImagePicker = ImagePicker();
  final ImagePicker _courseImagePicker = ImagePicker();
  final ImagePicker _videoPicker = ImagePicker();
  final ScrollController _scrollController = ScrollController();
  late final String _currentUserId;
  late final String _currentUserName;
  String? _selectedCategory;
  String? _selectedMentorName;
  String? _mentorCategory;
  bool _showCategoryInput = false;
  bool _showMentorInput = false;
  bool _savingMentor = false;
  bool _savingCourse = false;
  bool _seedingData = false;
  bool _updatingServer = false;
  bool _syncingSectionCount = false;
  final Set<String> _processingTransactions = <String>{};
  File? _mentorImageFile;
  String? _mentorImageUrl;
  File? _courseCoverFile;
  String? _courseCoverUrl;
  CourseItem? _editingCourse;
  MentorItem? _editingMentor;
  List<_SectionDraft> _sections = [];

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    TransactionCatalog.bindAuth();
    if (!widget.isMentorMode) {
      TransactionCatalog.bindForAdmin();
    }
    final User? user = FirebaseAuth.instance.currentUser;
    final String fallbackName = UserProfile.userName.trim();
    _currentUserId = user?.uid ?? '';
    _currentUserName = (user?.displayName ?? '').trim().isNotEmpty
        ? user!.displayName!.trim()
        : (user?.email ?? '').trim().isNotEmpty
        ? user!.email!.split('@').first
        : fallbackName;
    if (CategoryCatalog.items.isNotEmpty) {
      _selectedCategory = CategoryCatalog.items.first;
      _mentorCategory = _selectedCategory;
    }
    if (!widget.isMentorMode && MentorCatalog.items.isNotEmpty) {
      _selectedMentorName = MentorCatalog.items.first.name;
    } else if (widget.isMentorMode) {
      _selectedMentorName = _currentUserName;
    }
    _sections = [_createSection(0)];
    _syncSectionsCountField();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _priceController.dispose();
    _oldPriceController.dispose();
    _ratingController.dispose();
    _studentsController.dispose();
    _sectionsCountController.dispose();
    _hoursController.dispose();
    _newCategoryController.dispose();
    _newCategoryFocus.dispose();
    _newMentorController.dispose();
    _newMentorFocus.dispose();
    _scrollController.dispose();
    for (final _SectionDraft section in _sections) {
      section.dispose();
    }
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

  void _showPocketBaseError(Object error, String fallback) {
    if (error is ClientException) {
      final Object response = error.response;
      if (response is Map) {
        final Object? message = response['message'];
        if (message != null && message.toString().trim().isNotEmpty) {
          _showMessage(message.toString());
          return;
        }
      }
      _showMessage(error.toString());
      return;
    }
    _showMessage(fallback);
  }

  String _basename(String path) {
    final String normalized = path.replaceAll('\\', '/');
    final List<String> parts = normalized.split('/');
    return parts.isNotEmpty ? parts.last : path;
  }

  String _resolveLessonVideoName(_LessonDraft lesson) {
    if (lesson.videoFile != null) {
      return lesson.videoFileName?.trim().isNotEmpty == true
          ? lesson.videoFileName!.trim()
          : _basename(lesson.videoFile!.path);
    }
    final String existing = (lesson.existingVideoUrl ?? '').trim();
    if (existing.isEmpty) return 'No video selected';
    final Uri? uri = Uri.tryParse(existing);
    if (uri != null && uri.pathSegments.isNotEmpty) {
      return uri.pathSegments.last;
    }
    return existing;
  }

  Future<void> _pickLessonVideoFromGallery(_LessonDraft lesson) async {
    if (_savingCourse) return;
    try {
      final XFile? file = await _videoPicker.pickVideo(
        source: ImageSource.gallery,
      );
      if (file == null) return;
      final File resolved = File(file.path);
      if (!await resolved.exists()) {
        _showMessage('Video file not found.');
        return;
      }
      setState(() {
        lesson.videoFile = resolved;
        lesson.videoFileName = _basename(resolved.path);
        lesson.existingVideoUrl = null;
        lesson.videoController.clear();
        lesson.uploadProgress = 0;
        lesson.uploadError = null;
      });
    } catch (_) {
      if (!mounted) return;
      _showMessage('Could not open gallery. Please try again.');
    }
  }

  Future<void> _pickLessonVideoFromFiles(_LessonDraft lesson) async {
    if (_savingCourse) return;
    try {
      final FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        allowMultiple: false,
      );
      if (result == null || result.files.isEmpty) return;
      final PlatformFile picked = result.files.first;
      final String? path = picked.path;
      if (path == null || path.trim().isEmpty) {
        _showMessage('Could not read the selected file.');
        return;
      }
      final File resolved = File(path);
      if (!await resolved.exists()) {
        _showMessage('Video file not found.');
        return;
      }
      setState(() {
        lesson.videoFile = resolved;
        lesson.videoFileName = picked.name.trim().isEmpty
            ? _basename(resolved.path)
            : picked.name.trim();
        lesson.existingVideoUrl = null;
        lesson.videoController.clear();
        lesson.uploadProgress = 0;
        lesson.uploadError = null;
      });
    } catch (_) {
      if (!mounted) return;
      _showMessage('Could not pick file. Please try again.');
    }
  }

  void _clearLessonVideo(_LessonDraft lesson) {
    setState(() {
      lesson.videoFile = null;
      lesson.videoFileName = null;
      lesson.existingVideoUrl = null;
      lesson.uploadProgress = 0;
      lesson.uploadError = null;
    });
  }

  List<CourseLessonUpload> _collectLessonUploads() {
    final List<CourseLessonUpload> uploads = [];
    for (
      int sectionIndex = 0;
      sectionIndex < _sections.length;
      sectionIndex++
    ) {
      final _SectionDraft section = _sections[sectionIndex];
      for (
        int lessonIndex = 0;
        lessonIndex < section.lessons.length;
        lessonIndex++
      ) {
        final _LessonDraft lesson = section.lessons[lessonIndex];
        if (lesson.videoFile == null) continue;
        uploads.add(
          CourseLessonUpload(
            sectionIndex: sectionIndex,
            lessonIndex: lessonIndex,
            file: lesson.videoFile!,
          ),
        );
      }
    }
    return uploads;
  }

  void _markLessonUploadsStarted(List<CourseLessonUpload> uploads) {
    for (final CourseLessonUpload upload in uploads) {
      if (upload.sectionIndex < 0 || upload.sectionIndex >= _sections.length) {
        continue;
      }
      final _SectionDraft section = _sections[upload.sectionIndex];
      if (upload.lessonIndex < 0 ||
          upload.lessonIndex >= section.lessons.length) {
        continue;
      }
      final _LessonDraft lesson = section.lessons[upload.lessonIndex];
      lesson.uploadProgress = 0;
      lesson.isUploading = true;
      lesson.uploadError = null;
    }
  }

  void _onLessonUploadProgress(CourseLessonUploadProgress progress) {
    if (!mounted) return;
    if (progress.sectionIndex < 0 ||
        progress.sectionIndex >= _sections.length) {
      return;
    }
    final _SectionDraft section = _sections[progress.sectionIndex];
    if (progress.lessonIndex < 0 ||
        progress.lessonIndex >= section.lessons.length) {
      return;
    }
    final _LessonDraft lesson = section.lessons[progress.lessonIndex];
    setState(() {
      lesson.uploadProgress = progress.progress.clamp(0.0, 1.0).toDouble();
      lesson.isUploading = lesson.uploadProgress < 1;
      if (lesson.uploadProgress >= 1) {
        lesson.uploadError = null;
      }
    });
  }

  void _markLessonUploadsFailed(
    List<CourseLessonUpload> uploads,
    String message,
  ) {
    if (!mounted) return;
    setState(() {
      for (final CourseLessonUpload upload in uploads) {
        if (upload.sectionIndex < 0 ||
            upload.sectionIndex >= _sections.length) {
          continue;
        }
        final _SectionDraft section = _sections[upload.sectionIndex];
        if (upload.lessonIndex < 0 ||
            upload.lessonIndex >= section.lessons.length) {
          continue;
        }
        final _LessonDraft lesson = section.lessons[upload.lessonIndex];
        lesson.isUploading = false;
        lesson.uploadError = message;
      }
    });
  }

  Future<void> _openPocketBaseSettings() async {
    if (_updatingServer) return;
    final TextEditingController controller = TextEditingController(
      text: PocketBaseConfig.endpoint,
    );
    final String? result = await showDialog<String>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('PocketBase Server'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: controller,
                keyboardType: TextInputType.url,
                decoration: const InputDecoration(
                  hintText: 'http://10.0.2.2:8090',
                ),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Auto-detect runs on app start.',
                  style: GoogleFonts.poppins(fontSize: 11, color: _muted),
                ),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Phone: http://<LAN-IP>:8090',
                  style: GoogleFonts.poppins(fontSize: 11, color: _muted),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(dialogContext).pop(controller.text),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
    if (result == null) return;
    final String trimmed = result.trim();
    if (trimmed.isEmpty) {
      _showMessage('Enter server URL.');
      return;
    }
    setState(() => _updatingServer = true);
    try {
      await PocketBaseConfig.saveEndpoint(trimmed);
      PocketBaseService.reset();
      await MentorCatalog.refresh();
      await CourseCatalog.refresh();
      if (mounted) {
        _showMessage('Server updated.');
      }
    } catch (_) {
      if (mounted) {
        _showMessage('Could not update server.');
      }
    } finally {
      if (mounted) {
        setState(() => _updatingServer = false);
      }
    }
  }

  Color _transactionStatusColor(TransactionStatus status) {
    switch (status) {
      case TransactionStatus.paid:
        return const Color(0xFF1F7C64);
      case TransactionStatus.rejected:
        return const Color(0xFFE74C3C);
      case TransactionStatus.waiting:
        return const Color(0xFFE2702B);
    }
  }

  Future<void> _updateTransactionStatus(
    TransactionItem item,
    TransactionStatus status, {
    String? successMessage,
  }) async {
    if (_processingTransactions.contains(item.id)) return;
    setState(() => _processingTransactions.add(item.id));
    try {
      await TransactionCatalog.updateStatus(
        transactionId: item.id,
        status: status,
      );
      if (!mounted) return;
      final String message = (successMessage ?? '').trim().isNotEmpty
          ? successMessage!.trim()
          : (status == TransactionStatus.paid
                ? 'Payment approved.'
                : 'Payment rejected.');
      _showMessage(message);
    } catch (_) {
      if (!mounted) return;
      _showMessage('Could not update payment.');
    } finally {
      if (mounted) {
        setState(() => _processingTransactions.remove(item.id));
      }
    }
  }

  Future<void> _confirmRevokeAccess(TransactionItem item) async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Remove course access'),
          content: Text(
            'Remove "${item.courseTitle}" from '
            '${item.userName.isNotEmpty ? item.userName : item.userEmail}?',
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
              child: const Text('Remove'),
            ),
          ],
        );
      },
    );
    if (confirm != true) return;
    await _updateTransactionStatus(
      item,
      TransactionStatus.rejected,
      successMessage: 'Access removed.',
    );
  }

  Future<void> _openTransactionsSheet() async {
    if (widget.isMentorMode) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.88,
          minChildSize: 0.55,
          maxChildSize: 0.95,
          builder: (context, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                color: _background,
                borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  children: [
                    const SizedBox(height: 10),
                    Container(
                      width: 46,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFD6DCEB),
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 12, 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Payment Requests',
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: _title,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ValueListenableBuilder<List<TransactionItem>>(
                        valueListenable: TransactionCatalog.adminTransactions,
                        builder: (context, transactions, _) {
                          if (transactions.isEmpty) {
                            return Center(
                              child: Text(
                                'No payment requests yet.',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: _muted,
                                ),
                              ),
                            );
                          }
                          return ListView.separated(
                            controller: scrollController,
                            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                            itemCount: transactions.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              return _buildTransactionCard(transactions[index]);
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildTransactionCard(TransactionItem item) {
    final Color statusColor = _transactionStatusColor(item.status);
    final bool isWaiting = item.status == TransactionStatus.waiting;
    final bool isPaid = item.status == TransactionStatus.paid;
    final bool isBusy = _processingTransactions.contains(item.id);
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.courseTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF1C2140),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.courseCategory,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _muted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.userName.isNotEmpty ? item.userName : item.userEmail,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _title,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.priceLabel,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _muted,
                      ),
                    ),
                    if ((item.senderNumber ?? '').trim().isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        'From: ${item.senderNumber}',
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _muted,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      item.status == TransactionStatus.paid
                          ? Icons.check_circle
                          : item.status == TransactionStatus.rejected
                          ? Icons.cancel
                          : Icons.schedule,
                      size: 14,
                      color: statusColor,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      item.status.label,
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (isWaiting) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: isBusy
                        ? null
                        : () => _updateTransactionStatus(
                            item,
                            TransactionStatus.rejected,
                          ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: _danger,
                      side: const BorderSide(color: _danger),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      isBusy ? 'Updating...' : 'Reject',
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
                    onPressed: isBusy
                        ? null
                        : () => _updateTransactionStatus(
                            item,
                            TransactionStatus.paid,
                          ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1F7C64),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      isBusy ? 'Updating...' : 'Accept',
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
          ] else if (isPaid) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: isBusy ? null : () => _confirmRevokeAccess(item),
                style: OutlinedButton.styleFrom(
                  foregroundColor: _danger,
                  side: const BorderSide(color: _danger),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: const Icon(Icons.remove_circle_outline, size: 16),
                label: Text(
                  isBusy ? 'Updating...' : 'Remove Access',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatPrice(String input) {
    final String trimmed = input.trim();
    if (trimmed.isEmpty) return '';
    final String lower = trimmed.toLowerCase();
    if (lower.startsWith('egp')) return trimmed;
    return 'EGP $trimmed';
  }

  String _formatStudents(String input) {
    final String trimmed = input.trim();
    if (trimmed.isEmpty) return '0 Std';
    if (trimmed.toLowerCase().contains('std')) return trimmed;
    return '$trimmed Std';
  }

  _SectionDraft _createSection(int index) {
    final _SectionDraft section = _SectionDraft(title: 'Section ${index + 1}');
    section.lessons.add(_createLesson(0));
    return section;
  }

  _LessonDraft _createLesson(int index, {String? title, String? videoUrl}) {
    return _LessonDraft(
      title: title ?? 'Lesson ${index + 1}',
      videoUrl: videoUrl ?? '',
    );
  }

  void _syncSectionsCountField() {
    _syncingSectionCount = true;
    final String value = _sections.length.toString();
    _sectionsCountController.text = value;
    _sectionsCountController.selection = TextSelection.fromPosition(
      TextPosition(offset: value.length),
    );
    _syncingSectionCount = false;
  }

  void _setSectionsCount(int count) {
    if (count < 0) return;
    if (count == _sections.length) return;
    setState(() {
      if (count > _sections.length) {
        for (int i = _sections.length; i < count; i++) {
          _sections.add(_createSection(i));
        }
      } else {
        final List<_SectionDraft> removed = _sections.sublist(count);
        for (final _SectionDraft section in removed) {
          section.dispose();
        }
        _sections = _sections.sublist(0, count);
      }
    });
  }

  void _onSectionsCountChanged(String value) {
    if (_syncingSectionCount) return;
    final int count = int.tryParse(value.trim()) ?? 0;
    _setSectionsCount(count);
  }

  void _addSection() {
    setState(() {
      _sections.add(_createSection(_sections.length));
    });
    _syncSectionsCountField();
  }

  void _removeSection(int index) {
    if (index < 0 || index >= _sections.length) return;
    setState(() {
      final _SectionDraft removed = _sections.removeAt(index);
      removed.dispose();
    });
    _syncSectionsCountField();
  }

  void _addLesson(int sectionIndex) {
    if (sectionIndex < 0 || sectionIndex >= _sections.length) return;
    setState(() {
      final _SectionDraft section = _sections[sectionIndex];
      section.lessons.add(_createLesson(section.lessons.length));
    });
  }

  void _removeLesson(int sectionIndex, int lessonIndex) {
    if (sectionIndex < 0 || sectionIndex >= _sections.length) return;
    final _SectionDraft section = _sections[sectionIndex];
    if (lessonIndex < 0 || lessonIndex >= section.lessons.length) return;
    setState(() {
      final _LessonDraft removed = section.lessons.removeAt(lessonIndex);
      removed.dispose();
    });
  }

  Widget _buildSectionsEditor() {
    if (_sections.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'No sections yet.',
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: _muted,
            ),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _addSection,
            style: TextButton.styleFrom(
              foregroundColor: _primary,
              padding: EdgeInsets.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            icon: const Icon(Icons.add, size: 18),
            label: Text(
              'Add Section',
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      children: [
        for (int index = 0; index < _sections.length; index++) ...[
          _buildSectionCard(index, _sections[index]),
          const SizedBox(height: 12),
        ],
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _addSection,
            style: TextButton.styleFrom(
              foregroundColor: _primary,
              padding: EdgeInsets.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            icon: const Icon(Icons.add, size: 18),
            label: Text(
              'Add Section',
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSectionCard(int index, _SectionDraft section) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFF),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E6F4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Section ${index + 1}',
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: _title,
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: () => _removeSection(index),
                icon: Icon(Icons.delete_outline, color: _danger),
                tooltip: 'Remove section',
              ),
            ],
          ),
          const SizedBox(height: 6),
          _AdminTextField(
            controller: section.titleController,
            label: 'Section Name',
            hintText: 'Section ${index + 1}',
          ),
          const SizedBox(height: 12),
          Text(
            'Lessons',
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: _title,
            ),
          ),
          const SizedBox(height: 8),
          if (section.lessons.isEmpty)
            Text(
              'No lessons yet.',
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _muted,
              ),
            )
          else
            Column(
              children: [
                for (
                  int lessonIndex = 0;
                  lessonIndex < section.lessons.length;
                  lessonIndex++
                )
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: _AdminInlineField(
                                controller:
                                    section.lessons[lessonIndex].controller,
                                hintText: 'Lesson ${lessonIndex + 1}',
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              onPressed: () =>
                                  _removeLesson(index, lessonIndex),
                              icon: const Icon(
                                Icons.close,
                                size: 20,
                                color: _muted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Builder(
                          builder: (context) {
                            final _LessonDraft lesson =
                                section.lessons[lessonIndex];
                            final bool hasVideo =
                                lesson.videoFile != null ||
                                (lesson.existingVideoUrl ?? '')
                                    .trim()
                                    .isNotEmpty;
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _AdminInlineField(
                                  controller: lesson.videoController,
                                  hintText: 'YouTube link (optional)',
                                  keyboardType: TextInputType.url,
                                  textInputAction: TextInputAction.done,
                                  autocorrect: false,
                                  enableSuggestions: false,
                                  textCapitalization: TextCapitalization.none,
                                  enabled: !hasVideo,
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    _MiniUploadButton(
                                      icon: Icons.video_library_outlined,
                                      label: 'Gallery',
                                      onPressed: hasVideo
                                          ? null
                                          : () => _pickLessonVideoFromGallery(
                                              lesson,
                                            ),
                                    ),
                                    const SizedBox(width: 6),
                                    _MiniUploadButton(
                                      icon: Icons.folder_open_outlined,
                                      label: 'Files',
                                      onPressed: hasVideo
                                          ? null
                                          : () => _pickLessonVideoFromFiles(
                                              lesson,
                                            ),
                                    ),
                                    if (hasVideo) ...[
                                      const Spacer(),
                                      TextButton.icon(
                                        onPressed: lesson.isUploading
                                            ? null
                                            : () => _clearLessonVideo(lesson),
                                        icon: const Icon(
                                          Icons.close,
                                          size: 18,
                                          color: _danger,
                                        ),
                                        label: Text(
                                          'Remove',
                                          style: GoogleFonts.poppins(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w700,
                                            color: _danger,
                                          ),
                                        ),
                                        style: TextButton.styleFrom(
                                          padding: EdgeInsets.zero,
                                          tapTargetSize:
                                              MaterialTapTargetSize.shrinkWrap,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (hasVideo) ...[
                                  const SizedBox(height: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 8,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F4FF),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: const Color(0xFFDCE3FF),
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.play_circle_outline,
                                          size: 18,
                                          color: _primary,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            _resolveLessonVideoName(lesson),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: GoogleFonts.poppins(
                                              fontSize: 11.5,
                                              fontWeight: FontWeight.w600,
                                              color: _title,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                                if (lesson.isUploading ||
                                    lesson.uploadProgress > 0) ...[
                                  const SizedBox(height: 6),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: LinearProgressIndicator(
                                      value: lesson.uploadProgress,
                                      minHeight: 6,
                                      backgroundColor: const Color(0xFFE4E8F7),
                                      valueColor:
                                          const AlwaysStoppedAnimation<Color>(
                                            _primary,
                                          ),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: Text(
                                      '${(lesson.uploadProgress * 100).round()}%',
                                      style: GoogleFonts.poppins(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: _muted,
                                      ),
                                    ),
                                  ),
                                ],
                                if ((lesson.uploadError ?? '')
                                    .trim()
                                    .isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    lesson.uploadError!,
                                    style: GoogleFonts.poppins(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: _danger,
                                    ),
                                  ),
                                ],
                              ],
                            );
                          },
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          TextButton.icon(
            onPressed: () => _addLesson(index),
            style: TextButton.styleFrom(
              foregroundColor: _primary,
              padding: EdgeInsets.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            icon: const Icon(Icons.add, size: 18),
            label: Text(
              'Add Lesson',
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _clearForm() {
    _titleController.clear();
    _priceController.clear();
    _oldPriceController.clear();
    _ratingController.clear();
    _studentsController.clear();
    _hoursController.clear();
    _newCategoryController.clear();
    _newMentorController.clear();
    setState(() {
      _showCategoryInput = false;
      _showMentorInput = false;
      _savingMentor = false;
      _savingCourse = false;
      _mentorImageFile = null;
      _mentorImageUrl = null;
      _courseCoverFile = null;
      _courseCoverUrl = null;
      _editingCourse = null;
      for (final _SectionDraft section in _sections) {
        section.dispose();
      }
      _sections = [_createSection(0)];
    });
    _syncSectionsCountField();
  }

  String _resolveCategory() {
    final String selected = (_selectedCategory ?? '').trim();
    if (selected.isNotEmpty) return selected;
    final List<String> categories = CategoryCatalog.items;
    if (categories.isNotEmpty) return categories.first;
    return '';
  }

  void _toggleCategoryInput() {
    setState(() => _showCategoryInput = !_showCategoryInput);
    if (_showCategoryInput) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _newCategoryFocus.requestFocus();
      });
    } else {
      _newCategoryController.clear();
    }
  }

  void _saveNewCategory() {
    final String trimmed = _newCategoryController.text.trim();
    if (trimmed.isEmpty) {
      _showMessage('Enter a category name.');
      return;
    }
    if (CategoryCatalog.hasCategory(trimmed)) {
      _showMessage('Category already exists.');
      return;
    }
    CategoryCatalog.addCategory(trimmed);
    setState(() {
      _selectedCategory = trimmed;
      _showCategoryInput = false;
    });
    _newCategoryController.clear();
  }

  void _cancelNewCategory() {
    setState(() => _showCategoryInput = false);
    _newCategoryController.clear();
  }

  void _toggleMentorInput() {
    if (_showMentorInput && _editingMentor == null) {
      _resetMentorForm();
      return;
    }
    setState(() {
      _showMentorInput = true;
      _editingMentor = null;
      _mentorCategory = _selectedCategory ?? _mentorCategory;
      _mentorImageFile = null;
      _mentorImageUrl = null;
      _newMentorController.clear();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _newMentorFocus.requestFocus();
    });
  }

  void _resetMentorForm() {
    setState(() {
      _showMentorInput = false;
      _editingMentor = null;
      _mentorImageFile = null;
      _mentorImageUrl = null;
      _savingMentor = false;
    });
    _newMentorController.clear();
  }

  void _startEditMentor(MentorItem mentor) {
    setState(() {
      _editingMentor = mentor;
      _showMentorInput = true;
      _newMentorController.text = mentor.name;
      _mentorCategory = mentor.category;
      _mentorImageUrl = mentor.imagePath;
      _mentorImageFile = null;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
      _newMentorFocus.requestFocus();
    });
  }

  Future<void> _pickMentorImage() async {
    try {
      final XFile? file = await _mentorImagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 90,
      );
      if (file != null && mounted) {
        setState(() {
          _mentorImageFile = File(file.path);
        });
      }
    } catch (_) {
      if (!mounted) return;
      _showMessage(
        'Could not open gallery. Please check permissions and try again.',
      );
    }
  }

  void _clearMentorImage() {
    setState(() {
      _mentorImageFile = null;
      _mentorImageUrl = null;
    });
  }

  Future<void> _saveMentor() async {
    if (_savingMentor) return;
    final String trimmed = _newMentorController.text.trim();
    if (trimmed.isEmpty) {
      _showMessage('Enter a mentor name.');
      return;
    }
    if (MentorCatalog.hasName(trimmed, excludeId: _editingMentor?.id)) {
      _showMessage('Mentor already exists.');
      return;
    }
    final String resolvedCategory =
        (_mentorCategory ?? _resolveCategory()).trim().isEmpty
        ? 'General'
        : (_mentorCategory ?? _resolveCategory()).trim();
    setState(() => _savingMentor = true);
    try {
      if (_editingMentor == null) {
        final MentorItem? mentor = await MentorCatalog.createMentor(
          name: trimmed,
          category: resolvedCategory,
          subtitle: '$resolvedCategory Mentor',
          imageFile: _mentorImageFile,
        );
        if (!mounted) return;
        setState(() => _savingMentor = false);
        if (mentor == null) {
          _showMessage('Could not add mentor.');
          return;
        }
        setState(() {
          _selectedMentorName = mentor.name;
        });
        _resetMentorForm();
        if (_mentorImageFile != null &&
            (mentor.imagePath ?? '').trim().isEmpty) {
          _showMessage(
            'Mentor added Ø¨Ø¯ÙˆÙ† ØµÙˆØ±Ø©. Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø© ÙØ´Ù„ Ø£Ùˆ Ø§Ù„ØªØ®Ø²ÙŠÙ† Ù…Ù‚ÙÙˆÙ„.',
          );
        } else {
          _showMessage('Mentor added.');
        }
      } else {
        final MentorItem current = _editingMentor!;
        final MentorItem updated = current.copyWith(
          name: trimmed,
          category: resolvedCategory,
          subtitle: '$resolvedCategory Mentor',
          imagePath: _mentorImageUrl ?? current.imagePath,
        );
        final String previousName = current.name;
        final MentorItem saved = await MentorCatalog.updateMentor(
          updated,
          imageFile: _mentorImageFile,
        );
        await CourseCatalog.updateMentorReferences(
          mentorId: saved.id,
          mentorName: saved.name,
          mentorSubtitle: saved.subtitle,
          mentorImagePath: saved.imagePath,
          previousName: previousName,
        );
        if (!mounted) return;
        setState(() => _savingMentor = false);
        setState(() {
          _selectedMentorName = saved.name;
        });
        _resetMentorForm();
        if (_mentorImageFile != null &&
            (saved.imagePath ?? '').trim().isEmpty) {
          _showMessage(
            'Mentor updated Ø¨Ø¯ÙˆÙ† ØµÙˆØ±Ø©. Ø±ÙØ¹ Ø§Ù„ØµÙˆØ±Ø© ÙØ´Ù„ Ø£Ùˆ Ø§Ù„ØªØ®Ø²ÙŠÙ† Ù…Ù‚ÙÙˆÙ„.',
          );
        } else {
          _showMessage('Mentor updated.');
        }
      }
    } on ClientException catch (e) {
      if (!mounted) return;
      setState(() => _savingMentor = false);
      _showPocketBaseError(e, 'Could not save mentor.');
    } on FirebaseException catch (e) {
      if (!mounted) return;
      setState(() => _savingMentor = false);
      _showMessage(e.message ?? 'Could not save mentor.');
    } on TimeoutException {
      if (!mounted) return;
      setState(() => _savingMentor = false);
      _showMessage('Upload timed out. Check your connection.');
    } catch (e) {
      if (!mounted) return;
      setState(() => _savingMentor = false);
      _showMessage(
        e.toString().isNotEmpty ? e.toString() : 'Could not save mentor.',
      );
    }
  }

  MentorItem? _resolveMentor() {
    if (widget.isMentorMode) {
      final String name = _currentUserName.trim();
      if (name.isEmpty) return null;
      final String category =
          (_mentorCategory ?? _selectedCategory ?? 'General').trim().isEmpty
          ? 'General'
          : (_mentorCategory ?? _selectedCategory ?? 'General').trim();
      final MentorItem existing = MentorCatalog.items.firstWhere(
        (mentor) => mentor.name == name,
        orElse: () => MentorItem(
          id: '',
          name: name,
          category: category,
          subtitle: '$category Mentor',
          courses: '0',
          students: '0',
          ratings: '0',
          imagePath: null,
        ),
      );
      return existing;
    }
    final String selected = (_selectedMentorName ?? '').trim();
    if (MentorCatalog.items.isEmpty) return null;
    if (selected.isEmpty) return MentorCatalog.items.first;
    for (final MentorItem mentor in MentorCatalog.items) {
      if (mentor.name == selected) return mentor;
    }
    return MentorCatalog.items.first;
  }

  Future<MentorItem?> _ensureMentorRecord(MentorItem mentor) async {
    if (!widget.isMentorMode) return mentor;
    final MentorItem? existing = MentorCatalog.findByName(mentor.name);
    if (existing != null) return existing;
    try {
      return await MentorCatalog.addMentor(mentor);
    } catch (_) {
      return null;
    }
  }

  Future<void> _pickCourseCover() async {
    try {
      final XFile? file = await _courseImagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1400,
        maxHeight: 900,
        imageQuality: 90,
      );
      if (file != null && mounted) {
        setState(() {
          _courseCoverFile = File(file.path);
        });
      }
    } catch (_) {
      if (!mounted) return;
      _showMessage(
        'Could not open gallery. Please check permissions and try again.',
      );
    }
  }

  void _clearCourseCover() {
    setState(() {
      _courseCoverFile = null;
      _courseCoverUrl = null;
    });
  }

  void _loadSectionsFromCourse(CourseItem course) {
    for (final _SectionDraft section in _sections) {
      section.dispose();
    }
    _sections = [];
    if (course.sections.isEmpty) {
      _sections = [_createSection(0)];
    } else {
      for (int i = 0; i < course.sections.length; i++) {
        final CourseSection section = course.sections[i];
        final _SectionDraft draft = _SectionDraft(title: section.title);
        for (final CourseLesson lesson in section.lessons) {
          draft.lessons.add(
            _LessonDraft(title: lesson.title, videoUrl: lesson.videoUrl),
          );
        }
        if (draft.lessons.isEmpty) {
          draft.lessons.add(_LessonDraft(title: 'Lesson 1'));
        }
        _sections.add(draft);
      }
    }
    _syncSectionsCountField();
  }

  List<CourseSection>? _buildSectionsForSave() {
    if (_sections.isEmpty) {
      _showMessage('Add at least one section.');
      return null;
    }
    final List<CourseSection> sections = [];
    int totalLessons = 0;
    for (final _SectionDraft section in _sections) {
      final String sectionTitle = section.titleController.text.trim();
      if (sectionTitle.isEmpty) {
        _showMessage('Enter a name for each section.');
        return null;
      }
      if (section.lessons.isEmpty) {
        _showMessage('Each section needs at least one lesson.');
        return null;
      }
      final List<CourseLesson> lessons = [];
      for (final _LessonDraft lesson in section.lessons) {
        final String lessonTitle = lesson.controller.text.trim();
        if (lessonTitle.isEmpty) {
          _showMessage('Enter a name for each lesson.');
          return null;
        }
        final String rawVideo = lesson.videoController.text.trim();
        final String existingVideo = (lesson.existingVideoUrl ?? '').trim();
        final bool hasLocalVideo = lesson.videoFile != null;
        if (!hasLocalVideo &&
            rawVideo.isNotEmpty &&
            extractYoutubeId(rawVideo) == null) {
          _showMessage('Enter a valid YouTube link for "$lessonTitle".');
          return null;
        }
        final String resolvedVideo = hasLocalVideo
            ? existingVideo
            : rawVideo.isNotEmpty
            ? rawVideo
            : existingVideo;
        lessons.add(CourseLesson(title: lessonTitle, videoUrl: resolvedVideo));
      }
      totalLessons += lessons.length;
      sections.add(CourseSection(title: sectionTitle, lessons: lessons));
    }
    if (totalLessons == 0) {
      _showMessage('Add at least one lesson.');
      return null;
    }
    return sections;
  }

  void _startEditCourse(CourseItem course) {
    setState(() {
      _editingCourse = course;
      _titleController.text = course.title;
      _priceController.text = course.price.replaceAll('EGP', '').trim();
      _oldPriceController.text = course.oldPrice.replaceAll('EGP', '').trim();
      _ratingController.text = course.rating;
      _studentsController.text = course.students.replaceAll('Std', '').trim();
      _hoursController.text = course.hours.toString();
      _selectedCategory = course.category;
      _selectedMentorName = course.mentorName;
      _courseCoverUrl = course.coverImagePath;
      _courseCoverFile = null;
      _showCategoryInput = false;
    });
    _loadSectionsFromCourse(course);
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  void _cancelEditCourse() {
    _clearForm();
  }

  Future<void> _saveCourse() async {
    if (_editingCourse == null) {
      await _addCourse();
    } else {
      await _updateCourse();
    }
  }

  Future<void> _addCourse() async {
    if (_savingCourse) return;
    final String title = _titleController.text.trim();
    final String category = _resolveCategory();
    final String price = _formatPrice(_priceController.text);
    final String oldPrice = _formatPrice(_oldPriceController.text);
    final String rating = _ratingController.text.trim();
    final String students = _formatStudents(_studentsController.text);
    final int hours = int.tryParse(_hoursController.text.trim()) ?? 0;
    final MentorItem? mentor = _resolveMentor();

    if (title.isEmpty ||
        category.isEmpty ||
        price.isEmpty ||
        rating.isEmpty ||
        hours <= 0) {
      _showMessage('Fill all required fields.');
      return;
    }

    if (mentor == null) {
      _showMessage('Select a mentor.');
      return;
    }
    final MentorItem? resolvedMentor = await _ensureMentorRecord(mentor);
    if (resolvedMentor == null) {
      _showMessage('Select a mentor.');
      return;
    }

    final List<CourseSection>? sections = _buildSectionsForSave();
    if (sections == null) return;

    if (CourseCatalog.hasTitle(title)) {
      _showMessage('Course title already exists.');
      return;
    }

    final CourseItem course = CourseItem(
      id: '',
      category: category,
      title: title,
      mentorId: resolvedMentor.id,
      mentorName: resolvedMentor.name,
      mentorSubtitle: resolvedMentor.subtitle,
      mentorImagePath: resolvedMentor.imagePath,
      coverImagePath: _courseCoverUrl,
      price: price,
      oldPrice: oldPrice.isEmpty ? price : oldPrice,
      rating: rating,
      students: students,
      classes: sections.length,
      hours: hours,
      bookmarked: false,
      sections: sections,
    );

    final List<CourseLessonUpload> lessonUploads = _collectLessonUploads();
    setState(() {
      _savingCourse = true;
      _markLessonUploadsStarted(lessonUploads);
    });
    try {
      final CourseItem? saved = await CourseCatalog.addCourse(
        course,
        coverImageFile: _courseCoverFile,
        lessonVideoUploads: lessonUploads,
        onLessonUploadProgress: _onLessonUploadProgress,
      );
      if (!mounted) return;
      if (saved == null) {
        _showMessage('Could not add course.');
        return;
      }
      if (_courseCoverFile != null &&
          (saved.coverImagePath ?? '').trim().isEmpty) {
        _showMessage(
          'Course saved without cover. Upload failed or storage blocked.',
        );
      } else {
        _showMessage('Course added.');
      }
      _clearForm();
    } on ClientException catch (e) {
      if (!mounted) return;
      _showPocketBaseError(e, 'Could not add course.');
      if (lessonUploads.isNotEmpty) {
        _markLessonUploadsFailed(lessonUploads, 'Video upload failed.');
      }
    } on FirebaseException catch (e) {
      if (!mounted) return;
      _showMessage(e.message ?? 'Could not add course.');
      if (lessonUploads.isNotEmpty) {
        _markLessonUploadsFailed(lessonUploads, 'Video upload failed.');
      }
    } on TimeoutException {
      if (!mounted) return;
      _showMessage('Upload timed out. Check your connection.');
      if (lessonUploads.isNotEmpty) {
        _markLessonUploadsFailed(lessonUploads, 'Video upload timed out.');
      }
    } catch (e) {
      if (!mounted) return;
      _showMessage(
        e.toString().isNotEmpty ? e.toString() : 'Could not add course.',
      );
      if (lessonUploads.isNotEmpty) {
        _markLessonUploadsFailed(lessonUploads, 'Video upload failed.');
      }
    } finally {
      if (mounted) {
        setState(() => _savingCourse = false);
      }
    }
  }

  Future<void> _updateCourse() async {
    if (_savingCourse) return;
    final CourseItem current = _editingCourse!;
    final String title = _titleController.text.trim();
    final String category = _resolveCategory();
    final String price = _formatPrice(_priceController.text);
    final String oldPrice = _formatPrice(_oldPriceController.text);
    final String rating = _ratingController.text.trim();
    final String students = _formatStudents(_studentsController.text);
    final int hours = int.tryParse(_hoursController.text.trim()) ?? 0;
    final MentorItem? mentor = _resolveMentor();

    if (title.isEmpty ||
        category.isEmpty ||
        price.isEmpty ||
        rating.isEmpty ||
        hours <= 0) {
      _showMessage('Fill all required fields.');
      return;
    }

    if (mentor == null) {
      _showMessage('Select a mentor.');
      return;
    }
    final MentorItem? resolvedMentor = await _ensureMentorRecord(mentor);
    if (resolvedMentor == null) {
      _showMessage('Select a mentor.');
      return;
    }

    final List<CourseSection>? sections = _buildSectionsForSave();
    if (sections == null) return;

    if (CourseCatalog.hasTitle(title, excludeId: current.id)) {
      _showMessage('Course title already exists.');
      return;
    }

    final CourseItem updated = current.copyWith(
      category: category,
      title: title,
      mentorId: resolvedMentor.id,
      mentorName: resolvedMentor.name,
      mentorSubtitle: resolvedMentor.subtitle,
      mentorImagePath: resolvedMentor.imagePath,
      coverImagePath: _courseCoverUrl ?? '',
      price: price,
      oldPrice: oldPrice.isEmpty ? price : oldPrice,
      rating: rating,
      students: students,
      classes: sections.length,
      hours: hours,
      sections: sections,
    );

    final List<CourseLessonUpload> lessonUploads = _collectLessonUploads();
    setState(() {
      _savingCourse = true;
      _markLessonUploadsStarted(lessonUploads);
    });
    try {
      final CourseItem? saved = await CourseCatalog.updateCourse(
        updated,
        coverImageFile: _courseCoverFile,
        previousCoverUrl: current.coverImagePath,
        lessonVideoUploads: lessonUploads,
        onLessonUploadProgress: _onLessonUploadProgress,
      );
      if (!mounted) return;
      if (saved == null) {
        _showMessage('Could not update course.');
        return;
      }
      if (_courseCoverFile != null &&
          (saved.coverImagePath ?? '').trim().isEmpty) {
        _showMessage(
          'Course updated without cover. Upload failed or storage blocked.',
        );
      } else {
        _showMessage('Course updated.');
      }
      _clearForm();
    } on ClientException catch (e) {
      if (!mounted) return;
      _showPocketBaseError(e, 'Could not update course.');
      if (lessonUploads.isNotEmpty) {
        _markLessonUploadsFailed(lessonUploads, 'Video upload failed.');
      }
    } on FirebaseException catch (e) {
      if (!mounted) return;
      _showMessage(e.message ?? 'Could not update course.');
      if (lessonUploads.isNotEmpty) {
        _markLessonUploadsFailed(lessonUploads, 'Video upload failed.');
      }
    } on TimeoutException {
      if (!mounted) return;
      _showMessage('Upload timed out. Check your connection.');
      if (lessonUploads.isNotEmpty) {
        _markLessonUploadsFailed(lessonUploads, 'Video upload timed out.');
      }
    } catch (e) {
      if (!mounted) return;
      _showMessage(
        e.toString().isNotEmpty ? e.toString() : 'Could not update course.',
      );
      if (lessonUploads.isNotEmpty) {
        _markLessonUploadsFailed(lessonUploads, 'Video upload failed.');
      }
    } finally {
      if (mounted) {
        setState(() => _savingCourse = false);
      }
    }
  }

  Future<void> _confirmDelete(CourseItem course) async {
    final bool? shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(
            'Delete course?',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
          ),
          content: Text(
            'This will remove "${course.title}" from the app.',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(
                'Cancel',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: TextButton.styleFrom(foregroundColor: _danger),
              child: Text(
                'Delete',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        );
      },
    );

    if (shouldDelete == true) {
      await CourseCatalog.removeCourse(course.id);
      if (!mounted) return;
      _showMessage('Course deleted.');
    }
  }

  Future<void> _confirmDeleteMentor(MentorItem mentor) async {
    final bool? shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(
            'Delete mentor?',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
          ),
          content: Text(
            'This will remove "${mentor.name}" from mentors. Courses will keep the old mentor info.',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w500),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(
                'Cancel',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: TextButton.styleFrom(foregroundColor: _danger),
              child: Text(
                'Delete',
                style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        );
      },
    );

    if (shouldDelete == true) {
      await MentorCatalog.removeMentor(mentor.id);
      if (!mounted) return;
      if (_selectedMentorName == mentor.name) {
        final List<MentorItem> remaining = MentorCatalog.items;
        setState(() {
          _selectedMentorName = remaining.isNotEmpty
              ? remaining.first.name
              : null;
        });
      }
      _showMessage('Mentor deleted.');
    }
  }

  Future<void> _addSampleData() async {
    if (_seedingData) return;
    setState(() => _seedingData = true);
    try {
      final List<String> categories = CategoryCatalog.items.isNotEmpty
          ? CategoryCatalog.items
          : const ['Design', 'Business', 'Programming', 'Marketing'];
      final List<String> firstNames = [
        'Lina',
        'Omar',
        'Noor',
        'Youssef',
        'Salma',
        'Hassan',
        'Maya',
        'Karim',
      ];
      final List<String> lastNames = [
        'Adel',
        'Fathy',
        'Ibrahim',
        'Mahmoud',
        'Ali',
        'Hamed',
        'Nabil',
        'Salah',
      ];
      final List<String> courseTopics = [
        'UI Design',
        'Brand Strategy',
        'Flutter Basics',
        'Digital Marketing',
        'Productivity',
        'Data Analysis',
        'UX Research',
        'Web Development',
      ];
      final math.Random random = math.Random();

      if (MentorCatalog.items.length < 3) {
        for (int i = 0; i < 3; i++) {
          final String name =
              '${firstNames[random.nextInt(firstNames.length)]} '
              '${lastNames[random.nextInt(lastNames.length)]}';
          if (MentorCatalog.hasName(name)) continue;
          final String category = categories[random.nextInt(categories.length)];
          await MentorCatalog.createMentor(
            name: name,
            category: category,
            subtitle: '$category Mentor',
          );
        }
      }

      final List<MentorItem> mentors = MentorCatalog.items;
      if (mentors.isEmpty) {
        _showMessage('Add mentors first.');
        return;
      }

      for (int i = 0; i < 4; i++) {
        final MentorItem mentor = mentors[random.nextInt(mentors.length)];
        final String category = categories[random.nextInt(categories.length)];
        final String title =
            '${courseTopics[random.nextInt(courseTopics.length)]} '
            'Level ${random.nextInt(3) + 1}';
        if (CourseCatalog.hasTitle(title)) continue;
        final int hours = random.nextInt(20) + 10;
        final List<CourseSection> sections = [
          CourseSection(
            title: 'Section 1',
            lessons: const [
              CourseLesson(title: 'Introduction'),
              CourseLesson(title: 'Core Concepts'),
            ],
          ),
          CourseSection(
            title: 'Section 2',
            lessons: const [
              CourseLesson(title: 'Practice'),
              CourseLesson(title: 'Wrap Up'),
            ],
          ),
        ];
        final CourseItem course = CourseItem(
          id: '',
          category: category,
          title: title,
          mentorId: mentor.id,
          mentorName: mentor.name,
          mentorSubtitle: mentor.subtitle,
          mentorImagePath: mentor.imagePath,
          coverImagePath: null,
          price: 'EGP ${random.nextInt(1800) + 700}',
          oldPrice: 'EGP ${random.nextInt(2000) + 1200}',
          rating: '4.${random.nextInt(8) + 1}',
          students: '${random.nextInt(9000) + 500} Std',
          classes: sections.length,
          hours: hours,
          bookmarked: false,
          sections: sections,
        );
        await CourseCatalog.addCourse(course);
      }

      if (!mounted) return;
      _showMessage('Sample data added.');
    } finally {
      if (mounted) {
        setState(() => _seedingData = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isAdmin = AdminAccess.isAdmin();
    final bool isMentorMode = widget.isMentorMode;
    final bool hasAccess = isAdmin || isMentorMode;
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

            if (!hasAccess) {
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

            return SingleChildScrollView(
              controller: _scrollController,
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                18,
                horizontalPadding,
                28,
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
                        isMentorMode ? 'My Courses' : 'Course Admin',
                        style: GoogleFonts.poppins(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: _title,
                        ),
                      ),
                      const Spacer(),
                      SizedBox(
                        width: 42,
                        height: 42,
                        child: OutlinedButton(
                          onPressed: _updatingServer
                              ? null
                              : _openPocketBaseSettings,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: _primary,
                            side: const BorderSide(color: Color(0xFFE2E6F4)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            padding: EdgeInsets.zero,
                          ),
                          child: const Icon(Icons.dns_rounded, size: 20),
                        ),
                      ),
                      if (!isMentorMode) const SizedBox(width: 10),
                      if (!isMentorMode)
                        SizedBox(
                          width: 42,
                          height: 42,
                          child: OutlinedButton(
                            onPressed: _openTransactionsSheet,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: _primary,
                              side: const BorderSide(color: Color(0xFFE2E6F4)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              padding: EdgeInsets.zero,
                            ),
                            child: const Icon(Icons.history_rounded, size: 20),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (!isMentorMode)
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed: _seedingData ? null : _addSampleData,
                        style: TextButton.styleFrom(
                          foregroundColor: _primary,
                          padding: EdgeInsets.zero,
                          minimumSize: const Size(0, 0),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        icon: _seedingData
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.auto_awesome, size: 18),
                        label: Text(
                          _seedingData ? 'Seeding...' : 'Add Random Data',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: 12),
                  Text(
                    _editingCourse == null
                        ? 'New Course Details'
                        : 'Edit Course',
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: _title,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x1C7C8BB4),
                          blurRadius: 22,
                          offset: Offset(0, 14),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        _AdminTextField(
                          controller: _titleController,
                          label: 'Course Title',
                          hintText: 'e.g. Mobile UI Design',
                        ),
                        const SizedBox(height: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Course Cover',
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF3C4466),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Builder(
                                  builder: (context) {
                                    final DecorationImage? coverImage =
                                        _courseCoverFile != null
                                        ? DecorationImage(
                                            image: FileImage(_courseCoverFile!),
                                            fit: BoxFit.cover,
                                          )
                                        : resolveDecorationImage(
                                            _courseCoverUrl,
                                          );
                                    return Container(
                                      width: 72,
                                      height: 56,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEAF0FF),
                                        borderRadius: BorderRadius.circular(14),
                                        image: coverImage,
                                      ),
                                      child: coverImage == null
                                          ? const Icon(
                                              Icons.image_outlined,
                                              color: _muted,
                                            )
                                          : null,
                                    );
                                  },
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: _savingCourse
                                        ? null
                                        : _pickCourseCover,
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: _primary,
                                      side: const BorderSide(
                                        color: Color(0xFFE2E6F4),
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                    ),
                                    icon: const Icon(
                                      Icons.photo_library_outlined,
                                      size: 18,
                                    ),
                                    label: Text(
                                      _courseCoverFile == null &&
                                              (_courseCoverUrl ?? '')
                                                  .trim()
                                                  .isEmpty
                                          ? 'Choose Image'
                                          : 'Change Image',
                                      style: GoogleFonts.poppins(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                ),
                                if (_courseCoverFile != null ||
                                    (_courseCoverUrl ?? '').trim().isNotEmpty)
                                  IconButton(
                                    onPressed: _savingCourse
                                        ? null
                                        : _clearCourseCover,
                                    icon: const Icon(
                                      Icons.close,
                                      color: _muted,
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ValueListenableBuilder<List<String>>(
                          valueListenable: CategoryCatalog.categories,
                          builder: (context, categories, _) {
                            final String? resolvedValue =
                                categories.contains(_selectedCategory)
                                ? _selectedCategory
                                : categories.isNotEmpty
                                ? categories.first
                                : null;
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _AdminDropdownField(
                                  label: 'Category',
                                  hintText: categories.isEmpty
                                      ? 'No categories'
                                      : 'Select category',
                                  items: categories,
                                  value: resolvedValue,
                                  onChanged: (value) {
                                    setState(() => _selectedCategory = value);
                                  },
                                ),
                                const SizedBox(height: 6),
                                TextButton.icon(
                                  onPressed: _toggleCategoryInput,
                                  style: TextButton.styleFrom(
                                    foregroundColor: _primary,
                                    padding: EdgeInsets.zero,
                                    minimumSize: const Size(0, 0),
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  icon: Icon(
                                    _showCategoryInput
                                        ? Icons.close
                                        : Icons.add,
                                    size: 18,
                                  ),
                                  label: Text(
                                    _showCategoryInput
                                        ? 'Cancel'
                                        : 'Add Category',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                if (_showCategoryInput) ...[
                                  const SizedBox(height: 10),
                                  _AdminTextField(
                                    controller: _newCategoryController,
                                    label: 'New Category',
                                    hintText: 'e.g. Data Science',
                                    focusNode: _newCategoryFocus,
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton(
                                          onPressed: _cancelNewCategory,
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: _muted,
                                            side: const BorderSide(
                                              color: Color(0xFFE2E6F4),
                                            ),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(14),
                                            ),
                                          ),
                                          child: Text(
                                            'Cancel',
                                            style: GoogleFonts.poppins(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: _saveNewCategory,
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: _primary,
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(14),
                                            ),
                                          ),
                                          child: Text(
                                            'Add',
                                            style: GoogleFonts.poppins(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 12),
                        if (isMentorMode)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Mentor',
                                style: GoogleFonts.poppins(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _title,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                height: 54,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF7F9FF),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: const Color(0xFFE2E6F4),
                                  ),
                                ),
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  _currentUserName.isEmpty
                                      ? 'Mentor'
                                      : _currentUserName,
                                  style: GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: _title,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        if (!isMentorMode)
                          ValueListenableBuilder<List<MentorItem>>(
                            valueListenable: MentorCatalog.mentors,
                            builder: (context, mentors, _) {
                              final List<String> mentorNames = [];
                              final Set<String> seenNames = <String>{};
                              for (final MentorItem mentor in mentors) {
                                final String name = mentor.name.trim();
                                if (name.isEmpty) continue;
                                final String key = name.toLowerCase();
                                if (seenNames.add(key)) {
                                  mentorNames.add(name);
                                }
                              }
                              String? resolvedValue;
                              final String selected =
                                  (_selectedMentorName ?? '').trim();
                              if (selected.isNotEmpty) {
                                for (final String name in mentorNames) {
                                  if (name.toLowerCase() ==
                                      selected.toLowerCase()) {
                                    resolvedValue = name;
                                    break;
                                  }
                                }
                              }
                              resolvedValue ??= mentorNames.isNotEmpty
                                  ? mentorNames.first
                                  : null;
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _AdminDropdownField(
                                    label: 'Mentor',
                                    hintText: mentorNames.isEmpty
                                        ? 'No mentors'
                                        : 'Select mentor',
                                    items: mentorNames,
                                    value: resolvedValue,
                                    onChanged: (value) {
                                      setState(
                                        () => _selectedMentorName = value,
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 6),
                                  TextButton.icon(
                                    onPressed: _toggleMentorInput,
                                    style: TextButton.styleFrom(
                                      foregroundColor: _primary,
                                      padding: EdgeInsets.zero,
                                      minimumSize: const Size(0, 0),
                                      tapTargetSize:
                                          MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    icon: Icon(
                                      _showMentorInput
                                          ? Icons.close
                                          : Icons.add,
                                      size: 18,
                                    ),
                                    label: Text(
                                      _showMentorInput
                                          ? (_editingMentor != null
                                                ? 'Cancel Edit'
                                                : 'Cancel')
                                          : 'Add Mentor',
                                      style: GoogleFonts.poppins(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  if (_showMentorInput) ...[
                                    const SizedBox(height: 10),
                                    if (_editingMentor != null)
                                      Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 8,
                                        ),
                                        child: Text(
                                          'Editing ${_editingMentor!.name}',
                                          style: GoogleFonts.poppins(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: _muted,
                                          ),
                                        ),
                                      ),
                                    _AdminTextField(
                                      controller: _newMentorController,
                                      label: 'Mentor Name',
                                      hintText: 'e.g. Sara Ahmed',
                                      focusNode: _newMentorFocus,
                                    ),
                                    const SizedBox(height: 10),
                                    ValueListenableBuilder<List<String>>(
                                      valueListenable:
                                          CategoryCatalog.categories,
                                      builder: (context, categories, _) {
                                        final String? resolvedValue =
                                            categories.contains(_mentorCategory)
                                            ? _mentorCategory
                                            : categories.isNotEmpty
                                            ? categories.first
                                            : null;
                                        return _AdminDropdownField(
                                          label: 'Mentor Category',
                                          hintText: categories.isEmpty
                                              ? 'No categories'
                                              : 'Select category',
                                          items: categories,
                                          value: resolvedValue,
                                          onChanged: (value) {
                                            setState(
                                              () => _mentorCategory = value,
                                            );
                                          },
                                        );
                                      },
                                    ),
                                    const SizedBox(height: 10),
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Profile Image',
                                          style: GoogleFonts.poppins(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: const Color(0xFF3C4466),
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            Builder(
                                              builder: (context) {
                                                final DecorationImage?
                                                mentorImage =
                                                    _mentorImageFile != null
                                                    ? DecorationImage(
                                                        image: FileImage(
                                                          _mentorImageFile!,
                                                        ),
                                                        fit: BoxFit.cover,
                                                      )
                                                    : resolveDecorationImage(
                                                        _mentorImageUrl,
                                                      );
                                                return Container(
                                                  width: 54,
                                                  height: 54,
                                                  decoration: BoxDecoration(
                                                    color: const Color(
                                                      0xFFEAF0FF,
                                                    ),
                                                    shape: BoxShape.circle,
                                                    image: mentorImage,
                                                  ),
                                                  child: mentorImage == null
                                                      ? const Icon(
                                                          Icons.person,
                                                          color: _muted,
                                                        )
                                                      : null,
                                                );
                                              },
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: _savingMentor
                                                    ? null
                                                    : _pickMentorImage,
                                                style: OutlinedButton.styleFrom(
                                                  foregroundColor: _primary,
                                                  side: const BorderSide(
                                                    color: Color(0xFFE2E6F4),
                                                  ),
                                                  shape: RoundedRectangleBorder(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          14,
                                                        ),
                                                  ),
                                                ),
                                                icon: const Icon(
                                                  Icons.photo_library_outlined,
                                                  size: 18,
                                                ),
                                                label: Text(
                                                  _mentorImageFile == null &&
                                                          (_mentorImageUrl ??
                                                                  '')
                                                              .trim()
                                                              .isEmpty
                                                      ? 'Choose Image'
                                                      : 'Change Image',
                                                  style: GoogleFonts.poppins(
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                              ),
                                            ),
                                            if (_mentorImageFile != null ||
                                                (_mentorImageUrl ?? '')
                                                    .trim()
                                                    .isNotEmpty)
                                              IconButton(
                                                onPressed: _savingMentor
                                                    ? null
                                                    : _clearMentorImage,
                                                icon: const Icon(
                                                  Icons.close,
                                                  color: _muted,
                                                ),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton(
                                            onPressed: _resetMentorForm,
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: _muted,
                                              side: const BorderSide(
                                                color: Color(0xFFE2E6F4),
                                              ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(14),
                                              ),
                                            ),
                                            child: Text(
                                              'Cancel',
                                              style: GoogleFonts.poppins(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: ElevatedButton(
                                            onPressed: _savingMentor
                                                ? null
                                                : _saveMentor,
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: _primary,
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(14),
                                              ),
                                            ),
                                            child: _savingMentor
                                                ? const SizedBox(
                                                    width: 18,
                                                    height: 18,
                                                    child:
                                                        CircularProgressIndicator(
                                                          strokeWidth: 2,
                                                          color: Colors.white,
                                                        ),
                                                  )
                                                : Text(
                                                    _editingMentor == null
                                                        ? 'Add'
                                                        : 'Save',
                                                    style: GoogleFonts.poppins(
                                                      fontSize: 13,
                                                      fontWeight:
                                                          FontWeight.w700,
                                                      color: Colors.white,
                                                    ),
                                                  ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              );
                            },
                          ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _AdminTextField(
                                controller: _priceController,
                                label: 'Price (EGP)',
                                hintText: '1450',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _AdminTextField(
                                controller: _oldPriceController,
                                label: 'Old Price',
                                hintText: '1890',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _AdminTextField(
                                controller: _ratingController,
                                label: 'Rating',
                                hintText: '4.5',
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                      decimal: true,
                                    ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _AdminTextField(
                                controller: _studentsController,
                                label: 'Students',
                                hintText: '7800',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _AdminTextField(
                          controller: _sectionsCountController,
                          label: 'Sections',
                          hintText: 'e.g. 3',
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                          onChanged: _onSectionsCountChanged,
                        ),
                        const SizedBox(height: 12),
                        _buildSectionsEditor(),
                        const SizedBox(height: 12),
                        _AdminTextField(
                          controller: _hoursController,
                          label: 'Hours',
                          hintText: '42',
                          keyboardType: TextInputType.number,
                        ),
                        const SizedBox(height: 16),
                        if (_editingCourse == null)
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _primary,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                              onPressed: _savingCourse ? null : _saveCourse,
                              child: _savingCourse
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text(
                                      'Add Course',
                                      style: GoogleFonts.poppins(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                            ),
                          )
                        else
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: _cancelEditCourse,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: _muted,
                                    side: const BorderSide(
                                      color: Color(0xFFE2E6F4),
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  child: Text(
                                    'Cancel',
                                    style: GoogleFonts.poppins(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: _savingCourse ? null : _saveCourse,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: _primary,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  child: _savingCourse
                                      ? const SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : Text(
                                          'Update',
                                          style: GoogleFonts.poppins(
                                            fontSize: 13,
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
                  ),
                  const SizedBox(height: 22),
                  ValueListenableBuilder<List<CourseItem>>(
                    valueListenable: CourseCatalog.courses,
                    builder: (context, courses, _) {
                      final List<CourseItem> visibleCourses = isMentorMode
                          ? courses.where((course) {
                              if (_currentUserId.isNotEmpty &&
                                  course.mentorId == _currentUserId) {
                                return true;
                              }
                              final String name = _currentUserName.trim();
                              if (name.isNotEmpty &&
                                  course.mentorName.trim() == name) {
                                return true;
                              }
                              return false;
                            }).toList()
                          : courses;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isMentorMode
                                ? 'My Courses (${visibleCourses.length})'
                                : 'All Courses (${courses.length})',
                            style: GoogleFonts.poppins(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: _title,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (visibleCourses.isEmpty)
                            Center(
                              child: Text(
                                'No courses yet.',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: _muted,
                                ),
                              ),
                            )
                          else
                            ListView.separated(
                              itemCount: visibleCourses.length,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final CourseItem course = visibleCourses[index];
                                return _CourseRow(
                                  course: course,
                                  onEdit: () => _startEditCourse(course),
                                  onDelete: () => _confirmDelete(course),
                                );
                              },
                            ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 22),
                  if (!isMentorMode)
                    ValueListenableBuilder<List<MentorItem>>(
                      valueListenable: MentorCatalog.mentors,
                      builder: (context, mentors, _) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'All Mentors (${mentors.length})',
                                  style: GoogleFonts.poppins(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: _title,
                                  ),
                                ),
                                const Spacer(),
                                TextButton.icon(
                                  onPressed: _toggleMentorInput,
                                  style: TextButton.styleFrom(
                                    foregroundColor: _primary,
                                    padding: EdgeInsets.zero,
                                    minimumSize: const Size(0, 0),
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  icon: const Icon(Icons.add, size: 18),
                                  label: Text(
                                    'Add Mentor',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            if (mentors.isEmpty)
                              Center(
                                child: Text(
                                  'No mentors yet.',
                                  style: GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: _muted,
                                  ),
                                ),
                              )
                            else
                              ListView.separated(
                                itemCount: mentors.length,
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  final MentorItem mentor = mentors[index];
                                  return _MentorRow(
                                    mentor: mentor,
                                    onEdit: () => _startEditMentor(mentor),
                                    onDelete: () =>
                                        _confirmDeleteMentor(mentor),
                                  );
                                },
                              ),
                          ],
                        );
                      },
                    ),
                  const SizedBox(height: 22),
                  if (!isMentorMode)
                    ValueListenableBuilder<List<TransactionItem>>(
                      valueListenable: TransactionCatalog.adminTransactions,
                      builder: (context, transactions, _) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Payment Requests (${transactions.length})',
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: _title,
                              ),
                            ),
                            const SizedBox(height: 12),
                            if (transactions.isEmpty)
                              Center(
                                child: Text(
                                  'No payment requests yet.',
                                  style: GoogleFonts.poppins(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: _muted,
                                  ),
                                ),
                              )
                            else
                              ListView.separated(
                                itemCount: transactions.length,
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  return _buildTransactionCard(
                                    transactions[index],
                                  );
                                },
                              ),
                          ],
                        );
                      },
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

class _AdminTextField extends StatelessWidget {
  const _AdminTextField({
    required this.controller,
    required this.label,
    required this.hintText,
    this.keyboardType,
    this.focusNode,
    this.onChanged,
    this.inputFormatters,
  });

  final TextEditingController controller;
  final String label;
  final String hintText;
  final TextInputType? keyboardType;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final List<TextInputFormatter>? inputFormatters;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
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
            controller: controller,
            keyboardType: keyboardType,
            focusNode: focusNode,
            onChanged: onChanged,
            inputFormatters: inputFormatters,
            style: GoogleFonts.poppins(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF202244),
            ),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF9AA1B8),
              ),
              border: InputBorder.none,
            ),
          ),
        ),
      ],
    );
  }
}

class _AdminDropdownField extends StatelessWidget {
  const _AdminDropdownField({
    required this.label,
    required this.items,
    required this.value,
    required this.onChanged,
    this.hintText,
  });

  final String label;
  final List<String> items;
  final String? value;
  final String? hintText;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final bool hasItems = items.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
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
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: hasItems ? value : null,
              dropdownColor: Colors.white,
              borderRadius: BorderRadius.circular(14),
              menuMaxHeight: 280,
              focusColor: Colors.transparent,
              hint: Text(
                hintText ?? 'Select',
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF9AA1B8),
                ),
              ),
              icon: const Icon(
                Icons.keyboard_arrow_down_rounded,
                color: Color(0xFF68708C),
              ),
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF202244),
              ),
              items: items
                  .map(
                    (item) => DropdownMenuItem<String>(
                      value: item,
                      child: Text(item, overflow: TextOverflow.ellipsis),
                    ),
                  )
                  .toList(),
              onChanged: hasItems ? onChanged : null,
            ),
          ),
        ),
      ],
    );
  }
}

class _AdminInlineField extends StatelessWidget {
  const _AdminInlineField({
    required this.controller,
    required this.hintText,
    this.keyboardType,
    this.textInputAction,
    this.autocorrect = true,
    this.enableSuggestions = true,
    this.textCapitalization = TextCapitalization.sentences,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String hintText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool autocorrect;
  final bool enableSuggestions;
  final TextCapitalization textCapitalization;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E6F4)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: TextField(
        controller: controller,
        enabled: enabled,
        keyboardType: keyboardType,
        textInputAction: textInputAction,
        autocorrect: autocorrect,
        enableSuggestions: enableSuggestions,
        textCapitalization: textCapitalization,
        style: GoogleFonts.poppins(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: const Color(0xFF202244),
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: GoogleFonts.poppins(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF9AA1B8),
          ),
          border: InputBorder.none,
        ),
      ),
    );
  }
}

class _MiniUploadButton extends StatelessWidget {
  const _MiniUploadButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 30,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 16),
        label: Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
          ),
        ),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          foregroundColor: const Color(0xFF0D65FF),
          side: const BorderSide(color: Color(0xFFDCE3FF)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
    );
  }
}

class _CourseRow extends StatelessWidget {
  const _CourseRow({
    required this.course,
    required this.onEdit,
    required this.onDelete,
  });

  final CourseItem course;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
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
          Builder(
            builder: (context) {
              final DecorationImage? coverImage = resolveDecorationImage(
                course.coverImagePath,
              );
              return Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF0FF),
                  borderRadius: BorderRadius.circular(14),
                  image: coverImage,
                ),
                child: coverImage == null
                    ? const Icon(Icons.image_outlined, color: Color(0xFF7D818F))
                    : null,
              );
            },
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  course.title,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1C2140),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  course.category,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF7D818F),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${course.price} | ${course.rating} | ${course.students}',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF3C4466),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          IconButton(
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined, color: Color(0xFF0D65FF)),
          ),
          IconButton(
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline, color: Color(0xFFE74C3C)),
          ),
        ],
      ),
    );
  }
}

class _MentorRow extends StatelessWidget {
  const _MentorRow({
    required this.mentor,
    required this.onEdit,
    required this.onDelete,
  });

  final MentorItem mentor;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
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
          Builder(
            builder: (context) {
              final DecorationImage? mentorImage = resolveDecorationImage(
                mentor.imagePath,
              );
              return Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF0FF),
                  shape: BoxShape.circle,
                  image: mentorImage,
                ),
                child: mentorImage == null
                    ? const Icon(Icons.person, color: Color(0xFF7D818F))
                    : null,
              );
            },
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  mentor.name,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1C2140),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  mentor.category,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF7D818F),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  mentor.subtitle,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF3C4466),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          IconButton(
            onPressed: onEdit,
            icon: const Icon(Icons.edit_outlined, color: Color(0xFF0D65FF)),
          ),
          IconButton(
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline, color: Color(0xFFE74C3C)),
          ),
        ],
      ),
    );
  }
}

class _LessonDraft {
  _LessonDraft({required String title, String videoUrl = ''})
    : controller = TextEditingController(text: title),
      videoController = TextEditingController(
        text: _resolveYoutubeLink(videoUrl),
      ),
      existingVideoUrl = _resolveExistingVideo(videoUrl);

  final TextEditingController controller;
  final TextEditingController videoController;
  File? videoFile;
  String? videoFileName;
  String? existingVideoUrl;
  double uploadProgress = 0;
  bool isUploading = false;
  String? uploadError;

  void dispose() {
    controller.dispose();
    videoController.dispose();
  }

  static String _resolveYoutubeLink(String value) {
    final String trimmed = value.trim();
    if (trimmed.isEmpty) return '';
    return extractYoutubeId(trimmed) == null ? '' : trimmed;
  }

  static String? _resolveExistingVideo(String value) {
    final String trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    return extractYoutubeId(trimmed) == null ? trimmed : null;
  }
}

class _SectionDraft {
  _SectionDraft({required String title})
    : titleController = TextEditingController(text: title);

  final TextEditingController titleController;
  final List<_LessonDraft> lessons = [];

  void dispose() {
    titleController.dispose();
    for (final _LessonDraft lesson in lessons) {
      lesson.dispose();
    }
  }
}
