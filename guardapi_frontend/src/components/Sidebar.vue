<template>
  <aside class="sidebar" :class="{ open: isOpen }">
    <div class="sidebar-header">
      <h2>My App</h2>
      <button class="close-btn" @click="isOpen = false">✕</button>
    </div>
    
    <nav class="sidebar-nav">
      <router-link to="/" class="nav-item" exact-active-class="active">
        <span class="icon"></span>
        <span>Home</span>
      </router-link>
    </nav>
    
    <div class="sidebar-footer">
      <a href="#" class="nav-item logout-item" @click.prevent="handleLogout">
        <span class="icon"></span>
        <span>{{ loggingOut ? 'กำลังออก...' : 'Logout' }}</span>
      </a>
    </div>
  </aside>
  
  <button class="mobile-toggle" @click="isOpen = !isOpen">
    ☰
  </button>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const router = useRouter();
const isOpen = ref(false);
const loggingOut = ref(false);

async function handleLogout() {
  loggingOut.value = true;
  try {
    const token = localStorage.getItem('token');
    
    const res = await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json','Authorization': `Bearer ${token}` },
      body: JSON.stringify({ token })
    });

    if (res.ok) {
      localStorage.removeItem('token');
      isOpen.value = false;
      router.push('/auth/login');
    } else {
      console.error('Logout failed on server');
    }
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    loggingOut.value = false;
  }
}
</script>

<style scoped>
.sidebar {
  width: 250px;
  background: #1a1a2e;
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: transform 0.3s;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.sidebar-header h2 {
  font-size: 20px;
  margin: 0;
}

.close-btn {
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  transition: all 0.2s;
  font-size: 15px;
}

.nav-item:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.nav-item.active {
  background: rgba(255,255,255,0.15);
  color: white;
  border-right: 3px solid #667eea;
}

.logout-item:hover {
  background: rgba(255, 80, 80, 0.2);
  color: #ff6b6b;
}

.icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.mobile-toggle {
  display: none;
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 200;
  background: #1a1a2e;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  .close-btn {
    display: block;
  }
  
  .mobile-toggle {
    display: block;
  }
}
</style>