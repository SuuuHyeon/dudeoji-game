<script setup>
import PixelMascot from './PixelMascot.vue'

defineProps({
  currentName: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'start-game',
  'show-auth',
  'show-leaderboard',
  'show-my-record',
  'logout',
])
</script>

<template>
  <div class="overlay menu-overlay">
    <div class="crt-lines"></div>
    <div class="particles-bg"></div>

    <PixelMascot />

    <h1 class="main-title">두더지 게임</h1>
    <p class="subtitle">네오 아케이드 에디션</p>

    <div class="legend" v-if="currentName">
      <div class="legend-item welcome-msg">
        반가워요, <span class="player-name">{{ currentName }}</span> 님!
      </div>
    </div>
    <div class="legend" v-else>
      <div class="legend-item">
        <span style="color: #795548">■</span> Normal (+100)
      </div>
      <div class="legend-item">
        <span style="color: #ffb300">■</span> Golden (+300)
      </div>
      <div class="legend-item">
        <span style="color: #212121">■</span> Bomb (-200)
      </div>
      <div class="legend-item mt-small">⚡ 20 Combo = FEVER MODE!</div>
    </div>
    <div class="buttons-row">
      <template v-if="!currentName">
        <button @click="emit('show-auth', 'login')" class="action-btn neon-btn">
          로그인
        </button>
        <button
          @click="emit('show-auth', 'register')"
          class="action-btn neon-btn"
        >
          회원가입
        </button>
      </template>
      <button v-else @click="emit('start-game')" class="action-btn neon-btn">
        게임 시작
      </button>
      <button
        @click="emit('show-leaderboard')"
        class="action-btn neon-btn"
      >
        랭킹
      </button>
      <button
        v-if="currentName"
        @click="emit('show-my-record')"
        class="action-btn neon-btn"
      >
        내 기록
      </button>
      <button
        v-if="currentName"
        @click="emit('logout')"
        class="action-btn neon-btn"
      >
        로그아웃
      </button>
    </div>
  </div>
</template>

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

.menu-overlay {
  background: radial-gradient(circle at center, #1a1a2e 0%, #0a0a0c 100%);
}

.crt-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%),
    linear-gradient(
      90deg,
      rgba(255, 0, 0, 0.03),
      rgba(0, 255, 0, 0.01),
      rgba(0, 0, 255, 0.03)
    );
  background-size:
    100% 3px,
    3px 100%;
  pointer-events: none;
  z-index: 10;
}

.particles-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image:
    radial-gradient(1px 1px at 20px 30px, #fff, rgba(0, 0, 0, 0)),
    radial-gradient(1px 1px at 40px 70px, #fff, rgba(0, 0, 0, 0)),
    radial-gradient(1px 1px at 50px 160px, #fff, rgba(0, 0, 0, 0)),
    radial-gradient(1px 1px at 80px 120px, #fff, rgba(0, 0, 0, 0)),
    radial-gradient(1px 1px at 110px 10px, #fff, rgba(0, 0, 0, 0)),
    radial-gradient(1px 1px at 150px 150px, #fff, rgba(0, 0, 0, 0));
  background-repeat: repeat;
  background-size: 200px 200px;
  animation: bgScroll 20s linear infinite;
  opacity: 0.2;
  pointer-events: none;
}

@keyframes bgScroll {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 0 200px;
  }
}

.main-title {
  font-size: 4.5rem;
  background: linear-gradient(to bottom, #fff 0%, #00ffcc 50%, #00ccaa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 15px rgba(0, 255, 204, 0.4));
  margin-bottom: 5px;
  letter-spacing: -2px;
  z-index: 20;
}

.welcome-msg {
  color: #fff !important;
  font-size: 1.6rem !important;
  justify-content: center !important;
}

.player-name {
  color: #00ffcc;
  text-shadow: 0 0 10px #00ffcc;
  font-weight: bold;
}

.subtitle {
  color: #fff;
  margin-bottom: 30px;
  font-size: 1.2rem;
  letter-spacing: 2px;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 30px;
  text-align: left;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 15px 25px;
  border-radius: 8px;
  border: 2px solid var(--hole-color);
}

.legend-item {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.mt-small {
  margin-top: 10px;
  color: #ffeb3b;
  font-size: 1rem;
}

.buttons-row {
  display: flex;
  gap: 15px;
  position: relative;
  z-index: 20;
}

.action-btn {
  font-size: 1.2rem;
  padding: 15px 25px;
}

.neon-btn {
  border-color: #00ffcc;
  box-shadow: 0 0 10px #00ffcc;
}
.neon-btn:hover {
  background-color: #00ffcc;
  color: #000;
}
</style>
