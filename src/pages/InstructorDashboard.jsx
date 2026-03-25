import { useNavigate } from 'react-router-dom';

export default function InstructorDashboard() {
  const navigate = useNavigate();

  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <h2>Instructor Dashboard</h2>
        <p className="muted">Manage your courses and stay connected with learners.</p>

        <div className="dashboard-cards">
          <button type="button" className="dashboard-card" onClick={() => navigate('/mentor-courses')}>
            <div>
              <strong>My Courses</strong>
              <span>Review enrolled students and course progress.</span>
            </div>
            <span className="dashboard-arrow">&gt;</span>
          </button>
          <button type="button" className="dashboard-card" onClick={() => navigate('/support-chats')}>
            <div>
              <strong>Support Chats</strong>
              <span>Answer learner questions and requests.</span>
            </div>
            <span className="dashboard-arrow">&gt;</span>
          </button>
          <button type="button" className="dashboard-card" onClick={() => navigate('/profile')}>
            <div>
              <strong>Profile</strong>
              <span>Update your profile and security settings.</span>
            </div>
            <span className="dashboard-arrow">&gt;</span>
          </button>
          <button type="button" className="dashboard-card" onClick={() => navigate('/home')}>
            <div>
              <strong>Student Home</strong>
              <span>Browse courses as a learner.</span>
            </div>
            <span className="dashboard-arrow">&gt;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
