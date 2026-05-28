<template>
  <div class="page">
    <div class="page-header">
      <h1>👥 จัดการผู้ใช้งาน</h1>
      <div class="status">
        <span :class="['dot', connected ? 'green' : 'red']"></span>
        {{ connected ? 'เชื่อมต่อเรียบร้อย' : 'ไม่ได้เชื่อมต่อ' }}
      </div>
    </div>

    <!-- Add/Edit User Form -->
    <div class="card post-form" v-if="showForm">
      <h3>{{ editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน' }}</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="filter-label">ชื่อผู้ใช้งาน</label>
          <input v-model="formUsername" type="text" placeholder="Username..." class="title-input" />
        </div>
        <div class="form-group">
          <label class="filter-label">รหัสผ่าน</label>
          <div class="password-wrap">
            <input v-model="formPassword" :type="showPassword ? 'text' : 'password'" placeholder="Password..." class="title-input" />
            <button type="button" class="toggle-pw" @click="showPassword = !showPassword">{{ showPassword ? '🙈' : '👁️' }}</button>
          </div>
        </div>
        <div class="form-group">
          <label class="filter-label">ประเภทผู้ใช้</label>
          <select v-model="formType" class="filter-input">
            <option :value="2">ผู้ดูแลระบบ (Admin)</option>
            <option :value="3">ผู้ใช้ทั่วไป (User)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="filter-label">เปิดใช้งาน 2FA</label>
          <select v-model="form2FA" class="filter-input">
            <option :value="1">✅ เปิดใช้งาน</option>
            <option :value="0">❌ ไม่เปิดใช้งาน</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button @click="cancelForm" class="btn-clear">✕ ยกเลิก</button>
        <button @click="saveUser" :disabled="loading || !formUsername" class="btn btn-submit">
          {{ loading ? 'กำลังบันทึก...' : editingUser ? 'อัปเดต' : 'เพิ่มผู้ใช้' }}
        </button>
      </div>
    </div>

    <!-- Toggle Form Button -->
    <div class="card filters" v-if="!showForm">
      <button @click="showForm = true" class="btn btn-submit">+ เพิ่มผู้ใช้งาน</button>
    </div>

    <!-- Users Table -->
    <div class="card">
      <h3>รายชื่อผู้ใช้งาน ({{ users.length }})</h3>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>ประเภท</th>
              <th>2FA</th>
              <th>สร้างเมื่อ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" :class="{ 'new-row': newIds.has(user.id) }">
              <td>{{ user.id }}</td>
              <td>{{ user.username }}</td>
              <td>{{ typeLabel(user.type) }}</td>
              <td>{{ user.is_2fa_enabled ? '✅' : '❌' }}</td>
              <td>{{ formatTime(user.created_at) }}</td>
              <td>
                <span v-if="user.type > 1">
                  <button @click="editUser(user)" class="btn-edit">✏️</button>
                  <button @click="confirmDelete(user)" class="btn-danger-sm">✕</button>
                </span>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="6" class="empty">ไม่พบผู้ใช้งาน</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Confirm Delete Modal -->
  <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
    <div class="modal-content">
      <div class="modal-header">
        <h3>⚠️ ยืนยันการลบ</h3>
        <button class="modal-close" @click="showDeleteModal = false">×</button>
      </div>
      <div class="modal-body">
        <p>คุณต้องการลบผู้ใช้งาน <strong>{{ deleteTarget?.username }}</strong> ใช่หรือไม่?</p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn" @click="showDeleteModal = false">ยกเลิก</button>
        <button class="modal-btn modal-btn-danger" @click="deleteUser">ลบ</button>
      </div>
    </div>
  </div>

  <!-- Error Modal -->
  <div v-if="showErrorModal" class="modal-overlay" @click.self="showErrorModal = false">
    <div class="modal-content">
      <div class="modal-header">
        <h3>⚠️ ข้อผิดพลาด</h3>
        <button class="modal-close" @click="showErrorModal = false">×</button>
      </div>
      <div class="modal-body">
        <p>{{ errorMessage }}</p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" @click="showErrorModal = false">ตกลง</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue';

const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const currentUser = inject('currentUser');
const users = ref([]);
const loading = ref(false);
const connected = ref(false);
const newIds = ref(new Set());

const showForm = ref(false);
const editingUser = ref(null);
const formUsername = ref('');
const formPassword = ref('');
const formType = ref(3);
const showPassword = ref(false);
const form2FA = ref(1);

const showDeleteModal = ref(false);
const deleteTarget = ref(null);

const showErrorModal = ref(false);
const errorMessage = ref('');

let ws = null;

function connectWebSocket() {
  ws = new WebSocket(wsUrl);
  ws.onopen = () => { connected.value = true; fetchUsers(); };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'users_updated') {
        const oldIds = new Set(users.value.map(u => u.id));
        users.value = data.data;
        data.data.forEach(u => {
          if (!oldIds.has(u.id)) {
            newIds.value.add(u.id);
            setTimeout(() => newIds.value.delete(u.id), 2000);
          }
        });
      }
    } catch {}
  };
  ws.onclose = () => { connected.value = false; setTimeout(connectWebSocket, 2000); };
  ws.onerror = () => { connected.value = false; };
}

function typeLabel(type) {
  if (parseInt(type) <= 1) return 'AD Admin';
  if (parseInt(type) == 2) return 'Admin';
  return 'User';
}

function showError(msg) {
  errorMessage.value = msg;
  showErrorModal.value = true;
}

async function fetchUsers() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${apiUrl}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) users.value = await res.json();
  } catch {}
}

function cancelForm() {
  showForm.value = false;
  editingUser.value = null;
  formUsername.value = '';
  formPassword.value = '';
  formType.value = 3;
  form2FA.value = 1;
  showPassword.value = false;
}

function editUser(user) {
  editingUser.value = user;
  formUsername.value = user.username;
  formPassword.value = '';
  formType.value = user.type;
  form2FA.value = user.is_2fa_enabled ? 1 : 0;
  showPassword.value = false;
  showForm.value = true;
}

async function saveUser() {
  if (!formUsername.value) return;
  loading.value = true;
  try {
    const token = localStorage.getItem('token');
    const body = {
      username: formUsername.value,
      type: parseInt(formType.value),
      is_2fa_enabled: form2FA.value
    };
    if (formPassword.value) body.password = formPassword.value;

    const url = editingUser.value
      ? `${apiUrl}/api/users/${editingUser.value.id}`
      : `${apiUrl}/api/users`;
    const method = editingUser.value ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Failed');

    // Instant local update while waiting for WebSocket
    if (editingUser.value) {
      const idx = users.value.findIndex(u => u.id === editingUser.value.id);
      if (idx !== -1) {
        users.value[idx] = {
          ...users.value[idx],
          username: formUsername.value,
          type: parseInt(formType.value),
          is_2fa_enabled: form2FA.value
        };
      }
    }

    cancelForm();
  } catch (err) {
    showError(err.message);
  } finally {
    loading.value = false;
  }
}

async function deleteUser() {
  if (!deleteTarget.value) return;
  const targetId = deleteTarget.value.id;
  showDeleteModal.value = false;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${apiUrl}/api/users/${targetId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Delete failed');

    // Instant local removal
    users.value = users.value.filter(u => u.id !== targetId);
    deleteTarget.value = null;
  } catch (err) {
    showError(err.message);
  }
}

function confirmDelete(user) {
  deleteTarget.value = user;
  showDeleteModal.value = true;
}

function formatTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('th-TH');
}

onMounted(() => connectWebSocket());
onUnmounted(() => { if (ws) ws.close(); });
</script>

<style scoped>
select.filter-input option {
  background: #1a1a1a;
  color: #fff;
}

.page { max-width: 1200px; margin: 0 auto; padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 24px; color: #fff; }

.status { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #fff; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.green { background: #22c55e; }
.dot.red { background: #ef4444; }

.card {
  background: rgba(101, 21, 20, 1);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #5a1a1a;
  margin-bottom: 16px;
}

.card h3 { margin-bottom: 12px; color: #fff; }

.post-form { display: flex; flex-direction: column; gap: 16px; }

.form-row { display: flex; gap: 16px; flex-wrap: wrap; }
.form-group { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 4px; }

.password-wrap { position: relative; display: flex; align-items: center; }
.password-wrap .title-input { flex: 1; padding-right: 40px; }
.toggle-pw { position: absolute; right: 8px; background: none; border: none; cursor: pointer; font-size: 18px; }

.title-input,
.filter-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  background: #fff;
  color: #333;
}

.title-input:focus,
.filter-input:focus {
  outline: none;
  border-color: #ffd700;
  box-shadow: 0 0 0 2px rgba(255,215,0,0.2);
}

.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-actions { display: flex; gap: 12px; justify-content: flex-end; }

.btn {
  padding: 10px 20px;
  background: #8b2020;
  color: #e8e0e0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-submit { background: #005cb3; }
.btn-submit:hover:not(:disabled) { background: #0c81f0; }

.btn-clear {
  padding: 10px 20px;
  background: #3a1010;
  color: #ff6b6b;
  border: 1px solid #6b1a1a;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.table-scroll { max-height: 400px; overflow-y: auto; }
table { width: 100%; border-collapse: collapse; border: 1px solid #3a1010; }
thead { position: sticky; top: 0; z-index: 1; }

th {
  background: #3a1010;
  padding: 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  border-bottom: 2px solid #6b1a1a;
}

td {
  padding: 10px;
  border-bottom: 1px solid #3a1010;
  font-size: 13px;
  color: #fff;
}

tr:hover { background: #2a0808; }
.empty { text-align: center; padding: 40px; color: #fff; }

.btn-edit {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  margin-right: 8px;
}

.btn-danger-sm {
  background: #8b2020;
  color: #e8e0e0;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  font-size: 12px;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(20, 5, 5, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #2a1010;
  border: 1px solid #6b1a1a;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #3a1010;
}

.modal-header h3 { margin: 0; color: #f59e0b; font-size: 18px; }

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #b99;
  padding: 0;
  width: 30px; height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.modal-body { padding: 20px; }
.modal-body p { margin: 0; color: #c9a; line-height: 1.5; }

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #3a1010;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  background: #3a1010;
  color: #e8e0e0;
  border: 1px solid #6b1a1a;
}

.modal-btn-primary {
  background: #8b2020;
  color: #e8e0e0;
  border: none;
}

.modal-btn-danger {
  background: #a00000;
  color: #fff;
  border: none;
}

.modal-btn:hover { opacity: 0.9; }

.new-row {
  animation: highlightRow 2s ease-out;
}

@keyframes highlightRow {
  from { background: #4a1515; }
  to { background: transparent; }
}
</style>