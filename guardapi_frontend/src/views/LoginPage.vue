<template>
  <!-- Setup 2FA Screen -->
  <div v-if="showSetup2FA" class="login-container">
    <h2>ตั้งค่าการยืนยันสองขั้นตอน</h2>
    <div class="setup-2fa">
      <p>สแกน QR Code นี้ด้วยแอปยืนยันตัวตนของคุณ:</p>
      <div v-if="qrCode" class="qr-code-container">
        <img :src="qrCode" alt="QR Code" class="qr-code" />
      </div>
      <div v-else class="qr-code-container">
        <p>กำลังสร้าง QR Code...</p>
      </div>
      <div v-if="secret" class="secret-container">
        <p>หรือป้อนคีย์ลับนี้ด้วยตนเอง:</p>
        <div class="secret-display">
          <code>{{ secret }}</code>
          <button type="button" @click="copyToClipboard" class="copy-btn">คัดลอก</button>
        </div>
      </div>
      <p class="instruction">หลังจากตั้งค่าแล้ว กรุณาป้อนรหัส 6 หลักจากแอปยืนยันตัวตน:</p>
      <form @submit.prevent="verify2FA">
        <input class="login-input" type="text" placeholder="ป้อนรหัส 6 หลัก" v-model="code" required maxlength="6" />
        <button class="btn btn-full" type="submit" :disabled="loading">
          {{ loading ? 'กำลังตรวจสอบ...' : 'ยืนยันและตั้งค่าให้เสร็จสิ้น' }}
        </button>
      </form>
    </div>
    <Modal :isOpen="modal.isOpen" @close="closeModal" :title="modal.type === 'success' ? 'สำเร็จ' : 'ข้อผิดพลาด'">
      <p>{{ modal.message }}</p>
    </Modal>
  </div>

  <!-- 2FA Verification Screen -->
  <div v-else-if="requires2FA" class="login-container">
    <h2>การยืนยันสองขั้นตอน</h2>
    <h6>(พบอุปกรณ์ใหม่)</h6>
    <div class="auth-options">
      <p>ป้อนรหัส 6 หลักจากแอปยืนยันตัวตน</p>
      <br/>
      <form @submit.prevent="verify2FA">
        <input class="login-input" type="text" placeholder="ป้อนรหัส 6 หลัก" v-model="code" required maxlength="6" />
        <label class="checkbox-label">
          <input type="checkbox" v-model="rememberDevice" />
          จดจำอุปกรณ์นี้
        </label>
        <button class="btn btn-full" type="submit" :disabled="loading">
          {{ loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน' }}
        </button>
      </form>
    </div>
    <Modal :isOpen="modal.isOpen" @close="closeModal" :title="modal.type === 'success' ? 'สำเร็จ' : 'ข้อผิดพลาด'">
      <p>{{ modal.message }}</p>
    </Modal>
  </div>

  <!-- Setup Required Screen -->
  <div v-else-if="requiresSetup" class="login-container">
    <h2>ตั้งค่า 2FA</h2>
    <p style="text-align: center; margin-bottom: 20px;">คุณยังไม่ได้ตั้งค่าการยืนยันสองขั้นตอน</p>
    <button @click="setup2FA" class="btn btn-full" :disabled="loading">
      {{ loading ? 'กำลังดำเนินการ...' : 'ตั้งค่า 2FA ทันที' }}
    </button>
    <Modal :isOpen="modal.isOpen" @close="closeModal" :title="modal.type === 'success' ? 'สำเร็จ' : 'ข้อผิดพลาด'">
      <p>{{ modal.message }}</p>
    </Modal>
  </div>

  <!-- Login Screen -->
  <div v-else class="login-container">
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label>ชื่อผู้ใช้งาน</label>
        <input v-model="username" type="text" required>
      </div>
      <div class="form-group">
        <label>รหัสผ่าน</label>
        <input v-model="password" type="password" required>
      </div>
      <button type="submit" class="btn btn-full" :disabled="loading">
        {{ loading ? 'กำลังดำเนินการ...' : 'ลงชื่อเข้าใช้' }}
      </button>
    </form>
    <Modal :isOpen="modal.isOpen" @close="closeModal" :title="modal.type === 'success' ? 'สำเร็จ' : 'ข้อผิดพลาด'">
      <p>{{ modal.message }}</p>
    </Modal>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Modal from '../components/Modal.vue';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const router = useRouter();

const username = ref('');
const password = ref('');
const loading = ref(false);
const requires2FA = ref(false);
const requiresSetup = ref(false);
const userId = ref(null);
const pendingToken = ref(null);
const code = ref('');
const qrCode = ref('');
const secret = ref('');
const showSetup2FA = ref(false);
const rememberDevice = ref(true);
const modal = ref({ isOpen: false, type: '', message: '' });

const showModal = (type, message) => {
  modal.value = { isOpen: true, type, message };
};

const closeModal = () => {
  modal.value = { isOpen: false, type: '', message: '' };
};

const emit = defineEmits(['login-success']);

async function handleLogin() {
  loading.value = true;
  
  try {
    const res = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        trustToken: localStorage.getItem('trustToken') || null
      })
    });
    
    const data = await res.json();

    if (data.requires2FA) {
      requires2FA.value = true;
      requiresSetup.value = false;
      showSetup2FA.value = false;
      userId.value = data.userId;
      pendingToken.value = data.token;
    } else if (data.requiresSetup) {
      requiresSetup.value = true;
      requires2FA.value = false;
      showSetup2FA.value = false;
      userId.value = data.userId;
      pendingToken.value = data.token;
    } else if (data.success) {
      localStorage.setItem('token', data.token);
      if (data.trustToken) localStorage.setItem('trustToken', data.trustToken);
      emit('login-success', data.user);
      router.push('/');
    } else {
      showModal('error', data.error || 'Login failed');
    }
  } catch (err) {
    showModal('error', 'Login failed: ' + err.message);
  } finally {
    loading.value = false;
  }
}

async function verify2FA() {
  if (!pendingToken.value) {
    showModal('error', 'Session expired. Please login again.');
    requires2FA.value = false;
    showSetup2FA.value = false;
    requiresSetup.value = false;
    return;
  }

  loading.value = true;
  
  try {
    const res = await fetch(`${apiUrl}/api/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: pendingToken.value,
        code: code.value,
        rememberDevice: rememberDevice.value
      })
    });
    
    const data = await res.json();

    if (data.success) {
      localStorage.setItem('token', data.token);
      if (data.trustToken) localStorage.setItem('trustToken', data.trustToken);
      showSetup2FA.value = false;
      requires2FA.value = false;
      requiresSetup.value = false;
      pendingToken.value = null;
      code.value = '';
      emit('login-success', data.user);
      router.push('/');
    } else {
      showModal('error', data.error || '2FA verification failed');
    }
  } catch (err) {
    showModal('error', '2FA verification failed: ' + err.message);
  } finally {
    loading.value = false;
  }
}

async function setup2FA() {
  if (!pendingToken.value || !userId.value) {
    showModal('error', 'Session expired. Please login again.');
    requiresSetup.value = false;
    return;
  }

  loading.value = true;
  try {
    const res = await fetch(`${apiUrl}/api/auth/setup-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId.value,
        username: username.value,
        token: pendingToken.value
      })
    });
    
    const data = await res.json();

    if (data.success) {
      qrCode.value = data.qrCode;
      secret.value = data.secret;
      requiresSetup.value = false;
      showSetup2FA.value = true;
    } else {
      showModal('error', data.error || '2FA setup failed');
    }
  } catch (err) {
    showModal('error', '2FA setup failed: ' + err.message);
  } finally {
    loading.value = false;
  }
}

function copyToClipboard() {
  navigator.clipboard.writeText(secret.value);
  showModal('success', 'Secret key copied to clipboard!');
}
</script>

<style scoped>
* {
  color: #e0e0e0;
}

h2 {
  margin-bottom: 24px;
  color: #c44;
}

h6 {
  color: #c44;
  text-align: center;
  margin-bottom: 16px;
}

.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 40px 20px;
  background: transparent;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #fff;
}

.form-group input,
.login-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #333;
  border-radius: 6px;
  font-size: 14px;
  background: #360c0c;
  color: #fff673;
}

.form-group input:focus,
.login-input:focus {
  outline: none;
  border-color: #fff673;
}

.btn {
  padding: 12px 24px;
  background: #800000;
  color: #e0e0e0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-full {
  width: 100%;
}

.btn:hover:not(:disabled) {
  background: #a00000;
}

.copy-btn {
  padding: 6px 12px;
  background: #800000;
  color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.copy-btn:hover {
  background: #a00000;
}

.qr-code-container {
  text-align: center;
  margin: 20px 0;
}

.qr-code {
  width: 200px;
  height: 200px;
  border: 1px solid #333;
  border-radius: 8px;
  background: white;
  padding: 8px;
}

.secret-container {
  margin: 16px 0;
}

.secret-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1a1a1a;
  padding: 10px;
  border-radius: 6px;
  margin-top: 8px;
  border: 1px solid #333;
}

.secret-display code {
  flex: 1;
  word-break: break-all;
  font-size: 13px;
  color: #c44;
}

.instruction {
  margin: 16px 0 8px;
  color: #999;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #aaa;
  cursor: pointer;
  margin: 8px 0;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #800000;
}

p {
  color: #aaa;
}
</style>