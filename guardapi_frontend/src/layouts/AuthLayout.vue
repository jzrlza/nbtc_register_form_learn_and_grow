<template>
  <div class="auth-layout">
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <h1>เข้าสู่ระบบรายงาน รปภ.</h1>
        </div>
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 400px;
}

.auth-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.auth-logo {
  text-align: center;
  margin-bottom: 30px;
}

.auth-logo h1 {
  font-size: 28px;
  color: #333;
}
</style>