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
  background: #510100;
}

.not-found h1 {
  font-size: 120px;
  color: #ff6b6b;
  margin: 0;
  line-height: 1;
  text-shadow: 0 0 30px rgba(255,107,107,0.3);
}

.not-found h2 {
  font-size: 32px;
  color: #fff;
  margin: 16px 0;
}

.not-found p {
  color: #c99;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 24px;
  background: #8b2020;
  color: #e8e0e0;
  text-decoration: none;
  border-radius: 6px;
  font-size: 16px;
  border: 1px solid #a02828;
  transition: background 0.2s;
}

.btn:hover {
  background: #a02828;
}
</style>