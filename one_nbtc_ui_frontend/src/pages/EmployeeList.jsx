import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavbarAdmin from '../components/NavbarAdmin';
import Modal from '../components/Modal';
import { parseExcelToArray } from '../utils/excelParser';
import loadImage from '../res/loading.gif';

const EmployeeList = ({ user, onLogout }) => {
  const API_URL = import.meta.env.VITE_API_URL || '';
  const [employees, setEmployees] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [modal, setModal] = useState({ isOpen: false, type: '', message: '', employeeId: null });
  const [importModal, setImportModal] = useState({ isOpen: false, results: null, mode: 'test' });
  const [resignModal, setResignModal] = useState({ isOpen: false, results: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, excelData: null });
  const [excelLoadModal, setExcelLoadModal] = useState({ isOpen: false });
  const navigate = useNavigate();

  const fileInputRef = useRef();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Fetch divisions
  const fetchDivisions = async () => {
    setLoadingDivisions(true);
    try {
      const response = await axios.get(`${API_URL}/api/employees/divisions`);
      setDivisions(response.data);
    } catch (error) {
      console.error('Error fetching divisions:', error);
      showModal('error', 'ไม่สามารถดึงข้อมูลสายงานได้');
    } finally {
      setLoadingDivisions(false);
    }
  };

  // Fetch departments based on selected division
  const fetchDepartmentsByDivision = async (divisionId) => {
    if (!divisionId) {
      setDepartments([]);
      setSelectedDept('');
      return;
    }
    
    setLoadingDepts(true);
    try {
      const response = await axios.get(`${API_URL}/api/employees/departments/by-division/${divisionId}`);
      setDepartments(response.data);
      // Reset department selection when division changes
      setSelectedDept('');
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    } finally {
      setLoadingDepts(false);
    }
  };

  // Fetch all departments (for when no division is selected)
  const fetchAllDepartments = async () => {
    setLoadingDepts(true);
    try {
      const response = await axios.get(`${API_URL}/api/employees/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching all departments:', error);
      setDepartments([]);
    } finally {
      setLoadingDepts(false);
    }
  };

  const fetchEmployees = async (page = 1, searchTerm = '', divisionId = '', departmentId = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page,
        limit: 20
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (divisionId) {
        params.append('division_id', divisionId);
      }
      
      if (departmentId) {
        params.append('dept_id', departmentId);
      }
      
      const response = await axios.get(`${API_URL}/api/employees?${params}`);
      setEmployees(response.data.employees || []);
      setTotalPages(response.data.totalPages);
      setTotalEmployees(response.data.total);
      setCurrentPage(response.data.page);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
      showModal('error', 'ไม่สามารถดึงข้อมูลพนักงานได้');
    } finally {
      setLoading(false);
    }
  };

  const showModal = (type, message, employeeId = null) => {
    setModal({ isOpen: true, type, message, employeeId });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: '', message: '', employeeId: null });
  };

  const closeImportModal = () => {
    setImportModal({ isOpen: false, results: null, mode: 'test' });
  };

  const closeResignModal = () => {
    setResignModal({ isOpen: false, results: null });
  };

  const handleSearch = (search) => {
    setSearch(search);
    setCurrentPage(1);
    fetchEmployees(1, search, selectedDivision, selectedDept);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchEmployees(newPage, search, selectedDivision, selectedDept);
  };

  const handleEdit = (employeeId) => {
    navigate(`/employee/edit/${employeeId}`);
  };

  const handleDelete = (employeeId) => {
    showModal('confirm', 'คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้?', employeeId);
  };

  const handleMassDelete = (employeeIds) => {
    showModal('confirm-mass', 'คุณแน่ใจหรือไม่ที่จะลบพนักงานเหล่านี้?', employeeIds);
  }

  const confirmDelete = async () => {
    if (!modal.employeeId) return;
    
    try {
      if (modal.type === 'confirm-mass') {
        await axios.patch(`${API_URL}/api/employees/excel-mass-delete`, 
          {employeeIds: modal.employeeId}, {
          headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Send token like a password
          }
        });
        setExcelLoadModal({ isOpen: true });
      } else {
        await axios.delete(`${API_URL}/api/employees/${modal.employeeId}`,{
          headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Send token like a password
          }
        });
      }
      
      fetchEmployees(currentPage, search, selectedDivision, selectedDept);
      showModal('success', 'ลบพนักงานเรียบร้อยแล้ว');
      cancelImport();
      closeResignModal();
      setExcelLoadModal({ isOpen: false });
    } catch (error) {
      console.error('Error deleting employee:', error);
      showModal('error', 'ไม่สามารถลบพนักงานได้');
      if (error.response?.status == 403) {
        handleLogout();
      }
    }
  };

  const handleAddEmployee = () => {
    navigate('/employee/edit');
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // Handle division change
  const handleDivisionChange = (e) => {
    const divisionId = e.target.value;
    setSelectedDivision(divisionId);
    
    if (divisionId) {
      fetchDepartmentsByDivision(divisionId);
    } else {
      fetchAllDepartments();
    }
    
    // Reset department selection
    setSelectedDept('');
    setCurrentPage(1);
    
    // Refetch employees with new filters
    fetchEmployees(1, search, divisionId, '');
  };

  // Handle department change
  const handleDepartmentChange = (e) => {
    const deptId = e.target.value;
    setSelectedDept(deptId);
    setCurrentPage(1);
    fetchEmployees(1, search, selectedDivision, deptId);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('');
    setSelectedDivision('');
    setSelectedDept('');
    setDepartments([]);
    setCurrentPage(1);
    fetchEmployees(1);
    fetchAllDepartments();
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showModal('error', 'กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Frontend: Starting Excel import...');
      
      // Parse Excel to array
      const excelData = await parseExcelToArray(file);
      
      // Show confirmation modal instead of alert
      setConfirmModal({
        isOpen: true,
        excelData: excelData
      });
      
    } catch (error) {
      console.error('Frontend: Import error:', error);
      showModal('error', 'ไม่สามารถประมวลผลไฟล์ Excel ได้: ' + error.message);
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cancelImport = () => {
    setConfirmModal({ isOpen: false, excelData: null });
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleImportConfirm = async (shouldImport) => {
    setConfirmModal({ isOpen: false, excelData: null });
    
    if (!confirmModal.excelData) return;
    
    setLoading(true);
    setExcelLoadModal({ isOpen: true });
    
    try {
      let response;
      if (shouldImport) {
        console.log('Frontend: Starting REAL import...');
        response = await axios.post(`${API_URL}/api/employees/import`, { excelData: confirmModal.excelData },{
        headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Send token like a password
        }
      });
      } else { //detect resigned employees
        console.log('Frontend: Starting DETECT MISSING upload...');
        response = await axios.post(`${API_URL}/api/employees/detect-missing`, { excelData: confirmModal.excelData },{
        headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Send token like a password
        }
      });
      }
      
      if (response.data.success) {
        setExcelLoadModal({ isOpen: false });

        if (shouldImport) {
          setImportModal({
            isOpen: true,
            results: response.data,
            mode: shouldImport ? 'import' : 'test'
          });
        } else {
          setResignModal({
            isOpen: true,
            results: response.data
          });
        }
        
        
        // Refresh employee list if it was a real import
        if (shouldImport && response.data.savedCount > 0) {
          fetchEmployees(currentPage, search, selectedDivision, selectedDept);
          fetchDivisions();
          fetchAllDepartments();
        }
        
        console.log('Frontend: Operation completed successfully');
      } else {
        showModal('error', `การดำเนินการล้มเหลว: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Frontend: Import error:', error);
      setExcelLoadModal({ isOpen: false });
      showModal('error', 'ไม่สามารถประมวลผลไฟล์ Excel ได้: ' + error.message);
      if (error.response?.status == 403) {
        handleLogout();
      }
    } finally {
      setExcelLoadModal({ isOpen: false });
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    fetchEmployees(1);
    fetchDivisions();
    fetchAllDepartments();
  }, []);

  return (
    <div className="app">
      <NavbarAdmin user={user} onLogout={handleLogout} />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportExcel}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
      />
      
      <main className="app-main">
        <section className="employees-section">
          <div className="section-header">
            <h2 className="section-header--header">พนักงาน ({totalEmployees})</h2>
            <div className="section-header--btn-group">
            <button onClick={() => fetchEmployees(currentPage, search, selectedDivision, selectedDept)} disabled={loading} className="refresh-btn">
                    {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
                  </button>
            <button onClick={handleAddEmployee} className="add-btn">
              เพิ่มพนักงาน
            </button>
            <button onClick={handleImportClick} disabled={loading} className="import-btn">
              {loading ? 'กำลังประมวลผล...' : 'นำเข้า Excel'}
            </button>
            </div>
          </div>
          
            <div className="filters-container">
              <div className="filters-row">
                <form onSubmit={handleSearch} className="search-form">
                  <input
                    type="text"
                    placeholder="ค้นหาพนักงานด้วยชื่อ..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="search-input"
                  />
                </form>
                
                <div className="filter-controls">
                  <select 
                    value={selectedDivision} 
                    onChange={handleDivisionChange}
                    className="filter-select"
                    disabled={loadingDivisions}
                  >
                    <option value="">-- เลือกสายงาน --</option>
                    {divisions.map(division => (
                      <option key={division.id} value={division.id}>
                        {division.div_name}
                      </option>
                    ))}
                  </select>
                  
                  <select 
                    value={selectedDept} 
                    onChange={handleDepartmentChange}
                    className="filter-select"
                    disabled={loadingDepts || !departments.length}
                  >
                    <option value="">-- เลือกสำนัก/สังกัด --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.dept_name}
                      </option>
                    ))}
                  </select>
                  
                  <button 
                    type="button" 
                    onClick={handleClearFilters}
                    className="clear-btn"
                    disabled={loading}
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              </div>
              
              <div className="active-filters">
                {(selectedDivision || selectedDept || search) && (
                  <div className="filters-info">
                    <span className="filter-label">ตัวกรองที่ใช้งานอยู่: </span>
                    {selectedDivision && (
                      <span className="filter-tag">
                        สายงาน: {divisions.find(d => d.id == selectedDivision)?.div_name+" "}
                      </span>
                    )}
                    {selectedDept && (
                      <span className="filter-tag">
                        สำนัก: {departments.find(d => d.id == selectedDept)?.dept_name}
                      </span>
                    )}
                    {search && (
                      <span className="filter-tag">
                        ค้นหา: {search}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

          {employees.length > 0 ? (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || currentPage === 0}
                className="page-btn"
              >
                {"<"}
              </button>
              
              <span className="page-info">
                หน้า {currentPage}/{totalPages}
              </span>
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="page-btn"
              >
                {">"}
              </button>
            </div>
          ) : ""}
          
          {employees.length > 0 ? (
            <>
              <div className="table-container">
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="name-in-table">ชื่อ-นามสกุล</th>
                      <th className="subname-in-table">ตำแหน่ง</th>
                      <th>สำนัก</th>
                      <th>สายงาน</th>
                      <th>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td>{employee.id}</td>
                        <td className="name-in-table">{employee.emp_name}</td>
                        <td className="subname-in-table">{employee.position_name}</td>
                        <td>{employee.dept_name}</td>
                        <td>{employee.div_name}</td>
                        <td className="actions">
                          <button 
                            onClick={() => handleEdit(employee.id)}
                            className="edit-btn"
                          >
                            แก้ไข
                          </button>
                          <button 
                            onClick={() => handleDelete(employee.id)}
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
                  {"<"}
                </button>
                
                <span className="page-info">
                  หน้า {currentPage}/{totalPages}
                </span>
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  {">"}
                </button>
              </div>
            </>
          ) : (
            <div className="no-data">
              <p>ไม่พบพนักงาน</p>
              {selectedDivision || selectedDept || search ? (
                <button onClick={handleClearFilters} className="clear-btn">
                  ล้างตัวกรองทั้งหมด
                </button>
              ) : null}
            </div>
          )}
        </section>
      </main>

      {/* Confirm Import Modal */}
      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ isOpen: false, excelData: null })}
        title="ยืนยันการนำเข้า"
      >
        <div className="confirm-import">
          <p><strong>คุณต้องการนำเข้าข้อมูลไปยังฐานข้อมูลหรือไม่?</strong></p>
          <div className="import-options">
            <div className="option">
              <h4>✅ นำเข้าสู่ฐานข้อมูล</h4>
              <p>บันทึกพนักงานลงฐานข้อมูล (ไม่สามารถย้อนกลับได้)</p>
            </div>
            <div className="option">
              <h4>🔍 ตรวจสอบรายชื่อที่หายจาก Excel</h4>
              <p>ตรวจสอบพนักงานเก่าที่ออกจากงานแล้ว เพื่อลบออกภายหลัง</p>
            </div>
          </div>
          <div className="modal-actions">
            <button 
              onClick={() => handleImportConfirm(true)} 
              className="modal-btn secondary"
            >
              นำเข้าสู่ฐานข้อมูล
            </button>
            <button 
              onClick={() => handleImportConfirm(false)} 
              className="modal-btn danger"
            >
              ตรวจสอบรายชื่อที่หายจาก Excel
            </button>
            <button 
              onClick={() => cancelImport()} 
              className="modal-btn primary"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </Modal>

      {/*import modal*/}
      <Modal 
        isOpen={importModal.isOpen} 
        onClose={closeImportModal}
        title={importModal.mode === 'import' ? 'ผลการนำเข้า Excel' : 'ผลการทดสอบ Excel'}
      >
        {importModal.results && (
          <div className="import-results">
            <div className="import-summary">
              <p><strong>จำนวนแถวทั้งหมด:</strong> {importModal.results.totalRows}</p>
              <p className={importModal.mode === 'import' ? 'success-text' : 'info-text'}>
                <strong>{importModal.mode === 'import' ? 'เพิ่มสำเร็จ:' : 'แถวที่น่าเพิ่ม:'}</strong> {importModal.mode === 'import' ? importModal.results.createdCount : importModal.results.createdCount}
              </p>
              <p className={importModal.mode === 'import' ? 'success-text' : 'info-text'}>
                <strong>{importModal.mode === 'import' ? 'แก้ไขสำเร็จ:' : 'แถวที่น่าแก้ไข:'}</strong> {importModal.mode === 'import' ? importModal.results.updatedCount : importModal.results.updatedCount}
              </p>
              <p className="error-text">
                <strong>ไม่มีการเปลี่ยนแปลง:</strong> {importModal.mode === 'import' ? importModal.results.unchangedCount : importModal.results.unchangedCount}
              </p>
              <p className="error-text">
                <strong>ข้อผิดพลาด:</strong> {importModal.mode === 'import' ? importModal.results.errorCount : importModal.results.errorCount}
              </p>
            </div>
            
            {importModal.results.errors && importModal.results.errors.length > 0 && (
              <div className="import-errors">
                <h4>ข้อผิดพลาด ({importModal.results.errors.length}):</h4>
                <div className="error-list scroll-box">
                  {importModal.results.errors.map((error, index) => (
                    <div key={index} className="error-item">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {importModal.mode === 'import' && importModal.results.saved && importModal.results.saved.length > 0 && (
              <div className="import-success">
                <h4>นำเข้าสำเร็จ ({importModal.results.saved.length + importModal.results.updated.length}):</h4>
                <div className="success-list scroll-box">
                  {importModal.results.saved.slice(0, 10).map((item, index) => (
                    <div key={index} className="success-item">
                      <strong>แถวที่ {item.rowNumber}:</strong> {item.emp_name} - {item.dept_name} - {item.position_name}
                    </div>
                  ))}
                  {importModal.results.saved.length > 10 && (
                    <div className="more-items">
                      ... และอีก {importModal.results.saved.length - 10} พนักงาน
                    </div>
                  )}

                  {importModal.results.updated.slice(0, 10).map((item, index) => (
                    <div key={index} className="success-item">
                      <strong>แถวที่ {item.rowNumber}:</strong> {item.emp_name} - {item.dept_name} - {item.position_name}
                    </div>
                  ))}
                  {importModal.results.updated.length > 10 && (
                    <div className="more-items">
                      ... และอีก {importModal.results.updated.length - 10} พนักงาน
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {importModal.mode === 'test' && importModal.results.data && importModal.results.data.length > 0 && (
              <div className="import-preview">
                <h4>ตัวอย่าง (5 แถวแรก):</h4>
                <div className="preview-table scroll-box">
                  {importModal.results.data.slice(0, 5).map((item, index) => (
                    <div key={index} className="preview-item">
                      <strong>แถวที่ {item.rowNumber}:</strong> {item.emp_name} - {item.dept_name} - {item.position_name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="modal-actions">
              <button onClick={closeImportModal} className="modal-btn primary">
                ปิด
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/*detect resigned employees modal*/}
      <Modal 
        isOpen={resignModal.isOpen} 
        onClose={closeResignModal}
        title={'ผลจากการหาพนักงานที่ออกแล้ว เทียบจากฐานข้อมูลสู่ Excel'}
      >
        {resignModal.results && (
          <div className="import-results">
            
            {resignModal.results.missingEmployees && resignModal.results.missingEmployees.length > 0 ? (
              <div className="import-errors">
                <h4>รายชื่อพนักงานในฐานข้อมูลที่ไม่พบใน Excel ({resignModal.results.missingEmployees.length}):</h4>
                <div className="error-list scroll-box">
                  {resignModal.results.missingEmployees.map((missingEmployee, index) => (
                    <div key={index} className="error-item">
                      ID={missingEmployee.id} || {missingEmployee.emp_name} || {missingEmployee.dept_name} || {missingEmployee.div_name} || {missingEmployee.position_name}
                    </div>
                  ))}
                </div>
              </div>
            ) : (<div>
              <h4>ไม่พบพนักงานในฐานข้อมูลที่ไม่ปรากฎใน Excel ขณะนี้</h4>
            </div>)}
            
            <div className="modal-actions">
            <button 
            disabled={!resignModal.results.missingEmployees || resignModal.results.missingEmployees.length <= 0}
            onClick={() => handleMassDelete(resignModal.results.missingEmployeeIds)} className="modal-btn danger">
                ลบออกทั้งหมด
              </button>
              <button onClick={closeResignModal} className="modal-btn primary">
                ปิด
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal for confirmation */}
      <Modal 
        isOpen={modal.isOpen && (modal.type === 'confirm' || modal.type === 'confirm-mass')} 
        onClose={closeModal}
        title="ยืนยันการลบ"
      >
        <p>{modal.message}</p>
        <div className="modal-actions">
          <button onClick={confirmDelete} className="modal-btn danger">ลบ</button>
          <button onClick={closeModal} className="modal-btn secondary">ยกเลิก</button>
        </div>
      </Modal>

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

      {/* Modal for import loading */}
      <Modal 
        isOpen={excelLoadModal.isOpen} 
        title={'Loading...'}
      >
        <h1>
          <img 
            src={loadImage} 
            alt={`กำลังโหลด`} 
            style={{
              width: '40px',
              height: '40px',
              display: 'block',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}
          />
        </h1>
        <p>กำลังประมวลผล...</p>
      </Modal>
    </div>
  );
};

export default EmployeeList;