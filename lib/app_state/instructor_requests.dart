import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class InstructorRequest {
  const InstructorRequest({
    required this.id,
    required this.userId,
    required this.name,
    required this.email,
    required this.phone,
    required this.category,
    required this.coursesTaken,
    required this.experienceYears,
    required this.notes,
    required this.cvUrl,
    required this.idUrl,
    required this.status,
    this.requestedAt,
    this.updatedAt,
    this.resolvedAt,
  });

  final String id;
  final String userId;
  final String name;
  final String email;
  final String phone;
  final String category;
  final String coursesTaken;
  final String experienceYears;
  final String notes;
  final String cvUrl;
  final String idUrl;
  final String status;
  final DateTime? requestedAt;
  final DateTime? updatedAt;
  final DateTime? resolvedAt;

  bool get isPending => status == 'pending';
  bool get isApproved => status == 'approved';
  bool get isRejected => status == 'rejected';

  factory InstructorRequest.fromDoc(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final Map<String, dynamic> data = doc.data() ?? {};
    return InstructorRequest(
      id: doc.id,
      userId: (data['userId'] ?? doc.id).toString(),
      name: (data['name'] ?? '').toString(),
      email: (data['email'] ?? '').toString(),
      phone: (data['phone'] ?? '').toString(),
      category: (data['category'] ?? '').toString(),
      coursesTaken: (data['coursesTaken'] ?? '').toString(),
      experienceYears: (data['experienceYears'] ?? '').toString(),
      notes: (data['notes'] ?? '').toString(),
      cvUrl: (data['cvUrl'] ?? '').toString(),
      idUrl: (data['idUrl'] ?? '').toString(),
      status: (data['status'] ?? 'pending').toString(),
      requestedAt: _toDateTime(data['requestedAt']),
      updatedAt: _toDateTime(data['updatedAt']),
      resolvedAt: _toDateTime(data['resolvedAt']),
    );
  }
}

class InstructorRequestService {
  static CollectionReference<Map<String, dynamic>> get _collection =>
      FirebaseFirestore.instance.collection('instructor_requests');

  static DocumentReference<Map<String, dynamic>> _doc(String userId) =>
      _collection.doc(userId);

  static Stream<InstructorRequest?> streamForUser(String userId) {
    return _doc(userId).snapshots().map((snapshot) {
      if (!snapshot.exists) return null;
      return InstructorRequest.fromDoc(snapshot);
    });
  }

  static Stream<List<InstructorRequest>> streamForStatus(String status) {
    return _collection
        .where('status', isEqualTo: status)
        .orderBy('requestedAt', descending: true)
        .snapshots()
        .map(
          (snapshot) =>
              snapshot.docs.map(InstructorRequest.fromDoc).toList(),
        );
  }

  static Stream<List<InstructorRequest>> streamPending() {
    return streamForStatus('pending');
  }

  static Future<InstructorRequest?> getForUser(String userId) async {
    final DocumentSnapshot<Map<String, dynamic>> snapshot =
        await _doc(userId).get();
    if (!snapshot.exists) return null;
    return InstructorRequest.fromDoc(snapshot);
  }

  static Future<void> submitRequest({
    required User user,
    required String name,
    required String email,
    required String phone,
    required String category,
    String coursesTaken = '',
    String experienceYears = '',
    String notes = '',
  }) async {
    final DocumentReference<Map<String, dynamic>> doc =
        _doc(user.uid);
    final DocumentSnapshot<Map<String, dynamic>> snapshot =
        await doc.get();
    final Map<String, dynamic> existing = snapshot.data() ?? {};
    final String status =
        (existing['status'] ?? '').toString().toLowerCase();

    if (snapshot.exists && status == 'approved') {
      return;
    }

    final String cvUrl = (existing['cvUrl'] ?? '').toString();
    final String idUrl = (existing['idUrl'] ?? '').toString();

    final String displayName = name.trim();
    final String resolvedEmail = email.trim();
    final String resolvedPhone = phone.trim();
    final String resolvedCategory =
        category.trim().isEmpty ? 'General' : category.trim();
    final String resolvedCourses = coursesTaken.trim();
    final String resolvedExperience = experienceYears.trim();
    final String resolvedNotes = notes.trim();
    final Map<String, dynamic> payload = {
      'userId': user.uid,
      'name': displayName,
      'email': resolvedEmail,
      'phone': resolvedPhone,
      'category': resolvedCategory,
      'coursesTaken': resolvedCourses,
      'experienceYears': resolvedExperience,
      'notes': resolvedNotes,
      'cvUrl': cvUrl,
      'idUrl': idUrl,
      'status': 'pending',
      'updatedAt': FieldValue.serverTimestamp(),
    };

    if (!snapshot.exists || status == 'rejected') {
      payload['requestedAt'] = FieldValue.serverTimestamp();
    } else if (!snapshot.exists ||
        (existing['requestedAt'] ?? '').toString().trim().isEmpty) {
      payload['requestedAt'] = FieldValue.serverTimestamp();
    }

    await doc.set(payload, SetOptions(merge: true));
  }

  static Future<void> approve(InstructorRequest request) async {
    final String userId = request.userId.trim();
    if (userId.isEmpty) return;
    final String resolvedName =
        request.name.trim().isEmpty ? 'Mentor' : request.name.trim();
    final String resolvedCategory =
        request.category.trim().isEmpty ? 'General' : request.category.trim();

    final FirebaseFirestore firestore = FirebaseFirestore.instance;
    final DocumentReference<Map<String, dynamic>> mentorRef =
        firestore.collection('mentors').doc(userId);
    final DocumentSnapshot<Map<String, dynamic>> mentorSnap =
        await mentorRef.get();

    final Map<String, dynamic> mentorPayload = {
      'name': resolvedName,
      'category': resolvedCategory,
      'subtitle': '$resolvedCategory Mentor',
      'updatedAt': FieldValue.serverTimestamp(),
    };
    if (!mentorSnap.exists) {
      mentorPayload['createdAt'] = FieldValue.serverTimestamp();
      mentorPayload['courses'] = '0';
      mentorPayload['students'] = '0';
      mentorPayload['ratings'] = '0';
    }

    final WriteBatch batch = firestore.batch();
    batch.set(
      firestore.collection('users').doc(userId),
      {
        'role': 'instructor',
        'approved': true,
        'approvedAt': FieldValue.serverTimestamp(),
        'instructorWelcomeSeen': false,
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );
    batch.set(
      firestore.collection('instructor_requests').doc(userId),
      {
        'status': 'approved',
        'resolvedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );
    batch.set(mentorRef, mentorPayload, SetOptions(merge: true));
    await batch.commit();
  }

  static Future<void> reject(InstructorRequest request) async {
    final String userId = request.userId.trim();
    if (userId.isEmpty) return;
    await FirebaseFirestore.instance
        .collection('instructor_requests')
        .doc(userId)
        .set(
      {
        'status': 'rejected',
        'resolvedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );
  }

  static Future<void> revoke(InstructorRequest request) async {
    final String userId = request.userId.trim();
    if (userId.isEmpty) return;
    final FirebaseFirestore firestore = FirebaseFirestore.instance;
    final WriteBatch batch = firestore.batch();

    batch.set(
      firestore.collection('users').doc(userId),
      {
        'role': 'student',
        'approved': false,
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );

    batch.set(
      firestore.collection('instructor_requests').doc(userId),
      {
        'status': 'revoked',
        'resolvedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );

    batch.delete(firestore.collection('mentors').doc(userId));

    await batch.commit();
  }
}

DateTime? _toDateTime(Object? value) {
  if (value is Timestamp) return value.toDate();
  if (value is DateTime) return value;
  return null;
}
