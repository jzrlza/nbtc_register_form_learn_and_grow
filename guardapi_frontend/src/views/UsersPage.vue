<template>
  <div class="page">
    <div class="page-header">
      <h1>👥 Users</h1>
      <p>Manage your users</p>
    </div>
    
    <div class="card">
      <div class="header">
      <h1>📊 Real-time MySQL Test</h1>
      <div class="status">
        <span :class="['dot', connected ? 'green' : 'red']"></span>
        {{ connected ? 'Connected' : 'Disconnected' }}
      </div>
    </div>

      
      <div class="controls">
      <button @click="addRandomUser" class="btn">Add Random User</button>
      <button @click="updateRandomUser" class="btn">Update Random User</button>
      <button @click="deleteRandomUser" class="btn btn-danger">Delete Random User</button>
      <span class="update-count">Updates: {{ updateCount }}</span>
    </div>

    <h3>Users Table</h3>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" :class="{ 'new-row': isNew(user.id) }">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ formatTime(user.created_at) }}</td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
              No data yet...
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="log">
      <h3>Update Log (Last 10 changes)</h3>
      <div v-for="(log, index) in logs" :key="index" class="log-item">
        <span class="log-time">{{ log.time }}</span>
        <span :class="['log-type', log.type]">{{ log.type }}</span>
        <span>{{ log.message }}</span>
      </div>
    </div>
      <!-- Insert your real-time table component here -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const users = ref([])
const connected = ref(false)
const updateCount = ref(0)
const logs = ref([])
const newIds = ref(new Set())

let ws = null

// Connect to WebSocket
function connectWebSocket() {
  console.log('Connecting to WebSocket...')
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('✅ WebSocket connected')
    connected.value = true
    fetchUsers()
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    console.log('📨 Received:', data.type)
    
    if (data.type === 'users_updated') {
      // Update the table
      users.value = data.data
      updateCount.value++
      
      // Highlight new rows
      if (data.operation === 'INSERT' && data.data.length > users.value.length) {
        // Find new IDs
        const oldIds = new Set(users.value.map(u => u.id))
        data.data.forEach(user => {
          if (!oldIds.has(user.id)) {
            newIds.value.add(user.id)
            setTimeout(() => newIds.value.delete(user.id), 2000)
          }
        })
      }
      
      // Add to log
      addLog(data.operation || 'UPDATE', `${data.data.length} rows in table`)
    }
  }

  ws.onclose = () => {
    console.log('❌ WebSocket disconnected')
    connected.value = false
    // Auto reconnect after 2 seconds
    setTimeout(connectWebSocket, 2000)
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    connected.value = false
  }
}

function addLog(type, message) {
  logs.value.unshift({
    type: type || 'UPDATE',
    message: message,
    time: new Date().toLocaleTimeString()
  })
  // Keep only last 10 logs
  if (logs.value.length > 10) {
    logs.value.pop()
  }
}

function isNew(id) {
  return newIds.value.has(id)
}

// Fetch users from API
async function fetchUsers() {
  try {
    const res = await fetch(`${apiUrl}/api/users`)
    users.value = await res.json()
    console.log(`Loaded ${users.value.length} users`)
  } catch (err) {
    console.error('Error fetching users:', err)
  }
}

// Add random user
async function addRandomUser() {
  const names = ['ta', 'wa', 'cze', 'ewr', '32df', 'cdsd', 'fewr']
  const name = names[Math.floor(Math.random() * names.length)]
  const email = `${name.toLowerCase()}_${Date.now()}@test.com`
  const age = Math.floor(Math.random() * 50) + 20
  
  try {
    const res = await fetch(`${apiUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, age })
    })
    
    if (res.ok) {
      console.log('✅ User added')
      addLog('INSERT', `${name} (${email})`)
    }
  } catch (err) {
    console.error('Error adding user:', err)
  }
}

// Update random user
async function updateRandomUser() {
  if (users.value.length === 0) return
  
  const user = users.value[Math.floor(Math.random() * users.value.length)]
  
  try {
    const res = await fetch(`${apiUrl}/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated_' + Date.now(),
        age: Math.floor(Math.random() * 50) + 20
      })
    })
    
    if (res.ok) {
      console.log('✅ User updated')
      addLog('UPDATE', `User ID: ${user.id}`)
    }
  } catch (err) {
    console.error('Error updating user:', err)
  }
}

// Delete random user
async function deleteRandomUser() {
  if (users.value.length === 0) return
  
  const user = users.value[Math.floor(Math.random() * users.value.length)]
  
  try {
    const res = await fetch(`${apiUrl}/api/users/${user.id}`, {
      method: 'DELETE'
    })
    
    if (res.ok) {
      console.log('✅ User deleted')
      addLog('DELETE', `User ID: ${user.id}`)
    }
  } catch (err) {
    console.error('Error deleting user:', err)
  }
}

function formatTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  if (ws) ws.close()
})
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 8px;
}

.card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.card h3 {
  margin-bottom: 12px;
  color: #333;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f0f2f5;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.dot.green { background: #22c55e; }
.dot.red { background: #ef4444; }

.controls {
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn:hover { background: #2563eb; }

.btn-danger {
  background: #ef4444;
}

.btn-danger:hover {
  background: #dc2626;
}

.update-count {
  margin-left: auto;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.table-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #f9fafb;
  padding: 12px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 14px;
  color: #4b5563;
}

tr:hover {
  background: #f9fafb;
}

.new-row {
  animation: highlightRow 2s ease-out;
}

@keyframes highlightRow {
  from { background: #dbeafe; }
  to { background: transparent; }
}

.log {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.log h3 {
  margin-bottom: 15px;
  color: #1f2937;
}

.log-item {
  padding: 8px 12px;
  border-left: 3px solid #3b82f6;
  margin-bottom: 8px;
  background: #f9fafb;
  font-size: 14px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.log-time {
  color: #6b7280;
  font-size: 12px;
  min-width: 80px;
}

.log-type {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  min-width: 60px;
  text-align: center;
}

.log-type.INSERT { background: #22c55e; }
.log-type.UPDATE { background: #f59e0b; }
.log-type.DELETE { background: #ef4444; }
</style>