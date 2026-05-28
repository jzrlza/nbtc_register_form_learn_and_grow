<template>
  <div class="default-layout">
    <Sidebar :isOpen="sidebarOpen" @close="sidebarOpen = false" />
    <div class="main-content" :class="{ expanded: !sidebarOpen }">
      <Navbar @menu-click="sidebarOpen = !sidebarOpen" />
      <div class="page-content">
        <router-view />
      </div>
      <Footer />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, provide, onMounted } from 'vue';
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import Sidebar from '../components/Sidebar.vue'

const sidebarOpen = ref(false);
const currentUser = ref(null);

// Make available to all child components
provide('currentUser', currentUser);

function parseUserToken() {
  const token = localStorage.getItem('userToken');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

onMounted(() => {
  currentUser.value = parseUserToken();
});

watch(sidebarOpen, (val) => {
  if (val && window.innerWidth <= 768) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>
<style scoped>
.default-layout {
  display: flex;
  min-height: 100vh;
  background: #510100;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 250px;
  transition: margin-left 0.3s;
  background: #510100;
}

.main-content.expanded {
  margin-left: 0;
}

.page-content {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  background: #510100;
}

@media (max-width: 768px) {
  .main-content,
  .main-content.expanded {
    margin-left: 0;
  }
  .page-content {
    padding: 16px;
  }
}
</style>