<template>
  <nav class="navbar">
    <div class="navbar-left">
      <h3>ระบบรายงาน รปภ.</h3>
    </div>
    <div class="navbar-right">
      <span class="username">{{ username }}</span>
      <button class="logout-btn" @click="handleLogout" :disabled="loggingOut">
        {{ loggingOut ? '...' : 'ออกจากระบบ' }}
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const router = useRouter();
const route = useRoute();
const username = ref('');
const loggingOut = ref(false);

async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    username.value = '';
    return;
  }
  try {
    const res = await fetch(`${apiUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      username.value = data.user.username;
    } else {
      username.value = '';
      localStorage.removeItem('token');
    }
  } catch {
    username.value = '';
  }
}

watch(() => route.path, (newPath) => {
  if (newPath !== '/auth/login') {
    checkAuth();
  }
});

async function handleLogout() {
  loggingOut.value = true;
  try {
    const token = localStorage.getItem('token');
    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ token })
    });
    localStorage.removeItem('token');
    username.value = '';
    router.push('/auth/login');
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    loggingOut.value = false;
  }
}

// Run on mount
onMounted(() => {
  if (route.path !== '/auth/login') {
    checkAuth();
  }
});
</script>

<style scoped>
.navbar {
  background: rgba(51, 1, 0, 1);
  color: white;
  padding: 0 24px;
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.navbar-left h3 { font-size: 18px; }
.navbar-right { display: flex; align-items: center; gap: 16px; }
.username { font-size: 14px; color: rgba(255,255,255,0.8); }

.logout-btn {
  background: transparent;
  color: #ff6b6b;
  border: 1px solid #ff6b6b;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.logout-btn:hover {
  background: #ff6b6b;
  color: white;
}
</style>