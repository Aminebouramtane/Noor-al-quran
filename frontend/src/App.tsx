import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Lessons from './pages/Lessons';
import LessonDetail from './pages/LessonDetail';
import Reading from './pages/Reading';
import RecordingPage from './pages/RecordingPage';
import NlpRecitation from './pages/NlpRecitation';
import Profile from './pages/Profile';
import Stats from './pages/Stats';
import NotificationsSettings from './pages/NotificationsSettings';
import SoundSettings from './pages/SoundSettings';
import Help from './pages/Help';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/lessons" 
            element={
              <ProtectedRoute>
                <Lessons />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reading" 
            element={
              <ProtectedRoute>
                <Reading />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reading/:surahNo" 
            element={
              <ProtectedRoute>
                <Reading />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <Stats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/notifications"
            element={
              <ProtectedRoute>
                <NotificationsSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/sound"
            element={
              <ProtectedRoute>
                <SoundSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <Help />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/:lessonName"
            element={
              <ProtectedRoute>
                <LessonDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recording"
            element={
              <ProtectedRoute>
                <RecordingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nlp-reading"
            element={
              <ProtectedRoute>
                <NlpRecitation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nlp-reading/:surahNo"
            element={
              <ProtectedRoute>
                <NlpRecitation />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
