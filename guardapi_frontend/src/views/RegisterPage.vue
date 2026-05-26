<template>
  <form @submit.prevent="handleRegister">
    <h2>Register</h2>
    <div class="form-group">
      <label>Name</label>
      <input v-model="name" type="text" required>
    </div>
    <div class="form-group">
      <label>Email</label>
      <input v-model="email" type="email" required>
    </div>
    <div class="form-group">
      <label>Password</label>
      <input v-model="password" type="password" required>
    </div>
    <button type="submit" class="btn btn-full">Register</button>
    <p class="link-text">
      Already have an account? 
      <router-link to="/auth/login">Login</router-link>
    </p>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')

function handleRegister() {
  console.log('Register:', name.value, email.value, password.value)
  router.push('/auth/login')
}
</script>

<style scoped>
h2 {
  margin-bottom: 24px;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}

.btn-full {
  width: 100%;
}

.btn:hover {
  background: #5a67d8;
}

.link-text {
  text-align: center;
  margin-top: 16px;
  color: #666;
}

.link-text a {
  color: #667eea;
  text-decoration: none;
}
</style>