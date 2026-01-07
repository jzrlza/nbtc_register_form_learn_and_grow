import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const Home = ({ user, onLogout }) => {
  const [backendHealth, setBackendHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkBackendHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      setBackendHealth(response.data);
    } catch (error) {
      setBackendHealth({ status: 'ERROR', error: error.message });
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="app">
      <Navbar user={user} onLogout={handleLogout} />
      
      <main className="app-main">
        <section className="health-section">
        </section>

        <section className="users-section">
        </section>
      </main>
    </div>
  );
};

export default Home;