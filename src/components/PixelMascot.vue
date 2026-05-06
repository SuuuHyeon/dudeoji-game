<template>
  <div class="mascot-wrapper">
    <svg viewBox="0 0 40 40" class="pixel-mascot">
      <!-- Hat -->
      <rect x="14" y="2" width="12" height="4" fill="#ffb300" />
      <rect x="12" y="6" width="16" height="4" fill="#ffb300" />
      
      <!-- Body -->
      <rect x="8" y="10" width="24" height="24" fill="#795548" />
      <rect x="6" y="14" width="28" height="16" fill="#795548" />
      
      <!-- Eyes -->
      <rect x="12" y="16" width="4" height="4" fill="#000" />
      <rect x="24" y="16" width="4" height="4" fill="#000" />
      <rect x="14" y="16" width="2" height="2" fill="#fff" />
      <rect x="26" y="16" width="2" height="2" fill="#fff" />
      
      <!-- Nose -->
      <rect x="18" y="20" width="4" height="4" fill="#ff8a80" />
      
      <!-- Hands -->
      <rect x="4" y="22" width="6" height="4" fill="#795548" />
      <rect x="30" y="22" width="6" height="4" fill="#795548" />
      
      <!-- Belly -->
      <rect x="14" y="26" width="12" height="8" fill="#a1887f" />
    </svg>
  </div>
</template>

<style scoped>
.mascot-wrapper {
  animation: bounce 2s ease-in-out infinite;
  margin-bottom: 20px;
}

.pixel-mascot {
  width: 120px;
  height: 120px;
  filter: drop-shadow(0 0 10px rgba(255, 179, 0, 0.5));
}

@keyframes bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-15px) scale(1.05); }
}
</style>
