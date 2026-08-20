export type Teacher = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  rating: number;
  experience: string;
  location: string;
  verified: boolean;
  students: number;
  avatarUrl?: string;
};

export type Group = {
  id: string;
  teacherId: string;
  subject: string;
  grade: string;
  name: string;
  days: string;
  time: string;
  center: string;
  room: string;
  capacity: number;
  students: number;
  waiting: number;
  price: number;
};

export type PaymentRecord = {
  id: string;
  student: string;
  teacherId: string;
  groupId: string;
  month: string;
  amount: number;
  status: "paid" | "due" | "overdue";
  dueLabel: string;
  reminderSent: boolean;
};

export const teachers: Teacher[] = [
  {
    id: "ahmed",
    name: "Ahmed Mohamed",
    subject: "Physics",
    grade: "3rd Secondary",
    rating: 4.9,
    experience: "8+ years experience",
    location: "Ismailia",
    verified: true,
    students: 248,
  },
  {
    id: "mariam",
    name: "Mariam Ahmed",
    subject: "Chemistry",
    grade: "2nd Secondary",
    rating: 4.8,
    experience: "6+ years experience",
    location: "Cairo",
    verified: true,
    students: 181,
  },
  {
    id: "omar",
    name: "Omar Hassan",
    subject: "Mathematics",
    grade: "1st Secondary",
    rating: 4.7,
    experience: "5+ years experience",
    location: "Alexandria",
    verified: true,
    students: 164,
  },
];

export const initialGroups: Group[] = [
  { id: "a", teacherId: "ahmed", subject: "Physics", grade: "3rd Secondary", name: "Group A", days: "Saturday / Tuesday", time: "5:00 PM", center: "Center A", room: "Room 2", capacity: 50, students: 48, waiting: 23, price: 400 },
  { id: "b", teacherId: "ahmed", subject: "Physics", grade: "3rd Secondary", name: "Group B", days: "Sunday / Wednesday", time: "7:00 PM", center: "Center A", room: "Room 4", capacity: 50, students: 42, waiting: 11, price: 400 },
  { id: "c", teacherId: "ahmed", subject: "Physics", grade: "3rd Secondary", name: "Group C", days: "Monday / Thursday", time: "6:00 PM", center: "Center B", room: "Room 1", capacity: 50, students: 50, waiting: 18, price: 420 },
  { id: "d", teacherId: "mariam", subject: "Chemistry", grade: "2nd Secondary", name: "Group A", days: "Sunday / Thursday", time: "6:00 PM", center: "Center C", room: "Room 4", capacity: 45, students: 37, waiting: 8, price: 420 },
  { id: "e", teacherId: "mariam", subject: "Chemistry", grade: "2nd Secondary", name: "Group B", days: "Monday / Wednesday", time: "4:30 PM", center: "Center C", room: "Room 1", capacity: 45, students: 45, waiting: 14, price: 420 },
  { id: "f", teacherId: "omar", subject: "Mathematics", grade: "1st Secondary", name: "Group A", days: "Saturday / Wednesday", time: "7:00 PM", center: "Center B", room: "Room 1", capacity: 40, students: 31, waiting: 5, price: 380 },
  { id: "g", teacherId: "omar", subject: "Mathematics", grade: "1st Secondary", name: "Group B", days: "Monday / Thursday", time: "5:30 PM", center: "Center B", room: "Room 3", capacity: 40, students: 39, waiting: 7, price: 380 },
];

export const waitingStudents = [
  { name: "Mohamed Ali", time: "7-9 PM", days: "Sunday / Wednesday", joined: "Sep 2" },
  { name: "Omar Hassan", time: "7-9 PM", days: "Sunday / Wednesday", joined: "Sep 3" },
  { name: "Youssef Samir", time: "5-7 PM", days: "Saturday / Tuesday", joined: "Sep 4" },
  { name: "Mariam Ahmed", time: "5-7 PM", days: "Monday / Thursday", joined: "Sep 5" },
];

export const submissions = [
  { name: "Ahmed Ali", submitted: true },
  { name: "Omar Hassan", submitted: true },
  { name: "Mohamed Samir", submitted: false },
  { name: "Youssef Samir", submitted: false },
  { name: "Mariam Ahmed", submitted: true },
  { name: "Nour Khaled", submitted: true },
];

export const initialPaymentRecords: PaymentRecord[] = [
  { id: "invoice-mohamed", student: "Mohamed Ali", teacherId: "ahmed", groupId: "a", month: "October", amount: 400, status: "due", dueLabel: "Due today", reminderSent: false },
  { id: "invoice-omar", student: "Omar Hassan", teacherId: "ahmed", groupId: "b", month: "October", amount: 400, status: "overdue", dueLabel: "3 days overdue", reminderSent: false },
  { id: "invoice-youssef", student: "Youssef Samir", teacherId: "ahmed", groupId: "c", month: "October", amount: 420, status: "overdue", dueLabel: "7 days overdue", reminderSent: false },
  { id: "invoice-nour", student: "Nour Khaled", teacherId: "ahmed", groupId: "a", month: "October", amount: 400, status: "paid", dueLabel: "Paid Sep 28", reminderSent: false },
  { id: "invoice-salma", student: "Salma Adel", teacherId: "mariam", groupId: "d", month: "October", amount: 420, status: "due", dueLabel: "Due tomorrow", reminderSent: false },
  { id: "invoice-hany", student: "Hany Mostafa", teacherId: "omar", groupId: "f", month: "October", amount: 380, status: "paid", dueLabel: "Paid Sep 29", reminderSent: false },
  { id: "invoice-jana", student: "Jana Ashraf", teacherId: "omar", groupId: "g", month: "October", amount: 380, status: "paid", dueLabel: "Paid Sep 30", reminderSent: false },
  { id: "invoice-reem", student: "Reem Ahmed", teacherId: "mariam", groupId: "e", month: "October", amount: 420, status: "overdue", dueLabel: "2 days overdue", reminderSent: false },
];

export const whatsappTemplate =
  "مرحبًا،\n\nنود تذكير حضرتك بأن اشتراك الطالب {{student_name}} في {{subject}} مستحق.\n\nقيمة الاشتراك: {{amount}}\n\nيمكنكم إتمام الدفع من خلال LevelUp.\n\nشكرًا لتعاونكم.";
