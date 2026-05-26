<template>
  <div class="page">
    <div class="page-header">
      <h1>📊 Dashboard</h1>
      <p>Overview of your data</p>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">1,234</div>
        <div class="stat-label">Total Users</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">567</div>
        <div class="stat-label">Active Now</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">89%</div>
        <div class="stat-label">Uptime</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">12</div>
        <div class="stat-label">Errors</div>
      </div>
    </div>

    <div class="card">
      <h3>Recent Activity</h3>
      <p>No data yet. Start adding content!</p>
    </div>
  </div>
</template>

<script setup>
// Your dashboard logic here
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
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
</style>