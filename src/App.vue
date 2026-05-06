<script setup>
import { ref, onUnmounted, computed, onMounted } from 'vue'
import Hole from './components/Hole.vue'
import AuthModal from './components/AuthModal.vue'
import Leaderboard from './components/Leaderboard.vue'
import MyRecord from './components/MyRecord.vue'
import PixelMascot from './components/PixelMascot.vue'
import { supabase } from './lib/supabase.js'

const GAME_DURATION = 30
const BOARD_SIZE = 16

// States: 'menu', 'auth', 'playing', 'leaderboard'
const gameState = ref('menu') 

const score = ref(0)
const timeLeft = ref(GAME_DURATION)

const combo = ref(0)
const isFever = ref(false)

const currentName = ref('')
const dbBestScore = ref(0)

const countdownValue = ref(3)
let countdownTimer = null

const createEmptyHole = () => ({
  id: null,
  type: 'normal',
  active: false,
  isHit: false,
  floatingScore: null,
  floatingColor: null,
  timeoutId: null
})

const holes = ref(Array.from({ length: BOARD_SIZE }, createEmptyHole))

let gameTimer = null
let spawnTimer = null
let feverTimer = null
let gameStartTime = 0

onMounted(() => {
  // Setup if needed
})

const multiplier = computed(() => {
  if (combo.value >= 20) return 2.0
  if (combo.value >= 10) return 1.5
  return 1.0
})

const authMode = ref('login')

const startAuth = (mode) => {
  authMode.value = mode
  gameState.value = 'auth'
}

const handleAuthSuccess = (userData) => {
  currentName.value = userData.name
  dbBestScore.value = userData.score
  gameState.value = 'menu'
}

const prepareGame = () => {
  gameState.value = 'countdown'
  countdownValue.value = 3
  countdownTimer = setInterval(() => {
    countdownValue.value--
    if (countdownValue.value === 0) {
      clearInterval(countdownTimer)
      startGame()
    }
  }, 1000)
}

const quitGame = () => {
  clearInterval(gameTimer)
  clearTimeout(spawnTimer)
  clearTimeout(feverTimer)
  isFever.value = false
  holes.value.forEach((hole) => {
    if (hole && hole.timeoutId) clearTimeout(hole.timeoutId)
    if (hole) {
      hole.active = false
      hole.isHit = false
    }
  })
  gameState.value = 'menu'
}

const startGame = () => {
  score.value = 0
  timeLeft.value = GAME_DURATION
  combo.value = 0
  isFever.value = false
  gameState.value = 'playing'
  holes.value = Array.from({ length: BOARD_SIZE }, createEmptyHole)
  
  gameStartTime = Date.now()
  
  gameTimer = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000)
    timeLeft.value = Math.max(0, GAME_DURATION - elapsedSeconds)
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 100) // check more frequently to be precise

  scheduleSpawn()
}

const endGame = async () => {
  clearInterval(gameTimer)
  clearTimeout(spawnTimer)
  clearTimeout(feverTimer)
  isFever.value = false
  
  // Clear any active entities
  holes.value.forEach((hole) => {
    if (hole && hole.timeoutId) clearTimeout(hole.timeoutId)
    if (hole) {
      hole.active = false
      hole.isHit = false
    }
  })

  // Hard Cap check (Anti-cheat for score forgery)
  // Max possible score is around ~20k-25k realistically.
  if (score.value > 30000 || score.value < -5000) {
    console.warn('Abnormal score detected. Skipping DB upload.')
    gameState.value = 'leaderboard'
    return
  }

  // Auto-submit score to DB if it's a new best for this user
  if (score.value > dbBestScore.value) {
    try {
      await supabase.from('leaderboard').update({
        score: score.value
      }).eq('name', currentName.value)
      dbBestScore.value = score.value
    } catch (err) {
      console.error('Failed to update DB score', err)
    }
  }

  // Save to score history
  if (currentName.value) {
    try {
      await supabase.from('score_history').insert({
        name: currentName.value,
        score: score.value
      })
    } catch (err) {
      console.error('Failed to save history', err)
    }
  }

  // Go straight to leaderboard
  gameState.value = 'leaderboard'
}

const getSpawnDelay = () => {
  if (isFever.value) return 375 // 0.8x of previous speed (was 300)

  const minDelay = 500
  const maxDelay = 1200
  const progress = (GAME_DURATION - timeLeft.value) / GAME_DURATION
  return maxDelay - (maxDelay - minDelay) * progress
}

const getRandomType = () => {
  if (isFever.value) return 'golden' // Only golden in fever

  const rand = Math.random()
  if (rand < 0.15) return 'golden'
  if (rand < 0.35) return 'bomb'
  return 'normal'
}

const getActiveDuration = (type) => {
  if (isFever.value) return 750 // 0.8x of previous speed (was 600)

  const baseDuration = getSpawnDelay() * 1.5
  if (type === 'golden') return baseDuration * 0.8
  if (type === 'bomb') return baseDuration * 1.2
  return baseDuration
}

const scheduleSpawn = () => {
  if (gameState.value !== 'playing') return

  spawnTimer = setTimeout(() => {
    spawnEntity()
    scheduleSpawn()
  }, getSpawnDelay())
}

const triggerFever = () => {
  isFever.value = true
  clearTimeout(feverTimer)
  feverTimer = setTimeout(() => {
    isFever.value = false
  }, 5000) // 5 seconds of fever
}

const breakCombo = () => {
  combo.value = 0
}

const spawnEntity = () => {
  if (gameState.value !== 'playing') return

  const emptyIndices = []
  holes.value.forEach((hole, index) => {
    if (!hole || (!hole.active && !hole.isHit)) emptyIndices.push(index)
  })

  if (emptyIndices.length === 0) return

  const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)]
  const type = getRandomType()
  const entityId = Date.now()
  
  const hole = holes.value[randomIndex]
  if (hole && hole.timeoutId) clearTimeout(hole.timeoutId)

  hole.id = entityId
  hole.type = type
  hole.isHit = false
  hole.floatingScore = null
  hole.floatingColor = null
  hole.active = true
  
  hole.timeoutId = setTimeout(() => {
    if (hole.id === entityId) {
      // If it naturally hides and wasn't hit, and wasn't a bomb, combo breaks
      if (!hole.isHit && hole.type !== 'bomb') {
        breakCombo()
      }
      hole.active = false
      hole.isHit = false
    }
  }, getActiveDuration(type))
}

const handleHit = (index, entity) => {
  if (gameState.value !== 'playing' || !entity.active || entity.isHit) return

  let baseScore = 0
  let color = '#fff'
  
  if (entity.type === 'normal') {
    baseScore = 100
    color = '#fff'
    combo.value++
  } else if (entity.type === 'golden') {
    baseScore = 300
    color = '#ffcc80'
    combo.value++
  } else if (entity.type === 'bomb') {
    baseScore = -200
    color = '#ff3366'
    breakCombo()
  }

  // Check Fever trigger
  if (combo.value === 20 && !isFever.value) {
    triggerFever()
  }

  // Apply multiplier (bombs don't get multiplied to be fair, or maybe they do? Let's multiply penalties too)
  const scoreChange = Math.floor(baseScore * multiplier.value)
  score.value += scoreChange

  if (holes.value[index] && holes.value[index].id === entity.id) {
    holes.value[index].isHit = true
    holes.value[index].floatingScore = scoreChange > 0 ? `+${scoreChange}` : `${scoreChange}`
    holes.value[index].floatingColor = color
    clearTimeout(holes.value[index].timeoutId)
    
    setTimeout(() => {
      if (holes.value[index] && holes.value[index].id === entity.id) {
        holes.value[index].active = false
        holes.value[index].isHit = false
      }
    }, 400)
  }
}

onUnmounted(() => {
  clearInterval(countdownTimer)
  clearInterval(gameTimer)
  clearTimeout(spawnTimer)
  clearTimeout(feverTimer)
})
</script>

<template>
  <div class="app-wrapper" :class="{ 'fever-active': isFever }">
    <div class="game-container">
      
      <!-- Top Info Bar -->
      <div class="top-info" v-if="currentName">
        <div class="personal-best">TOP: {{ dbBestScore }}</div>
        <button v-if="gameState === 'playing'" @click="quitGame" class="quit-btn">포기하기</button>
      </div>

      <header class="game-header">
        <div class="score-container">
          <div class="huge-score" :class="{'negative': score < 0}">{{ score }}</div>
          <div class="timer-badge" :class="{ 'warning': timeLeft <= 5 && gameState === 'playing' }">TIME: {{ timeLeft }}s</div>
        </div>
      </header>

      <!-- Combo Overlay (Absolute positioned to top right) -->
      <div v-if="combo > 1 && gameState === 'playing'" class="combo-overlay" :key="combo">
        <div class="huge-combo" :class="{'combo-high': combo >= 10, 'combo-fever': combo >= 20}">
          {{ combo }} COMBO!
          <span v-if="multiplier > 1" class="multiplier">x{{ multiplier }}</span>
        </div>
      </div>

      <div class="board-wrapper">
        <div class="grid">
          <Hole 
            v-for="(entity, index) in holes" 
            :key="index"
            :entity="entity"
            @hit="handleHit(index, entity)"
          />
        </div>

        <!-- Overlays -->
        <div v-if="gameState === 'menu'" class="overlay menu-overlay">
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
            <div class="legend-item"><span style="color: #795548;">■</span> Normal (+100)</div>
            <div class="legend-item"><span style="color: #ffb300;">■</span> Golden (+300)</div>
            <div class="legend-item"><span style="color: #212121;">■</span> Bomb (-200)</div>
            <div class="legend-item mt-small">⚡ 20 Combo = FEVER MODE!</div>
          </div>
          <div class="buttons-row">
            <template v-if="!currentName">
              <button @click="startAuth('login')" class="action-btn neon-btn">로그인</button>
              <button @click="startAuth('register')" class="action-btn neon-btn">회원가입</button>
            </template>
            <button v-else @click="prepareGame" class="action-btn neon-btn">게임 시작</button>
            <button @click="gameState = 'leaderboard'" class="action-btn neon-btn">랭킹</button>
            <button v-if="currentName" @click="gameState = 'my_record'" class="action-btn neon-btn">내 기록</button>
            <button v-if="currentName" @click="currentName = ''" class="action-btn neon-btn">로그아웃</button>
          </div>
        </div>

        <div v-if="gameState === 'auth'" class="overlay">
          <AuthModal :mode="authMode" @close="gameState = 'menu'" @auth-success="handleAuthSuccess" />
        </div>

        <div v-if="gameState === 'countdown'" class="overlay">
          <div class="countdown-text">{{ countdownValue }}</div>
        </div>

        <div v-if="gameState === 'leaderboard'" class="overlay">
          <Leaderboard :current-score="score" :current-name="currentName" @close="gameState = 'menu'" />
        </div>

        <div v-if="gameState === 'my_record'" class="overlay">
          <MyRecord :currentName="currentName" @close="gameState = 'menu'" />
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.app-wrapper {
  /* width: 100vw; */
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.3s;
}

/* Fever Background Animation applied to wrapper if we wanted, but we can't change body from scoped easily. 
   We will rely on CSS variables or global styles if needed, or just animate the app-wrapper. */
.fever-active {
  animation: feverPulse 0.5s infinite alternate;
}

@keyframes feverPulse {
  0% { background-color: rgba(255, 0, 100, 0.1); }
  100% { background-color: rgba(0, 200, 255, 0.1); }
}

.game-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
}

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
  text-shadow: 0 0 20px #00ffcc, 0 0 40px rgba(0, 255, 204, 0.5);
  line-height: 1;
  transition: color 0.3s, text-shadow 0.3s;
}

.huge-score.negative {
  color: #ff3366;
  text-shadow: 0 0 20px #ff3366, 0 0 40px rgba(255, 51, 102, 0.5);
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
  text-shadow: 0 0 20px #ff00de, 0 0 40px #ff00de;
  white-space: nowrap;
  animation: popBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.combo-high {
  color: #ffeb3b;
  text-shadow: 0 0 20px #ffeb3b, 0 0 40px #ffeb3b;
  font-size: 5rem;
}

.combo-fever {
  color: #ff0000;
  text-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #ff0000;
  font-size: 6rem;
  animation: popBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), shake 0.2s infinite;
}

.multiplier {
  font-size: 0.6em;
  color: #fff;
  vertical-align: top;
  text-shadow: none;
}

@keyframes popBounce {
  0% { transform: scale(0.5) translateY(50px); opacity: 0; }
  50% { transform: scale(1.2) translateY(-20px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.board-wrapper {
  position: relative;
  background-color: var(--grid-bg);
  padding: 15px;
  border-radius: 12px;
  border: 4px solid var(--hole-color);
  box-shadow: 0 8px 0 rgba(0, 0, 0, 0.5);
}

.fever-active .board-wrapper {
  border-color: #ff00de;
  box-shadow: 0 0 30px rgba(255, 0, 222, 0.5);
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 15px;
  width: 100%;
  aspect-ratio: 1 / 1;
}

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

.countdown-text {
  font-size: 8rem;
  color: #00ffcc;
  text-shadow: 0 0 20px #00ffcc;
  animation: pop 1s infinite;
  font-family: var(--font-pixel);
  z-index: 20;
}

@keyframes pop {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}

.crt-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), 
              linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
  background-size: 100% 3px, 3px 100%;
  pointer-events: none;
  z-index: 10;
}

.particles-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)),
    radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
    radial-gradient(1px 1px at 50px 160px, #fff, rgba(0,0,0,0)),
    radial-gradient(1px 1px at 80px 120px, #fff, rgba(0,0,0,0)),
    radial-gradient(1px 1px at 110px 10px, #fff, rgba(0,0,0,0)),
    radial-gradient(1px 1px at 150px 150px, #fff, rgba(0,0,0,0));
  background-repeat: repeat;
  background-size: 200px 200px;
  animation: bgScroll 20s linear infinite;
  opacity: 0.2;
  pointer-events: none;
}

@keyframes bgScroll {
  from { background-position: 0 0; }
  to { background-position: 0 200px; }
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
  background-color: rgba(0,0,0,0.5);
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

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px) rotate(-2deg); }
  75% { transform: translateX(2px) rotate(2deg); }
}
</style>
