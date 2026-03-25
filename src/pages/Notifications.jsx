import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  {
    title: 'Today',
    items: [
      {
        title: 'New Category Course.!',
        message: 'New the 3D Design Course is Availa..',
        asset: '/assets/notifications/Circle.svg',
        isNew: true,
      },
      {
        title: 'Flash Sale 25% Off',
        message: 'Enroll today and save your seat.',
        asset: '/assets/notifications/Circle (1).svg',
        isNew: true,
      },
      {
        title: "Today's Special Offers",
        message: 'You have made a course payment.',
        asset: '/assets/notifications/Circle (2).svg',
        isNew: true,
      },
      {
        title: 'Mentor replied to you',
        message: 'Your question got a new reply.',
        asset: '/assets/notifications/Circle (3).svg',
        isNew: true,
      },
    ],
  },
  {
    title: 'Yesterday',
    items: [
      {
        title: 'Credit Card Connected.!',
        message: 'Credit Card has been linked.!',
        asset: '/assets/notifications/Circle (4).svg',
        isNew: false,
      },
      {
        title: 'Course Updated',
        message: '2 new lessons added to your class.',
        asset: '/assets/notifications/Circle (1).svg',
        isNew: false,
      },
    ],
  },
  {
    title: 'Nov 20, 2022',
    items: [
      {
        title: 'Account Setup Successful.!',
        message: 'Your account has been created.',
        asset: '/assets/notifications/Circle.svg',
        isNew: false,
      },
    ],
  },
];

export default function Notifications() {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Notifications</h2>
        </div>
        <div className="notification-settings-link">
          <button type="button" onClick={() => navigate('/notification-settings')}>
            Notification Settings
          </button>
        </div>
        {SECTIONS.map((section) => (
          <div key={section.title} className="notification-section">
            <h3>{section.title}</h3>
            {section.items.map((item) => (
              <div key={item.title} className="notification-card">
                <div className="notification-icon">
                  <img src={item.asset} alt="" />
                </div>
                <div className="notification-body">
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                </div>
                {item.isNew && <span className="notification-dot" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
