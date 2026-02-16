import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import NavbarAdmin from '../components/NavbarAdmin';
import Modal from '../components/Modal';
import { getEnumValue } from '../utils/enum_config';

const UsernameInput = ({ user, onLogout }) => {
  const API_URL = import.meta.env.VITE_API_URL || '';
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    //emp_name: '',
    emp_id: '',
    username: '',
    is_2fa_enabled: false
  });
  
  // New state for hierarchical selection
  const [divisions, setDivisions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, type: '', message: '' });

  const showModal = (type, message) => {
    setModal({ isOpen: true, type, message });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: '', message: '' });
  };

  useEffect(() => {
    fetchDivisions();
    if (isEditMode) {
      fetchUserData();
    } else {
      setPageLoading(false);
    }
  }, [id]);

  // Fetch divisions on component mount
  const fetchDivisions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/divisions`);
      setDivisions(response.data);
    } catch (error) {
      console.error('Error fetching divisions:', error);
      showModal('error', 'ไม่สามารถโหลดข้อมูลสายงานได้');
    }
  };

  // Fetch departments based on selected division
  const fetchDepartments = async (divId) => {
    try {
      const response = await axios.get(`${API_URL}/api/users/departments?div_id=${divId}`);
      setDepartments(response.data);
      setSelectedDepartment('');
      setEmployees([]);
      setSelectedEmployee('');
    } catch (error) {
      console.error('Error fetching departments:', error);
      showModal('error', 'ไม่สามารถโหลดข้อมูลสำนักได้');
    }
  };

  // Fetch employees based on selected department
  const fetchEmployees = async (deptId) => {
    try {
      const response = await axios.get(`${API_URL}/api/users/employees?dept_id=${deptId}`);
      setEmployees(response.data);
      setSelectedEmployee('');
    } catch (error) {
      console.error('Error fetching employees:', error);
      showModal('error', 'ไม่สามารถโหลดข้อมูลพนักงานได้');
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users/${id}`);
      const userobj = response.data;
      
      setFormData({
        //emp_name: user.emp_name || '',
        emp_id: userobj.employee_id || '',
        username: userobj.username || '',
        is_2fa_enabled: userobj.is_2fa_enabled === 1 || userobj.is_2fa_enabled === true
      });

      // If editing, we need to fetch the employee's division and department
      if (userobj.employee_id) {
        try {
          const employeeInfo = await axios.get(`${API_URL}/api/users/employee-info/${userobj.employee_id}`);
          const { division_id, department_id } = employeeInfo.data;
          
          setSelectedDivision(division_id?.toString() || '');
          if (division_id) {
            await fetchDepartments(division_id);
            setSelectedDepartment(department_id?.toString() || '');
            if (department_id) {
              await fetchEmployees(department_id);
            }
          }
          setSelectedEmployee(userobj.employee_id.toString());
        } catch (error) {
          console.error('Error fetching employee info:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      showModal('error', 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
    } finally {
      setPageLoading(false);
    }
  };

  const handleDivisionChange = (e) => {
    const divisionId = e.target.value;
    setSelectedDivision(divisionId);
    setSelectedDepartment('');
    setSelectedEmployee('');
    setEmployees([]);
    
    if (divisionId) {
      fetchDepartments(divisionId);
    } else {
      setDepartments([]);
    }

    // Clear employee selection
    setFormData(prev => ({
      ...prev,
      //emp_name: '',
      emp_id: ''
    }));
  };

  const handleDepartmentChange = (e) => {
    const departmentId = e.target.value;
    setSelectedDepartment(departmentId);
    setSelectedEmployee('');
    
    if (departmentId) {
      fetchEmployees(departmentId);
    } else {
      setEmployees([]);
    }

    // Clear employee selection
    setFormData(prev => ({
      ...prev,
      //emp_name: '',
      emp_id: ''
    }));
  };

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value;
    setSelectedEmployee(employeeId);
    
    if (employeeId) {
      const employee = employees.find(emp => emp.id.toString() === employeeId);
      if (employee) {
        setFormData(prev => ({
          ...prev,
          //emp_name: employee.emp_name,
          emp_id: employee.id.toString()
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        //emp_name: '',
        emp_id: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate employee selection
    if (!formData.emp_id) {
      showModal('error', 'กรุณาเลือกพนักงาน');
      return;
    }
    
    setLoading(true);
    
    try {
      const submitData = {
        employee_id: formData.emp_id,
        username: formData.username,
        is_2fa_enabled: formData.is_2fa_enabled
      };
      
      if (isEditMode) {
        await axios.put(`${API_URL}/api/users/${id}`, submitData,{
        headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Send token like a password
        }
      });
        showModal('success', 'อัพเดทผู้ใช้งานเรียบร้อยแล้ว');
      } else {
        await axios.post(`${API_URL}/api/users`, submitData, {
        headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Send token like a password
        }
      });
        showModal('success', 'เพิ่มผู้ใช้งานเรียบร้อยแล้ว');
      }
    } catch (error) {
      console.error('Error saving registration:', error);
      showModal('error', 'ไม่สามารถบันทึกผู้ใช้งานได้: ' + (error.response?.data?.error || error.message));
      if (error.response?.status == 403) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Check if van_round_id should be disabled
  const isVanRoundDisabled = formData.take_van_id === '3' || formData.take_van_id === '4';

  const handleModalClose = () => {
    closeModal();
    if (modal.type === 'success') {
      navigate('/username');
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  if (pageLoading) {
    return <div className="loading">กำลังโหลด...</div>;
  }

  return (
    <div className="app">
      <NavbarAdmin user={user} onLogout={handleLogout} />
      
      <main className="app-main">
        <section className="form-section">
          <h2>{isEditMode ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</h2>

          <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="ป้อน username"
              />
            </div>

          <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="is_2fa_enabled"
              checked={formData.is_2fa_enabled}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                is_2fa_enabled: e.target.checked
              }))}
            />
            &nbsp;เปิดใช้งาน Two-Factor Authentication (2FA)
          </label>
          <small className="form-hint">
            เมื่อเปิดใช้งานนี้ ผู้ใช้งานจะต้องตั้งค่า 2FA ผ่านแอป Google Authenticator
          </small>
        </div>
          
          <form onSubmit={handleSubmit} className="employee-form">
            {/* Division Selection */}
            <div className="form-group">
              <label>สายงาน</label>
              <select
                value={selectedDivision}
                onChange={handleDivisionChange}
                required
              >
                <option value="">เลือกสายงาน</option>
                {divisions.map(division => (
                  <option key={division.id} value={division.id}>
                    {division.div_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Selection */}
            <div className="form-group">
              <label>สำนัก</label>
              <select
                value={selectedDepartment}
                onChange={handleDepartmentChange}
                disabled={!selectedDivision}
                required
              >
                <option value="">เลือกสำนัก</option>
                {departments.map(department => (
                  <option key={department.id} value={department.id}>
                    {department.dept_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Selection */}
            <div className="form-group">
              <label>ชื่อ-นามสกุล</label>
              <select
                value={selectedEmployee}
                onChange={handleEmployeeChange}
                disabled={!selectedDepartment}
                required
              >
                <option value="">เลือกพนักงาน</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.emp_name}
                  </option>
                ))}
              </select>
              {formData.emp_id && (
                <small className="form-hint">เลือกพนักงานแล้ว: {formData.emp_name} (รหัส ID ในฐานข้อมูล: {formData.emp_id})</small>
              )}
            </div>

            <br/>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'กำลังบันทึก...' : (isEditMode ? 'อัพเดทผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน')}
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/username')}
                className="cancel-btn"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </section>
      </main>

      <Modal 
        isOpen={modal.isOpen} 
        onClose={handleModalClose}
        title={modal.type === 'success' ? 'สำเร็จ' : 'ข้อผิดพลาด'}
      >
        <p>{modal.message}</p>
        <div className="modal-actions">
          <button onClick={handleModalClose} className="modal-btn primary">ตกลง</button>
        </div>
      </Modal>
    </div>
  );
};

export default UsernameInput;