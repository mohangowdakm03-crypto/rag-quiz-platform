import React, { useState, useEffect } from 'react';
import StudentApp from './StudentApp';
import TeacherApp from './TeacherApp';

export default function App() {
  const [isInstructorRoute, setIsInstructorRoute] = useState(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      return (
        path.includes('/teacher') ||
        path.includes('/instructor') ||
        params.get('portal') === 'teacher' ||
        params.get('mode') === 'teacher' ||
        params.get('admin') === '1'
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      setIsInstructorRoute(
        path.includes('/teacher') ||
        path.includes('/instructor') ||
        params.get('portal') === 'teacher' ||
        params.get('mode') === 'teacher' ||
        params.get('admin') === '1'
      );
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Strict separation: If instructor route, render protected TeacherApp. Otherwise render StudentApp.
  if (isInstructorRoute) {
    return <TeacherApp />;
  }

  return <StudentApp />;
}
