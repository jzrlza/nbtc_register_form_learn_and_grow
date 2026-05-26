<template>
  <div class="not-found">
    <h1>404</h1>
    <h2>ไม่พบหน้า</h2>
    <p>ขออภัย ไม่พบหน้าที่คุณกำลังหา</p>
    <router-link to="/" class="btn">กลับหน้าหลัก</router-link>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.not-found h1 {
  font-size: 120px;
  color: #667eea;
  margin: 0;
  line-height: 1;
}

.not-found h2 {
  font-size: 32px;
  color: #333;
  margin: 16px 0;
}

.not-found p {
  color: #666;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 16px;
}
</style>