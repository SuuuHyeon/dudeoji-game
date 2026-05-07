<template>
  <div class="overlay">
    <div class="countdown-text">{{ value }}</div>
  </div>
</template>

<script setup>
defineProps({
  value: {
    type: Number,
    required: true,
  },
})
</script>

<style scoped>
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(10, 10, 12, 0.98);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  overflow: hidden;
}

.countdown-text {
  font-size: 8rem;
  color: #00ffcc;
  text-shadow: 0 0 20px #00ffcc;
  animation: pop 1s infinite;
  font-family: var(--font-pixel);
  z-index: 20;
}

@keyframes pop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}
</style>
