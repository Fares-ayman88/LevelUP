import {
  AutoAwesome,
  CalendarMonth,
  CheckCircle,
  CloudQueue,
  Close,
  Devices,
  FilterAlt,
  Groups,
  Lock,
  Menu,
  Payments,
  Psychology,
  School,
  WorkspacePremium,
} from '@mui/icons-material';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useMemo, useRef, useState } from 'react';

gsap.registerPlugin(ScrollTrigger);

const launchAt = new Date('2026-06-20T18:00:00+03:00');
const projectWebsiteUrl = import.meta.env.VITE_LEVELUP_WEBSITE_URL || '/home';
const brandLogo = new URL('../../new-demo/assets/logo/SVG/Group 6976.svg', import.meta.url).href;
const previewImages = {
  chatbot: new URL('../../new-demo/assets/optimized/preview-chatbot.webp', import.meta.url).href,
  filter: new URL('../../new-demo/assets/optimized/preview-filter.webp', import.meta.url).href,
  certificate: new URL('../../new-demo/assets/optimized/preview-certificate.webp', import.meta.url).href,
};

const teamMembers = [
  {
    name: 'Fares Ayman',
    role: { en: 'Front-End Developer', ar: 'مطور واجهات أمامية' },
    team: { en: 'Front-End', ar: 'فريق الواجهات' },
    image: new URL('../../new-demo/assets/optimized/fares.webp', import.meta.url).href,
  },
  {
    name: 'Karim Hassan',
    role: { en: 'Front-End Developer', ar: 'مطور واجهات أمامية' },
    team: { en: 'Front-End', ar: 'فريق الواجهات' },
    image: new URL('../../new-demo/assets/optimized/karim.webp', import.meta.url).href,
  },
  {
    name: 'Abdallah Elsayed Desawy',
    role: { en: 'Back-End Developer', ar: 'مطور خلفية' },
    team: { en: 'Back-End', ar: 'فريق الخلفية' },
    image: new URL('../../new-demo/assets/optimized/abdallah-elsayed.webp', import.meta.url).href,
  },
  {
    name: 'Mariam Mohamed Mostafa',
    role: { en: 'Back-End Developer', ar: 'مطورة خلفية' },
    team: { en: 'Back-End', ar: 'فريق الخلفية' },
    image: new URL('../../new-demo/assets/optimized/mariam.webp', import.meta.url).href,
  },
  {
    name: 'Ahmed Mohamed Mostafa',
    role: { en: 'Mobile App Developer', ar: 'مطور تطبيقات موبايل' },
    team: { en: 'Mobile', ar: 'فريق الموبايل' },
    image: new URL('../../new-demo/assets/optimized/ahmed-mohamed-mobile.webp', import.meta.url).href,
  },
  {
    name: 'Ahmed Said Abdelmotelb',
    role: { en: 'Mobile App Developer', ar: 'مطور تطبيقات موبايل' },
    team: { en: 'Mobile', ar: 'فريق الموبايل' },
    image: new URL('../../new-demo/assets/optimized/ahmed-said.webp', import.meta.url).href,
  },
  {
    name: 'Mahmoud Mohamed Mostafa',
    role: { en: 'Mobile App Developer', ar: 'مطور تطبيقات موبايل' },
    team: { en: 'Mobile', ar: 'فريق الموبايل' },
    image: new URL('../../new-demo/assets/optimized/mahmoud.webp', import.meta.url).href,
  },
  {
    name: 'Abdallah Mohamed Ali',
    role: { en: 'UI/UX Designer', ar: 'مصمم تجربة وواجهة المستخدم' },
    team: { en: 'UI/UX', ar: 'فريق التصميم' },
    image: new URL('../../new-demo/assets/optimized/abdallah-ui.webp', import.meta.url).href,
  },
  {
    name: 'Ahmed Mohamed Abdelfatah',
    role: { en: 'UI/UX Designer', ar: 'مصمم تجربة وواجهة المستخدم' },
    team: { en: 'UI/UX', ar: 'فريق التصميم' },
    image: new URL('../../new-demo/assets/optimized/ahmed-ui.webp', import.meta.url).href,
  },
  {
    name: 'Mohamed Abo Alnour',
    role: { en: 'UI/UX Designer', ar: 'مصمم تجربة وواجهة المستخدم' },
    team: { en: 'UI/UX', ar: 'فريق التصميم' },
    image: new URL('../../new-demo/assets/optimized/mohamed-ui.webp', import.meta.url).href,
  },
];

const valueProps = [
  {
    title: 'Find the right course faster.',
    text: 'Smart filtering helps learners move from endless browsing to confident decisions.',
    icon: FilterAlt,
  },
  {
    title: 'Learn with support, not silence.',
    text: 'The AI assistant explains, summarizes, recommends, and helps students stay unstuck.',
    icon: Psychology,
  },
  {
    title: 'Everything feels organized.',
    text: 'Lessons, quizzes, progress, payments, and certificates live in one polished experience.',
    icon: CheckCircle,
  },
];

const features = [
  { title: 'Personal learning dashboard', text: 'A clear home for courses, progress, saved content, and next steps.', icon: School },
  { title: 'Instructor workspace', text: 'A focused space for building courses, uploading lessons, and managing learning material.', icon: Groups },
  { title: 'AI learning assistant', text: 'Contextual support for explanations, summaries, recommendations, and generated practice.', icon: AutoAwesome },
  { title: 'Mobile-ready learning', text: 'A companion mobile experience for students who learn on the move.', icon: Devices },
  { title: 'Secure payments', text: 'A cleaner payment journey with receipts and transaction tracking.', icon: Payments },
  { title: 'Progress and certificates', text: 'Visible milestones that turn learning effort into measurable achievement.', icon: WorkspacePremium },
  { title: 'Protected experience', text: 'Authentication and role-aware access keep each workflow focused and private.', icon: Lock },
  { title: 'Cloud media delivery', text: 'Course videos, files, and profile assets are built for reliable delivery.', icon: CloudQueue },
];

const journey = [
  'Create account',
  'Pick interests',
  'Discover courses',
  'Ask AI',
  'Learn by lessons',
  'Practice quizzes',
  'Track progress',
  'Earn certificate',
];

const stats = [
  ['Smarter', 'course discovery'],
  ['Faster', 'learning decisions'],
  ['Cleaner', 'instructor workflow'],
  ['Guided', 'student progress'],
];

const teamStars = [
  [8, 12, 2, 0.38], [15, 28, 1, 0.28], [22, 9, 1.5, 0.34], [31, 21, 2.5, 0.22],
  [43, 14, 1, 0.3], [55, 26, 2, 0.26], [66, 11, 1.5, 0.36], [78, 23, 2, 0.28],
  [90, 16, 1, 0.34], [6, 46, 1.5, 0.25], [18, 58, 2, 0.32], [29, 43, 1, 0.3],
  [38, 63, 2.5, 0.2], [49, 49, 1.5, 0.34], [61, 59, 1, 0.28], [72, 45, 2, 0.3],
  [84, 66, 1.5, 0.26], [94, 51, 2, 0.22], [11, 78, 1, 0.3], [24, 88, 2, 0.25],
  [35, 76, 1.5, 0.32], [47, 91, 1, 0.26], [58, 81, 2.5, 0.2], [69, 92, 1.5, 0.34],
  [81, 78, 1, 0.28], [91, 87, 2, 0.24], [13, 7, 1, 0.3], [52, 8, 1, 0.22],
  [74, 5, 1.5, 0.28], [97, 34, 1, 0.3], [3, 68, 2, 0.18], [57, 38, 1, 0.34],
  [33, 34, 1.5, 0.24], [88, 39, 1.5, 0.3], [41, 6, 1, 0.26], [63, 72, 1, 0.28],
  [7, 52, 1.5, 0.36], [12, 61, 2, 0.3], [17, 70, 1, 0.34], [21, 83, 1.5, 0.32],
  [27, 56, 2.5, 0.24], [32, 67, 1, 0.38], [37, 86, 2, 0.28], [42, 73, 1.5, 0.36],
  [46, 58, 1, 0.3], [51, 69, 2, 0.34], [56, 90, 1.5, 0.28], [62, 54, 2.5, 0.22],
  [67, 64, 1, 0.36], [71, 84, 2, 0.3], [76, 57, 1.5, 0.34], [82, 72, 1, 0.32],
  [87, 90, 2.5, 0.22], [93, 62, 1.5, 0.36], [96, 76, 1, 0.3], [5, 91, 2, 0.24],
  [15, 94, 1, 0.34], [25, 97, 1.5, 0.28], [44, 96, 1, 0.36], [73, 96, 1.5, 0.3],
];

const techItems = [
  { en: 'React', ar: 'React' },
  { en: 'Flutter', ar: 'Flutter' },
  { en: 'Node.js', ar: 'Node.js' },
  { en: 'AI Assistant', ar: 'مساعد ذكي' },
  { en: 'Cloud Storage', ar: 'تخزين سحابي' },
  { en: 'Secure Auth', ar: 'تسجيل آمن' },
];

const pageCopy = {
  en: {
    nav: [
      ['Team', 'team'],
      ['Why us', 'why'],
      ['Built for', 'built-for'],
      ['Experience', 'experience'],
      ['Preview', 'preview'],
      ['Tech', 'tech'],
    ],
    open: 'View Project',
    heroKicker: 'The creators of LevelUP',
    heroTitle: 'Built by a team that understands how learning should feel.',
    heroText:
      'LevelUP is a premium learning experience for students and instructors: smarter discovery, guided learning, cleaner publishing, and AI assistance in one elegant platform.',
    stats,
    why: {
      eyebrow: 'Why us',
      title: 'Because choosing what to learn should not be the hard part.',
      text: 'LevelUP is designed to reduce friction from the learning journey. It helps students discover the right course, stay guided, and finish with visible progress.',
    },
    builtFor: {
      eyebrow: 'Built for',
      title: 'Made for everyone inside the learning journey.',
      text: 'LevelUP connects the people who learn, teach, and create educational content in one polished experience.',
      items: [
        ['Students', 'Find the right course, stay guided, and track every milestone.'],
        ['Instructors', 'Publish learning content with less friction and clearer structure.'],
        ['Self-learners', 'Use AI support and smart discovery to keep momentum.'],
        ['Course creators', 'Turn knowledge into a clean, organized digital product.'],
      ],
    },
    valueProps,
    beforeAfter: {
      eyebrow: 'Before / After',
      title: 'From scattered learning to a guided experience.',
      before: {
        label: 'Before LevelUP',
        points: ['Too many course choices', 'No clear learning path', 'Progress feels invisible', 'Support is hard to reach'],
      },
      after: {
        label: 'After LevelUP',
        points: ['Smart course discovery', 'Guided progress tracking', 'AI support while learning', 'Certificates that show achievement'],
      },
    },
    experience: {
      eyebrow: 'The experience',
      title: 'A learning platform that feels calm, fast, and personal.',
      text: 'Every feature is shaped around a simple promise: less confusion, more progress.',
    },
    features,
    flow: {
      eyebrow: 'Learning flow',
      title: 'From curiosity to certificate.',
      text: 'LevelUP turns the path into a guided product journey: choose, learn, ask, practice, progress, complete.',
    },
    journey,
    preview: {
      eyebrow: 'Product preview',
      title: 'A focused look at the experience.',
      text: 'A small preview of the features we can show before discussion day: smart filtering, AI help, and certificates.',
      items: [
        { title: 'Smart course filtering', text: 'Help learners narrow choices quickly and confidently.', image: previewImages.filter },
        { title: 'AI learning assistant', text: 'A helpful companion for questions, summaries, and guidance.', image: previewImages.chatbot },
        { title: 'Certificate journey', text: 'Progress becomes a visible achievement students can keep.', image: previewImages.certificate },
      ],
    },
    closingTitle: 'LevelUP is not just an LMS. It is a smarter learning journey.',
    closingText: 'A polished product experience that helps learners choose better, move faster, and finish with confidence.',
    supervisor: 'Supervisor',
    assistant: 'Teaching Assistant',
    launchBadge: 'Launch moment',
    launchTitle: 'The link opens when it is time.',
    launchText: (date) => `Visitors can explore LevelUP after ${date} Cairo time. Until then, the platform stays private.`,
    launchOpen: 'Open LevelUP',
    launchLocked: 'Locked until 20/6 - 6:00 PM',
    timeUnits: ['Days', 'Hours', 'Minutes', 'Seconds'],
  },
  ar: {
    nav: [
      ['الفريق', 'team'],
      ['ليه إحنا', 'why'],
      ['مصمم لمين', 'built-for'],
      ['التجربة', 'experience'],
      ['المعاينة', 'preview'],
      ['التقنيات', 'tech'],
    ],
    open: 'مشاهدة المشروع',
    heroKicker: 'الفريق الذي صنع LevelUP',
    heroTitle: 'منصة تعليم صممها فريق فاهم تجربة التعلم محتاجة تكون عاملة إزاي.',
    heroText:
      'LevelUP تجربة تعليمية حديثة للطلاب والمحاضرين: اكتشاف أذكى للكورسات، تعلم موجه، نشر محتوى أسهل، ومساعد ذكاء اصطناعي داخل تجربة واحدة أنيقة.',
    stats: [
      ['أذكى', 'في اختيار الكورسات'],
      ['أسرع', 'في قرار التعلم'],
      ['أنظم', 'في نشر المحتوى'],
      ['أوضح', 'في متابعة التقدم'],
    ],
    why: {
      eyebrow: 'ليه إحنا',
      title: 'لأن اختيار الكورس المناسب مش المفروض يكون أصعب جزء في التعلم.',
      text: 'LevelUP معمول عشان يقلل التشتت في رحلة التعلم. يساعد الطالب يلاقي الكورس المناسب، يفضل متابع تقدمه، ويوصل لإنجاز واضح في النهاية.',
    },
    builtFor: {
      eyebrow: 'مصمم لمين',
      title: 'معمول لكل شخص داخل رحلة التعلم.',
      text: 'LevelUP بيربط الطلاب والمحاضرين وصناع المحتوى التعليمي في تجربة واحدة منظمة.',
      items: [
        ['الطلاب', 'اختيار الكورس المناسب، متابعة التقدم، والوصول لإنجاز واضح.'],
        ['المحاضرين', 'نشر المحتوى التعليمي بطريقة أسهل وأكثر تنظيمًا.'],
        ['المتعلمين ذاتيًا', 'استخدام الذكاء الاصطناعي والاكتشاف الذكي للحفاظ على الاستمرارية.'],
        ['صناع الكورسات', 'تحويل المعرفة لمنتج تعليمي رقمي منظم وواضح.'],
      ],
    },
    valueProps: [
      {
        title: 'اختار الكورس المناسب أسرع.',
        text: 'الفلاتر الذكية تنقل الطالب من التصفح العشوائي لقرار واضح وواثق.',
        icon: FilterAlt,
      },
      {
        title: 'تعلم ومعاك دعم دائم.',
        text: 'مساعد الذكاء الاصطناعي يشرح، يلخص، يقترح، ويساعد الطالب لما يقف عند نقطة صعبة.',
        icon: Psychology,
      },
      {
        title: 'كل حاجة في مكان واحد.',
        text: 'الدروس، الاختبارات، التقدم، الدفع، والشهادات داخل تجربة مرتبة وسهلة.',
        icon: CheckCircle,
      },
    ],
    beforeAfter: {
      eyebrow: 'قبل / بعد',
      title: 'من تعلم مشتت لتجربة موجهة.',
      before: {
        label: 'قبل LevelUP',
        points: ['اختيارات كتير ومربكة', 'مفيش مسار تعلم واضح', 'التقدم مش ظاهر', 'الدعم صعب الوصول له'],
      },
      after: {
        label: 'بعد LevelUP',
        points: ['اكتشاف ذكي للكورسات', 'متابعة واضحة للتقدم', 'مساعد AI أثناء التعلم', 'شهادات توضح الإنجاز'],
      },
    },
    experience: {
      eyebrow: 'التجربة',
      title: 'منصة تعلم هادئة، سريعة، وشخصية.',
      text: 'كل ميزة في LevelUP مبنية على وعد بسيط: تشتت أقل، وتقدم أكتر.',
    },
    features: [
      { title: 'لوحة تعلم شخصية', text: 'مكان واضح للكورسات، التقدم، المحتوى المحفوظ، والخطوة التالية.', icon: School },
      { title: 'مساحة للمحاضر', text: 'تجربة مركزة لإنشاء الكورسات، رفع الدروس، وتنظيم المادة التعليمية.', icon: Groups },
      { title: 'مساعد تعلم ذكي', text: 'شرح، تلخيص، اقتراحات، وتدريبات تساعد الطالب يكمل.', icon: AutoAwesome },
      { title: 'تجربة موبايل', text: 'تعلم أسهل للطلاب اللي بيحبوا يتابعوا من الموبايل.', icon: Devices },
      { title: 'دفع آمن وواضح', text: 'رحلة دفع أنضف مع إيصالات ومتابعة للمعاملات.', icon: Payments },
      { title: 'تقدم وشهادات', text: 'إنجازات واضحة تحول مجهود التعلم لنتيجة ملموسة.', icon: WorkspacePremium },
      { title: 'خصوصية وتنظيم', text: 'تسجيل دخول وصلاحيات مناسبة تخلي كل تجربة مركزة وآمنة.', icon: Lock },
      { title: 'ميديا سحابية', text: 'فيديوهات وملفات وصور جاهزة لتجربة استخدام مستقرة.', icon: CloudQueue },
    ],
    flow: {
      eyebrow: 'رحلة التعلم',
      title: 'من الفضول للشهادة.',
      text: 'LevelUP يحول التعلم لرحلة واضحة: اختار، اتعلم، اسأل، اتدرب، تابع تقدمك، واكمل.',
    },
    journey: ['إنشاء حساب', 'اختيار الاهتمامات', 'اكتشاف الكورسات', 'سؤال AI', 'مشاهدة الدروس', 'حل اختبارات', 'متابعة التقدم', 'استلام الشهادة'],
    preview: {
      eyebrow: 'معاينة المنتج',
      title: 'نظرة بسيطة على التجربة.',
      text: 'معاينة صغيرة للحاجات المسموح نعرضها قبل المناقشة: الفلترة الذكية، مساعد الذكاء الاصطناعي، والشهادات.',
      items: [
        { title: 'فلترة ذكية للكورسات', text: 'تساعد الطالب يوصل للكورس المناسب بسرعة وثقة.', image: previewImages.filter },
        { title: 'مساعد تعلم بالذكاء الاصطناعي', text: 'رفيق يساعد في الأسئلة، التلخيص، والتوجيه أثناء التعلم.', image: previewImages.chatbot },
        { title: 'رحلة الشهادة', text: 'التقدم في التعلم يتحول لإنجاز واضح يقدر الطالب يحتفظ به.', image: previewImages.certificate },
      ],
    },
    closingTitle: 'LevelUP مش مجرد منصة كورسات، دي رحلة تعلم أذكى.',
    closingText: 'تجربة منتج مصممة عشان تساعد المتعلم يختار أحسن، يتحرك أسرع، ويوصل للنهاية بثقة.',
    supervisor: 'المشرف',
    assistant: 'المعيدة',
    launchBadge: 'موعد الإطلاق',
    launchTitle: 'اللينك هيفتح في معاده.',
    launchText: (date) => `الزوار يقدروا يدخلوا LevelUP بعد ${date} بتوقيت القاهرة. قبل كده المنصة هتفضل خاصة.`,
    launchOpen: 'افتح LevelUP',
    launchLocked: 'مغلق حتى 20/6 - 6:00 مساءً',
    timeUnits: ['يوم', 'ساعة', 'دقيقة', 'ثانية'],
  },
};

function getTimeLeft() {
  const difference = Math.max(0, launchAt.getTime() - Date.now());
  const totalSeconds = Math.floor(difference / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isOpen: difference === 0,
  };
}

function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="reveal mx-auto mb-12 max-w-4xl text-center">
      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">
        {eyebrow}
      </span>
      <h2 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl">
        {title}
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-400">{text}</p>
    </div>
  );
}

function TeamCard({ member, lang }) {
  return (
    <article
      className="team-card group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-3 shadow-xl shadow-black/20 backdrop-blur-2xl"
    >
      <div className="relative aspect-[4/4.25] overflow-hidden rounded-[1.15rem] bg-zinc-950">
        <img
          src={member.image}
          alt={member.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-center grayscale-[12%] transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
        />
      </div>
      <div className="p-3">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{member.team[lang]}</span>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-white">{member.name}</h3>
        <p className="mt-1 text-sm font-medium text-zinc-400">{member.role[lang]}</p>
      </div>
    </article>
  );
}

function TeamGroup({ title, members, lang }) {
  const gridClass = members.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3';

  return (
    <section className="team-group rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-400">{members.length}</span>
      </div>
      <div className={`grid gap-4 ${gridClass}`}>
        {members.map((member) => (
          <TeamCard key={member.name} member={member} lang={lang} />
        ))}
      </div>
    </section>
  );
}

function LaunchGate({ copy, lang }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const launchLabel = useMemo(
    () => launchAt.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Cairo',
    }),
    [lang],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const units = [
    [copy.timeUnits[0], timeLeft.days],
    [copy.timeUnits[1], timeLeft.hours],
    [copy.timeUnits[2], timeLeft.minutes],
    [copy.timeUnits[3], timeLeft.seconds],
  ];

  return (
    <section id="launch" className="px-5 py-24 sm:px-8">
      <div className="reveal mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.05fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black">
              <CalendarMonth className="!text-lg" /> {copy.launchBadge}
            </span>
            <h2 className="mt-6 text-4xl font-semibold leading-none tracking-[-0.04em] text-white sm:text-6xl">
              {copy.launchTitle}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
              {copy.launchText(launchLabel)}
            </p>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {units.map(([label, value]) => (
                <div key={label} className="rounded-[1.5rem] bg-black/40 p-5 text-center ring-1 ring-white/10">
                  <strong className="block text-4xl font-semibold tracking-[-0.04em] text-white">
                    {String(value).padStart(2, '0')}
                  </strong>
                  <span className="mt-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
                </div>
              ))}
            </div>
            {timeLeft.isOpen ? (
            <a
                href={projectWebsiteUrl}
                className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-black transition hover:scale-[1.01]"
              >
              {copy.launchOpen}
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="mt-5 h-14 w-full cursor-not-allowed rounded-full bg-white/10 px-7 text-sm font-semibold text-zinc-400 ring-1 ring-white/10"
              >
                {copy.launchLocked}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function PresentationWebsite() {
  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const [lang, setLang] = useState('en');
  const [activeSection, setActiveSection] = useState('team');
  const [activeTeam, setActiveTeam] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const copy = pageCopy[lang];
  const isPresentMode = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('mode') === 'present';
  const teamGroups = [
    {
      key: 'frontend',
      title: lang === 'ar' ? 'فريق الواجهات' : 'Front-End Team',
      members: teamMembers.filter((member) => member.team.en === 'Front-End'),
    },
    {
      key: 'backend',
      title: lang === 'ar' ? 'فريق الخلفية' : 'Back-End Team',
      members: teamMembers.filter((member) => member.team.en === 'Back-End'),
    },
    {
      key: 'mobile',
      title: lang === 'ar' ? 'فريق الموبايل' : 'Mobile App Team',
      members: teamMembers.filter((member) => member.team.en === 'Mobile'),
    },
    {
      key: 'uiux',
      title: lang === 'ar' ? 'فريق تجربة وواجهة المستخدم' : 'UI/UX Team',
      members: teamMembers.filter((member) => member.team.en === 'UI/UX'),
    },
  ];
  const visibleTeamGroups = activeTeam === 'all'
    ? teamGroups
    : teamGroups.filter((group) => group.key === activeTeam);
  const teamFilters = [
    { key: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
    { key: 'frontend', label: lang === 'ar' ? 'واجهات' : 'Front-End' },
    { key: 'backend', label: lang === 'ar' ? 'خلفية' : 'Back-End' },
    { key: 'mobile', label: lang === 'ar' ? 'موبايل' : 'Mobile' },
    { key: 'uiux', label: lang === 'ar' ? 'تصميم' : 'UI/UX' },
  ];

  useEffect(() => {
    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        gsap.set('.nav-shell, .hero-kicker, .hero-title, .hero-copy, .hero-stat, .team-group, .team-card, .reveal, .screen-shot', {
          clearProps: 'all',
          opacity: 1,
        });
        return;
      }

      gsap.set('.nav-shell', { y: -24, opacity: 0 });
      gsap.set('.hero-kicker, .hero-title, .hero-copy, .hero-stat', { y: 34, opacity: 0 });
      gsap.set('.team-group', { y: 50, opacity: 0 });
      gsap.set('.team-card', { y: 80, opacity: 0, scale: 0.94 });

      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .to('.nav-shell', { y: 0, opacity: 1, duration: 0.8 })
        .to('.hero-kicker', { y: 0, opacity: 1, duration: 0.7 }, '-=0.35')
        .to('.hero-title', { y: 0, opacity: 1, duration: 0.9 }, '-=0.45')
        .to('.hero-copy', { y: 0, opacity: 1, duration: 0.75 }, '-=0.5')
        .to('.hero-stat', { y: 0, opacity: 1, stagger: 0.08, duration: 0.55 }, '-=0.45')
        .to('.team-group', { y: 0, opacity: 1, stagger: 0.08, duration: 0.65 }, '-=0.25')
        .to('.team-card', { y: 0, opacity: 1, scale: 1, stagger: 0.035, duration: 0.65 }, '-=0.35');

      gsap.utils.toArray('.reveal').forEach((element) => {
        gsap.fromTo(
          element,
          { y: 70, opacity: 0, filter: 'blur(10px)' },
          {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.95,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 84%' },
          },
        );
      });

      gsap.utils.toArray('.float-card').forEach((element, index) => {
        gsap.to(element, {
          y: index % 2 === 0 ? -18 : 18,
          duration: 2.4 + index * 0.12,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });

      gsap.utils.toArray('.team-star').forEach((element, index) => {
        gsap.to(element, {
          x: index % 2 === 0 ? 16 : -16,
          y: index % 3 === 0 ? -22 : 18,
          opacity: index % 4 === 0 ? 0.12 : 0.42,
          duration: 4 + (index % 6) * 0.45,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });

      gsap.utils.toArray('.screen-shot').forEach((element) => {
        gsap.fromTo(
          element,
          { scale: 0.92, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: { trigger: element, start: 'top 86%' },
          },
        );
      });

      gsap.to('.progress-line', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      });
    }, rootRef);

    return () => context.revert();
  }, [lang]);

  useEffect(() => {
    const sectionIds = ['team', 'why', 'built-for', 'experience', 'preview', 'tech'];
    const updateActiveSection = () => {
      const scrollLine = window.scrollY + Math.min(260, window.innerHeight * 0.35);
      const current = sectionIds.reduce((active, id) => {
        const section = document.getElementById(id);
        if (!section) return active;

        return section.offsetTop <= scrollLine ? id : active;
      }, 'team');

      setActiveSection(current);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(contentRef.current, { opacity: 0.72, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
  }, [lang]);

  return (
    <main
      ref={rootRef}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen overflow-hidden bg-[#030303] font-[Manrope,Poppins,system-ui] text-white ${isPresentMode ? 'scroll-smooth' : ''}`}
    >
      <div className="progress-line fixed left-0 top-0 z-[80] h-1 w-full origin-left scale-x-0 bg-white" />

      {!isPresentMode && (
      <div className="fixed bottom-5 right-5 z-[75] flex rounded-full border border-white/10 bg-black/60 p-1 shadow-2xl shadow-black/30 backdrop-blur-2xl">
        {[
          ['ar', 'عربي'],
          ['en', 'EN'],
        ].map(([code, label]) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            data-event={`language-${code}`}
            className={`h-11 rounded-full px-4 text-sm font-semibold transition ${
              lang === code ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            } focus:outline-none focus:ring-2 focus:ring-white/60`}
            aria-pressed={lang === code}
          >
            {label}
          </button>
        ))}
      </div>
      )}

      <nav className="nav-shell fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-black/55 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <a href="#team" className="flex items-center gap-3">
            <img src={brandLogo} alt="LevelUP" className="h-11 w-24 object-contain sm:w-28" />
          </a>
          <div className="hidden items-center gap-1 md:flex">
            {copy.nav.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                data-event={`nav-${id}`}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-white/10 hover:text-white ${
                  activeSection === id ? 'bg-white !text-black hover:bg-white hover:!text-black' : 'text-zinc-400'
                } focus:outline-none focus:ring-2 focus:ring-white/60`}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/10 text-white md:hidden focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <Close className="!text-xl" /> : <Menu className="!text-xl" />}
          </button>
          <a
            href="#launch"
            data-event="view-project"
            className="min-w-[58px] rounded-full border border-white/15 bg-white/10 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:scale-105 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60 sm:min-w-[132px] sm:px-5"
          >
            <span className="hidden sm:inline">{copy.open}</span>
            <span className="sm:hidden">{lang === 'ar' ? 'عرض' : 'View'}</span>
          </a>
          </div>
        </div>
        <div
          className={`fixed inset-0 z-[-1] bg-black/85 backdrop-blur-lg transition-opacity duration-300 md:hidden ${
            mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          className={`fixed bottom-0 right-0 top-0 z-[60] w-[min(84vw,360px)] border-l border-white/10 bg-[#020202] p-5 shadow-2xl shadow-black/60 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          <div className="mb-8 flex items-center justify-between gap-4">
            <img src={brandLogo} alt="LevelUP" className="h-11 w-28 object-contain" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label="Close menu"
            >
              <Close className="!text-xl" />
            </button>
          </div>
          <div className="grid gap-2">
            {copy.nav.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setMobileMenuOpen(false)}
                data-event={`mobile-nav-${id}`}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  activeSection === id ? 'bg-white !text-black' : 'text-zinc-300 hover:bg-white/10'
                } focus:outline-none focus:ring-2 focus:ring-white/60`}
              >
                {label}
              </a>
            ))}
          </div>
        </aside>
      </nav>

      <div ref={contentRef}>
      <section id="team" className="relative px-5 pb-24 pt-32 sm:px-8 lg:pt-36">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_36%),radial-gradient(circle_at_20%_28%,rgba(59,130,246,0.15),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(20,184,166,0.12),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {teamStars.map(([left, top, size, opacity], index) => (
            <span
              key={`${left}-${top}-${index}`}
              className="team-star absolute rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)]"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size + 0.8}px`,
                height: `${size + 0.8}px`,
                opacity,
              }}
            />
          ))}
        </div>
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-5xl text-center">
            <span className="hero-kicker inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
              {copy.heroKicker}
            </span>
            <h1 className="hero-title mt-7 text-5xl font-semibold leading-[0.9] tracking-[-0.065em] text-white sm:text-7xl lg:text-8xl">
              {copy.heroTitle}
            </h1>
            <p className="hero-copy mx-auto mt-7 max-w-3xl text-lg leading-8 text-zinc-400 sm:text-xl">
              {copy.heroText}
            </p>
            <div className="hero-copy mt-5 inline-flex rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
              {lang === 'ar' ? 'الديمو خاص حتى يوم المناقشة' : 'Demo locked until discussion day'}
            </div>
            <div className="hero-copy mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#experience"
                data-event="hero-explore-experience"
                className="min-w-[220px] rounded-full bg-white px-6 py-3 text-center text-sm font-bold !text-black shadow-xl shadow-black/20 transition hover:scale-105 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                {lang === 'ar' ? 'استكشف التجربة' : 'Explore Experience'}
              </a>
              <a
                href="#why"
                data-event="hero-why-levelup"
                className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                {lang === 'ar' ? 'ليه LevelUP؟' : 'Why LevelUP?'}
              </a>
            </div>
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-4">
            {copy.stats.map(([value, label]) => (
              <div key={label} className="hero-stat rounded-[1.4rem] border border-white/10 bg-white/[0.055] p-5 text-center backdrop-blur-xl">
                <strong className="block text-2xl font-semibold tracking-[-0.04em] text-white">{value}</strong>
                <span className="mt-1 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
              </div>
            ))}
          </div>

          <div className="team-filter mb-7 flex flex-wrap justify-center gap-2">
            {teamFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveTeam(filter.key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeTeam === filter.key
                    ? 'border-white bg-white text-black'
                    : 'border-white/10 bg-white/[0.055] text-zinc-400 hover:bg-white/10 hover:text-white'
                } focus:outline-none focus:ring-2 focus:ring-white/60`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {visibleTeamGroups.map((group) => (
              <TeamGroup key={group.title} title={group.title} members={group.members} lang={lang} />
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow={copy.why.eyebrow}
            title={copy.why.title}
            text={copy.why.text}
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {copy.valueProps.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="reveal float-card rounded-[2rem] border border-white/10 bg-white/[0.055] p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-black">
                    <Icon />
                  </div>
                  <h3 className="mt-8 text-3xl font-semibold leading-tight tracking-[-0.04em] text-white">{item.title}</h3>
                  <p className="mt-4 text-base leading-8 text-zinc-400">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="built-for" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow={copy.builtFor.eyebrow}
            title={copy.builtFor.title}
            text={copy.builtFor.text}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {copy.builtFor.items.map(([title, text]) => (
              <article key={title} className="reveal rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-6 shadow-xl shadow-black/20">
                <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-zinc-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow={copy.beforeAfter.eyebrow}
            title={copy.beforeAfter.title}
            text={lang === 'ar' ? 'نفس فكرة التعلم، لكن بتجربة أوضح وأذكى.' : 'The same learning goal, rebuilt into a clearer and smarter flow.'}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            {[copy.beforeAfter.before, copy.beforeAfter.after].map((column, columnIndex) => (
              <article
                key={column.label}
                className={`reveal rounded-[2rem] border p-7 shadow-2xl shadow-black/20 ${
                  columnIndex === 0
                    ? 'border-white/10 bg-white/[0.04]'
                    : 'border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.045]'
                }`}
              >
                <h3 className="text-3xl font-semibold tracking-[-0.04em] text-white">{column.label}</h3>
                <div className="mt-7 grid gap-3">
                  {column.points.map((point) => (
                    <div key={point} className="flex items-center gap-3 rounded-2xl bg-black/25 p-4 text-zinc-300">
                      <CheckCircle className={columnIndex === 0 ? 'text-zinc-600' : 'text-white'} />
                      <span className="text-sm font-medium">{point}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="experience" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow={copy.experience.eyebrow}
            title={copy.experience.title}
            text={copy.experience.text}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {copy.features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="reveal group rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.075] to-white/[0.03] p-6 transition hover:-translate-y-2 hover:bg-white/[0.09]">
                  <Icon className="text-zinc-300 transition group-hover:text-white" />
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="reveal">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">
              {copy.flow.eyebrow}
            </span>
            <h2 className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl">
              {copy.flow.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
              {copy.flow.text}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {copy.journey.map((step, index) => (
              <div key={step} className="reveal rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-5">
                <span className="text-sm font-semibold text-zinc-500">{String(index + 1).padStart(2, '0')}</span>
                <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-white">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="preview" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow={copy.preview.eyebrow}
            title={copy.preview.title}
            text={copy.preview.text}
          />
          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="screen-shot group overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-3 shadow-2xl shadow-black/25">
              <div className="rounded-[2rem] bg-black/55 p-3 ring-1 ring-white/10">
                <div className="mb-3 flex items-center gap-2 px-2">
                  <span className="h-3 w-3 rounded-full bg-red-400/80" />
                  <span className="h-3 w-3 rounded-full bg-yellow-300/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  <span className="ms-auto rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-400">
                    LevelUP
                  </span>
                </div>
                <div className="relative h-[34rem] overflow-hidden rounded-[1.5rem] bg-zinc-950">
                  <img
                    src={copy.preview.items[0].image}
                    alt={copy.preview.items[0].title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-3xl font-semibold tracking-[-0.05em] text-white">{copy.preview.items[0].title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{copy.preview.items[0].text}</p>
              </div>
            </article>

            <div className="grid gap-5">
              {copy.preview.items.slice(1).map((item, index) => (
                <article
                  key={item.title}
                  className="screen-shot group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/25"
                >
                  <div className="relative h-72 overflow-hidden bg-zinc-950">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                    <span className="absolute left-5 top-5 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl">
                      {String(index + 2).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="tech" className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow={lang === 'ar' ? 'التقنيات' : 'Technology'}
            title={lang === 'ar' ? 'مبني بتقنيات حديثة وجاهزة للتوسع.' : 'Built with a modern, scalable stack.'}
            text={lang === 'ar'
              ? 'اختيارات تقنية تساعد LevelUP يبقى سريع، آمن، وسهل التطوير بعد المناقشة.'
              : 'Technical choices that help LevelUP stay fast, secure, and easy to evolve after the discussion.'}
          />
          <div className="reveal flex flex-wrap justify-center gap-3">
            {techItems.map((item) => (
              <span
                key={item.en}
                className="rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-semibold text-zinc-200 shadow-lg shadow-black/10"
              >
                {item[lang]}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="reveal mx-auto max-w-5xl rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-8 text-center shadow-2xl shadow-black/25 backdrop-blur-2xl sm:p-12">
          <h2 className="text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl">
            {copy.closingTitle}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            {copy.closingText}
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {[
              [copy.supervisor, 'Dr. Arabi Kishk'],
              [copy.assistant, 'Eng. Rahaf Mahmoud'],
            ].map(([label, name]) => (
              <article key={label} className="rounded-[1.75rem] bg-black/35 p-7 ring-1 ring-white/10">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{name}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LaunchGate copy={copy} lang={lang} />
      </div>
    </main>
  );
}
