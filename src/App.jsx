import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

import EmailVerificationGate from './components/EmailVerificationGate.jsx';
import { routeConfig } from './routes.jsx';
import Placeholder from './pages/Placeholder.jsx';
import NotFound from './pages/NotFound.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import { initPocketBase } from './services/pocketbase.js';

export default function App() {
  useEffect(() => {
    initPocketBase().catch(() => {});
  }, []);

  return (
    <EmailVerificationGate>
      <Routes>
        {routeConfig.map((route) => {
          const Page = route.component;
          const content = Page ? (
            <Page />
          ) : (
            <Placeholder title={route.title} path={route.path} />
          );
          const element = route.roles ? (
            <RoleRoute roles={route.roles}>{content}</RoleRoute>
          ) : (
            content
          );
          return (
            <Route key={route.path} path={route.path} element={element} />
          );
        })}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </EmailVerificationGate>
  );
}
