import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NavbarAdmin = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="nav-brand">Admin</div>
        <div className="nav-tabs">
          <button 
            onClick={() => navigate('/employee')}
            className={`nav-tab ${location.pathname === '/employee' ? 'active' : ''}`}
          >
            หน้ารายการพนักงาน
          </button>
          <button 
            onClick={() => navigate('/attendance')}
            className={`nav-tab ${location.pathname === '/attendance' ? 'active' : ''}`}
          >
            หน้ารายการลงทะเบียนเข้าร่วมงาน
          </button>
        </div>
      </div>
      <div className="nav-user">
        ยินดีต้อนรับ, {user?.username} 
        <button onClick={onLogout} className="logout-btn">ออกจากระบบ</button>
      </div>
    </nav>
  );
};

export default NavbarAdmin;