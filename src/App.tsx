import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useProgrammeStore } from './store/programmeStore';
import { useAuthStore } from './store/authStore';
import { useScheduleStore } from './store/scheduleStore';
import { Admin } from './pages/Admin';

export const App: React.FC = () => {
  const { darkMode } = useScheduleStore();
  const { checkAuth } = useAuthStore();
  const { fetchProgrammeFromServer, fetchSpeakerPhotos } = useProgrammeStore();

  useEffect(() => {
    checkAuth();
    fetchProgrammeFromServer();
    fetchSpeakerPhotos();

    // Auto-refresh data and live status silently every 30 seconds
    const intervalId = window.setInterval(() => {
      fetchProgrammeFromServer(true);
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [checkAuth, fetchProgrammeFromServer, fetchSpeakerPhotos]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-teal-500 selection:text-white">
        <Routes>
          <Route path="/" element={<Admin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
