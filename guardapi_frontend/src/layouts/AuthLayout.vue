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
  background: rgba(81, 1, 0, 1);
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 400px;
}

.auth-card {
  background: transparent;
  border-radius: 12px;
  padding: 40px;
}

.auth-logo {
  text-align: center;
  margin-bottom: 30px;
}

.auth-logo h1 {
  font-size: 28px;
  color: #eee;
}
</style>