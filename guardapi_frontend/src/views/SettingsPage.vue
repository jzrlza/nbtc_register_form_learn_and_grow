<template>
  <div class="page">
    <div class="page-header">
      <h1>⚙️ Settings</h1>
      <p>Configure your application</p>
    </div>
    
    <div class="card">
      <h3>General Settings</h3>
      <form @submit.prevent="saveSettings">
        <div class="form-group">
          <label>Site Name</label>
          <input v-model="settings.siteName" type="text" class="form-control" placeholder="My App">
        </div>
        <div class="form-group">
          <label>Language</label>
          <select v-model="settings.language" class="form-control">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
        <div class="form-group">
          <label>
            <input v-model="settings.notifications" type="checkbox">
            Enable notifications
          </label>
        </div>
        <button type="submit" class="btn">Save Settings</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const settings = ref({
  siteName: 'My App',
  language: 'en',
  notifications: true
})

function saveSettings() {
  console.log('Settings saved:', settings.value)
  alert('Settings saved!')
}
</script>

<style scoped>
.page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.card h3 {
  margin-bottom: 20px;
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

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
}

.btn {
  padding: 10px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btn:hover {
  background: #5a67d8;
}
</style>