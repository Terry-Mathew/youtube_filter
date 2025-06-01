import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Settings from './pages/Settings';
import { CategoryFormTest } from './components/CategoryFormTest';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/test-category-form" element={<CategoryFormTest />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}

export default App;