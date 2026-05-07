<template>
  <div class="patch-board">
    <div class="patch-title">📌 패치 노트</div>
    <ul class="patch-list">
      <li v-for="(text, i) in notes" :key="i">
        <span class="patch-version">{{ i + 1 }}.</span>
        {{ text }}
      </li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  notes: {
    type: Array,
    default: () => [],
  },
})
</script>

<style scoped>
.patch-board {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #2b4f36; /* 칠판 녹색 */
  border: 4px solid #5c3a21; /* 나무 테두리 */
  border-radius: 4px;
  padding: 10px;
  width: 160px;
  box-shadow:
    4px 4px 10px rgba(0, 0, 0, 0.6),
    inset 0 0 10px rgba(0, 0, 0, 0.3);
  color: #f8f8f8; /* 분필 하얀색 */
  z-index: 2000;
  transform: rotate(3deg); /* 살짝 비뚤게 툭 걸어둔 느낌 */
  font-family: var(--font-pixel), sans-serif;
}

.patch-title {
  font-size: 0.9rem;
  margin-bottom: 8px;
  text-align: center;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.4);
  padding-bottom: 5px;
}

.patch-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.5;
  text-align: left;
}

.patch-version {
  color: #ffcc80; /* 버전 포인트 컬러 */
}
</style>
