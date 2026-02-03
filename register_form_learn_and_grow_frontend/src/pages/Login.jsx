import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from '../components/Modal';

const Login = ({ onLogin }) => {
  const API_URL = import.meta.env.VITE_API_URL || '';
  const AD_API_URL = import.meta.env.AD_API_URL || '';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: '', message: '' });
  const navigate = useNavigate();

  const showModal = (type, message) => {
    setModal({ isOpen: true, type, message });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: '', message: '' });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password
      });

      if (response.data.requires2FA) {
        setRequires2FA(true);
        setUserId(response.data.userId);
      } else {
        onLogin(response.data.user);
        navigate('/');
      }
    } catch (error) {
      showModal('error', 'Login failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-2fa`, {
        userId,
        code
      });
      
      onLogin(response.data.user);
      navigate('/');
    } catch (error) {
      showModal('error','2FA verification failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const setup2FA = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/setup-2fa`, {
        userId
      });
      
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setShowSetup2FA(true);
    } catch (error) {
      showModal('error','2FA setup failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secret);
    showModal('success', 'Secret key copied to clipboard!');
  };

  const handleModalClose = () => {
    closeModal();
  };

  // 2FA Setup Screen
  if (showSetup2FA) {
    return (
      <div className="login-container">
        <h2>Setup Two-Factor Authentication</h2>
        <div className="setup-2fa">
          <p>Scan this QR code with your authenticator app:</p>
          
          {qrCode && (
            <div className="qr-code-container">
              <img src={qrCode} alt="QR Code" className="qr-code" />
            </div>
          )}
          
          <div className="secret-container">
            <p>Or enter this secret key manually:</p>
            <div className="secret-display">
              <code>{secret}</code>
              <button 
                type="button" 
                onClick={copyToClipboard}
                className="copy-btn"
              >
                Copy
              </button>
            </div>
          </div>
          
          <p className="instruction">
            After setting up, enter the 6-digit code from your authenticator app:
          </p>
          
          <form onSubmit={verify2FA}>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2FA Verification Screen
  if (requires2FA) {
    return (
      <div className="login-container">
        <h2>Two-Factor Authentication</h2>
        
        <div className="auth-options">
          <p>Enter the 6-digit code from your authenticator app:</p>
          
          <form onSubmit={verify2FA}>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
          
          <div className="setup-prompt">
            <p>Don't have 2FA setup yet?</p>
            <button 
              type="button" 
              onClick={setup2FA}
              disabled={loading}
              className="setup-btn"
            >
              Setup 2FA Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial Login Screen
  return (
    <div className="login-container">
      <h2>ลงชื่อเข้าใช้งานสำหรับผู้ดูแลระบบ</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'กำลังดำเนินการ...' : 'ลงชื่อเข้าใช้'}
        </button>
      </form>

      <Modal 
        isOpen={modal.isOpen} 
        onClose={handleModalClose}
        title={modal.type === 'success' ? 'สำเร็จ' : 'ข้อผิดพลาด'}
      >
        <p>{modal.message}</p>
        <div className="modal-actions">
          <button onClick={handleModalClose} className="modal-btn primary">ปิด</button>
        </div>
      </Modal>
    </div>
  );
};

export default Login;