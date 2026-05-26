<template>
  <div class="page">
    <div class="page-header">
      <h1>👤 Profile</h1>
    </div>
    
    <div class="card">
      <div class="profile-header">
        <div class="avatar">JD</div>
        <div>
          <h3>John Doe</h3>
          <p>john@example.com</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Profile logic here
</script>

<style scoped>
.page {
  max-width: 600px;
  margin: 0 auto;
}

.card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 600;
}
</style>