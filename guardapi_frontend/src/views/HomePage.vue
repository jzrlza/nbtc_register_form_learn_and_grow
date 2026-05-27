<template>
  <div class="page">
    <div class="page-header">
      <h1>แบบรายงาน รปภ.</h1>
      <div class="status">
        <span :class="['dot', connected ? 'green' : 'red']"></span>
        {{ connected ? 'เชื่อมต่อเรียบร้อย' : 'ไม่ได้เชื่อมต่อ' }}
      </div>
    </div>

    <!-- Create Post -->
    <div class="card post-form">
    <textarea v-model="textMessage" placeholder="เขียนข้อความรายงาน..." rows="4" class="text-area"></textarea>
    
    <div class="form-actions">
      <div class="form-left">
        <label class="file-label">+ เพิ่มรูปภาพ (เลือกได้ 3 รูป) <input type="file" multiple accept="image/*" @change="handleFiles" class="file-input" /></label>
        <span v-if="files.length" class="file-count">โหลดแล้ว {{ files.length }} รูป</span>
        <div v-if="previews.length" class="previews">
          <div v-for="(p, i) in previews" :key="i" class="preview-item">
            <img :src="p" alt="แสดงรูป" />
            <button @click="removeFile(i)" class="remove-btn">✕</button>
          </div>
        </div>
      </div>
      <button @click="createPost" :disabled="loading || (!textMessage && !files.length)" class="btn">
        {{ loading ? 'กำลังบันทึก...' : 'บันทึก' }}
      </button>
    </div>
  </div>

    <!-- Filters -->
    <div class="card filters">
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">🔍 ค้นหา</label>
          <input v-model="filterUsername" type="text" placeholder="Username..." class="filter-input" @input="applyFilters" />
        </div>

        <div class="filter-group">
          <label class="filter-label">📅 โหมดการเลือกเวลา</label>
          <select v-model="filterMode" class="filter-input" @change="onModeChange">
            <option value="date">ช่วงวันที่</option>
            <option value="month">เดือนปี</option>
          </select>
        </div>

        <template v-if="filterMode === 'date'">
          <div class="filter-group">
            <label class="filter-label">จาก</label>
            <input v-model="filterDateFrom" type="date" class="filter-input" @change="applyFilters" />
          </div>
          <div class="filter-group">
            <label class="filter-label">ถึง</label>
            <input v-model="filterDateTo" type="date" class="filter-input" @change="applyFilters" />
          </div>
        </template>

        <template v-else>
          <div class="filter-group">
            <label class="filter-label">เดือน</label>
            <select v-model="filterMonth" class="filter-input" @change="onMonthChange">
              <option value="">-- Select --</option>
              <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label_th }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">ปี</label>
            <select v-model="filterYear" class="filter-input" @change="onMonthChange">
              <option value="">-- Select --</option>
              <option v-for="y in years" :key="y" :value="y">{{ y + " / " + (y + 543) }}</option>
            </select>
          </div>
        </template>
      </div>

      <div class="filter-actions">
        <button @click="clearFilters" class="btn-clear">✕ ล้าง</button>
        <button @click="exportPosts" :disabled="!canExport" class="btn-export">📥 รายงานผล .xlsx</button>
      </div>
    </div>

    <!-- Posts Table -->
    <div class="card">
      <h3>รายการรายงาน (แสดงทั้งหมด {{ posts.length }} รายการ)</h3>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ชื่อผู้ส่ง</th>
              <th>ข้อความ</th>
              <th>รูปภาพ</th>
              <th>วันที่/เวลา</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="post in posts" :key="post.id">
              <td>{{ post.id }}</td>
              <td>{{ post.username }}</td>
              <td>{{ post.text_message?.substring(0, 50) }}{{ post.text_message?.length > 50 ? '...' : '' }}</td>
              <td>
                <div v-if="post.filenames && post.filenames.length" class="thumbnail-list">
                  <a
                    v-for="(img, i) in post.filenames"
                    :key="i"
                    :href="`${apiUrl}/images/${img}`"
                    target="_blank"
                    class="thumbnail-link"
                  >
                    <img :src="`${apiUrl}/images/${img}`" class="thumbnail" />
                  </a>
                </div>
                <span v-else>-</span>
              </td>
              <td>{{ formatTime(post.created_at) }}</td>
              <td><button @click="deletePost(post.id)" class="btn-danger-sm">✕</button></td>
            </tr>
            <tr v-if="posts.length === 0">
              <td colspan="6" class="empty">No posts yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const textMessage = ref('');
const files = ref([]);
const previews = ref([]);
const loading = ref(false);
const posts = ref([]);
const connected = ref(false);

const filterUsername = ref('');
const filterMode = ref('date');
const filterDateFrom = ref('');
const filterDateTo = ref('');
const filterMonth = ref('');
const filterYear = ref('');

let ws = null;
let filterTimeout = null;

// Generate years (current year back 5 years)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

const months = [
  { value: '01', label_th: 'มกราคม', label_en: 'January' },
  { value: '02', label_th: 'กุมภาพันธ์', label_en: 'February' },
  { value: '03', label_th: 'มีนาคม', label_en: 'March' },
  { value: '04', label_th: 'เมษายน', label_en: 'April' },
  { value: '05', label_th: 'พฤษภาคม', label_en: 'May' },
  { value: '06', label_th: 'มิถุนายน', label_en: 'June' },
  { value: '07', label_th: 'กรกฎาคม', label_en: 'July' },
  { value: '08', label_th: 'สิงหาคม', label_en: 'August' },
  { value: '09', label_th: 'กันยายน', label_en: 'September' },
  { value: '10', label_th: 'ตุลาคม', label_en: 'October' },
  { value: '11', label_th: 'พฤศจิกายน', label_en: 'November' },
  { value: '12', label_th: 'ธันวาคม', label_en: 'December' },
];

const canExport = computed(() => {
  if (filterMode.value === 'date') {
    return filterDateFrom.value && filterDateTo.value;
  }
  return filterMonth.value && filterYear.value;
});

function onModeChange() {
  filterDateFrom.value = '';
  filterDateTo.value = '';
  filterMonth.value = '';
  filterYear.value = '';
  fetchPosts();
}

function onMonthChange() {
  if (filterMonth.value && filterYear.value) {
    // Set dateFrom/dateTo for API
    const lastDay = new Date(parseInt(filterYear.value), parseInt(filterMonth.value), 0).getDate();
    filterDateFrom.value = `${filterYear.value}-${filterMonth.value}-01`;
    filterDateTo.value = `${filterYear.value}-${filterMonth.value}-${String(lastDay).padStart(2, '0')}`;
    applyFilters();
  }
}

function connectWebSocket() {
  ws = new WebSocket(wsUrl);
  ws.onopen = () => { connected.value = true; fetchPosts(); };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'posts_updated') posts.value = data.data;
  };
  ws.onclose = () => { connected.value = false; setTimeout(connectWebSocket, 2000); };
  ws.onerror = () => { connected.value = false; };
}

function handleFiles(e) {
  const selected = Array.from(e.target.files);
  files.value = [...files.value, ...selected];
  selected.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => previews.value.push(ev.target.result);
    reader.readAsDataURL(file);
  });
}

function generateFileName(file, index) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = now.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  const min = String(now.getMinutes()).padStart(2, '0');
  const ext = file.name.split('.').pop();
  
  return `${year}${month}${day}t${hour12}${ampm}${min}min_img${index + 1}.${ext}`;
}

function removeFile(index) { files.value.splice(index, 1); previews.value.splice(index, 1); }

async function createPost() {
  loading.value = true;
  try {
    const formData = new FormData();
    formData.append('text_message', textMessage.value);
    
    files.value.forEach((file, i) => {
      const newName = generateFileName(file, i);
      const renamedFile = new File([file], newName, { type: file.type });
      formData.append('images', renamedFile);
    });

    await fetch(`${apiUrl}/api/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });

    textMessage.value = '';
    files.value = [];
    previews.value = [];
  } catch (err) { console.error(err); }
  finally { loading.value = false; }
}

async function fetchPosts() {
  try {
    const params = new URLSearchParams();
    if (filterUsername.value) params.append('username', filterUsername.value);
    if (filterDateFrom.value) params.append('dateFrom', filterDateFrom.value);
    if (filterDateTo.value) params.append('dateTo', filterDateTo.value);

    const res = await fetch(`${apiUrl}/api/posts?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    posts.value = await res.json();
  } catch {}
}

function applyFilters() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(fetchPosts, 300);
}

function clearFilters() {
  filterUsername.value = '';
  filterDateFrom.value = '';
  filterDateTo.value = '';
  filterMonth.value = '';
  filterYear.value = '';
  fetchPosts();
}

async function exportPosts() {
  if (!canExport.value) return;

  try {
    const params = new URLSearchParams();
    params.append('dateFrom', filterDateFrom.value);
    params.append('dateTo', filterDateTo.value);

    const res = await fetch(`${apiUrl}/api/posts/export?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `posts_${filterDateFrom.value}_to_${filterDateTo.value}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
  }
}

async function deletePost(id) {
  try {
    await fetch(`${apiUrl}/api/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
  } catch {}
}

function formatTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

onMounted(() => connectWebSocket());
onUnmounted(() => { if (ws) ws.close(); });
</script>

<style scoped>
.page { max-width: 900px; margin: 0 auto; padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 24px; color: #333; }

.status { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #666; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.green { background: #22c55e; }
.dot.red { background: #ef4444; }

.card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 16px; }
.card h3 { margin-bottom: 12px; color: #333; }

.post-form { display: flex; flex-direction: column; gap: 12px; }
.text-area { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; resize: vertical; font-size: 14px; font-family: inherit; }
.text-area:focus { outline: none; border-color: #667eea; }

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.form-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.previews {
  display: flex;
  gap: 8px;
}
.file-label { cursor: pointer; padding: 8px 14px; background: #f0f0f0; border-radius: 6px; font-size: 14px; }
.file-input { display: none; }
.file-count { font-size: 13px; color: #888; }

.btn { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.previews { display: flex; gap: 8px; flex-wrap: wrap; }
.preview-item { position: relative; width: 70px; height: 70px; }
.preview-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
.remove-btn { position: absolute; top: -6px; right: -6px; background: #e74c3c; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer; }

.filters {
  padding: 16px 20px;
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  min-width: 130px;
}

.filter-input:focus {
  outline: none;
  border-color: #667eea;
}

.filter-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.btn-clear {
  padding: 8px 14px;
  background: #eee;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-clear:hover {
  background: #ddd;
}

.btn-export {
  padding: 8px 14px;
  background: #22c55e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.btn-export:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.table-scroll { max-height: 300px; overflow-y: auto; }
table { width: 100%; border-collapse: collapse; }
thead { position: sticky; top: 0; z-index: 1; }
th { background: #f9fafb; padding: 10px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #4b5563; }
tr:hover { background: #f9fafb; }
.empty { text-align: center; padding: 40px; color: #999; }

.thumbnail-list { display: flex; gap: 4px; }
.thumbnail { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; }
.btn-danger-sm { background: #e74c3c; color: white; border: none; border-radius: 4px; width: 24px; height: 24px; font-size: 12px; cursor: pointer; }

.thumbnail-link {
  display: block;
  cursor: pointer;
  transition: opacity 0.2s;
}

.thumbnail-link:hover {
  opacity: 0.8;
}
</style>