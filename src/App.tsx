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
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300">
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Routes>
            <Route path="/" element={<Admin />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
