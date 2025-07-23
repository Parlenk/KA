import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage-simple';
import SimpleDashboardPage from './pages/SimpleDashboardPage-simple';
import SimpleEditor from './pages/SimpleEditor-simple';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<SimpleDashboardPage />} />
        <Route path="/editor" element={<SimpleEditor />} />
      </Routes>
    </Router>
  );
}

export default App;