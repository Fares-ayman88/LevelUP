import {
  AdminPanelSettings,
  Api,
  AutoAwesome,
  Dashboard,
  DataObject,
  Devices,
  Groups,
  Hub,
  Lock,
  RocketLaunch,
  School,
  Science,
  Security,
  Storage,
  VerifiedUser,
} from '@mui/icons-material';
import './PresentationWebsite.css';

const sections = [
  { id: 'intro', label: 'Intro' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'implementation', label: 'Implementation' },
  { id: 'technical', label: 'Technical' },
  { id: 'testing', label: 'Testing' },
  { id: 'future', label: 'Future' },
];

const modules = [
  { title: 'Mobile App', icon: Devices, text: 'Flutter learning experience for students on iOS and Android.' },
  { title: 'Student Website', icon: School, text: 'Course discovery, enrollment, progress, quizzes, and certificates.' },
  { title: 'Instructor Portal', icon: Groups, text: 'Instructor applications, documents, course creation, and lesson upload.' },
  { title: 'Admin Dashboard', icon: Dashboard, text: 'Governance for users, instructors, courses, payments, and monitoring.' },
  { title: 'Backend API', icon: Api, text: 'Node.js and Express REST services for business logic and validation.' },
  { title: 'AI Assistant', icon: AutoAwesome, text: 'Recommendations, Q&A, PDF summaries, and quiz generation.' },
];

const requirements = [
  ['Authentication', 'Register, login, profile completion, token validation'],
  ['Courses', 'Browse, search, filter, details, bookmarks, enrollment'],
  ['Learning', 'Videos, lessons, quizzes, progress, certificates'],
  ['Instructor', 'Applications, document upload, course publishing'],
  ['Admin', 'Users, approvals, payments, reports, monitoring'],
  ['AI', 'Assistant, recommendations, summaries, generated quizzes'],
];

const collections = [
  ['users', 'role, profile, auth provider, instructor status'],
  ['courses', 'title, category, instructorId, price, status, tags'],
  ['lessons', 'courseId, videoUrl, resources, order, duration'],
  ['enrollments', 'userId, courseId, progress, completed lessons'],
  ['quizzes', 'questions, answers, passing score, lessonId'],
  ['payments', 'amount, provider, status, transaction reference'],
  ['certificates', 'userId, courseId, issuedAt, certificateUrl'],
  ['notifications', 'type, payload, read state, target user'],
];

const apiExamples = [
  ['POST', '/api/v1/auth/session', 'Validate Firebase token and initialize backend session'],
  ['GET', '/api/v1/courses?category=web&page=1', 'Paginated course discovery'],
  ['POST', '/api/v1/enrollments', 'Create enrollment after payment validation'],
  ['PATCH', '/api/v1/progress/:courseId', 'Update lesson completion and progress'],
  ['POST', '/api/v1/ai/summarize', 'Summarize PDF or lesson material securely'],
  ['POST', '/api/v1/admin/courses/:id/approve', 'Admin-only course publishing approval'],
];

const screenshots = [
  ['/assets/presentation/home.png', 'Student Website'],
  ['/assets/presentation/course-detail.png', 'Course Details'],
  ['/assets/presentation/mobile/mobile-home.png', 'Mobile Home'],
  ['/assets/presentation/mobile/mobile-course-detail.png', 'Mobile Course'],
  ['/assets/presentation/lesson-player.png', 'Lesson Player'],
  ['/assets/presentation/certificate.png', 'Certificate'],
];

function SectionTitle({ kicker, title, text }) {
  return (
    <div className="presentation-section-title">
      <span>{kicker}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <div className="presentation-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ModuleCard({ item }) {
  const Icon = item.icon;
  return (
    <article className="presentation-module-card">
      <div className="presentation-module-icon">
        <Icon />
      </div>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
    </article>
  );
}

export default function PresentationWebsite() {
  return (
    <main className="presentation-page">
      <nav className="presentation-nav" aria-label="Presentation sections">
        <a className="presentation-brand" href="#top" aria-label="LevelUP presentation home">
          <img src="/assets/wordmark_levelup.png" alt="LevelUP" />
        </a>
        <div className="presentation-nav-links">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <section id="top" className="presentation-hero">
        <div className="presentation-hero-copy">
          <span className="presentation-eyebrow">Full Stack Software Engineering Graduation Project</span>
          <h1>LevelUP: AI-Powered Educational Platform</h1>
          <p>
            A complete educational ecosystem combining mobile, web, instructor tools, admin governance,
            backend APIs, MongoDB, Firebase services, secure authentication, and AI learning features.
          </p>
          <div className="presentation-actions">
            <a href="#architecture">View Architecture</a>
            <a href="#implementation">See Screens</a>
          </div>
        </div>

        <div className="presentation-hero-visual" aria-label="LevelUP system overview">
          <div className="presentation-orbit-card presentation-orbit-card--main">
            <img src="/assets/logo_level.png" alt="" />
            <strong>LevelUP</strong>
            <span>Unified Learning Platform</span>
          </div>
          <div className="presentation-orbit-card"><Devices /> Mobile</div>
          <div className="presentation-orbit-card"><Api /> APIs</div>
          <div className="presentation-orbit-card"><Storage /> MongoDB</div>
          <div className="presentation-orbit-card"><Security /> Security</div>
          <div className="presentation-orbit-card"><AutoAwesome /> AI</div>
        </div>
      </section>

      <section id="intro" className="presentation-band">
        <SectionTitle
          kicker="01 Introduction"
          title="Business Problem And Proposed Solution"
          text="LevelUP solves fragmented learning workflows by bringing students, instructors, administrators, payments, content, and AI support into one engineered platform."
        />
        <div className="presentation-split">
          <div className="presentation-panel">
            <h3>Current Problems</h3>
            <ul>
              <li>Course discovery, learning progress, payments, and support are often disconnected.</li>
              <li>Instructor onboarding and course approval are manually managed.</li>
              <li>AI features are risky when API keys are exposed from client applications.</li>
              <li>Admins need one place to monitor users, content, payments, and platform activity.</li>
            </ul>
          </div>
          <div className="presentation-panel presentation-panel--accent">
            <h3>LevelUP Solution</h3>
            <p>
              A backend-first AI educational platform with role-based workflows, secure APIs,
              cloud storage, database design, testing strategy, and deployment readiness.
            </p>
            <div className="presentation-metrics">
              <Metric value="3" label="Core Roles" />
              <Metric value="7" label="System Layers" />
              <Metric value="4" label="AI Features" />
            </div>
          </div>
        </div>
      </section>

      <section id="analysis" className="presentation-band presentation-band--soft">
        <SectionTitle
          kicker="02 System Analysis"
          title="Stakeholders, Roles, And Requirements"
          text="The system is designed around real platform users and software requirements, not only visual screens."
        />
        <div className="presentation-requirements">
          {requirements.map(([title, text]) => (
            <article key={title}>
              <VerifiedUser />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="presentation-flow">
          <div>Student: Login</div>
          <div>Browse Courses</div>
          <div>Enroll</div>
          <div>Learn + Quiz</div>
          <div>Certificate</div>
        </div>
      </section>

      <section id="architecture" className="presentation-band">
        <SectionTitle
          kicker="03 System Design"
          title="Architecture, Auth, Authorization, And Database"
          text="The architecture separates clients, API logic, authentication, database, storage, AI, and deployment responsibilities."
        />
        <div className="presentation-architecture">
          <div className="presentation-arch-row">
            <div><Devices /> Flutter Mobile</div>
            <div><School /> Student Website</div>
            <div><Groups /> Instructor Portal</div>
            <div><AdminPanelSettings /> Admin Dashboard</div>
          </div>
          <div className="presentation-arch-connector">REST API + JWT Bearer Tokens</div>
          <div className="presentation-arch-row presentation-arch-row--core">
            <div><Api /> Node.js / Express API</div>
            <div><Lock /> RBAC Middleware</div>
            <div><DataObject /> Controllers + Services</div>
          </div>
          <div className="presentation-arch-connector">Business Logic, Validation, Storage, AI Proxy</div>
          <div className="presentation-arch-row">
            <div><Storage /> MongoDB</div>
            <div><Security /> Firebase Auth</div>
            <div><Hub /> Firebase Storage</div>
            <div><AutoAwesome /> AI Provider</div>
          </div>
        </div>

        <div className="presentation-grid-two">
          <div className="presentation-panel">
            <h3>Authentication Flow</h3>
            <ol>
              <li>User logs in through Firebase Authentication.</li>
              <li>Client sends identity token to backend.</li>
              <li>Backend verifies token and maps app role.</li>
              <li>JWT protects API requests with role checks.</li>
            </ol>
          </div>
          <div className="presentation-panel">
            <h3>Authorization Logic</h3>
            <p>
              Students access their learning data, instructors manage their courses, and admins control
              users, approvals, payments, and monitoring. Backend middleware enforces role and ownership checks.
            </p>
          </div>
        </div>
      </section>

      <section className="presentation-band presentation-band--dark">
        <SectionTitle
          kicker="Database Design"
          title="MongoDB Collections Structure"
          text="The database supports flexible course content while preserving clear relationships and indexes for performance."
        />
        <div className="presentation-db-grid">
          {collections.map(([name, fields]) => (
            <article key={name}>
              <Storage />
              <h3>{name}</h3>
              <p>{fields}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="implementation" className="presentation-band">
        <SectionTitle
          kicker="04 Implementation"
          title="Website, Mobile App, Instructor Portal, And Admin Dashboard"
          text="LevelUP includes real product surfaces connected by shared backend contracts and role-specific workflows."
        />
        <div className="presentation-modules">
          {modules.map((item) => (
            <ModuleCard key={item.title} item={item} />
          ))}
        </div>
        <div className="presentation-screens">
          {screenshots.map(([src, label]) => (
            <figure key={src}>
              <img src={src} alt={label} />
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="technical" className="presentation-band presentation-band--soft">
        <SectionTitle
          kicker="05 Technical Details"
          title="APIs, Firebase, AI, Payments, Notifications, And Performance"
          text="This section shows the backend contracts and integrations that make LevelUP a full-stack engineering project."
        />
        <div className="presentation-api-table">
          {apiExamples.map(([method, path, desc]) => (
            <div key={path}>
              <span>{method}</span>
              <code>{path}</code>
              <p>{desc}</p>
            </div>
          ))}
        </div>
        <div className="presentation-grid-four">
          <article><Hub /><h3>Firebase</h3><p>Auth, storage, identity tokens, secure media and documents.</p></article>
          <article><AutoAwesome /><h3>AI Proxy</h3><p>Recommendations, summaries, assistant answers, quiz generation.</p></article>
          <article><RocketLaunch /><h3>Performance</h3><p>Pagination, indexes, lazy loading, compression, caching.</p></article>
          <article><Lock /><h3>Security</h3><p>HTTPS, JWT, RBAC, validation, sanitization, rate limits.</p></article>
        </div>
      </section>

      <section id="testing" className="presentation-band">
        <SectionTitle
          kicker="06 Testing"
          title="Testing Strategy And Engineering Validation"
          text="Testing covers critical flows across authentication, APIs, database updates, AI endpoints, and role restrictions."
        />
        <div className="presentation-test-grid">
          <article><Science /><h3>Unit Tests</h3><p>Services, validators, utility functions, and business rules.</p></article>
          <article><Api /><h3>API Tests</h3><p>Auth, courses, enrollments, payments, progress, and AI routes.</p></article>
          <article><Security /><h3>Security Tests</h3><p>Invalid tokens, wrong roles, injection attempts, and rate limits.</p></article>
          <article><Devices /><h3>Manual QA</h3><p>Mobile and web journeys from signup to certificate.</p></article>
        </div>
        <div className="presentation-panel">
          <h3>Key Test Cases</h3>
          <p>
            Login validation, enrollment after successful payment, admin-only course approval,
            progress update after lesson completion, protected AI summarization, and certificate generation
            only after completion criteria.
          </p>
        </div>
      </section>

      <section id="future" className="presentation-band presentation-finale">
        <SectionTitle
          kicker="07 Future Work"
          title="Business Impact And Future Enhancements"
          text="LevelUP can grow from graduation project into a scalable educational product."
        />
        <div className="presentation-roadmap">
          <div>Adaptive learning paths</div>
          <div>Live classes</div>
          <div>Offline mobile content</div>
          <div>Multilingual learning</div>
          <div>Advanced analytics</div>
          <div>Gamification</div>
        </div>
        <div className="presentation-closing">
          <img src="/assets/logo_level.png" alt="" />
          <h2>LevelUP is a complete full-stack AI educational platform.</h2>
          <p>Questions?</p>
        </div>
      </section>
    </main>
  );
}
