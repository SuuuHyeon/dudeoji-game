<script setup>
defineProps({
  score: { type: Number, default: 0 },
  timeLeft: { type: Number, default: 30 },
  combo: { type: Number, default: 0 },
  multiplier: { type: Number, default: 1.0 },
  isFever: { type: Boolean, default: false },
  dbBestScore: { type: Number, default: 0 },
  currentName: { type: String, default: '' },
  isPlaying: { type: Boolean, default: false },
})

const emit = defineEmits(['quit'])
</script>

<template>
  <!-- Top Info Bar -->
  <div class="top-info" v-if="currentName">
    <div class="personal-best">TOP: {{ dbBestScore }}</div>
    <button
      v-if="isPlaying"
      @click="emit('quit')"
      class="quit-btn"
    >
      포기하기
    </button>
  </div>

  <header class="game-header">
    <div class="score-container">
      <div class="huge-score" :class="{ negative: score < 0 }">
        {{ score }}
      </div>
      <div
        class="timer-badge"
        :class="{ warning: timeLeft <= 5 && isPlaying }"
      >
        TIME: {{ timeLeft }}s
      </div>
    </div>
  </header>

  <!-- Combo Overlay -->
  <div
    v-if="combo > 1 && isPlaying"
    class="combo-overlay"
    :key="combo"
  >
    <div
      class="huge-combo"
      :class="{ 'combo-high': combo >= 10, 'combo-fever': combo >= 20 }"
    >
      {{ combo }} COMBO!
      <span v-if="multiplier > 1" class="multiplier">x{{ multiplier }}</span>
    </div>
  </div>
</template>

<style scoped>
.top-info {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 5px;
  color: #ffcc80;
  font-size: 1.2rem;
  letter-spacing: 1px;
}

.quit-btn {
  background: none;
  border: 1px solid #ff3366;
  color: #ff3366;
  padding: 4px 10px;
  font-size: 0.9rem;
  font-family: var(--font-pixel);
  cursor: pointer;
  border-radius: 4px;
  margin-left: 15px;
  transition: all 0.2s;
  box-shadow: none;
}

.quit-btn:hover {
  background: #ff3366;
  color: #000;
}

.game-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  background-color: transparent;
  padding: 0;
  border: none;
  box-shadow: none;
  height: auto;
}

.score-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.huge-score {
  font-size: 5rem;
  color: #00ffcc;
  text-shadow:
    0 0 20px #00ffcc,
    0 0 40px rgba(0, 255, 204, 0.5);
  line-height: 1;
  transition:
    color 0.3s,
    text-shadow 0.3s;
}

.huge-score.negative {
  color: #ff3366;
  text-shadow:
    0 0 20px #ff3366,
    0 0 40px rgba(255, 51, 102, 0.5);
}

.timer-badge {
  background-color: #222;
  color: #fff;
  padding: 5px 20px;
  border-radius: 20px;
  font-size: 1.5rem;
  border: 2px solid #555;
}

.timer-badge.warning {
  border-color: #ff3366;
  color: #ff3366;
  animation: pulse 1s infinite;
}

.combo-overlay {
  position: absolute;
  top: -10px;
  right: 10px;
  z-index: 100;
  pointer-events: none;
}

.huge-combo {
  font-size: 4rem;
  color: #ff00de;
  text-shadow:
    0 0 20px #ff00de,
    0 0 40px #ff00de;
  white-space: nowrap;
  animation: popBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.combo-high {
  color: #ffeb3b;
  text-shadow:
    0 0 20px #ffeb3b,
    0 0 40px #ffeb3b;
  font-size: 5rem;
}

.combo-fever {
  color: #ff0000;
  text-shadow:
    0 0 20px #ff0000,
    0 0 40px #ff0000,
    0 0 60px #ff0000;
  font-size: 6rem;
  animation:
    popBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    shake 0.2s infinite;
}

.multiplier {
  font-size: 0.6em;
  color: #fff;
  vertical-align: top;
  text-shadow: none;
}

@keyframes popBounce {
  0% {
    transform: scale(0.5) translateY(50px);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) translateY(-20px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-2px) rotate(-2deg);
  }
  75% {
    transform: translateX(2px) rotate(2deg);
  }
}
</style>
