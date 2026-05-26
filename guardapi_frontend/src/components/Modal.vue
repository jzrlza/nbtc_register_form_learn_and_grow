<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-box">
      <button class="modal-close" @click="$emit('close')">&times;</button>
      <h3>{{ title }}</h3>
      <div class="modal-body">
        <slot />
      </div>
      <div class="modal-footer">
        <slot name="footer">
          <button @click="$emit('close')" class="btn">ปิด</button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isOpen: Boolean,
  title: String
});

defineEmits(['close']);
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-box {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 420px;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #888;
  line-height: 1;
}

.modal-close:hover {
  color: #333;
}

.modal-box h3 {
  margin-bottom: 12px;
  color: #333;
}

.modal-body {
  margin-bottom: 16px;
  color: #555;
}

.modal-footer {
  text-align: right;
}

.btn {
  padding: 10px 20px;
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