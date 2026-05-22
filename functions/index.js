const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

const STATIC_ADMIN_DOMAINS = ["levelup.admin", "levelup.app"];
const STATIC_ADMIN_ALIASES = ["sa3doon", "fares", "mahmoud"];

function isStaticAdminEmail(email) {
  if (!email) return false;
  const normalized = email.toString().trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return false;
  const local = normalized.substring(0, at);
  const domain = normalized.substring(at + 1);
  if (!STATIC_ADMIN_DOMAINS.includes(domain)) return false;
  return STATIC_ADMIN_ALIASES.includes(local);
}

async function requireAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Sign in required.",
    );
  }

  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const role = (userDoc.get("role") || "").toString().toLowerCase();
  if (role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admins only.",
    );
  }
}

exports.grantAdminAccess = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Sign in required.",
    );
  }

  const key = ((data && data.key) || "").toString().trim();
  const expected = functions.config().admin?.key;
  if (!expected) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Admin key not configured.",
    );
  }

  if (!key || key !== expected) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Invalid admin key.",
    );
  }

  const uid = context.auth.uid;
  await db.collection("users").doc(uid).set(
    {
      role: "admin",
      approved: true,
      status: "active",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true},
  );

  return {ok: true};
});

exports.approveInstructorRequest = functions.https.onCall(
  async (data, context) => {
    await requireAdmin(context);
    const userId = ((data && data.userId) || "").toString().trim();
    if (!userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing userId.",
      );
    }

    const requestRef = db.collection("instructor_requests").doc(userId);
    const requestSnap = await requestRef.get();
    const requestName = (requestSnap.get("name") || "").toString();
    const requestCategory = (requestSnap.get("category") || "").toString();
    const resolvedName = requestName.trim() || "Mentor";
    const resolvedCategory = requestCategory.trim() || "General";

    const mentorRef = db.collection("mentors").doc(userId);
    const mentorSnap = await mentorRef.get();
    const mentorPayload = {
      name: resolvedName,
      category: resolvedCategory,
      subtitle: `${resolvedCategory} Mentor`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!mentorSnap.exists) {
      mentorPayload.createdAt = admin.firestore.FieldValue.serverTimestamp();
      mentorPayload.courses = "0";
      mentorPayload.students = "0";
      mentorPayload.ratings = "0";
    }

    const batch = db.batch();
    batch.set(
      db.collection("users").doc(userId),
      {
        role: "instructor",
        approved: true,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
    batch.set(requestRef, {
      status: "approved",
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    batch.set(mentorRef, mentorPayload, {merge: true});

    await batch.commit();
    return {ok: true};
  },
);

exports.rejectInstructorRequest = functions.https.onCall(
  async (data, context) => {
    await requireAdmin(context);
    const userId = ((data && data.userId) || "").toString().trim();
    if (!userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing userId.",
      );
    }

    await db.collection("instructor_requests").doc(userId).set(
      {
        status: "rejected",
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
    return {ok: true};
  },
);

exports.onAuthUserCreate = functions.auth.user().onCreate(async (user) => {
  const ref = db.collection("users").doc(user.uid);
  const snapshot = await ref.get();
  const data = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!snapshot.exists) {
    data.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }
  if (!snapshot.exists || !snapshot.get("role")) {
    data.role = "student";
  }
  if (!snapshot.exists || typeof snapshot.get("approved") === "undefined") {
    data.approved = false;
  }
  if (!snapshot.exists || !snapshot.get("status")) {
    data.status = "active";
  }
  if (user.email) {
    data.email = user.email;
  }
  data.emailVerified = user.emailVerified === true;
  if (user.displayName) {
    data.name = user.displayName;
  }
  if (user.email && isStaticAdminEmail(user.email)) {
    data.role = "admin";
    data.approved = true;
    data.status = "active";
  }

  await ref.set(data, {merge: true});
});
