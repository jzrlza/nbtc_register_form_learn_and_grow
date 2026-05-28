<template>
  <div v-if="isOpen && isMobile" class="overlay" @click="$emit('close')"></div>
  <aside class="sidebar" :class="{ open: isOpen, closed: !isOpen }">
    <div class="sidebar-header">
      <h2>ระบบรายงาน รปภ.</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    <nav class="sidebar-nav">
      <router-link to="/" class="nav-item" exact-active-class="active" @click="closeOnMobile">แบบรายงาน รปภ.</router-link>
    </nav>
    <div class="sidebar-footer">
      <a href="#" class="nav-item logout-item" @click.prevent="handleLogout">ออกจากระบบ</a>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

defineProps({ isOpen: Boolean });
const emit = defineEmits(['close']);
const router = useRouter();
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const isMobile = ref(window.innerWidth <= 768);

function checkMobile() {
  isMobile.value = window.innerWidth <= 768;
}

function closeOnMobile() {
  if (isMobile.value) emit('close');
}

onMounted(() => window.addEventListener('resize', checkMobile));
onUnmounted(() => window.removeEventListener('resize', checkMobile));

async function handleLogout() {
  const token = localStorage.getItem('token');
  await fetch(`${apiUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ token })
  });
  localStorage.removeItem('token');
  emit('close');
  router.push('/auth/login');
}
</script>

<style scoped>
.sidebar {
  width: 250px;
  background: #3a1010;
  position: fixed;
  top: 0; left: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: transform 0.3s;
  border-right: 1px solid #5a1a1a;
}

.sidebar.closed {
  transform: translateX(-250px);
}

.sidebar.open {
  transform: translateX(0);
}

.sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #5a1a1a;
}

.sidebar-header h2 { color: #ff6b6b; margin: 0; font-size: 18px; }

.close-btn { background: none; border: none; color: #ff6b6b; font-size: 20px; cursor: pointer; display: none; }

.sidebar-nav { flex: 1; padding: 20px 0; overflow-y: auto; }

.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; color: rgba(255,255,255,0.7);
  text-decoration: none; font-size: 15px;
}

.nav-item:hover { background: rgba(255,255,255,0.1); color: white; }
.nav-item.active { background: rgba(139,32,32,0.3); color: #ff6b6b; border-right: 3px solid #ff6b6b; }
.logout-item:hover { background: rgba(255,80,80,0.2); color: #ff6b6b; }

.sidebar-footer { padding: 20px; border-top: 1px solid #5a1a1a; }

.overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.5);
  z-index: 99;
}

@media (min-width: 769px) {
  .sidebar.closed {
    transform: translateX(-250px);
  }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar.closed {
    transform: translateX(-100%);
  }
  .close-btn {
    display: block;
  }
}

.sidebar {
  height: 100vh;
  height: 100dvh;
}

.overlay {
  height: 100vh;
  height: 100dvh;
}
</style>