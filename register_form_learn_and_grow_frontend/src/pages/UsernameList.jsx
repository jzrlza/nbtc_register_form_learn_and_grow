import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavbarAdmin from '../components/NavbarAdmin';
import Modal from '../components/Modal';
import { getEnumValue } from '../utils/enum_config';

const UsernameList = ({ user, onLogout }) => {
  const API_URL = import.meta.env.VITE_API_URL || '';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [modal, setModal] = useState({ isOpen: false, type: '', message: '', userId: null });
  const navigate = useNavigate();

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page,
        limit: 10
      });
      
      const response = await axios.get(`${API_URL}/api/users?${params}`);
      setUsers(response.data.users || []);
      setTotalPages(response.data.totalPages);
      setTotalUsers(response.data.total);
      setCurrentPage(response.data.page);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      showModal('error', 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้');
    } finally {
      setLoading(false);
    }
  };

  const showModal = (type, message, userId = null) => {
    setModal({ isOpen: true, type, message, userId });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: '', message: '', userId: null });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchUsers(newPage);
  };

  const handleEdit = (userId) => {
    navigate(`/username/edit/${userId}`);
  };

  const handleAddUser = () => {
    navigate('/username/edit');
  };

  const handleDelete = (userId) => {
    showModal('confirm', 'คุณแน่ใจหรือไม่ที่จะลบผู้ใข้งานนี้?', userId);
  };

  const confirmDelete = async () => {
    if (!modal.userId) return;
    
    try {
      await axios.delete(`${API_URL}/api/users/${modal.userId}`, {
        headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Send token like a password
        }
      });
      fetchUsers(currentPage);
      showModal('success', 'ลบผู้ใข้งานแล้ว');
    } catch (error) {
      console.error('Error deleting user:', error);
      showModal('error', 'ไม่สามารถผู้ใข้งานได้');
      if (error.response?.status == 403) {
        handleLogout();
      }
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  return (
    <div className="app">
      <NavbarAdmin user={user} onLogout={handleLogout} />
      
      <main className="app-main">
        <section className="registers-section">
          <div className="section-header">
            <h2>ผู้ใช้งาน ({totalUsers})</h2>
            <button onClick={() => fetchUsers(currentPage)} disabled={loading} className="refresh-btn">
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
            <button onClick={handleAddUser} className="add-btn">
              เพิ่มผู้ใข้งาน
            </button>
          </div>
          
          

          {users.length > 0 ? <div className="pagination">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || currentPage === 0}
                  className="page-btn"
                >
                  ก่อนหน้า
                </button>
                
                <span className="page-info">
                  หน้า {currentPage} จาก {totalPages}
                </span>
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  ถัดไป
                </button>
              </div> : ""}
          
          {users.length > 0 ? (
            <>
              <div className="table-container horizontal-scroll">
                <table className="registers-table">
                  <thead>
                    <tr>
                      <th>รหัส</th>
                      <th>username</th>
                      <th>employee_id</th>
                      <th>is_2fa_enabled</th>
                      <th>two_factor_secret??</th>
                      <th>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>{user.employee_id}</td>
                        <td>{user.is_2fa_enabled ? "true" : "false"}</td>
                        <td>{user.is_2fa_enabled ? (user.has_two_password ? "set" : "not set") : "-"}</td>
                        <td className="actions">
                          <button 
                            onClick={() => handleEdit(user.id)}
                            className="edit-btn"
                          >
                            แก้ไข
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="delete-btn"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || currentPage === 0}
                  className="page-btn"
                >
                  ก่อนหน้า
                </button>
                
                <span className="page-info">
                  หน้า {currentPage} จาก {totalPages}
                </span>
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  ถัดไป
                </button>
              </div>
            </>
          ) : (
            <p>ไม่พบผู้ใช้งาน</p>
          )}
        </section>
      </main>

      {/* Modal for messages */}
      <Modal 
        isOpen={modal.isOpen && ['success', 'error'].includes(modal.type)} 
        onClose={closeModal}
        title={modal.type === 'success' ? 'สำเร็จ' : 'ข้อผิดพลาด'}
      >
        <p>{modal.message}</p>
        <div className="modal-actions">
          <button onClick={closeModal} className="modal-btn primary">ตกลง</button>
        </div>
      </Modal>

      {/* Modal for confirmation */}
      <Modal 
        isOpen={modal.isOpen && modal.type === 'confirm'} 
        onClose={closeModal}
        title="ยืนยันการลบ"
      >
        <p>{modal.message}</p>
        <div className="modal-actions">
          <button onClick={confirmDelete} className="modal-btn danger">ลบ</button>
          <button onClick={closeModal} className="modal-btn secondary">ยกเลิก</button>
        </div>
      </Modal>
    </div>
  );
};

export default UsernameList;