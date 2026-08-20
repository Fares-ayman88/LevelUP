"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BookOpenCheck,
  CalendarCheck2,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Download,
  GraduationCap,
  Home,
  ImagePlus,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Moon,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trophy,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Button, EmptyState, GlassCard, IconButton, StatCard, StatusBadge } from "@/components/ui";
import { dictionary, Lang, Translation } from "@/i18n/dictionary";
import { studentCopy, StudentCopy } from "@/i18n/student";
import { Group, initialGroups, initialPaymentRecords, PaymentRecord, submissions as initialSubmissions, Teacher, teachers, waitingStudents, whatsappTemplate } from "@/mock/data";

type Role = "student" | "teacher" | "assistant" | "center";
type DemoAccount = { code: string; role: Role; name: string; initials: string };
type AttendanceState = "idle" | "active" | "confirmed" | "duplicate" | "expired" | "wrong" | "closed";
type MakeupState = "none" | "pending" | "confirmed" | "rejected";
type PaymentMethod = "Card" | "InstaPay" | "Vodafone Cash" | "Cash at Center";
type PaymentState = "paid" | "due" | "pending" | "failed";
type NavItem = readonly [string, string, React.ElementType];
type AttendanceMark = "unmarked" | "present" | "late" | "absent";
type AttendanceSummary = {
  checkedIn: number;
  present: number;
  late: number;
  absent: number;
  pending: number;
  total: number;
};
type RosterStudent = { id: string; groupId: string; name: string; note: string };
type PaymentFilter = "all" | PaymentRecord["status"];
type CommunicationKind = "Payment Reminder" | "Attendance Alert" | "Class Reminder" | "Announcement";
type MessageLog = { id: string; kind: CommunicationKind; recipients: string; createdAt: string };
type StudentFilters = { subject: string; city: string; availability: "all" | "available" };

const roleIcons = { student: GraduationCap, teacher: BookOpenCheck, assistant: ClipboardCheck, center: LayoutDashboard };
const DEMO_ACCESS_CODE_KEY = "levelup-demo-access-code";
const TEACHER_PROFILES_KEY = "levelup-demo-teacher-profiles-v1";
const TEACHER_PROFILES_UPDATED_EVENT = "levelup-teacher-profiles-updated";
const MAX_PROFILE_IMAGE_BYTES = 3 * 1024 * 1024;
const EMPTY_STUDENT_FILTERS: StudentFilters = { subject: "all", city: "all", availability: "all" };
const demoAccounts: DemoAccount[] = [
  { code: "ST-2048", role: "student", name: "Mohamed Ali", initials: "MA" },
  { code: "TC-031", role: "teacher", name: "Ahmed Mohamed", initials: "AM" },
  { code: "AS-014", role: "assistant", name: "Nour Hassan", initials: "NH" },
  { code: "CA-001", role: "center", name: "LevelUp Ismailia", initials: "LU" },
];
const paymentMethods: PaymentMethod[] = ["Card", "InstaPay", "Vodafone Cash", "Cash at Center"];
const communicationTemplates: Record<CommunicationKind, string> = {
  "Payment Reminder": "Hello, this is a reminder that {{student_name}} has {{amount}} due for {{subject}}. You can renew through LevelUp.",
  "Attendance Alert": "Hello, {{student_name}} was absent from {{subject}} today. Please contact the center if a make-up session is needed.",
  "Class Reminder": "Hello, {{student_name}} has {{subject}} class tomorrow. Please arrive a few minutes early.",
  "Announcement": "Hello, an important update from LevelUp: {{subject}} schedule information is available in the app.",
};
const QR_REFRESH_SECONDS = 45;

const attendanceRoster: RosterStudent[] = [
  { id: "mohamed-ali", groupId: "a", name: "Mohamed Ali", note: "Waiting for QR" },
  { id: "mariam-ahmed", groupId: "a", name: "Mariam Ahmed", note: "Checked in on arrival" },
  { id: "omar-hassan", groupId: "a", name: "Omar Hassan", note: "Arrived after start" },
  { id: "youssef-samir", groupId: "a", name: "Youssef Samir", note: "Parent called" },
  { id: "nour-khaled", groupId: "a", name: "Nour Khaled", note: "Checked in on arrival" },
  { id: "ahmed-ali", groupId: "a", name: "Ahmed Ali", note: "Checked in on arrival" },
  { id: "salma-adel", groupId: "b", name: "Salma Adel", note: "Waiting for QR" },
  { id: "hany-mostafa", groupId: "b", name: "Hany Mostafa", note: "Checked in on arrival" },
  { id: "jana-ashraf", groupId: "b", name: "Jana Ashraf", note: "Arrived after start" },
  { id: "adam-tarek", groupId: "b", name: "Adam Tarek", note: "Waiting for QR" },
  { id: "farah-wael", groupId: "b", name: "Farah Wael", note: "Parent called" },
  { id: "ziad-nabil", groupId: "c", name: "Ziad Nabil", note: "Checked in on arrival" },
  { id: "reem-ahmed", groupId: "c", name: "Reem Ahmed", note: "Waiting for QR" },
  { id: "sara-adel", groupId: "c", name: "Sara Adel", note: "Arrived after start" },
  { id: "mazen-khaled", groupId: "c", name: "Mazen Khaled", note: "Checked in on arrival" },
  { id: "laila-samir", groupId: "c", name: "Laila Samir", note: "Parent called" },
];

const initialAttendanceMarks: Record<string, AttendanceMark> = {
  "mohamed-ali": "unmarked",
  "mariam-ahmed": "present",
  "omar-hassan": "late",
  "youssef-samir": "absent",
  "nour-khaled": "present",
  "ahmed-ali": "present",
  "salma-adel": "unmarked",
  "hany-mostafa": "present",
  "jana-ashraf": "late",
  "adam-tarek": "unmarked",
  "farah-wael": "absent",
  "ziad-nabil": "present",
  "reem-ahmed": "unmarked",
  "sara-adel": "late",
  "mazen-khaled": "present",
  "laila-samir": "absent",
};

const students = [
  { name: "Mohamed Ali", attendance: 92, homework: 84, exams: 88 },
  { name: "Mariam Ahmed", attendance: 96, homework: 94, exams: 91 },
  { name: "Omar Hassan", attendance: 86, homework: 72, exams: 80 },
  { name: "Youssef Samir", attendance: 89, homework: 78, exams: 76 },
  { name: "Nour Khaled", attendance: 98, homework: 90, exams: 93 },
];

function money(value: number) {
  return `${value.toLocaleString("en-US")} EGP`;
}

function seatsRemaining(group: Group) {
  return Math.max(0, group.capacity - group.students);
}

function occupancy(group: Group) {
  return Math.round((group.students / group.capacity) * 100);
}

function paymentTotals(records: PaymentRecord[]) {
  return records.reduce((totals, record) => {
    totals.expected += record.amount;
    if (record.status === "paid") totals.collected += record.amount;
    if (record.status === "due") totals.due += record.amount;
    if (record.status === "overdue") totals.overdue += record.amount;
    return totals;
  }, { expected: 0, collected: 0, due: 0, overdue: 0 });
}

function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

const PREFERENCES_UPDATED_EVENT = "levelup-preferences-updated";

function subscribeToPreferences(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PREFERENCES_UPDATED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PREFERENCES_UPDATED_EVENT, onChange);
  };
}

function readLanguagePreference(): Lang {
  return window.localStorage.getItem("levelup-lang") === "ar" ? "ar" : "en";
}

function getServerLanguagePreference(): Lang {
  return "en";
}

function readThemePreference(): "light" | "dark" {
  const savedTheme = window.localStorage.getItem("levelup-theme-v2") ?? window.localStorage.getItem("levelup-theme");
  return savedTheme === "light" ? "light" : "dark";
}

function getServerThemePreference(): "light" | "dark" {
  return "dark";
}

function readAccessPreference() {
  return window.localStorage.getItem(DEMO_ACCESS_CODE_KEY) ?? "";
}

function getServerAccessPreference() {
  return "";
}

let teacherProfilesSnapshot: Teacher[] = teachers;

function sameTeacherProfiles(left: Teacher[], right: Teacher[]) {
  return left.length === right.length && left.every((teacher, index) => teacher.id === right[index]?.id && teacher.avatarUrl === right[index]?.avatarUrl);
}

function readTeacherProfilesPreference(): Teacher[] {
  try {
    const savedProfiles = window.localStorage.getItem(TEACHER_PROFILES_KEY);
    if (!savedProfiles) return teacherProfilesSnapshot;

    const parsedProfiles = JSON.parse(savedProfiles) as Array<{ id?: unknown; avatarUrl?: unknown }>;
    if (!Array.isArray(parsedProfiles)) return teacherProfilesSnapshot;

    const nextProfiles = teachers.map((teacher) => {
      const savedAvatar = parsedProfiles.find((profile) => profile?.id === teacher.id)?.avatarUrl;
      return typeof savedAvatar === "string" ? { ...teacher, avatarUrl: savedAvatar } : teacher;
    });

    if (!sameTeacherProfiles(nextProfiles, teacherProfilesSnapshot)) teacherProfilesSnapshot = nextProfiles;
    return teacherProfilesSnapshot;
  } catch {
    window.localStorage.removeItem(TEACHER_PROFILES_KEY);
    return teacherProfilesSnapshot;
  }
}

function getServerTeacherProfilesPreference(): Teacher[] {
  return teachers;
}

function subscribeToTeacherProfiles(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(TEACHER_PROFILES_UPDATED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TEACHER_PROFILES_UPDATED_EVENT, onChange);
  };
}

function persistTeacherProfiles(profiles: Teacher[]) {
  teacherProfilesSnapshot = profiles;
  try {
    window.localStorage.setItem(
      TEACHER_PROFILES_KEY,
      JSON.stringify(profiles.map(({ id, avatarUrl }) => ({ id, avatarUrl }))),
    );
  } catch {
    // The upload still works for the current session if browser storage is unavailable.
  }
  window.dispatchEvent(new Event(TEACHER_PROFILES_UPDATED_EVENT));
}

function notifyPreferenceSubscribers() {
  window.dispatchEvent(new Event(PREFERENCES_UPDATED_EVENT));
}

function score(student = students[0]) {
  return Math.round(student.attendance * 0.3 + student.homework * 0.3 + student.exams * 0.4);
}

function teacherInitials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2);
}

export default function App() {
  const lang = useSyncExternalStore(subscribeToPreferences, readLanguagePreference, getServerLanguagePreference);
  const theme = useSyncExternalStore(subscribeToPreferences, readThemePreference, getServerThemePreference);
  const accessCode = useSyncExternalStore(subscribeToPreferences, readAccessPreference, getServerAccessPreference);
  const activeAccount = demoAccounts.find((account) => account.code === accessCode) ?? null;
  const role = activeAccount?.role ?? "student";
  const [studentTab, setStudentTab] = useState("explore");
  const [teacherTab, setTeacherTab] = useState("dashboard");
  const [assistantTab, setAssistantTab] = useState("dashboard");
  const [centerTab, setCenterTab] = useState("dashboard");
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const teacherProfiles = useSyncExternalStore(subscribeToTeacherProfiles, readTeacherProfilesPreference, getServerTeacherProfilesPreference);
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0].id);
  const [studentFilters, setStudentFilters] = useState<StudentFilters>(EMPTY_STUDENT_FILTERS);
  const [teacherProfileOpen, setTeacherProfileOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(initialGroups[0]);
  const [booking, setBooking] = useState<"none" | "review" | "success">("none");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("InstaPay");
  const [payment, setPayment] = useState<PaymentState>("due");
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(initialPaymentRecords);
  const [subscription, setSubscription] = useState<"active" | "cancelled">("active");
  const [enrolledGroupIds, setEnrolledGroupIds] = useState<string[]>(["a", "f"]);
  const [activeGroupId, setActiveGroupId] = useState("a");
  const [waitlistPositions, setWaitlistPositions] = useState<Record<string, number>>({});
  const [attendance, setAttendance] = useState<AttendanceState>("idle");
  const [sessionActive, setSessionActive] = useState(false);
  const [attendanceStarted, setAttendanceStarted] = useState(false);
  const [attendanceGroupId, setAttendanceGroupId] = useState("a");
  const [operationsGroupId, setOperationsGroupId] = useState("a");
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, AttendanceMark>>(initialAttendanceMarks);
  const [qrTick, setQrTick] = useState(QR_REFRESH_SECONDS);
  const [qrVersion, setQrVersion] = useState(1);
  const [makeup, setMakeup] = useState<MakeupState>("none");
  const [makeupGroupId, setMakeupGroupId] = useState("");
  const [makeupSourceGroupId, setMakeupSourceGroupId] = useState("");
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [template, setTemplate] = useState(whatsappTemplate);
  const [communicationKind, setCommunicationKind] = useState<CommunicationKind>("Payment Reminder");
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [waitlistInvitesSent, setWaitlistInvitesSent] = useState<Record<string, boolean>>({});
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  useEffect(() => {
    if (!sessionActive) return;

    const timeout = window.setTimeout(() => {
      if (qrTick <= 1) {
        setQrTick(QR_REFRESH_SECONDS);
        setQrVersion((version) => version + 1);
        return;
      }
      setQrTick(qrTick - 1);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [qrTick, sessionActive]);

  const t = dictionary[lang];
  const studentT = studentCopy[lang];
  const rtl = lang === "ar";
  const enrolledGroups = groups.filter((group) => enrolledGroupIds.includes(group.id));
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? enrolledGroups[0] ?? initialGroups[0];
  const teacherGroups = groups.filter((group) => group.teacherId === "ahmed");
  const operationGroup = teacherGroups.find((group) => group.id === operationsGroupId) ?? teacherGroups[0] ?? initialGroups[0];
  const attendanceGroup = teacherGroups.find((group) => group.id === attendanceGroupId) ?? operationGroup;
  const attendanceGroupRoster = attendanceRoster.filter((student) => student.groupId === attendanceGroup.id);
  const teacherStudentTotal = teacherGroups.reduce((sum, group) => sum + group.students, 0);
  const teacherAvailableSeats = teacherGroups.reduce((sum, group) => sum + seatsRemaining(group), 0);
  const teacherWaitingTotal = teacherGroups.reduce((sum, group) => sum + group.waiting, 0);
  const waitingTotal = groups.reduce((sum, group) => sum + group.waiting, 0);
  const progress = score();
  const rank = [...students].sort((a, b) => score(b) - score(a)).findIndex((student) => student.name === "Mohamed Ali") + 1;
  const attendanceSummary = useMemo<AttendanceSummary>(() => {
    if (!attendanceStarted) {
      return { checkedIn: 0, present: 0, late: 0, absent: 0, pending: attendanceGroup.students, total: attendanceGroup.students };
    }

    const marked = attendanceGroupRoster.map((student) => attendanceMarks[student.id] ?? "unmarked");
    const baseCheckIns = Math.max(0, attendanceGroup.students - attendanceGroupRoster.length);
    const present = baseCheckIns + marked.filter((mark) => mark === "present").length;
    const late = marked.filter((mark) => mark === "late").length;
    const unmarked = marked.filter((mark) => mark === "unmarked").length;
    const markedAbsent = marked.filter((mark) => mark === "absent").length;
    const pending = sessionActive ? unmarked : 0;
    const absent = markedAbsent + (sessionActive ? 0 : unmarked);

    return {
      checkedIn: present + late,
      present,
      late,
      absent,
      pending,
      total: attendanceGroup.students,
    };
  }, [attendanceGroup, attendanceGroupRoster, attendanceMarks, attendanceStarted, sessionActive]);
  const makeupSourceGroup = groups.find((group) => group.id === makeupSourceGroupId) ?? activeGroup;
  const makeupTargetGroup = groups.find((group) => group.id === makeupGroupId);
  const activeTeacherProfile = teacherProfiles.find((teacher) => teacher.id === "ahmed") ?? teacherProfiles[0];

  const studentNav = useMemo<NavItem[]>(() => [
    ["explore", t.explore, Search],
    ["classes", t.classes, CalendarCheck2],
    ["progress", t.progress, Trophy],
    ["attendance", t.attendance, QrCode],
    ["payments", t.payments, WalletCards],
  ], [t]);

  const teacherNav = useMemo<NavItem[]>(() => [
    ["dashboard", t.dashboard, LayoutDashboard],
    ["groups", t.groups, Users],
    ["attendance", t.attendance, QrCode],
    ["assignments", t.assignments, ClipboardCheck],
    ["makeup", t.makeup, CalendarCheck2],
    ["payments", t.payments, CircleDollarSign],
    ["communications", t.communications, MessageCircle],
    ["reports", t.reports, ListChecks],
  ], [t]);

  const assistantNav = useMemo<NavItem[]>(() => [
    ["dashboard", t.dashboard, Home],
    ["attendance", t.attendance, QrCode],
    ["assignments", t.assignments, ClipboardCheck],
    ["makeup", t.makeup, CalendarCheck2],
  ], [t]);

  const centerNav = useMemo<NavItem[]>(() => [
    ["dashboard", t.dashboard, LayoutDashboard],
    ["teachers", t.teacher, GraduationCap],
    ["groups", t.groups, Users],
    ["payments", t.payments, CircleDollarSign],
    ["communications", t.communications, MessageCircle],
    ["reports", t.reports, ListChecks],
    ["settings", t.settings, Settings],
  ], [t]);

  const nav = role === "student" ? studentNav : role === "teacher" ? teacherNav : role === "assistant" ? assistantNav : centerNav;
  const activeTab = role === "student" ? studentTab : role === "teacher" ? teacherTab : role === "assistant" ? assistantTab : centerTab;
  const setActiveTab = (id: string) =>
    role === "student" ? setStudentTab(id)
      : role === "teacher" ? setTeacherTab(id)
        : role === "assistant" ? setAssistantTab(id)
          : setCenterTab(id);
  const Arrow = rtl ? ChevronLeft : ChevronRight;

  const setLang = (nextLang: Lang) => {
    window.localStorage.setItem("levelup-lang", nextLang);
    notifyPreferenceSubscribers();
  };

  const setTheme = (nextTheme: "light" | "dark") => {
    window.localStorage.setItem("levelup-theme-v2", nextTheme);
    window.localStorage.setItem("levelup-theme", nextTheme);
    notifyPreferenceSubscribers();
  };

  const signIn = (code: string) => {
    const account = demoAccounts.find((item) => item.code === code.trim().toUpperCase());
    if (!account) return false;
    window.localStorage.setItem(DEMO_ACCESS_CODE_KEY, account.code);
    notifyPreferenceSubscribers();
    return true;
  };

  const signOut = () => {
    window.localStorage.removeItem(DEMO_ACCESS_CODE_KEY);
    setGlobalSearchOpen(false);
    notifyPreferenceSubscribers();
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [lang, rtl]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (event.key === "Escape") setGlobalSearchOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function notify(message: string) {
    setNotifications((items) => [message, ...items].slice(0, 9));
  }

  function updateTeacherPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      notify("Choose an image file for the profile photo.");
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      notify("Choose a profile photo under 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const avatarUrl = reader.result;
      if (typeof avatarUrl !== "string") return;
      persistTeacherProfiles(teacherProfiles.map((teacher) => teacher.id === "ahmed" ? { ...teacher, avatarUrl } : teacher));
      notify("Profile photo updated. Students can now see it with your groups.");
    });
    reader.readAsDataURL(file);
  }

  function removeTeacherPhoto() {
    persistTeacherProfiles(teacherProfiles.map((teacher) => teacher.id === "ahmed" ? { ...teacher, avatarUrl: undefined } : teacher));
    notify("Profile photo removed.");
  }

  function startBooking(group: Group) {
    setSelectedGroup(group);
    setBooking("review");
  }

  function confirmBooking() {
    const target = selectedGroup;
    if (!target) return;
    const isAlreadyEnrolled = enrolledGroupIds.includes(target.id);
    if (!isAlreadyEnrolled) {
      setGroups((items) => items.map((group) => group.id === target.id ? { ...group, students: Math.min(group.capacity, group.students + 1) } : group));
      setEnrolledGroupIds((items) => [...items, target.id]);
    }
    setActiveGroupId(target.id);
    setPayment("paid");
    setSubscription("active");
    setBooking("success");
    notify(interpolate(t.bookingConfirmed, { group: target.name }));
  }

  function joinWaitingList(group: Group) {
    const existingPosition = waitlistPositions[group.id];
    if (existingPosition) {
      notify(interpolate(t.waitingListJoined, { group: group.name, position: existingPosition }));
      return;
    }
    const position = group.waiting + 1;
    setGroups((items) => items.map((item) => item.id === group.id ? { ...item, waiting: item.waiting + 1 } : item));
    setWaitlistPositions((items) => ({ ...items, [group.id]: position }));
    notify(interpolate(t.waitingListJoined, { group: group.name, position }));
  }

  function renewSubscription() {
    setPayment("paid");
    setPaymentRecords((items) => items.map((record) => record.id === "invoice-mohamed" ? { ...record, status: "paid", dueLabel: "Paid just now" } : record));
    notify(t.subscriptionRenewed);
  }

  function queueCommunication(kind: CommunicationKind, recipients: string) {
    setMessageLogs((items) => [{ id: `${kind}-${Date.now()}`, kind, recipients, createdAt: "Just now" }, ...items].slice(0, 6));
    notify(`${kind} queued for ${recipients}.`);
  }

  function selectCommunicationKind(kind: CommunicationKind) {
    setCommunicationKind(kind);
    setTemplate(communicationTemplates[kind]);
  }

  function sendCommunication(recipients: string) {
    queueCommunication(communicationKind, recipients);
  }

  function sendPaymentReminder(recordId: string) {
    const record = paymentRecords.find((item) => item.id === recordId);
    if (!record || record.status === "paid") return;
    setPaymentRecords((items) => items.map((item) => item.id === recordId ? { ...item, reminderSent: true } : item));
    queueCommunication("Payment Reminder", `${record.student}'s family`);
  }

  function markPaymentPaid(recordId: string) {
    const record = paymentRecords.find((item) => item.id === recordId);
    if (!record || record.status === "paid") return;
    setPaymentRecords((items) => items.map((item) => item.id === recordId ? { ...item, status: "paid", dueLabel: "Paid just now" } : item));
    notify(`${record.student}'s payment marked paid.`);
  }

  function leaveGroup() {
    if (!enrolledGroupIds.includes(activeGroup.id)) return;
    const remainingGroupIds = enrolledGroupIds.filter((groupId) => groupId !== activeGroup.id);
    setEnrolledGroupIds(remainingGroupIds);
    setActiveGroupId(remainingGroupIds[0] ?? "");
    setSubscription(remainingGroupIds.length > 0 ? "active" : "cancelled");
    setGroups((items) => items.map((group) => group.id === activeGroup.id ? { ...group, students: Math.max(0, group.students - 1) } : group));
    notify(t.seatReleased);
  }

  function selectOperationsGroup(groupId: string) {
    if (sessionActive) return;
    setOperationsGroupId(groupId);
    setAttendanceGroupId(groupId);
    setAttendanceStarted(false);
    setAttendance("idle");
  }

  function startAttendance(groupId = operationGroup.id) {
    const group = teacherGroups.find((item) => item.id === groupId);
    if (!group) return;
    setOperationsGroupId(group.id);
    setAttendanceGroupId(group.id);
    setAttendanceMarks((current) => {
      const next = { ...current };
      attendanceRoster.filter((student) => student.groupId === group.id).forEach((student) => {
        next[student.id] = initialAttendanceMarks[student.id] ?? "unmarked";
      });
      return next;
    });
    setAttendanceStarted(true);
    setSessionActive(true);
    setAttendance("active");
    setQrTick(QR_REFRESH_SECONDS);
    setQrVersion((version) => version + 1);
    notify(`${group.subject} · ${group.name}: attendance session started.`);
  }

  function refreshQr() {
    if (!sessionActive) return;
    setQrTick(QR_REFRESH_SECONDS);
    setQrVersion((version) => version + 1);
    notify("A fresh attendance QR is ready to scan.");
  }

  function scanQr(state: AttendanceState = "confirmed") {
    if (!sessionActive) {
      setAttendance("closed");
      return;
    }
    if (activeGroup.id !== attendanceGroup.id) {
      setAttendance("wrong");
      return;
    }
    if (state !== "confirmed") {
      setAttendance(state);
      return;
    }
    const studentId = "mohamed-ali";
    if (attendanceMarks[studentId] !== "unmarked") {
      setAttendance("duplicate");
      return;
    }
    setAttendanceMarks((items) => ({ ...items, [studentId]: "present" }));
    setAttendance("confirmed");
    notify(t.attendanceProgressUpdated);
  }

  function endAttendance() {
    if (!attendanceStarted) return;
    setSessionActive(false);
    setAttendance("closed");
    notify(t.attendanceClosed);
  }

  function markAttendance(studentId: string, mark: AttendanceMark) {
    if (!sessionActive) return;
    const student = attendanceRoster.find((item) => item.id === studentId);
    setAttendanceMarks((items) => ({ ...items, [studentId]: mark }));
    if (student) notify(`${student.name} marked ${mark}.`);
  }

  function requestMakeup(group: Group) {
    setMakeup("pending");
    setMakeupGroupId(group.id);
    setMakeupSourceGroupId(activeGroup.id);
    notify(t.makeupRequested);
  }

  function approveMakeup() {
    if (makeup !== "pending") return;
    setMakeup("confirmed");
    notify(t.makeupApproved);
  }

  function rejectMakeup() {
    if (makeup !== "pending") return;
    setMakeup("rejected");
    notify("Make-up request declined. The student can choose another session.");
  }

  function sendWaitingListInvites(group: Group) {
    setWaitlistInvitesSent((items) => ({ ...items, [group.id]: true }));
    notify(`${group.name}: waiting-list invitations are ready to send.`);
  }

  function createGroupFromWaitingList(sourceGroup?: Group) {
    const source = sourceGroup ?? [...groups].sort((left, right) => right.waiting - left.waiting)[0];
    if (!source) return;
    const relatedGroups = groups.filter((group) => group.teacherId === source.teacherId && group.subject === source.subject && group.grade === source.grade);
    const name = `Group ${String.fromCharCode(65 + relatedGroups.length)}`;
    const newGroup = {
      ...source,
      id: `${source.teacherId}-demand-${relatedGroups.length + 1}`,
      name,
      room: `Room ${relatedGroups.length + 2}`,
      capacity: Math.max(30, source.capacity - 5),
      students: 0,
      waiting: 0,
    };
    setGroups((items) => [
      ...items,
      newGroup,
    ]);
    notify(`${source.subject} ${name} is open. Invitations can now be prepared.`);
  }

  if (!activeAccount) {
    return <AccessScreen t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} onSignIn={signIn} />;
  }

  return (
    <main dir={rtl ? "rtl" : "ltr"} className={`app-shell min-h-screen overflow-x-hidden text-slate-950 transition-colors duration-300 ${rtl ? "font-arabic" : ""}`}>
      <div className="ambient-bg" />
      <div className="app-frame relative mx-auto grid min-h-screen w-full max-w-[1440px] gap-5 px-4 py-4 pb-28 sm:px-6 sm:py-6 lg:grid-cols-[84px_minmax(0,1fr)] lg:gap-7 lg:px-8 lg:py-7">
        <DesktopRail nav={nav} active={activeTab} onSelect={setActiveTab} role={role} t={t} />
        <section className="app-workspace min-w-0">
          <TopBar t={t} lang={lang} setLang={setLang} account={activeAccount} theme={theme} setTheme={setTheme} notifications={notifications} teacherProfile={role === "teacher" ? activeTeacherProfile : undefined} teachers={teacherProfiles} studentFilters={studentFilters} onStudentFiltersChange={setStudentFilters} onOpenSearch={() => setGlobalSearchOpen(true)} onOpenTeacherProfile={() => setTeacherProfileOpen(true)} onSignOut={signOut} />
          <GlobalSearch key={`${globalSearchOpen}-${lang}`} open={globalSearchOpen} lang={lang} role={role} nav={nav} groups={groups} teachers={teacherProfiles} onClose={() => setGlobalSearchOpen(false)} onNavigate={setActiveTab} onSelectTeacher={(teacherId) => { setSelectedTeacherId(teacherId); setStudentFilters(EMPTY_STUDENT_FILTERS); }} />
          {role === "teacher" && activeTeacherProfile && <TeacherProfileDialog open={teacherProfileOpen} teacher={activeTeacherProfile} lang={lang} onClose={() => setTeacherProfileOpen(false)} onUpload={updateTeacherPhoto} onRemove={removeTeacherPhoto} />}
          <AnimatePresence mode="wait">
            <MotionPage key={`${role}-${activeTab}-${booking}`}>
              {role === "student" && (
                <StudentView
                  tab={studentTab}
                  t={t}
                  copy={studentT}
                  groups={groups}
                  teachers={teacherProfiles}
                  selectedTeacherId={selectedTeacherId}
                  setSelectedTeacherId={setSelectedTeacherId}
                  studentFilters={studentFilters}
                  setStudentFilters={setStudentFilters}
                  enrolledGroupIds={enrolledGroupIds}
                  activeGroup={activeGroup}
                  activeGroupId={activeGroupId}
                  setActiveGroupId={setActiveGroupId}
                  waitlistPositions={waitlistPositions}
                  booking={booking}
                  selectedGroup={selectedGroup ?? activeGroup}
                  payment={payment}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  startBooking={startBooking}
                  confirmBooking={confirmBooking}
                  setBooking={setBooking}
                  joinWaitingList={joinWaitingList}
                  attendance={attendance}
                  scanQr={scanQr}
                  sessionActive={sessionActive}
                  qrTick={qrTick}
                  qrVersion={qrVersion}
                  makeup={makeup}
                  makeupGroupId={makeupGroupId}
                  setMakeupGroupId={setMakeupGroupId}
                  requestMakeup={requestMakeup}
                  subscription={subscription}
                  renewSubscription={renewSubscription}
                  leaveGroup={leaveGroup}
                  notifications={notifications}
                  progress={progress}
                  rank={rank}
                  Arrow={Arrow}
                  onBrowseGroups={() => setStudentTab("explore")}
                />
              )}
              {role === "teacher" && (
                <TeacherView
                  tab={teacherTab}
                  t={t}
                  groups={teacherGroups}
                  operationGroup={operationGroup}
                  onSelectGroup={selectOperationsGroup}
                  waitingTotal={teacherWaitingTotal}
                  availableSeats={teacherAvailableSeats}
                  studentTotal={teacherStudentTotal}
                  payment={payment}
                  submissions={submissions}
                  setSubmissions={setSubmissions}
                  sessionActive={sessionActive}
                  attendanceStarted={attendanceStarted}
                  attendance={attendance}
                  qrTick={qrTick}
                  qrVersion={qrVersion}
                  attendanceGroup={attendanceGroup}
                  attendanceSummary={attendanceSummary}
                  attendanceRoster={attendanceGroupRoster}
                  attendanceMarks={attendanceMarks}
                  startAttendance={startAttendance}
                  refreshQr={refreshQr}
                  endAttendance={endAttendance}
                  markAttendance={markAttendance}
                  makeup={makeup}
                  makeupSourceGroup={makeupSourceGroup}
                  makeupTargetGroup={makeupTargetGroup}
                  approveMakeup={approveMakeup}
                  rejectMakeup={rejectMakeup}
                  createGroupFromWaitingList={createGroupFromWaitingList}
                  waitlistInvitesSent={waitlistInvitesSent}
                  sendWaitingListInvites={sendWaitingListInvites}
                  template={template}
                  setTemplate={setTemplate}
                  onNavigate={setTeacherTab}
                />
              )}
              {role === "assistant" && (
                <AssistantView
                  tab={assistantTab}
                  t={t}
                  groups={teacherGroups}
                  operationGroup={operationGroup}
                  onSelectGroup={selectOperationsGroup}
                  submissions={submissions}
                  setSubmissions={setSubmissions}
                  sessionActive={sessionActive}
                  attendanceStarted={attendanceStarted}
                  attendance={attendance}
                  qrTick={qrTick}
                  qrVersion={qrVersion}
                  attendanceGroup={attendanceGroup}
                  attendanceSummary={attendanceSummary}
                  attendanceRoster={attendanceGroupRoster}
                  attendanceMarks={attendanceMarks}
                  startAttendance={startAttendance}
                  refreshQr={refreshQr}
                  endAttendance={endAttendance}
                  markAttendance={markAttendance}
                  makeup={makeup}
                  makeupSourceGroup={makeupSourceGroup}
                  makeupTargetGroup={makeupTargetGroup}
                  approveMakeup={approveMakeup}
                  rejectMakeup={rejectMakeup}
                  onNavigate={setAssistantTab}
                />
              )}
              {role === "center" && (
                <CenterView
                  tab={centerTab}
                  t={t}
                  groups={groups}
                  waitingTotal={waitingTotal}
                  paymentRecords={paymentRecords}
                  onSendPaymentReminder={sendPaymentReminder}
                  onMarkPaymentPaid={markPaymentPaid}
                  template={template}
                  setTemplate={setTemplate}
                  communicationKind={communicationKind}
                  onSelectCommunicationKind={selectCommunicationKind}
                  messageLogs={messageLogs}
                  onSendCommunication={sendCommunication}
                  createGroupFromWaitingList={createGroupFromWaitingList}
                  onNavigate={setCenterTab}
                />
              )}
            </MotionPage>
          </AnimatePresence>
        </section>
      </div>
      <MobileNav items={nav} active={activeTab} onSelect={setActiveTab} moreLabel={t.more} />
    </main>
  );
}

function AccessScreen({ t, lang, setLang, theme, setTheme, onSignIn }: { t: Translation; lang: Lang; setLang: (lang: Lang) => void; theme: "light" | "dark"; setTheme: (theme: "light" | "dark") => void; onSignIn: (code: string) => boolean }) {
  const [code, setCode] = useState("");
  const [invalidCode, setInvalidCode] = useState(false);
  const copy = lang === "ar"
    ? { eyebrow: "مساحتك الدراسية", title: "أهلا بك مجددا.", subtitle: "أدخل كود الدخول للمتابعة.", code: "كود الدخول", placeholder: "مثال: ST-2048", continue: "متابعة", demo: "حسابات تجريبية", invalid: "اكتب كود دخول صحيح.", language: "English", theme: "تبديل المظهر" }
    : { eyebrow: "Your study space", title: "Welcome back.", subtitle: "Enter your access code to continue.", code: "Access code", placeholder: "For example: ST-2048", continue: "Continue", demo: "Demo accounts", invalid: "Enter a valid access code.", language: "العربية", theme: "Toggle theme" };

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvalidCode(!onSignIn(code));
  }

  function selectDemoAccount(account: DemoAccount) {
    setCode(account.code);
    setInvalidCode(false);
    onSignIn(account.code);
  }

  const backgroundImage = theme === "dark" ? "/images/levelup-login-desk-v1.png" : "/images/levelup-login-desk-light-v1.png";

  return (
    <main dir={lang === "ar" ? "rtl" : "ltr"} className={`access-shell min-h-screen ${lang === "ar" ? "font-arabic" : ""}`}>
      <motion.div initial={{ opacity: 0, scale: 1.025 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="access-background-media" aria-hidden="true">
        <Image src={backgroundImage} alt="" fill priority sizes="100vw" />
      </motion.div>
      <div className="access-background-scrim" aria-hidden="true" />
      <div className="access-grid" aria-hidden="true" />
      <div className="access-layout relative mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-5 py-5 sm:px-8 sm:py-8">
        <header className="access-header">
          <div className="access-brand"><span className="access-mark"><GraduationCap size={20} aria-hidden="true" /></span><span>LevelUp</span></div>
          <div className="flex items-center gap-2"><button type="button" className="access-language" onClick={() => setLang(lang === "en" ? "ar" : "en")}>{copy.language}</button><IconButton label={copy.theme} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</IconButton></div>
        </header>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className="access-immersive-layout my-auto w-full">
          <div className="access-copy-column">
            <section aria-labelledby="access-title" className="access-panel">
              <div className="access-panel-intro">
                <p className="access-eyebrow">{copy.eyebrow}</p>
                <h1 id="access-title">{copy.title}</h1>
                <p className="access-subtitle">{copy.subtitle}</p>
              </div>
              <form className="access-form" onSubmit={submit}>
                <label htmlFor="access-code">{copy.code}</label>
                <input id="access-code" value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); setInvalidCode(false); }} placeholder={copy.placeholder} autoComplete="one-time-code" aria-invalid={invalidCode} />
                {invalidCode && <p role="alert" className="access-error">{copy.invalid}</p>}
                <Button type="submit" className="w-full"><ShieldCheck size={18} /> {copy.continue}</Button>
              </form>
              <div className="access-demo-list">
                <p>{copy.demo}</p>
                <div>
                  {demoAccounts.map((account) => {
                    const Icon = roleIcons[account.role];
                    return <button key={account.code} type="button" onClick={() => selectDemoAccount(account)}><span className="access-demo-icon"><Icon size={17} aria-hidden="true" /></span><span><b>{account.name}</b><small>{t[account.role]} · {account.code}</small></span><ChevronRight size={17} aria-hidden="true" /></button>;
                  })}
                </div>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function GlobalSearch({ open, lang, role, nav, groups, teachers: teacherProfiles, onClose, onNavigate, onSelectTeacher }: { open: boolean; lang: Lang; role: Role; nav: NavItem[]; groups: Group[]; teachers: Teacher[]; onClose: () => void; onNavigate: (tab: string) => void; onSelectTeacher: (teacherId: string) => void }) {
  const [query, setQuery] = useState("");
  const copy = lang === "ar"
    ? { search: role === "student" ? "ابحث عن مدرس أو مادة أو مدينة أو مجموعة" : "ابحث في مساحة العمل", openWorkspace: "فتح مساحة العمل", close: "إغلاق البحث", noResults: "لا توجد نتائج مطابقة." }
    : { search: role === "student" ? "Search teachers, subjects, cities, or groups" : "Search your workspace", openWorkspace: "Open workspace", close: "Close search", noResults: "No results found." };
  const groupTab = role === "student" ? "explore" : role === "assistant" ? "attendance" : "groups";
  const visibleGroups = role === "teacher" || role === "assistant" ? groups.filter((group) => group.teacherId === "ahmed") : groups;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = [
    ...nav.map(([id, label, Icon]) => ({ id: `nav-${id}`, label, detail: copy.openWorkspace, icon: Icon, tab: id, teacherId: undefined })),
    ...(role === "student" ? teacherProfiles.map((teacher) => ({ id: `teacher-${teacher.id}`, label: teacher.name, detail: `${teacher.subject} · ${teacher.grade} · ${teacher.location}`, icon: GraduationCap, tab: "explore", teacherId: teacher.id })) : []),
    ...visibleGroups.map((group) => ({ id: `group-${group.id}`, label: `${group.subject} · ${group.name}`, detail: `${group.center} · ${group.days} · ${group.time}`, icon: Users, tab: groupTab, teacherId: undefined })),
  ].filter((item) => !normalizedQuery || `${item.label} ${item.detail}`.toLocaleLowerCase().includes(normalizedQuery));

  function closeSearch() {
    setQuery("");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="global-search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSearch(); }}>
        <motion.section initial={{ opacity: 0, y: 8, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.99 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }} role="dialog" aria-modal="true" aria-label={copy.search} className="global-search-dialog">
          <div className="global-search-input"><Search size={20} aria-hidden="true" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} /><kbd>Esc</kbd><IconButton label={copy.close} onClick={closeSearch}><X size={18} /></IconButton></div>
          <div className="global-search-results">
            {!results.length ? <p className="global-search-empty">{copy.noResults}</p> : results.slice(0, 7).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => { if (item.teacherId) onSelectTeacher(item.teacherId); onNavigate(item.tab); closeSearch(); }}><span><Icon size={18} aria-hidden="true" /></span><span><b>{item.label}</b><small>{item.detail}</small></span><ChevronRight size={18} aria-hidden="true" /></button>; })}
          </div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  );
}

function MotionPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="pt-4"
    >
      {children}
    </motion.div>
  );
}

function TeacherAvatar({ teacher, size = "md", alt = "" }: { teacher: Teacher; size?: "sm" | "md" | "lg" | "xl"; alt?: string }) {
  return (
    <span className={`teacher-profile-avatar teacher-profile-avatar-${size}`}>
      {teacher.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={teacher.avatarUrl} alt={alt} />
      ) : <span>{teacherInitials(teacher.name)}</span>}
    </span>
  );
}

function TeacherProfileDialog({ open, teacher, lang, onClose, onUpload, onRemove }: {
  open: boolean; teacher: Teacher; lang: Lang; onClose: () => void; onUpload: (file: File) => void; onRemove: () => void;
}) {
  const copy = lang === "ar"
    ? { title: "الملف العام", subtitle: "تظهر هذه الصورة للطلاب عند اختيار مجموعاتك.", upload: "رفع صورة", remove: "حذف الصورة", close: "تم" }
    : { title: "Public profile", subtitle: "Students see this photo while choosing your groups.", upload: "Upload photo", remove: "Remove photo", close: "Done" };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="profile-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.section role="dialog" aria-modal="true" aria-labelledby="teacher-profile-title" className="profile-dialog" initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.985 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            <div className="profile-dialog-heading">
              <TeacherAvatar teacher={teacher} size="xl" alt={`${teacher.name} profile photo`} />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0d65ff]">{copy.title}</p>
                <h2 id="teacher-profile-title" className="mt-2 text-2xl font-black text-slate-950">{teacher.name}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{teacher.subject} · {teacher.grade} · {teacher.location}</p>
              </div>
            </div>
            <p className="profile-dialog-subtitle">{copy.subtitle}</p>
            <div className="profile-dialog-actions">
              <label className="profile-upload-control">
                <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} />
                <ImagePlus size={18} aria-hidden="true" />
                <span>{copy.upload}</span>
              </label>
              {teacher.avatarUrl && <Button variant="secondary" onClick={onRemove}><Trash2 size={17} /> {copy.remove}</Button>}
              <Button variant="ghost" onClick={onClose}>{copy.close}</Button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TopBar({ t, lang, setLang, account, theme, setTheme, notifications, teacherProfile, teachers: teacherProfiles, studentFilters, onStudentFiltersChange, onOpenSearch, onOpenTeacherProfile, onSignOut }: {
  t: Translation; lang: Lang; setLang: (lang: Lang) => void; account: DemoAccount; theme: "light" | "dark"; setTheme: (theme: "light" | "dark") => void; notifications: string[]; teacherProfile?: Teacher; teachers: Teacher[]; studentFilters: StudentFilters; onStudentFiltersChange: (filters: StudentFilters) => void; onOpenSearch: () => void; onOpenTeacherProfile: () => void; onSignOut: () => void;
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const RoleIcon = roleIcons[account.role];
  const searchLabel = account.role === "student"
    ? (lang === "ar" ? "ابحث عن مدرس أو مجموعة" : "Search teachers or groups")
    : (lang === "ar" ? "ابحث في مساحة العمل" : "Search workspace");
  const updatesLabel = lang === "ar" ? "التحديثات" : "Updates";
  const noUpdatesLabel = lang === "ar" ? "لا توجد تحديثات جديدة." : "No new updates.";
  const signOutLabel = lang === "ar" ? "تسجيل الخروج" : "Sign out";
  const profileLabel = lang === "ar" ? "الملف الشخصي" : "Profile";
  const filterCopy = lang === "ar"
    ? { label: "فلترة المدرسين", subject: "المادة", allSubjects: "كل المواد", city: "المدينة", allCities: "كل المدن", availability: "التوفر", allAvailability: "أي توافر", availableNow: "مقاعد متاحة", clear: "مسح" }
    : { label: "Filter teachers", subject: "Subject", allSubjects: "All subjects", city: "City", allCities: "All cities", availability: "Availability", allAvailability: "Any availability", availableNow: "Seats available", clear: "Clear" };
  const subjects = [...new Set(teacherProfiles.map((teacher) => teacher.subject))];
  const cities = [...new Set(teacherProfiles.map((teacher) => teacher.location))];
  const filterCount = [studentFilters.subject, studentFilters.city, studentFilters.availability].filter((value) => value !== "all").length;

  return (
    <header className="app-topbar sticky top-4 z-40">
      <div className="app-brand"><span className="app-brand-mark"><GraduationCap size={19} aria-hidden="true" /></span><span>LevelUp</span></div>
      <div className="topbar-search-control">
        <button type="button" className="global-search-trigger" onClick={onOpenSearch} aria-label={searchLabel}><Search size={18} aria-hidden="true" /><span>{searchLabel}</span><kbd>Ctrl K</kbd></button>
        {account.role === "student" && <div className="topbar-popover-wrap search-filter-wrap">
          <IconButton label={filterCopy.label} className={`global-filter-button ${filterCount ? "is-active" : ""}`} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={18} />{filterCount > 0 && <span className="global-filter-count">{filterCount}</span>}</IconButton>
          <AnimatePresence>{filtersOpen && <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }} className="search-filter-popover">
            <div className="search-filter-popover-heading"><p>{filterCopy.label}</p>{filterCount > 0 && <button type="button" onClick={() => onStudentFiltersChange(EMPTY_STUDENT_FILTERS)}>{filterCopy.clear}</button>}</div>
            <label className="search-filter-field"><span>{filterCopy.subject}</span><select value={studentFilters.subject} onChange={(event) => onStudentFiltersChange({ ...studentFilters, subject: event.target.value })}><option value="all">{filterCopy.allSubjects}</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
            <label className="search-filter-field"><span>{filterCopy.city}</span><select value={studentFilters.city} onChange={(event) => onStudentFiltersChange({ ...studentFilters, city: event.target.value })}><option value="all">{filterCopy.allCities}</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
            <label className="search-filter-field"><span>{filterCopy.availability}</span><select value={studentFilters.availability} onChange={(event) => onStudentFiltersChange({ ...studentFilters, availability: event.target.value as StudentFilters["availability"] })}><option value="all">{filterCopy.allAvailability}</option><option value="available">{filterCopy.availableNow}</option></select></label>
          </motion.div>}</AnimatePresence>
        </div>}
      </div>
      <div className="topbar-actions">
        <div className="topbar-popover-wrap">
          <IconButton label={t.notifications} className="topbar-icon-button relative" onClick={() => setNotificationsOpen((open) => !open)}><Bell size={18} />{notifications.length > 0 && <span className="notification-count">{Math.min(notifications.length, 9)}</span>}</IconButton>
          <AnimatePresence>{notificationsOpen && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="topbar-popover notification-popover"><p>{updatesLabel}</p>{notifications.length ? notifications.slice(0, 3).map((item, index) => <small key={`${item}-${index}`}>{item}</small>) : <small>{noUpdatesLabel}</small>}</motion.div>}</AnimatePresence>
        </div>
        <button type="button" className="topbar-language" onClick={() => setLang(lang === "en" ? "ar" : "en")} aria-label={lang === "en" ? "Switch language to Arabic" : "Switch language to English"}>{lang === "en" ? "ع" : "EN"}</button>
        <IconButton label={t.toggleTheme} className="topbar-icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><motion.span key={theme} initial={{ rotate: -12, opacity: 0, scale: 0.94 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.16 }}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</motion.span></IconButton>
        <div className="topbar-popover-wrap">
          <button type="button" className="account-control" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen} aria-label={`${account.name}, ${t[account.role]}`}>{teacherProfile ? <TeacherAvatar teacher={teacherProfile} size="sm" /> : <span className="account-avatar">{account.initials}</span>}<span className="account-copy"><b>{account.name}</b><small>{t[account.role]}</small></span><ChevronDown size={16} aria-hidden="true" /></button>
          <AnimatePresence>{accountOpen && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="topbar-popover account-popover"><div className="account-popover-summary">{teacherProfile ? <TeacherAvatar teacher={teacherProfile} size="md" /> : <span className="account-avatar"><RoleIcon size={16} aria-hidden="true" /></span>}<span><b>{account.name}</b><small>{t[account.role]}</small></span></div>{teacherProfile && <button type="button" onClick={() => { setAccountOpen(false); onOpenTeacherProfile(); }}><UserRound size={16} aria-hidden="true" /> {profileLabel}</button>}<button type="button" onClick={onSignOut}><LogOut size={16} aria-hidden="true" /> {signOutLabel}</button></motion.div>}</AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function DesktopRail({ nav, active, onSelect, role, t }: { nav: NavItem[]; active: string; onSelect: (id: string) => void; role: Role; t: Translation }) {
  const RoleIcon = roleIcons[role];
  return (
    <aside className="hidden lg:block">
      <nav aria-label={`${t.viewAs}: ${t[role]}`} className="liquid-rail sticky top-5 flex min-h-[calc(100vh-40px)] flex-col items-center gap-2 p-3">
        <div className="mb-2 flex size-12 items-center justify-center rounded-[20px] bg-slate-950 text-white shadow-xl shadow-slate-900/25">
          <RoleIcon size={20} />
        </div>
        <p className="sr-only">{t.viewAs}: {t[role]}</p>
        {nav.map(([id, label, Icon]) => (
          <button type="button" key={id} onClick={() => onSelect(id)} title={label} aria-current={active === id ? "page" : undefined} className={`group relative flex size-12 items-center justify-center rounded-[18px] transition ${active === id ? "text-white" : "text-slate-500 hover:bg-white/70 hover:text-slate-950"}`}>
            {active === id && <motion.span layoutId="rail-active" className="absolute inset-0 rounded-[18px] bg-[#0d65ff] shadow-lg shadow-blue-600/25" />}
            <Icon className="relative" size={20} />
            <span className="pointer-events-none absolute start-16 top-1/2 z-20 -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition group-hover:opacity-100">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function MobileNav({ items, active, onSelect, moreLabel }: { items: NavItem[]; active: string; onSelect: (id: string) => void; moreLabel: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const hasMore = items.length > 5;
  const primaryItems = hasMore ? items.slice(0, 4) : items;
  const overflowItems = hasMore ? items.slice(4) : [];
  const overflowActive = overflowItems.some(([id]) => id === active);

  return (
    <>
      <AnimatePresence>
        {moreOpen && <motion.div id="mobile-more-menu" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.16 }} className="mobile-nav-menu lg:hidden">
          {overflowItems.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => { onSelect(id); setMoreOpen(false); }} aria-current={active === id ? "page" : undefined} className={active === id ? "is-selected" : ""}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>)}
        </motion.div>}
      </AnimatePresence>
      <nav aria-label="Primary navigation" className="liquid-nav fixed inset-x-3 bottom-3 z-50 grid grid-flow-col auto-cols-[76px] gap-1 overflow-x-auto p-1.5 lg:hidden">
        {primaryItems.map(([id, label, Icon]) => (
          <button type="button" key={id} onClick={() => { onSelect(id); setMoreOpen(false); }} aria-current={active === id ? "page" : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] text-[11px] font-black transition ${active === id ? "text-white" : "text-slate-500"}`}>
            {active === id && <motion.span layoutId="mobile-active" className="absolute inset-0 rounded-[18px] bg-[#0d65ff] shadow-lg shadow-blue-600/25" />}
            <Icon className="relative" size={18} />
            <span className="relative max-w-full truncate px-1">{label}</span>
          </button>
        ))}
        {hasMore && <button type="button" aria-expanded={moreOpen} aria-controls="mobile-more-menu" onClick={() => setMoreOpen((open) => !open)} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[18px] text-[11px] font-black transition ${overflowActive ? "text-white" : "text-slate-500"}`}>
          {overflowActive && <motion.span layoutId="mobile-active" className="absolute inset-0 rounded-[18px] bg-[#0d65ff] shadow-lg shadow-blue-600/25" />}
          <MoreHorizontal className="relative" size={19} aria-hidden="true" />
          <span className="relative max-w-full truncate px-1">{moreLabel}</span>
        </button>}
      </nav>
    </>
  );
}

function PageTitle({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle: string }) {
  return (
    <div className="page-title-panel mb-5">
      {kicker && <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#0d65ff]">{kicker}</p>}
      <h2 className="max-w-4xl text-balance text-3xl font-black tracking-normal text-slate-950 sm:text-5xl">{title}</h2>
      <p className="mt-2 text-pretty text-base font-semibold leading-7 text-slate-500">{subtitle}</p>
    </div>
  );
}

function StudentView(props: {
  tab: string; t: Translation; copy: StudentCopy; groups: Group[]; teachers: Teacher[]; selectedTeacherId: string; setSelectedTeacherId: (teacherId: string) => void;
  studentFilters: StudentFilters; setStudentFilters: (filters: StudentFilters) => void;
  enrolledGroupIds: string[]; activeGroup: Group; activeGroupId: string; setActiveGroupId: (groupId: string) => void; waitlistPositions: Record<string, number>;
  booking: string; selectedGroup: Group; payment: PaymentState; paymentMethod: PaymentMethod; setPaymentMethod: (method: PaymentMethod) => void;
  startBooking: (group: Group) => void; confirmBooking: () => void; setBooking: (value: "none" | "review" | "success") => void; joinWaitingList: (group: Group) => void;
  attendance: AttendanceState; scanQr: (state?: AttendanceState) => void; sessionActive: boolean; qrTick: number; qrVersion: number; makeup: MakeupState; makeupGroupId: string; setMakeupGroupId: (groupId: string) => void; requestMakeup: (group: Group) => void;
  subscription: string; renewSubscription: () => void; leaveGroup: () => void; notifications: string[]; progress: number; rank: number; Arrow: React.ElementType; onBrowseGroups: () => void;
}) {
  const p = props;
  if (p.tab === "classes") return <StudentSchedule t={p.t} copy={p.copy} groups={p.groups} enrolledGroupIds={p.enrolledGroupIds} activeGroup={p.activeGroup} activeGroupId={p.activeGroupId} setActiveGroupId={p.setActiveGroupId} makeup={p.makeup} makeupGroupId={p.makeupGroupId} setMakeupGroupId={p.setMakeupGroupId} requestMakeup={p.requestMakeup} subscription={p.subscription} leaveGroup={p.leaveGroup} onBrowseGroups={p.onBrowseGroups} />;
  if (p.tab === "progress") return <StudentProgress copy={p.copy} progress={p.progress} rank={p.rank} activeGroup={p.activeGroup} />;
  if (p.tab === "attendance") return <StudentAttendance t={p.t} copy={p.copy} activeGroup={p.activeGroup} attendance={p.attendance} scanQr={p.scanQr} sessionActive={p.sessionActive} qrTick={p.qrTick} qrVersion={p.qrVersion} />;
  if (p.tab === "payments") return <StudentPayments t={p.t} copy={p.copy} activeGroup={p.activeGroup} payment={p.payment} paymentMethod={p.paymentMethod} setPaymentMethod={p.setPaymentMethod} renewSubscription={p.renewSubscription} />;
  return (
    <>
      <StudentExplore {...p} />
      <BookingSheet
        t={p.t}
        copy={p.copy}
        group={p.selectedGroup}
        booking={p.booking}
        paymentMethod={p.paymentMethod}
        setPaymentMethod={p.setPaymentMethod}
        confirmBooking={p.confirmBooking}
        setBooking={p.setBooking}
      />
    </>
  );
}

function StudentExplore({ t, copy, groups, teachers: teacherProfiles, selectedTeacherId, setSelectedTeacherId, studentFilters, setStudentFilters, enrolledGroupIds, activeGroup, waitlistPositions, startBooking, joinWaitingList, notifications, progress, rank, Arrow }: {
  t: Translation; copy: StudentCopy; groups: Group[]; teachers: Teacher[]; selectedTeacherId: string; setSelectedTeacherId: (teacherId: string) => void; studentFilters: StudentFilters; setStudentFilters: (filters: StudentFilters) => void; enrolledGroupIds: string[]; activeGroup: Group; waitlistPositions: Record<string, number>; startBooking: (group: Group) => void; joinWaitingList: (group: Group) => void; notifications: string[]; progress: number; rank: number; Arrow: React.ElementType;
}) {
  const filteredTeachers = teacherProfiles.filter((teacher) => {
    const matchesSubject = studentFilters.subject === "all" || teacher.subject === studentFilters.subject;
    const matchesCity = studentFilters.city === "all" || teacher.location === studentFilters.city;
    const matchesAvailability = studentFilters.availability !== "available" || groups.some((group) => group.teacherId === teacher.id && group.students < group.capacity);
    return matchesSubject && matchesCity && matchesAvailability;
  });
  const activeTeacher = filteredTeachers.find((teacher) => teacher.id === selectedTeacherId) ?? filteredTeachers[0] ?? teacherProfiles[0];
  const selectedGroups = groups.filter((group) => group.teacherId === activeTeacher.id);
  const seatsLeft = selectedGroups.reduce((sum, group) => sum + Math.max(0, group.capacity - group.students), 0);
  const resetFilters = () => setStudentFilters(EMPTY_STUDENT_FILTERS);

  return (
    <div className="student-command-space">
      <section className="guide-strip">
        {[
          ["1", t.chooseTeacher],
          ["2", t.pickGroup],
          ["3", t.bookOrWaitlist],
        ].map(([number, label]) => (
          <div key={label} className="step-pill">
            <span>{number}</span>
            <b>{label}</b>
          </div>
        ))}
      </section>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }} className="command-panel editorial-study-stage">
        <div className="min-w-0 editorial-stage-copy">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0d65ff]">{t.studentFirst}</p>
          <h2 className="mt-2 max-w-3xl text-balance text-3xl font-black text-slate-950 sm:text-5xl">
            {t.findTeacherTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-base font-semibold leading-7 text-slate-500">
            {t.findTeacherSubtitle}
          </p>
          <div className="command-metrics">
            <MiniStat label={t.seatsNow} value={`${seatsLeft}`} />
            <MiniStat label={t.yourScore} value={`${progress}%`} />
            <MiniStat label={t.groupRank} value={`#${rank}`} />
          </div>
        </div>
        <motion.figure initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08, duration: 0.42, ease: [0.22, 1, 0.36, 1] }} className="editorial-study-visual">
          <Image src="/images/levelup-editorial-study-v1.png" alt="Study schedule on a phone beside colorful study materials" fill sizes="(max-width: 1023px) 100vw, 40vw" />
          <span className="editorial-visual-corner" aria-hidden="true" />
        </motion.figure>
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <aside>
          <p className="teacher-results-meta">{filteredTeachers.length} {copy.matchingTeachers}</p>
          <div className="teacher-stack">
            {filteredTeachers.map((teacher, index) => (
              <motion.button
                type="button"
                key={teacher.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.995 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                onClick={() => setSelectedTeacherId(teacher.id)}
                className={`teacher-card compact-teacher w-full text-start transition ${activeTeacher.id === teacher.id ? "is-selected" : ""}`}
              >
                <TeacherAvatar teacher={teacher} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate text-base font-black text-slate-950">{teacher.name}</h3>
                    <span className="availability-dot" />
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-slate-500">{teacher.subject} · {teacher.grade}</p>
                  <p className="mt-2 text-xs font-black text-[#0d65ff]">{groups.filter((group) => group.teacherId === teacher.id).length} {t.groupCount} · {teacher.location}</p>
                </div>
              </motion.button>
            ))}
            {!filteredTeachers.length && <EmptyState title={copy.noTeachersTitle} action={<Button variant="secondary" onClick={resetFilters}>{copy.clearFilters}</Button>} />}
          </div>
        </aside>

        <section className="booking-panel">
          {filteredTeachers.length ? (
            <>
          <div className="booking-hero">
            <div className="booking-teacher-profile">
              <TeacherAvatar teacher={activeTeacher} size="lg" alt={`${activeTeacher.name} profile photo`} />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0d65ff]">{copy.groupsForTeacher}</p>
                <h3 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">{activeTeacher.name}</h3>
                <p className="mt-2 font-semibold text-slate-500">{activeTeacher.subject} · {activeTeacher.students} {t.students} · {activeTeacher.location}</p>
              </div>
            </div>
            <div className="teacher-trust">
              <ShieldCheck size={22} />
              <span>{t.verified}</span>
            </div>
          </div>

          <div className="quick-grid">
            <MiniStat label={t.availableGroups} value={`${selectedGroups.filter((group) => group.students < group.capacity).length}`} />
            <MiniStat label={t.lowestFee} value={selectedGroups.length ? money(Math.min(...selectedGroups.map((group) => group.price))) : "-"} />
            <MiniStat label={t.waitingList} value={`${selectedGroups.reduce((sum, group) => sum + group.waiting, 0)}`} />
          </div>

          <div className="mt-4 grid gap-3">
            {selectedGroups.map((group, index) => {
              const seats = group.capacity - group.students;
              const full = seats <= 0;
              const enrolled = enrolledGroupIds.includes(group.id);
              const waitlistPosition = waitlistPositions[group.id];
              const fill = Math.round((group.students / group.capacity) * 100);
              return (
                <motion.div
                  key={group.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035, duration: 0.2 }}
                  className={`group-row decision-row ${full ? "is-full" : ""}`}
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_180px] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xl font-black text-slate-950">{group.name}</h4>
                        <StatusBadge status={enrolled ? copy.alreadyEnrolled : waitlistPosition ? interpolate(copy.waitlistPosition, { position: waitlistPosition }) : full ? t.full : `${seats} ${t.seatsLeft}`} tone={enrolled ? "success" : waitlistPosition || full ? "warning" : "success"} />
                      </div>
                      <div className="group-teacher-line">
                        <TeacherAvatar teacher={activeTeacher} size="sm" />
                        <span>{activeTeacher.name}</span>
                        {activeTeacher.verified && <ShieldCheck size={14} aria-label={t.verified} />}
                      </div>
                      <div className="mt-3 grid gap-2 text-sm font-bold text-slate-500 sm:grid-cols-3">
                        <span>{group.days}</span>
                        <span>{group.time}</span>
                        <span>{group.center} · {group.room}</span>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${fill}%` }} className="h-full rounded-full bg-[#0d65ff]" />
                        </div>
                        <span className="text-xs font-black text-slate-400">{fill}% {t.fullPercent}</span>
                      </div>
                    </div>
                    <div className="action-stack">
                      <p className="text-end text-xl font-black text-slate-950">{money(group.price)}</p>
                      <Button disabled={enrolled || Boolean(waitlistPosition)} onClick={() => full ? joinWaitingList(group) : startBooking(group)} variant={enrolled || full ? "secondary" : "primary"} className="w-full">
                        {enrolled ? copy.alreadyEnrolled : waitlistPosition ? copy.onWaitingList : full ? t.joinWaiting : t.bookSeat} {!enrolled && !waitlistPosition && <Arrow size={16} />}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {!selectedGroups.length && <EmptyState title={copy.noGroupsTitle} action={<Button variant="secondary" onClick={resetFilters}>{copy.clearFilters}</Button>} />}
          </div>
            </>
          ) : <EmptyState title={copy.noTeachersTitle} action={<Button variant="secondary" onClick={resetFilters}>{copy.clearFilters}</Button>} />}
        </section>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <GlassCard className="support-card">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{t.progressSnapshot}</p>
          <p className="mt-3 text-4xl font-black text-slate-950">{progress}%</p>
          <p className="mt-1 font-bold text-slate-500">{interpolate(copy.progressSnapshotDetail, { rank, students: activeGroup.students, group: `${activeGroup.subject} ${activeGroup.name}` })}</p>
        </GlassCard>
        <GlassCard className="support-card">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{t.nextAction}</p>
          <p className="mt-3 text-lg font-black text-slate-950">{notifications[0] ?? t.defaultNextAction}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">{t.nextActionDetail}</p>
        </GlassCard>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function BookingSheet({ t, copy, group, booking, paymentMethod, setPaymentMethod, confirmBooking, setBooking }: {
  t: Translation; copy: StudentCopy; group: Group; booking: string; paymentMethod: PaymentMethod; setPaymentMethod: (method: PaymentMethod) => void; confirmBooking: () => void; setBooking: (value: "none" | "review" | "success") => void;
}) {
  const isOpen = booking === "review" || booking === "success";
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/24 px-3 pb-3 backdrop-blur-sm sm:items-center sm:pb-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section
            initial={{ y: 28, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="booking-sheet w-full max-w-2xl"
          >
            {booking === "success" ? (
              <div className="text-center">
                <motion.div initial={{ scale: 0.78, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto flex size-18 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={38} />
                </motion.div>
                <h2 className="mt-4 text-3xl font-black text-slate-950">{t.allSet}</h2>
                <p className="mt-2 font-bold text-slate-500">{copy.bookingReference} · {group.subject} · {group.name}</p>
                <div className="mt-5 grid gap-3 text-start sm:grid-cols-2">
                  {[`${group.days} · ${group.time}`, group.center, `${t.paid} · ${paymentMethod}`, t.seatConfirmed].map((item) => <p key={item} className="rounded-[18px] bg-slate-50 p-4 font-black text-slate-800">{item}</p>)}
                </div>
                <Button className="mt-6 w-full sm:w-auto" onClick={() => setBooking("none")}>{t.done}</Button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0d65ff]">{t.booking}</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">{group.subject} · {group.name}</h3>
                    <p className="mt-1 font-semibold text-slate-500">{group.days} · {group.time} · {group.center}</p>
                  </div>
                  <IconButton label={t.close} onClick={() => setBooking("none")}><X size={18} /></IconButton>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {paymentMethods.map((method) => (
                    <button type="button" key={method} onClick={() => setPaymentMethod(method)} aria-pressed={paymentMethod === method} className={`payment-option ${paymentMethod === method ? "is-selected" : ""}`}>
                      <CreditCard size={20} /> {method}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex flex-col gap-3 rounded-[22px] bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-bold text-slate-500">{t.monthlyFee}</p><p className="text-3xl font-black text-slate-950">{money(group.price)}</p></div>
                  <Button onClick={confirmBooking}>{t.confirmBooking}</Button>
                </div>
              </>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StudentSchedule({ t, copy, groups, enrolledGroupIds, activeGroup, activeGroupId, setActiveGroupId, makeup, makeupGroupId, setMakeupGroupId, requestMakeup, subscription, leaveGroup, onBrowseGroups }: {
  t: Translation; copy: StudentCopy; groups: Group[]; enrolledGroupIds: string[]; activeGroup: Group; activeGroupId: string; setActiveGroupId: (groupId: string) => void; makeup: MakeupState; makeupGroupId: string; setMakeupGroupId: (groupId: string) => void; requestMakeup: (group: Group) => void; subscription: string; leaveGroup: () => void; onBrowseGroups: () => void;
}) {
  const enrolledGroups = groups.filter((group) => enrolledGroupIds.includes(group.id));
  const alternativeGroups = groups.filter((group) => group.teacherId === activeGroup.teacherId && group.subject === activeGroup.subject && group.id !== activeGroup.id && group.students < group.capacity);
  const selectedMakeupGroup = alternativeGroups.find((group) => group.id === makeupGroupId);
  const requestedMakeupGroup = groups.find((group) => group.id === makeupGroupId);

  return (
    <>
      <PageTitle kicker={copy.scheduleKicker} title={copy.scheduleTitle} subtitle={copy.scheduleSubtitle} />
      {!enrolledGroups.length ? <EmptyState title={copy.noScheduleTitle} action={<Button onClick={onBrowseGroups}>{t.explore}</Button>} /> : (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-sm font-black text-slate-500">{copy.enrolledClasses}</p>
              <StatusBadge status={`${enrolledGroups.length} ${t.classes}`} tone="success" />
            </div>
            {enrolledGroups.map((group, index) => {
              const teacher = teachers.find((item) => item.id === group.teacherId);
              const isCurrent = group.id === activeGroupId;
              return (
                <motion.button key={group.id} type="button" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} onClick={() => setActiveGroupId(group.id)} className={`schedule-row text-start ${isCurrent ? "is-active" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0d65ff]">{group.days}</p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">{group.subject} · {group.name}</h3>
                    <p className="mt-1 truncate font-semibold text-slate-500">{teacher?.name} · {group.time} · {group.center} · {group.room}</p>
                  </div>
                  <StatusBadge status={isCurrent ? copy.currentClass : copy.switchClass} tone={isCurrent ? "success" : "warning"} />
                </motion.button>
              );
            })}
          </section>
          <aside className="space-y-4">
            <GlassCard>
              <h3 className="text-xl font-black text-slate-950">{t.requestMakeup}</h3>
              <p className="mt-2 font-semibold text-slate-500">{copy.makeUpDescription}</p>
              <label className="mt-4 grid gap-2 text-sm font-black text-slate-600">
                <span>{copy.makeUpGroup}</span>
                <select value={makeupGroupId} onChange={(event) => setMakeupGroupId(event.target.value)} className="select-control">
                  <option value="">{copy.chooseMakeUp}</option>
                  {alternativeGroups.map((group) => <option key={group.id} value={group.id}>{group.name} · {group.days} · {group.time}</option>)}
                </select>
              </label>
              {selectedMakeupGroup ? <p className="mt-3 text-sm font-bold text-slate-500">{selectedMakeupGroup.center} · {selectedMakeupGroup.room} · {selectedMakeupGroup.capacity - selectedMakeupGroup.students} {t.seatsLeft}</p> : !alternativeGroups.length ? <p className="mt-3 text-sm font-bold text-slate-500">{copy.noMakeUp}</p> : null}
              <Button disabled={!selectedMakeupGroup || makeup === "pending" || makeup === "confirmed"} className="mt-4 w-full" onClick={() => selectedMakeupGroup && requestMakeup(selectedMakeupGroup)}>{t.requestMakeup}</Button>
              {makeup !== "none" && <div className="mt-3"><StatusBadge status={makeup === "confirmed" ? t.confirmed : makeup === "rejected" ? t.rejected : t.pending} tone={makeup === "confirmed" ? "success" : makeup === "rejected" ? "danger" : "warning"} />{requestedMakeupGroup && <p className="mt-2 text-sm font-bold text-slate-500">{requestedMakeupGroup.subject} · {requestedMakeupGroup.name} · {requestedMakeupGroup.time}</p>}</div>}
            </GlassCard>
            <GlassCard>
              <h3 className="text-xl font-black text-slate-950">{t.manageSubscription}</h3>
              <p className="mt-2 font-semibold text-slate-500">{copy.subscriptionDescription}</p>
              <div className="mt-4"><StatusBadge status={subscription === "active" ? copy.activeSubscription : copy.cancelledSubscription} tone={subscription === "active" ? "success" : "danger"} /></div>
              <Button className="mt-4 w-full" variant="danger" onClick={leaveGroup}><X size={18} /> {t.leaveGroup}</Button>
            </GlassCard>
          </aside>
        </div>
      )}
    </>
  );
}

function StudentProgress({ copy, progress, rank, activeGroup }: { copy: StudentCopy; progress: number; rank: number; activeGroup: Group }) {
  const rows = [
    [copy.attendanceScore, students[0].attendance, copy.attendanceWeight],
    [copy.homeworkScore, students[0].homework, copy.homeworkWeight],
    [copy.examAverage, students[0].exams, copy.examWeight],
  ] as const;
  const aheadPercent = Math.max(0, Math.round(((activeGroup.students - rank) / Math.max(activeGroup.students, 1)) * 100));
  return (
    <>
      <PageTitle kicker={copy.progressKicker} title={copy.progressTitle} subtitle={copy.progressSubtitle} />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <GlassCard>
          <Trophy className="text-[#0d65ff]" size={36} />
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-slate-400">{copy.overallScore}</p>
          <p className="mt-2 text-6xl font-black text-slate-950">{progress}%</p>
          <p className="mt-2 text-xl font-black text-slate-700">#{rank} / {activeGroup.students} {copy.groupComparison}</p>
          <p className="mt-2 font-semibold text-slate-500">{copy.improvement}</p>
        </GlassCard>
        <div className="grid gap-3">
          {rows.map(([label, value, detail]) => <ProgressRow key={label} label={label} value={value} detail={detail} />)}
          <GlassCard>
            <h3 className="text-xl font-black text-slate-950">{interpolate(copy.aheadOfGroup, { percent: aheadPercent })}</h3>
            <p className="mt-2 font-semibold text-slate-500">{copy.encouragement}</p>
          </GlassCard>
        </div>
      </div>
    </>
  );
}

function ProgressRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-4">
        <div><h3 className="font-black text-slate-950">{label}</h3><p className="text-sm font-semibold text-slate-500">{detail}</p></div>
        <b className="text-2xl text-slate-950">{value}%</b>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className="h-full rounded-full bg-[#0d65ff]" /></div>
    </GlassCard>
  );
}

function StudentAttendance({ t, copy, activeGroup, attendance, scanQr, sessionActive, qrTick, qrVersion }: { t: Translation; copy: StudentCopy; activeGroup: Group; attendance: AttendanceState; scanQr: (state?: AttendanceState) => void; sessionActive: boolean; qrTick: number; qrVersion: number }) {
  const [capturedQrVersion, setCapturedQrVersion] = useState(qrVersion);
  const successful = attendance === "confirmed";
  const expired = sessionActive && capturedQrVersion !== qrVersion;
  const canScan = sessionActive && !expired && !successful;
  const statusMessage = successful ? t.attendanceConfirmed : !sessionActive ? copy.sessionClosed : expired || attendance === "expired" ? copy.qrExpired : copy.readyToScan;

  function scanPresentedQr() {
    if (!sessionActive) {
      scanQr("closed");
      return;
    }
    if (capturedQrVersion !== qrVersion) {
      scanQr("expired");
      return;
    }
    scanQr();
  }

  function loadCurrentQr() {
    setCapturedQrVersion(qrVersion);
    scanQr("active");
  }

  return (
    <>
      <PageTitle kicker={copy.attendanceKicker} title={copy.attendanceTitle} subtitle={copy.attendanceSubtitle} />
      <div className="mx-auto max-w-lg">
        <GlassCard className="p-4 text-center sm:p-6">
          <div role="img" aria-label={successful ? "Attendance confirmed" : !sessionActive ? "No active QR attendance session" : expired ? "The scanned QR has expired" : "Camera ready to scan the live attendance QR"} className="camera-frame relative mx-auto flex aspect-[3/4] max-h-[520px] max-w-[360px] items-center justify-center overflow-hidden rounded-[34px] bg-slate-950 text-white">
            <div className="scan-line" />
            {successful ? <Check size={104} aria-hidden="true" className="text-emerald-300" /> : <Camera size={84} aria-hidden="true" className="text-white/80" />}
          </div>
          <h3 className="mt-5 text-3xl font-black text-slate-950">{statusMessage}</h3>
          <p className="mt-1 font-semibold text-slate-500">{successful ? `${activeGroup.subject} · ${activeGroup.name} · ${activeGroup.time}` : sessionActive ? `${activeGroup.subject} · ${activeGroup.name} · QR refreshes in 00:${String(qrTick).padStart(2, "0")}` : copy.scanHint}</p>
          {attendance === "duplicate" && <Notice tone="warn" text={t.alreadyChecked} />}
          {(expired || attendance === "expired") && <Notice tone="error" text={copy.qrExpired} />}
          {attendance === "wrong" && <Notice tone="error" text={copy.wrongGroup} />}
          {((!sessionActive && !successful) || attendance === "closed") && <Notice tone="error" text={copy.sessionClosed} />}
          <div className="mt-5 grid gap-2">
            <Button disabled={!canScan} onClick={scanPresentedQr}><QrCode size={18} /> {successful ? t.attendanceConfirmed : t.simulateScan}</Button>
            {(expired || attendance === "expired") && <Button variant="secondary" onClick={loadCurrentQr}><RefreshCw size={18} /> {t.simulateScan}</Button>}
          </div>
        </GlassCard>
      </div>
    </>
  );
}

function StudentPayments({ t, copy, activeGroup, payment, paymentMethod, setPaymentMethod, renewSubscription }: { t: Translation; copy: StudentCopy; activeGroup: Group; payment: PaymentState; paymentMethod: PaymentMethod; setPaymentMethod: (method: PaymentMethod) => void; renewSubscription: () => void }) {
  return (
    <>
      <PageTitle kicker={copy.renewalKicker} title={copy.renewalTitle} subtitle={copy.renewalSubtitle} />
      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{copy.currentMonth}</p>
          <h3 className="mt-3 text-3xl font-black text-slate-950">September</h3>
          <p className="mt-2 font-semibold text-slate-500">{activeGroup.subject} · {activeGroup.name}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{money(activeGroup.price)}</p>
          <div className="mt-4"><StatusBadge status={t.paid} /></div>
        </GlassCard>
        <GlassCard>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{copy.nextRenewal}</p>
          <h3 className="mt-3 text-3xl font-black text-slate-950">October</h3>
          <p className="mt-2 text-2xl font-black text-slate-950">{money(activeGroup.price)}</p>
          <label className="mt-4 grid gap-2 text-sm font-black text-slate-600">
            <span>{copy.paymentMethod}</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="select-control">
              {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
          <div className="mt-4"><StatusBadge status={payment === "paid" ? t.paid : copy.dueNow} tone={payment === "paid" ? "success" : "warning"} /></div>
          <Button disabled={payment === "paid"} className="mt-5 w-full" onClick={renewSubscription}>{payment === "paid" ? copy.renewalComplete : copy.renewNow}</Button>
        </GlassCard>
      </div>
    </>
  );
}

function TeacherView(props: {
  tab: string; t: Translation; groups: Group[]; operationGroup: Group; onSelectGroup: (groupId: string) => void; waitingTotal: number; availableSeats: number; studentTotal: number; payment: PaymentState; submissions: typeof initialSubmissions; setSubmissions: React.Dispatch<React.SetStateAction<typeof initialSubmissions>>;
  sessionActive: boolean; attendanceStarted: boolean; attendance: AttendanceState; qrTick: number; qrVersion: number; attendanceGroup: Group; attendanceSummary: AttendanceSummary; attendanceRoster: RosterStudent[]; attendanceMarks: Record<string, AttendanceMark>; startAttendance: (groupId?: string) => void; refreshQr: () => void; endAttendance: () => void; markAttendance: (studentId: string, mark: AttendanceMark) => void;
  makeup: MakeupState; makeupSourceGroup: Group; makeupTargetGroup?: Group; approveMakeup: () => void; rejectMakeup: () => void; createGroupFromWaitingList: (group?: Group) => void; waitlistInvitesSent: Record<string, boolean>; sendWaitingListInvites: (group: Group) => void; template: string; setTemplate: (value: string) => void; onNavigate: (tab: string) => void;
}) {
  const p = props;
  if (p.tab === "groups") return <TeacherGroups t={p.t} groups={p.groups} selectedGroup={p.operationGroup} onSelectGroup={p.onSelectGroup} sessionActive={p.sessionActive} waitingTotal={p.waitingTotal} createGroupFromWaitingList={p.createGroupFromWaitingList} waitlistInvitesSent={p.waitlistInvitesSent} sendWaitingListInvites={p.sendWaitingListInvites} />;
  if (p.tab === "attendance") return <AttendanceDesk audience="teacher" t={p.t} groups={p.groups} group={p.attendanceGroup} onSelectGroup={p.onSelectGroup} sessionActive={p.sessionActive} attendanceStarted={p.attendanceStarted} attendance={p.attendance} qrTick={p.qrTick} qrVersion={p.qrVersion} summary={p.attendanceSummary} roster={p.attendanceRoster} marks={p.attendanceMarks} startAttendance={p.startAttendance} refreshQr={p.refreshQr} endAttendance={p.endAttendance} markAttendance={p.markAttendance} />;
  if (p.tab === "assignments") return <AssignmentTracking t={p.t} group={p.operationGroup} submissions={p.submissions} setSubmissions={p.setSubmissions} />;
  if (p.tab === "makeup") return <MakeupTeacher t={p.t} makeup={p.makeup} sourceGroup={p.makeupSourceGroup} targetGroup={p.makeupTargetGroup} approveMakeup={p.approveMakeup} rejectMakeup={p.rejectMakeup} />;
  if (p.tab === "payments") return <PaymentsOps scope="Teacher" />;
  if (p.tab === "communications") return <Communications template={p.template} setTemplate={p.setTemplate} />;
  if (p.tab === "reports") return <Reports waitingTotal={p.waitingTotal} />;
  return <TeacherDashboard t={p.t} group={p.operationGroup} groupCount={p.groups.length} studentTotal={p.studentTotal} availableSeats={p.availableSeats} waitingTotal={p.waitingTotal} sessionActive={p.sessionActive} attendanceStarted={p.attendanceStarted} attendanceSummary={p.attendanceSummary} submissions={p.submissions} payment={p.payment} makeup={p.makeup} startAttendance={p.startAttendance} createGroupFromWaitingList={p.createGroupFromWaitingList} onNavigate={p.onNavigate} />;
}

function TeacherDashboard({ t, group, groupCount, studentTotal, availableSeats, waitingTotal, sessionActive, attendanceStarted, attendanceSummary, submissions, payment, makeup, startAttendance, createGroupFromWaitingList, onNavigate }: {
  t: Translation; group: Group; groupCount: number; studentTotal: number; availableSeats: number; waitingTotal: number; sessionActive: boolean; attendanceStarted: boolean; attendanceSummary: AttendanceSummary; submissions: typeof initialSubmissions; payment: PaymentState; makeup: MakeupState; startAttendance: (groupId?: string) => void; createGroupFromWaitingList: (group?: Group) => void; onNavigate: (tab: string) => void;
}) {
  const homeworkDone = submissions.filter((student) => student.submitted).length;
  const collectionBase = studentTotal * group.price;
  const collected = Math.round(collectionBase * (payment === "paid" ? 0.92 : 0.89));
  const attendanceRate = attendanceStarted && attendanceSummary.total ? Math.round((attendanceSummary.checkedIn / attendanceSummary.total) * 100) : 0;
  const actions = [
    { id: "attendance", icon: UserCheck, title: sessionActive ? "Attendance session is live" : "Open today's attendance", detail: sessionActive ? `${attendanceSummary.checkedIn} of ${attendanceSummary.total} checked in` : `${group.name} · ${group.time}` },
    { id: "assignments", icon: ClipboardCheck, title: `${submissions.length - homeworkDone} homework checks remain`, detail: `Newton's Laws · ${homeworkDone}/${submissions.length} complete` },
    { id: "makeup", icon: CalendarCheck2, title: makeup === "pending" ? "One make-up request needs a decision" : "Review make-up requests", detail: makeup === "confirmed" ? "Latest request approved" : "A one-session exception only" },
  ];

  function startAndOpenAttendance() {
    startAttendance(group.id);
    onNavigate("attendance");
  }

  return (
    <>
      <PageTitle kicker="Teacher workspace" title="Your next class, with the next action" subtitle="Run attendance, clear exceptions, and keep every group moving without hunting through the system." />
      <div className="grid gap-4 xl:items-start xl:grid-cols-[1.12fr_0.88fr]">
        <GlassCard className="editorial-action-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d65ff]">Next session</p>
              <h3 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">{group.subject} · {group.name}</h3>
              <p className="mt-2 font-semibold text-slate-500">{group.days} · {group.time} · {group.center} · {group.room}</p>
              <div className="ops-focus-meta mt-5">
                <span>{group.students}/{group.capacity} enrolled</span>
                <span>{seatsRemaining(group)} seats open</span>
                <span>{group.waiting} waiting</span>
              </div>
            </div>
            <div className="min-w-[220px] lg:text-end">
              <StatusBadge status={sessionActive ? "Live now" : attendanceStarted ? "Session closed" : "Ready"} tone={sessionActive ? "success" : attendanceStarted ? "warning" : "success"} />
              <Button className="mt-4 w-full" onClick={sessionActive ? () => onNavigate("attendance") : startAndOpenAttendance}><QrCode size={18} /> {sessionActive ? "Open attendance" : t.startAttendance}</Button>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="text-xl font-black text-slate-950">Today&apos;s queue</h3><p className="mt-1 text-sm font-semibold text-slate-500">Only the decisions that unblock students.</p></div>
            <StatusBadge status={`${actions.length} actions`} tone="warning" />
          </div>
          <div className="ops-action-list mt-4">
            {actions.map((action) => {
              const Icon = action.icon;
              return <button key={action.id} type="button" className="ops-action-row" onClick={() => onNavigate(action.id)}><span className="ops-action-icon"><Icon size={18} aria-hidden="true" /></span><span><b>{action.title}</b><small>{action.detail}</small></span><ChevronRight size={18} aria-hidden="true" /></button>;
            })}
          </div>
        </GlassCard>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Students" value={String(studentTotal)} detail={`${groupCount} active groups`} />
        <StatCard label="Attendance" value={attendanceStarted ? `${attendanceRate}%` : "Ready"} detail={attendanceStarted ? `${attendanceSummary.checkedIn}/${attendanceSummary.total} checked in` : "Start when class opens"} />
        <StatCard label="Homework" value={`${homeworkDone}/${submissions.length}`} detail="Latest assignment" />
        <StatCard label="Waiting" value={String(waitingTotal)} detail={`${availableSeats} seats available`} />
        <StatCard label="Collected" value={money(collected)} detail="This month" />
      </div>
      <GlassCard className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d65ff]">Demand signal</p><h3 className="mt-2 text-2xl font-black text-slate-950">A fourth group can absorb the waitlist</h3><p className="mt-2 font-semibold text-slate-500">Group A and Group C are full or nearly full, while students are already waiting for compatible times.</p></div>
          <Button onClick={() => createGroupFromWaitingList(group)}><Plus size={18} /> {t.createGroup}</Button>
        </div>
      </GlassCard>
    </>
  );
}

function TeacherGroups({ t, groups, selectedGroup, onSelectGroup, sessionActive, waitingTotal, createGroupFromWaitingList, waitlistInvitesSent, sendWaitingListInvites }: {
  t: Translation; groups: Group[]; selectedGroup: Group; onSelectGroup: (groupId: string) => void; sessionActive: boolean; waitingTotal: number; createGroupFromWaitingList: (group?: Group) => void; waitlistInvitesSent: Record<string, boolean>; sendWaitingListInvites: (group: Group) => void;
}) {
  const selectedSeats = seatsRemaining(selectedGroup);
  const invitesPrepared = Boolean(waitlistInvitesSent[selectedGroup.id]);

  return (
    <>
      <PageTitle kicker="Group operations" title="Every group has one clear status" subtitle="See capacity, pressure, timing, and the next action without leaving the screen." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-3" aria-label="Teacher groups">
          {groups.map((group) => {
            const seats = seatsRemaining(group);
            const isSelected = group.id === selectedGroup.id;
            return (
              <button key={group.id} type="button" aria-pressed={isSelected} disabled={sessionActive && !isSelected} className={`ops-group-row ${isSelected ? "is-selected" : ""}`} onClick={() => onSelectGroup(group.id)}>
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 text-start"><p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d65ff]">{group.subject}</p><h3 className="mt-2 text-2xl font-black text-slate-950">{group.name}</h3><p className="mt-1 truncate font-semibold text-slate-500">{group.days} · {group.time} · {group.center} · {group.room}</p></div>
                  <StatusBadge status={seats ? `${seats} seats left` : t.full} tone={seats ? "success" : "danger"} />
                </div>
                <CapacityMeter group={group} />
                <div className="ops-group-foot"><span>{group.students}/{group.capacity} enrolled</span><span>{group.waiting} waiting</span><span>{money(group.price)}/month</span></div>
              </button>
            );
          })}
        </section>
        <div className="grid content-start gap-4">
          <GlassCard>
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-slate-950">{selectedGroup.name} at a glance</h3><p className="mt-1 text-sm font-semibold text-slate-500">{selectedGroup.days} · {selectedGroup.time}</p></div><StatusBadge status={occupancy(selectedGroup) >= 96 ? "High demand" : "Stable"} tone={occupancy(selectedGroup) >= 96 ? "warning" : "success"} /></div>
            <dl className="ops-key-values mt-5">
              <div><dt>Seats now</dt><dd>{selectedSeats}</dd></div>
              <div><dt>Waiting</dt><dd>{selectedGroup.waiting}</dd></div>
              <div><dt>Room</dt><dd>{selectedGroup.center} · {selectedGroup.room}</dd></div>
            </dl>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-950">{t.waitingList}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{waitingTotal} students are waiting across your groups.</p></div><StatusBadge status="Demand" tone="warning" /></div>
            <div className="ops-waitlist mt-4">
              {waitingStudents.slice(0, 3).map((student) => <div key={student.name}><b>{student.name}</b><small>{student.time} · {student.days}</small></div>)}
            </div>
            <Button className="mt-4 w-full" onClick={() => createGroupFromWaitingList(selectedGroup)}><Plus size={18} /> {t.createGroup}</Button>
            <Button disabled={!selectedGroup.waiting || invitesPrepared} className="mt-3 w-full" variant="secondary" onClick={() => sendWaitingListInvites(selectedGroup)}><Send size={18} /> {invitesPrepared ? "Invitations prepared" : "Prepare invitations"}</Button>
          </GlassCard>
        </div>
      </div>
    </>
  );
}

function GroupPicker({ label, groups, group, onSelectGroup, disabled = false }: { label: string; groups: Group[]; group: Group; onSelectGroup: (groupId: string) => void; disabled?: boolean }) {
  return (
    <label className="ops-group-picker">
      <span>{label}</span>
      <select value={group.id} disabled={disabled} onChange={(event) => onSelectGroup(event.target.value)} className="select-control">
        {groups.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.days} · {item.time}</option>)}
      </select>
    </label>
  );
}

function CapacityMeter({ group }: { group: Group }) {
  return (
    <div className="ops-capacity-meter" aria-label={`${occupancy(group)}% capacity`}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${occupancy(group)}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
    </div>
  );
}

function AttendanceDesk({ audience, t, groups, group, onSelectGroup, sessionActive, attendanceStarted, attendance, qrTick, qrVersion, summary, roster, marks, startAttendance, refreshQr, endAttendance, markAttendance }: {
  audience: "teacher" | "assistant"; t: Translation; groups: Group[]; group: Group; onSelectGroup: (groupId: string) => void; sessionActive: boolean; attendanceStarted: boolean; attendance: AttendanceState; qrTick: number; qrVersion: number; summary: AttendanceSummary; roster: RosterStudent[]; marks: Record<string, AttendanceMark>; startAttendance: (groupId?: string) => void; refreshQr: () => void; endAttendance: () => void; markAttendance: (studentId: string, mark: AttendanceMark) => void;
}) {
  const sessionLabel = sessionActive ? "Live now" : attendanceStarted || attendance === "closed" ? "Session closed" : "Ready to start";
  const title = audience === "assistant" ? "Check-in desk" : `${group.subject} · ${group.name} attendance`;
  const subtitle = audience === "assistant" ? "Keep the door moving: scan, correct the few exceptions, and close the room when the class begins." : "Start one session for the selected group, then follow the live check-ins and exceptions below.";
  const sessionToken = `LU-${group.id.toUpperCase()}-${String(qrVersion).padStart(3, "0")}`;
  const expiresSoon = sessionActive && qrTick <= 10;

  return (
    <>
      <PageTitle kicker={audience === "assistant" ? "Assistant shift" : "QR attendance"} title={title} subtitle={subtitle} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <GlassCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <GroupPicker label="Attendance group" groups={groups} group={group} onSelectGroup={onSelectGroup} disabled={sessionActive} />
            <StatusBadge status={sessionLabel} tone={sessionActive ? "success" : attendanceStarted ? "warning" : "success"} />
          </div>
          <div role="img" aria-label={sessionActive ? `Live QR for ${group.name}, ${qrTick} seconds until refresh` : "Attendance QR is inactive"} className={`qr-panel mx-auto mt-6 grid aspect-square max-w-[340px] grid-cols-7 gap-2 rounded-[28px] p-5 ${sessionActive ? "" : "is-idle"}`}>
            {Array.from({ length: 49 }).map((_, index) => <motion.div key={`${qrVersion}-${index}`} aria-hidden="true" animate={{ opacity: sessionActive && ((index + qrTick + qrVersion) % 4 === 0 || index % 9 === 0) ? 1 : sessionActive ? 0.16 : 0.08 }} className="rounded-[4px] bg-slate-950" />)}
          </div>
          <div className="mt-5 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-start">
            <div><p className="sr-only" aria-live="polite">{sessionActive ? `Attendance QR version ${qrVersion} is active.` : attendanceStarted ? "Attendance is closed." : "Attendance is ready to start."}</p><h3 className="text-xl font-black text-slate-950">{sessionActive ? `QR refreshes in 00:${String(qrTick).padStart(2, "0")}` : attendanceStarted ? "Attendance has been closed" : "Open attendance when class begins"}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{sessionActive ? `${sessionToken} · ${expiresSoon ? "Refreshing soon" : "Active"}` : `${group.name} · ${group.center} · ${group.room}`}</p></div>
            {sessionActive ? <div className="qr-session-controls"><Button variant="secondary" onClick={refreshQr}><RefreshCw size={18} /> Refresh QR</Button><Button variant="danger" onClick={endAttendance}><Clock3 size={18} /> {t.endAttendance}</Button></div> : <Button onClick={() => startAttendance(group.id)}><QrCode size={18} /> {t.startAttendance}</Button>}
          </div>
        </GlassCard>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard label="Checked in" value={attendanceStarted ? `${summary.checkedIn}/${summary.total}` : "Ready"} detail={sessionActive ? "Live session" : attendanceStarted ? "Final count" : "No session open"} />
          <StatCard label={t.late} value={attendanceStarted ? String(summary.late) : "-"} detail="Marked at the door" />
          <StatCard label={t.absent} value={attendanceStarted ? String(summary.absent) : "-"} detail={sessionActive ? `${summary.pending} still pending` : "Final after close"} />
        </div>
      </div>
      <GlassCard className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-xl font-black text-slate-950">Arrival exceptions</h3><p className="mt-1 text-sm font-semibold text-slate-500">The remaining students need one quick decision.</p></div><StatusBadge status={sessionActive ? `${summary.pending} pending` : "Roster"} tone={sessionActive && summary.pending ? "warning" : "success"} /></div>
        <AttendanceRoster t={t} roster={roster} marks={marks} disabled={!sessionActive} onMark={markAttendance} />
      </GlassCard>
    </>
  );
}

function AttendanceRoster({ t, roster, marks, onMark, disabled }: { t: Translation; roster: RosterStudent[]; marks: Record<string, AttendanceMark>; onMark: (studentId: string, mark: AttendanceMark) => void; disabled: boolean }) {
  const options: { value: AttendanceMark; label: string }[] = [
    { value: "present", label: t.present },
    { value: "late", label: t.late },
    { value: "absent", label: t.absent },
  ];

  if (!roster.length) return <EmptyState title="No students are assigned to this group yet." />;

  return (
    <div className="ops-roster mt-5">
      {roster.map((student) => {
        const mark = marks[student.id] ?? "unmarked";
        const status = mark === "unmarked" ? t.pending : mark === "present" ? t.present : mark === "late" ? t.late : t.absent;
        return <div key={student.id} className="ops-roster-row"><div className="min-w-0"><b>{student.name}</b><small>{student.note}</small></div><div className="flex flex-wrap items-center justify-end gap-2"><StatusBadge status={status} tone={mark === "present" ? "success" : mark === "late" || mark === "unmarked" ? "warning" : "danger"} /><div className="attendance-mark-control" role="group" aria-label={`Attendance for ${student.name}`}>{options.map((option) => <button key={option.value} type="button" title={option.label} disabled={disabled} aria-pressed={mark === option.value} className={mark === option.value ? "is-selected" : ""} onClick={() => onMark(student.id, option.value)}>{option.label}</button>)}</div></div></div>;
      })}
    </div>
  );
}

function AssignmentTracking({ t, group, submissions, setSubmissions }: { t: Translation; group: Group; submissions: typeof initialSubmissions; setSubmissions: React.Dispatch<React.SetStateAction<typeof initialSubmissions>> }) {
  const submitted = submissions.filter((item) => item.submitted).length;
  const remaining = submissions.length - submitted;
  return (
    <>
      <PageTitle kicker="Homework" title="The latest assignment, at a glance" subtitle="Mark the small number of missing submissions and move on with the class." />
      <GlassCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d65ff]">{group.subject} · {group.name}</p><h3 className="mt-2 text-2xl font-black text-slate-950">Newton&apos;s Laws · Questions 1-20</h3><p className="mt-1 font-semibold text-slate-500">Due before the next session · {group.time}</p></div><StatusBadge status={`${submitted}/${submissions.length} submitted`} tone={remaining ? "warning" : "success"} /></div>
        <div className="ops-submission-list mt-5">
          {submissions.map((student) => <div key={student.name} className="ops-submission-row"><span className="font-black text-slate-800">{student.name}</span><div className="flex flex-wrap items-center justify-end gap-2"><StatusBadge status={student.submitted ? "Submitted" : "Missing"} tone={student.submitted ? "success" : "danger"} />{!student.submitted && <Button variant="secondary" onClick={() => setSubmissions((items) => items.map((item) => item.name === student.name ? { ...item, submitted: true } : item))}>{t.markSubmitted}</Button>}</div></div>)}
        </div>
      </GlassCard>
    </>
  );
}

function MakeupTeacher({ t, makeup, sourceGroup, targetGroup, approveMakeup, rejectMakeup }: { t: Translation; makeup: MakeupState; sourceGroup: Group; targetGroup?: Group; approveMakeup: () => void; rejectMakeup: () => void }) {
  const isPending = makeup === "pending" && Boolean(targetGroup);
  const status = makeup === "confirmed" ? t.confirmed : makeup === "rejected" ? t.rejected : t.pending;

  if (makeup === "none" || !targetGroup) {
    return <><PageTitle kicker="Make-up" title="Replacement sessions stay simple" subtitle="Approve only the one missed class, while the regular enrollment remains unchanged." /><EmptyState title="No make-up request needs a decision right now." /></>;
  }

  return (
    <>
      <PageTitle kicker="Make-up" title="Review one replacement session" subtitle="The student keeps the regular class and uses this approval for one missed session only." />
      <GlassCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-2xl font-black text-slate-950">Mohamed Ali</h3><p className="mt-1 font-semibold text-slate-500">Requested a replacement for a missed {sourceGroup.name} session.</p></div><StatusBadge status={status} tone={makeup === "confirmed" ? "success" : makeup === "rejected" ? "danger" : "warning"} /></div>
        <dl className="ops-key-values mt-6 sm:grid-cols-2"><div><dt>Regular group</dt><dd>{sourceGroup.subject} · {sourceGroup.name}</dd></div><div><dt>Replacement</dt><dd>{targetGroup.name} · {targetGroup.days}</dd></div><div><dt>Time and room</dt><dd>{targetGroup.time} · {targetGroup.center} · {targetGroup.room}</dd></div><div><dt>Seat status</dt><dd>{seatsRemaining(targetGroup)} seats available</dd></div></dl>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row"><Button disabled={!isPending} onClick={approveMakeup}><Check size={18} /> {t.approve}</Button><Button disabled={!isPending} variant="danger" onClick={rejectMakeup}>Decline request</Button></div>
      </GlassCard>
    </>
  );
}

function PaymentsOps({ scope = "Center", records = initialPaymentRecords, groups = initialGroups, onSendReminder = () => undefined, onMarkPaid = () => undefined }: { scope?: string; records?: PaymentRecord[]; groups?: Group[]; onSendReminder?: (recordId: string) => void; onMarkPaid?: (recordId: string) => void }) {
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [locallyReminded, setLocallyReminded] = useState<string[]>([]);
  const [locallyPaid, setLocallyPaid] = useState<string[]>([]);
  const activeRecords: PaymentRecord[] = records.map((record) => locallyPaid.includes(record.id) ? { ...record, status: "paid", dueLabel: "Paid just now" } : record);
  const totals = paymentTotals(activeRecords);
  const filteredRecords = activeRecords.filter((record) => filter === "all" || record.status === filter);

  function sendReminder(record: PaymentRecord) {
    setLocallyReminded((items) => items.includes(record.id) ? items : [...items, record.id]);
    onSendReminder(record.id);
  }

  function markPaid(record: PaymentRecord) {
    setLocallyPaid((items) => items.includes(record.id) ? items : [...items, record.id]);
    onMarkPaid(record.id);
  }

  return (
    <>
      <PageTitle kicker="Payments" title={`${scope} payment desk`} subtitle="See every invoice, act on overdue families, and keep collection status current without a spreadsheet." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Expected" value={money(totals.expected)} detail={`${activeRecords.length} invoices`} />
        <StatCard label="Collected" value={money(totals.collected)} detail={`${activeRecords.filter((record) => record.status === "paid").length} paid`} />
        <StatCard label="Due" value={money(totals.due)} detail={`${activeRecords.filter((record) => record.status === "due").length} families`} />
        <StatCard label="Overdue" value={money(totals.overdue)} detail={`${activeRecords.filter((record) => record.status === "overdue").length} need follow-up`} />
      </div>
      <GlassCard className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-xl font-black text-slate-950">Invoice follow-up</h3><p className="mt-1 text-sm font-semibold text-slate-500">One place for reminders and confirmed payments.</p></div><label className="ops-inline-select"><span>Show</span><select value={filter} onChange={(event) => setFilter(event.target.value as PaymentFilter)} className="select-control"><option value="all">All invoices</option><option value="overdue">Overdue</option><option value="due">Due</option><option value="paid">Paid</option></select></label></div>
        {!filteredRecords.length ? <div className="mt-5"><EmptyState title="No invoices match this view." /></div> : <div className="ops-payment-list mt-5">{filteredRecords.map((record) => {
          const group = groups.find((item) => item.id === record.groupId);
          const reminded = record.reminderSent || locallyReminded.includes(record.id);
          const tone = record.status === "paid" ? "success" : record.status === "overdue" ? "danger" : "warning";
          const label = record.status === "paid" ? "Paid" : record.status === "overdue" ? "Overdue" : "Due";
          return <div key={record.id} className="ops-payment-row"><div className="min-w-0"><b>{record.student}</b><small>{group?.subject ?? "Class"} · {group?.name ?? "Group"} · {record.month}</small></div><div className="ops-payment-amount"><b>{money(record.amount)}</b><small>{record.dueLabel}</small></div><div className="flex flex-wrap items-center justify-end gap-2"><StatusBadge status={label} tone={tone} />{record.status !== "paid" && <Button variant="secondary" disabled={reminded} onClick={() => sendReminder(record)}><Send size={16} /> {reminded ? "Reminder queued" : "Send reminder"}</Button>}{record.status !== "paid" && <Button onClick={() => markPaid(record)}><Check size={16} /> Mark paid</Button>}</div></div>;
        })}</div>}
      </GlassCard>
    </>
  );
}

function Communications({ template, setTemplate, communicationKind, onSelectCommunicationKind, messageLogs, onSendCommunication }: { template: string; setTemplate: (value: string) => void; communicationKind?: CommunicationKind; onSelectCommunicationKind?: (kind: CommunicationKind) => void; messageLogs?: MessageLog[]; onSendCommunication?: (recipients: string) => void }) {
  const [localKind, setLocalKind] = useState<CommunicationKind>("Payment Reminder");
  const [recipientGroup, setRecipientGroup] = useState("Overdue families (3)");
  const [localLogs, setLocalLogs] = useState<MessageLog[]>([]);
  const currentKind = communicationKind ?? localKind;
  const logs = messageLogs ?? localLogs;

  function selectKind(kind: CommunicationKind) {
    if (onSelectCommunicationKind) onSelectCommunicationKind(kind);
    else setLocalKind(kind);
    setTemplate(communicationTemplates[kind]);
  }

  function send() {
    if (onSendCommunication) onSendCommunication(recipientGroup);
    else setLocalLogs((items) => [{ id: `${currentKind}-${Date.now()}`, kind: currentKind, recipients: recipientGroup, createdAt: "Just now" }, ...items].slice(0, 6));
  }

  return (
    <>
      <PageTitle kicker="WhatsApp" title="Send the useful message, not noise" subtitle="Choose a purpose, review the recipient group, then queue one clear update for families." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <GlassCard>
          <div className="template-mode-list">{(Object.keys(communicationTemplates) as CommunicationKind[]).map((kind) => <button key={kind} type="button" className={currentKind === kind ? "is-selected" : ""} onClick={() => selectKind(kind)}>{kind}</button>)}</div>
          <label className="mt-5 grid gap-2 text-sm font-black text-slate-600"><span>Recipients</span><select value={recipientGroup} onChange={(event) => setRecipientGroup(event.target.value)} className="select-control"><option>Overdue families (3)</option><option>Physics Group A parents (48)</option><option>Students absent twice (7)</option><option>All active families (292)</option></select></label>
          <textarea value={template} onChange={(event) => setTemplate(event.target.value)} className="communication-editor mt-5 min-h-64 w-full" dir="auto" />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-slate-500">Variables are filled at delivery.</p><Button onClick={send}><Send size={18} /> Queue message</Button></div>
        </GlassCard>
        <div className="grid content-start gap-4">
          <GlassCard>
            <h3 className="text-xl font-black text-slate-950">Automation rules</h3>
            <div className="ops-rule-list mt-4"><p>Attendance alert after 2 consecutive absences</p><p>Payment reminder before the due date, then after 1 and 3 days</p><p>All messages use the official center number</p></div>
            <div className="ops-variable-list mt-5">{["{{student_name}}", "{{subject}}", "{{amount}}"].map((item) => <code key={item}>{item}</code>)}</div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-black text-slate-950">Recent activity</h3><StatusBadge status={`${logs.length} queued`} tone={logs.length ? "success" : "warning"} /></div>
            {!logs.length ? <p className="mt-4 text-sm font-semibold text-slate-500">No messages have been queued in this demo session.</p> : <div className="ops-message-log mt-4">{logs.map((entry) => <div key={entry.id}><b>{entry.kind}</b><small>{entry.recipients} · {entry.createdAt}</small></div>)}</div>}
          </GlassCard>
        </div>
      </div>
    </>
  );
}

function Reports({ waitingTotal, groups = initialGroups, paymentRecords = initialPaymentRecords, attendanceRate = 94 }: { waitingTotal: number; groups?: Group[]; paymentRecords?: PaymentRecord[]; attendanceRate?: number }) {
  const [view, setView] = useState<"all" | "demand" | "capacity">("all");
  const [exported, setExported] = useState(false);
  const totals = paymentTotals(paymentRecords);
  const collectionRate = totals.expected ? Math.round((totals.collected / totals.expected) * 100) : 0;
  const capacityRate = groups.length ? Math.round(groups.reduce((sum, group) => sum + occupancy(group), 0) / groups.length) : 0;
  const displayedGroups = groups.filter((group) => {
    if (view === "demand") return group.waiting >= 10;
    if (view === "capacity") return occupancy(group) >= 90;
    return true;
  });

  function exportCsv() {
    const rows = ["Group,Subject,Enrolled,Capacity,Waiting,Monthly fee", ...groups.map((group) => `${group.name},${group.subject},${group.students},${group.capacity},${group.waiting},${group.price}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "levelup-center-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
  }

  return (
    <>
      <PageTitle kicker="Reports" title="Signals that lead to an action" subtitle="Review capacity, demand, collection, and attendance without turning the dashboard into a spreadsheet." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Attendance" value={`${attendanceRate}%`} detail="Across active classes" /><StatCard label="Collection" value={`${collectionRate}%`} detail={`${money(totals.collected)} collected`} /><StatCard label="Capacity" value={`${capacityRate}%`} detail="Average fill rate" /><StatCard label="Waitlist" value={String(waitingTotal)} detail="Students waiting" /></div>
      <GlassCard className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-xl font-black text-slate-950">Group performance</h3><p className="mt-1 text-sm font-semibold text-slate-500">Filter the groups that need a decision, then export the current view.</p></div><div className="flex flex-wrap items-center gap-2"><label className="ops-inline-select"><span>View</span><select value={view} onChange={(event) => setView(event.target.value as typeof view)} className="select-control"><option value="all">All groups</option><option value="demand">High demand</option><option value="capacity">At capacity</option></select></label><Button variant="secondary" onClick={exportCsv}><Download size={17} /> {exported ? "Exported" : "Export CSV"}</Button></div></div>
        {!displayedGroups.length ? <div className="mt-5"><EmptyState title="No groups match this report view." /></div> : <div className="ops-report-list mt-5">{displayedGroups.map((group) => <div key={group.id} className="ops-report-row"><div className="min-w-0"><b>{group.subject} · {group.name}</b><small>{group.center} · {group.room} · {group.days}</small></div><div className="min-w-[130px]"><CapacityMeter group={group} /><small className="mt-2 block text-end font-bold text-slate-500">{group.students}/{group.capacity} enrolled</small></div><div className="text-end"><b>{group.waiting} waiting</b><small>{seatsRemaining(group)} seats open</small></div></div>)}</div>}
      </GlassCard>
    </>
  );
}

function AssistantView(props: {
  tab: string; t: Translation; groups: Group[]; operationGroup: Group; onSelectGroup: (groupId: string) => void; submissions: typeof initialSubmissions; setSubmissions: React.Dispatch<React.SetStateAction<typeof initialSubmissions>>;
  sessionActive: boolean; attendanceStarted: boolean; attendance: AttendanceState; qrTick: number; qrVersion: number; attendanceGroup: Group; attendanceSummary: AttendanceSummary; attendanceRoster: RosterStudent[]; attendanceMarks: Record<string, AttendanceMark>; startAttendance: (groupId?: string) => void; refreshQr: () => void; endAttendance: () => void; markAttendance: (studentId: string, mark: AttendanceMark) => void;
  makeup: MakeupState; makeupSourceGroup: Group; makeupTargetGroup?: Group; approveMakeup: () => void; rejectMakeup: () => void; onNavigate: (tab: string) => void;
}) {
  const p = props;
  if (p.tab === "attendance") return <AttendanceDesk audience="assistant" t={p.t} groups={p.groups} group={p.attendanceGroup} onSelectGroup={p.onSelectGroup} sessionActive={p.sessionActive} attendanceStarted={p.attendanceStarted} attendance={p.attendance} qrTick={p.qrTick} qrVersion={p.qrVersion} summary={p.attendanceSummary} roster={p.attendanceRoster} marks={p.attendanceMarks} startAttendance={p.startAttendance} refreshQr={p.refreshQr} endAttendance={p.endAttendance} markAttendance={p.markAttendance} />;
  if (p.tab === "assignments") return <AssignmentTracking t={p.t} group={p.operationGroup} submissions={p.submissions} setSubmissions={p.setSubmissions} />;
  if (p.tab === "makeup") return <MakeupTeacher t={p.t} makeup={p.makeup} sourceGroup={p.makeupSourceGroup} targetGroup={p.makeupTargetGroup} approveMakeup={p.approveMakeup} rejectMakeup={p.rejectMakeup} />;
  return <AssistantDashboard t={p.t} groups={p.groups} group={p.operationGroup} onSelectGroup={p.onSelectGroup} sessionActive={p.sessionActive} attendanceStarted={p.attendanceStarted} attendanceSummary={p.attendanceSummary} submissions={p.submissions} makeup={p.makeup} startAttendance={p.startAttendance} onNavigate={p.onNavigate} />;
}

function AssistantDashboard({ t, groups, group, onSelectGroup, sessionActive, attendanceStarted, attendanceSummary, submissions, makeup, startAttendance, onNavigate }: {
  t: Translation; groups: Group[]; group: Group; onSelectGroup: (groupId: string) => void; sessionActive: boolean; attendanceStarted: boolean; attendanceSummary: AttendanceSummary; submissions: typeof initialSubmissions; makeup: MakeupState; startAttendance: (groupId?: string) => void; onNavigate: (tab: string) => void;
}) {
  const submitted = submissions.filter((student) => student.submitted).length;

  function openCheckIn() {
    if (!sessionActive) startAttendance(group.id);
    onNavigate("attendance");
  }

  return (
    <>
      <PageTitle kicker="Assistant shift" title="Everything needed at the door" subtitle="Choose the class, keep check-in moving, then clear the small exceptions that need a person." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.attendance} value={sessionActive ? `${attendanceSummary.checkedIn}/${attendanceSummary.total}` : attendanceStarted ? "Closed" : "Ready"} detail={sessionActive ? "Live check-ins" : "Today's class"} />
        <StatCard label={t.assignments} value={`${submitted}/${submissions.length}`} detail="Latest assignment" />
        <StatCard label={t.students} value={String(group.students)} detail={group.name} />
        <StatCard label={t.makeup} value={makeup === "pending" ? "1" : "0"} detail={makeup === "pending" ? "Needs a decision" : "Nothing waiting"} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_0.92fr]">
        <GlassCard>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d65ff]">Next class</p><h3 className="mt-2 text-3xl font-black text-slate-950">{group.subject} · {group.name}</h3><p className="mt-2 font-semibold text-slate-500">{group.days} · {group.time} · {group.center} · {group.room}</p></div><StatusBadge status={sessionActive ? "Live now" : "Ready"} tone="success" /></div>
          <div className="mt-5"><GroupPicker label="Working group" groups={groups} group={group} onSelectGroup={onSelectGroup} disabled={sessionActive} /></div>
          <Button className="mt-5 w-full sm:w-auto" onClick={openCheckIn}><UserCheck size={18} /> {sessionActive ? "Open check-in desk" : t.startAttendance}</Button>
        </GlassCard>
        <GlassCard>
          <h3 className="text-xl font-black text-slate-950">Quick handoff</h3>
          <div className="ops-action-list mt-4">
            <button type="button" className="ops-action-row" onClick={() => onNavigate("attendance")}><span className="ops-action-icon"><QrCode size={18} aria-hidden="true" /></span><span><b>Attendance</b><small>{sessionActive ? `${attendanceSummary.pending} still pending` : "Open the check-in desk"}</small></span><ChevronRight size={18} aria-hidden="true" /></button>
            <button type="button" className="ops-action-row" onClick={() => onNavigate("assignments")}><span className="ops-action-icon"><ClipboardCheck size={18} aria-hidden="true" /></span><span><b>Homework</b><small>{submissions.length - submitted} submissions need a mark</small></span><ChevronRight size={18} aria-hidden="true" /></button>
            <button type="button" className="ops-action-row" onClick={() => onNavigate("makeup")}><span className="ops-action-icon"><CalendarCheck2 size={18} aria-hidden="true" /></span><span><b>Make-up</b><small>{makeup === "pending" ? "One request is waiting" : "No request waiting"}</small></span><ChevronRight size={18} aria-hidden="true" /></button>
          </div>
        </GlassCard>
      </div>
    </>
  );
}

function CenterView({ tab, t, groups, waitingTotal, paymentRecords, onSendPaymentReminder, onMarkPaymentPaid, template, setTemplate, communicationKind, onSelectCommunicationKind, messageLogs, onSendCommunication, createGroupFromWaitingList, onNavigate }: {
  tab: string; t: Translation; groups: Group[]; waitingTotal: number; paymentRecords: PaymentRecord[]; onSendPaymentReminder: (recordId: string) => void; onMarkPaymentPaid: (recordId: string) => void; template: string; setTemplate: (value: string) => void; communicationKind: CommunicationKind; onSelectCommunicationKind: (kind: CommunicationKind) => void; messageLogs: MessageLog[]; onSendCommunication: (recipients: string) => void; createGroupFromWaitingList: (group?: Group) => void; onNavigate: (tab: string) => void;
}) {
  if (tab === "teachers") return <TeachersCenter groups={groups} paymentRecords={paymentRecords} onNavigate={onNavigate} />;
  if (tab === "groups") return <CenterGroups t={t} groups={groups} createGroupFromWaitingList={createGroupFromWaitingList} />;
  if (tab === "payments") return <PaymentsOps scope="Center" records={paymentRecords} groups={groups} onSendReminder={onSendPaymentReminder} onMarkPaid={onMarkPaymentPaid} />;
  if (tab === "communications" || tab === "settings") return <Communications template={template} setTemplate={setTemplate} communicationKind={communicationKind} onSelectCommunicationKind={onSelectCommunicationKind} messageLogs={messageLogs} onSendCommunication={onSendCommunication} />;
  if (tab === "reports") return <Reports waitingTotal={waitingTotal} groups={groups} paymentRecords={paymentRecords} />;
  return <CenterDashboard groups={groups} paymentRecords={paymentRecords} waitingTotal={waitingTotal} messageLogs={messageLogs} createGroupFromWaitingList={createGroupFromWaitingList} onNavigate={onNavigate} />;
}

function CenterDashboard({ groups, paymentRecords, waitingTotal, messageLogs, createGroupFromWaitingList, onNavigate }: { groups: Group[]; paymentRecords: PaymentRecord[]; waitingTotal: number; messageLogs: MessageLog[]; createGroupFromWaitingList: (group?: Group) => void; onNavigate: (tab: string) => void }) {
  const totals = paymentTotals(paymentRecords);
  const students = groups.reduce((sum, group) => sum + group.students, 0);
  const availableSeats = groups.reduce((sum, group) => sum + seatsRemaining(group), 0);
  const highDemand = [...groups].filter((group) => group.waiting >= 10 || occupancy(group) >= 96).sort((left, right) => right.waiting - left.waiting);
  const priorityGroup = highDemand[0] ?? groups[0];
  const actions = [
    { tab: "payments", icon: CircleDollarSign, title: `${paymentRecords.filter((record) => record.status === "overdue").length} overdue invoices`, detail: `${money(totals.overdue)} needs follow-up` },
    { tab: "groups", icon: Users, title: `${highDemand.length} groups need capacity review`, detail: `${waitingTotal} students are waiting` },
    { tab: "communications", icon: MessageCircle, title: messageLogs.length ? `${messageLogs.length} messages queued` : "Prepare the next family update", detail: messageLogs.length ? messageLogs[0].recipients : "Payment and attendance templates are ready" },
    { tab: "teachers", icon: GraduationCap, title: "Review teacher pressure", detail: "Demand, seats, and collection by instructor" },
  ];

  return (
    <>
      <PageTitle kicker="Center control" title="A few decisions keep the center moving" subtitle="Prioritize capacity, collection, and parent communication from one calm operations view." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Students" value={String(students)} detail={`${teachers.length} instructors`} /><StatCard label="Groups" value={String(groups.length)} detail={`${availableSeats} seats open`} /><StatCard label="Collection" value={money(totals.collected)} detail={`${money(totals.due)} due`} /><StatCard label="Overdue" value={money(totals.overdue)} detail={`${paymentRecords.filter((record) => record.status === "overdue").length} families`} /></div>
      <div className="mt-4 grid gap-4 xl:items-start xl:grid-cols-[minmax(0,1.12fr)_0.88fr]">
        <GlassCard className="editorial-center-demand-panel">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d65ff]">Demand decision</p><h3 className="mt-2 text-3xl font-black text-slate-950">{priorityGroup.subject} · {priorityGroup.name}</h3><p className="mt-2 font-semibold text-slate-500">{priorityGroup.waiting} students are waiting while {priorityGroup.students}/{priorityGroup.capacity} seats are occupied.</p></div><StatusBadge status={priorityGroup.waiting >= 10 ? "High demand" : "Stable"} tone={priorityGroup.waiting >= 10 ? "warning" : "success"} /></div>
          <div className="mt-5"><CapacityMeter group={priorityGroup} /></div>
          <div className="ops-focus-meta mt-4"><span>{seatsRemaining(priorityGroup)} seats open</span><span>{priorityGroup.days} · {priorityGroup.time}</span><span>{priorityGroup.center} · {priorityGroup.room}</span></div>
          <Button className="mt-5" onClick={() => createGroupFromWaitingList(priorityGroup)}><Plus size={18} /> Open recommended group</Button>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-950">Action queue</h3><p className="mt-1 text-sm font-semibold text-slate-500">The shortest route to an outcome.</p></div><StatusBadge status={`${actions.length} actions`} tone="warning" /></div>
          <div className="ops-action-list mt-4">{actions.map((action) => { const Icon = action.icon; return <button key={action.tab} type="button" className="ops-action-row" onClick={() => onNavigate(action.tab)}><span className="ops-action-icon"><Icon size={18} aria-hidden="true" /></span><span><b>{action.title}</b><small>{action.detail}</small></span><ChevronRight size={18} aria-hidden="true" /></button>; })}</div>
        </GlassCard>
      </div>
      <GlassCard className="mt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-xl font-black text-slate-950">Capacity watch</h3><p className="mt-1 text-sm font-semibold text-slate-500">Groups with pressure are visible before a family leaves the waitlist.</p></div><Button variant="secondary" onClick={() => onNavigate("groups")}>Open groups</Button></div>
        <div className="ops-demand-list mt-5">{highDemand.slice(0, 3).map((group) => <div key={group.id}><div><b>{group.subject} · {group.name}</b><small>{group.center} · {group.time}</small></div><div className="min-w-[140px]"><CapacityMeter group={group} /><small>{group.students}/{group.capacity} enrolled</small></div><StatusBadge status={`${group.waiting} waiting`} tone="warning" /></div>)}</div>
      </GlassCard>
    </>
  );
}

function CenterGroups({ t, groups, createGroupFromWaitingList }: { t: Translation; groups: Group[]; createGroupFromWaitingList: (group?: Group) => void }) {
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const visibleGroups = groups.filter((group) => teacherFilter === "all" || group.teacherId === teacherFilter);
  const selectedGroup = visibleGroups.find((group) => group.id === selectedGroupId) ?? visibleGroups[0] ?? groups[0];

  return (
    <>
      <PageTitle kicker="Groups" title="Capacity decisions are visible before they become a problem" subtitle="Filter the operation by instructor, then review the group that needs the next decision." />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><label className="ops-inline-select"><span>Instructor</span><select value={teacherFilter} onChange={(event) => setTeacherFilter(event.target.value)} className="select-control"><option value="all">All instructors</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label><p className="text-sm font-semibold text-slate-500">{visibleGroups.length} groups shown</p></div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="grid gap-3" aria-label="Center groups">{visibleGroups.map((group) => { const seats = seatsRemaining(group); const isSelected = selectedGroup?.id === group.id; return <button key={group.id} type="button" aria-pressed={isSelected} className={`ops-group-row ${isSelected ? "is-selected" : ""}`} onClick={() => setSelectedGroupId(group.id)}><div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 text-start"><p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d65ff]">{group.subject}</p><h3 className="mt-2 text-2xl font-black text-slate-950">{group.name}</h3><p className="mt-1 truncate font-semibold text-slate-500">{group.days} · {group.time} · {group.center} · {group.room}</p></div><StatusBadge status={seats ? `${seats} seats left` : t.full} tone={seats ? "success" : "danger"} /></div><CapacityMeter group={group} /><div className="ops-group-foot"><span>{group.students}/{group.capacity} enrolled</span><span>{group.waiting} waiting</span><span>{money(group.price)}/month</span></div></button>; })}</section>{selectedGroup && <GlassCard><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-slate-950">{selectedGroup.subject} · {selectedGroup.name}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{selectedGroup.center} · {selectedGroup.room}</p></div><StatusBadge status={selectedGroup.waiting >= 10 ? "High demand" : "Stable"} tone={selectedGroup.waiting >= 10 ? "warning" : "success"} /></div><dl className="ops-key-values mt-5"><div><dt>Capacity</dt><dd>{selectedGroup.students}/{selectedGroup.capacity}</dd></div><div><dt>Open seats</dt><dd>{seatsRemaining(selectedGroup)}</dd></div><div><dt>Waiting</dt><dd>{selectedGroup.waiting}</dd></div><div><dt>Monthly fee</dt><dd>{money(selectedGroup.price)}</dd></div></dl><Button className="mt-5 w-full" disabled={selectedGroup.waiting < 10} onClick={() => createGroupFromWaitingList(selectedGroup)}><Plus size={18} /> Open recommended group</Button></GlassCard>}</div>
    </>
  );
}

function TeachersCenter({ groups, paymentRecords, onNavigate }: { groups: Group[]; paymentRecords: PaymentRecord[]; onNavigate: (tab: string) => void }) {
  const teacherRows = teachers.map((teacher) => {
    const teacherGroups = groups.filter((group) => group.teacherId === teacher.id);
    const teacherPayments = paymentRecords.filter((record) => record.teacherId === teacher.id);
    const totals = paymentTotals(teacherPayments);
    return { teacher, groups: teacherGroups, waiting: teacherGroups.reduce((sum, group) => sum + group.waiting, 0), enrolled: teacherGroups.reduce((sum, group) => sum + group.students, 0), overdue: totals.overdue };
  });

  return (
    <>
      <PageTitle kicker="Instructors" title="See who needs support before the day gets busy" subtitle="Demand, filled seats, and payment follow-up are grouped by instructor instead of scattered across screens." />
      <div className="grid gap-3 xl:grid-cols-3">{teacherRows.map((row) => <GlassCard key={row.teacher.id}><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-slate-950">{row.teacher.name}</h3><p className="mt-1 text-sm font-semibold text-slate-500">{row.teacher.subject} · {row.teacher.location}</p></div><StatusBadge status={row.waiting >= 15 ? "High demand" : "Stable"} tone={row.waiting >= 15 ? "warning" : "success"} /></div><dl className="ops-key-values mt-5"><div><dt>Groups</dt><dd>{row.groups.length}</dd></div><div><dt>Enrolled</dt><dd>{row.enrolled}</dd></div><div><dt>Waiting</dt><dd>{row.waiting}</dd></div><div><dt>Overdue</dt><dd>{money(row.overdue)}</dd></div></dl></GlassCard>)}</div>
      <GlassCard className="mt-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-xl font-black text-slate-950">Instructor capacity</h3><p className="mt-1 text-sm font-semibold text-slate-500">Review each instructor&apos;s groups and make capacity decisions from the group workspace.</p></div><Button onClick={() => onNavigate("groups")}>Open groups</Button></div></GlassCard>
    </>
  );
}

function Notice({ tone, text }: { tone: "warn" | "error"; text: string }) {
  return <p role="alert" className={`notice-card mt-4 rounded-[18px] p-4 text-sm font-black ${tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{text}</p>;
}


