<template>
  <div class="default-layout">
    <Navbar />
    <div class="main-content">
      <div class="page-content">
        <router-view />
      </div>
      <Footer />
    </div>
  </div>
</template>

<script setup>
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
</script>

<style scoped>
.default-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: rgba(81, 1, 0, 1);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .page-content {
    padding: 16px;
  }
}
</style>