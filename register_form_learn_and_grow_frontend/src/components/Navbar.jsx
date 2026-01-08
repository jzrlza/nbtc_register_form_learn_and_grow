import React from 'react';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="nav-brand">Registration</div>
      <div className="nav-user">
        กรอกข้อมูลเพื่อลงทะเบียน
      </div>
    </nav>
  );
};

export default Navbar;