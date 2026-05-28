<template>
  <nav class="navbar">
    <div class="navbar-left">
      <button class="menu-btn" @click="$emit('menu-click')">☰</button>
      <h3>ระบบรายงาน รปภ.</h3>
    </div>
    <div class="navbar-right">
      <span class="username">{{ username }}</span>
    </div>
  </nav>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';

defineEmits(['menu-click']);

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const route = useRoute();
const username = ref('');

async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch(`${apiUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      username.value = data.user.username;
    }
  } catch {}
}

onMounted(() => { if (route.path !== '/auth/login') checkAuth(); });
watch(() => route.path, (p) => { if (p !== '/auth/login') checkAuth(); });
</script>

<style scoped>
.navbar {
  background: #3a1010;
  border-bottom: 1px solid #5a1a1a;
  padding: 0 24px;
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.navbar-left { display: flex; align-items: center; gap: 12px; }
.navbar-left h3 { font-size: 18px; color: #ff6b6b; margin: 0; }

.menu-btn {
  background: none;
  border: none;
  color: #ff6b6b;
  font-size: 22px;
  cursor: pointer;
  padding: 4px 8px;
}

.username { font-size: 14px; color: rgba(255,255,255,0.8); }
</style>