import { useNavigate } from 'react-router-dom';
import MainBottomNav from '../components/MainBottomNav.jsx';
import './UserFlow.css';

const journeySteps = [
  {
    title: 'Account Entry',
    icon: 'login',
    detail: 'Sign in, create an account, verify email, complete profile, then secure access with PIN or biometrics.',
    surfaces: ['Sign In', 'Sign Up', 'Verification', 'Profile Setup'],
  },
  {
    title: 'Course Discovery',
    icon: 'travel_explore',
    detail: 'Browse categories, search topics, inspect course details, compare mentors, and save courses for later.',
    surfaces: ['Home', 'Search', 'Categories', 'Saved Courses'],
  },
  {
    title: 'Enrollment & Payment',
    icon: 'payments',
    detail: 'Move selected courses to checkout, choose a payment method, submit proof when needed, and track status.',
    surfaces: ['Cart', 'Payment Method', 'Manual Transfer', 'Receipt'],
  },
  {
    title: 'Learning Workspace',
    icon: 'school',
    detail: 'Continue ongoing lessons, track progress, complete courses, and return to purchased material quickly.',
    surfaces: ['My Courses', 'Lesson Player', 'Ongoing', 'Completed'],
  },
  {
    title: 'Help & Communication',
    icon: 'forum',
    detail: 'Ask the AI assistant, message mentors, contact support, review notifications, and keep conversations organized.',
    surfaces: ['AI Chat', 'Mentor Chats', 'Support Chats', 'Notifications'],
  },
  {
    title: 'Recognition & Account Care',
    icon: 'workspace_premium',
    detail: 'Download certificates, review transactions, update profile and security preferences, then keep learning.',
    surfaces: ['Certificate', 'Transactions', 'Security', 'Profile'],
  },
];

const roleFlows = [
  {
    role: 'Student',
    icon: 'person',
    points: ['Finds courses', 'Pays or submits proof', 'Learns through lessons', 'Uses chat and support'],
  },
  {
    role: 'Instructor',
    icon: 'co_present',
    points: ['Registers as instructor', 'Submits documents', 'Manages course area', 'Tracks mentor transactions'],
  },
  {
    role: 'Admin',
    icon: 'admin_panel_settings',
    points: ['Reviews instructor requests', 'Manages courses', 'Approves transactions', 'Controls notifications'],
  },
];

const systemFlow = [
  ['Authentication', 'email verification, Google sign-in, password recovery'],
  ['Catalog Data', 'courses, mentors, categories, featured ordering'],
  ['Payments', 'methods, manual proof, transaction review, receipts'],
  ['Messaging', 'AI assistant, mentor threads, support conversations'],
  ['Progress', 'ongoing courses, completed courses, certificates'],
];

function FlowIcon({ children }) {
  return (
    <span className="material-icons-round user-flow-icon" aria-hidden>
      {children}
    </span>
  );
}

export default function UserFlow() {
  const navigate = useNavigate();

  return (
    <div className="user-flow-page">
      <main className="user-flow">
        <header className="user-flow__header">
          <div className="user-flow__intro">
            <button type="button" className="user-flow__back" onClick={() => navigate('/home')}>
              <span className="material-icons-round" aria-hidden>
                arrow_back
              </span>
              Back Home
            </button>
            <span className="user-flow__eyebrow">Project Map</span>
            <h1>LevelUp User Flow</h1>
            <p>
              A clear operating map for how learners, instructors, and admins move
              through the platform from account setup to learning outcomes.
            </p>
          </div>
          <div className="user-flow__snapshot" aria-label="Flow summary">
            <div>
              <strong>3</strong>
              <span>User roles</span>
            </div>
            <div>
              <strong>6</strong>
              <span>Main stages</span>
            </div>
            <div>
              <strong>5</strong>
              <span>System lanes</span>
            </div>
          </div>
        </header>

        <section className="user-flow__rail" aria-label="Primary journey">
          {journeySteps.map((step, index) => (
            <article key={step.title} className="user-flow-stage">
              <div className="user-flow-stage__top">
                <span className="user-flow-stage__index">{String(index + 1).padStart(2, '0')}</span>
                <FlowIcon>{step.icon}</FlowIcon>
              </div>
              <h2>{step.title}</h2>
              <p>{step.detail}</p>
              <div className="user-flow-stage__tags">
                {step.surfaces.map((surface) => (
                  <span key={`${step.title}-${surface}`}>{surface}</span>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="user-flow__grid">
          <div className="user-flow-panel user-flow-panel--roles">
            <div className="user-flow-panel__heading">
              <span className="material-icons-round" aria-hidden>
                groups
              </span>
              <div>
                <h2>Role Paths</h2>
                <p>Each role sees the same platform backbone with different permissions and priorities.</p>
              </div>
            </div>
            <div className="user-flow-roles">
              {roleFlows.map((role) => (
                <article key={role.role} className="user-flow-role">
                  <FlowIcon>{role.icon}</FlowIcon>
                  <h3>{role.role}</h3>
                  <ul>
                    {role.points.map((point) => (
                      <li key={`${role.role}-${point}`}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>

          <div className="user-flow-panel">
            <div className="user-flow-panel__heading">
              <span className="material-icons-round" aria-hidden>
                hub
              </span>
              <div>
                <h2>System Lanes</h2>
                <p>The main services that keep the user journey consistent across pages.</p>
              </div>
            </div>
            <div className="user-flow-lanes">
              {systemFlow.map(([title, detail]) => (
                <div key={title} className="user-flow-lane">
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="user-flow__handoff">
          <div>
            <span className="user-flow__eyebrow">Operational handoff</span>
            <h2>Where the flow becomes real work</h2>
            <p>
              The strongest loop is course discovery to payment approval to lesson access.
              Notifications, chat, and profile security support that loop without pulling
              users away from learning.
            </p>
          </div>
          <div className="user-flow__handoff-actions">
            <button type="button" onClick={() => navigate('/home')}>
              Explore Home
            </button>
            <button type="button" onClick={() => navigate('/indox')}>
              Open AI Chat
            </button>
          </div>
        </section>
      </main>
      <MainBottomNav currentIndex={-1} showSearch />
    </div>
  );
}
