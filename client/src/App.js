import React from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Home />
      </main>
    </div>
  );
}
