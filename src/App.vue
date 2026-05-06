<script setup>
import { ref, onUnmounted, computed, onMounted } from 'vue'
import Hole from './components/Hole.vue'
import AuthModal from './components/AuthModal.vue'
import Leaderboard from './components/Leaderboard.vue'
import { supabase } from './lib/supabase.js'

const GAME_DURATION = 30
const BOARD_SIZE = 16

// States: 'menu', 'auth', 'playing', 'leaderboard'
const gameState = ref('menu') 

const score = ref(0)
const timeLeft = ref(GAME_DURATION)
const personalBest = ref(0)

const combo = ref(0)
const isFever = ref(false)

const currentName = ref('')
const dbBestScore = ref(0)

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

onMounted(() => {
  const pb = localStorage.getItem('personalBest')
  if (pb) personalBest.value = parseInt(pb, 10)
})

const multiplier = computed(() => {
  if (combo.value >= 20) return 2.0
  if (combo.value >= 10) return 1.5
  return 1.0
})

const startAuth = () => {
  gameState.value = 'auth'
}

const handleAuthSuccess = (userData) => {
  currentName.value = userData.name
  dbBestScore.value = userData.score
  gameState.value = 'menu'
}

const startGame = () => {
  score.value = 0
  timeLeft.value = GAME_DURATION
  combo.value = 0
  isFever.value = false
  gameState.value = 'playing'
  holes.value = Array.from({ length: BOARD_SIZE }, createEmptyHole)
  
  gameTimer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)

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

  // Update Personal Best
  if (score.value > personalBest.value) {
    personalBest.value = score.value
    localStorage.setItem('personalBest', score.value)
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
  clearInterval(gameTimer)
  clearTimeout(spawnTimer)
  clearTimeout(feverTimer)
})
</script>

<template>
  <div class="app-wrapper" :class="{ 'fever-active': isFever }">
    <div class="game-container">
      
      <!-- Top Info Bar -->
      <div class="top-info">
        <div class="personal-best">TOP: {{ personalBest }}</div>
      </div>

      <header class="game-header">
        <div class="score-section">
          <div class="score">SCORE: <span :class="{'negative': score < 0}">{{ score }}</span></div>
          <div v-if="combo > 1" class="combo" :class="{'combo-high': combo >= 10, 'combo-fever': combo >= 20}">
            {{ combo }} COMBO! <span v-if="multiplier > 1" class="multiplier">(x{{ multiplier }})</span>
          </div>
        </div>
        <div class="timer" :class="{ 'warning': timeLeft <= 5 && gameState === 'playing' }">TIME: {{ timeLeft }}s</div>
      </header>

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
        <div v-if="gameState === 'menu'" class="overlay">
          <h1>WHAC-A-MOLE</h1>
          <p class="subtitle">Neo-Arcade Edition</p>
          <div class="legend" v-if="currentName">
            <div class="legend-item" style="color: #00ffcc; justify-content: center; font-size: 1.5rem">
              Welcome, {{ currentName }}!
            </div>
          </div>
          <div class="legend" v-else>
            <div class="legend-item"><span style="color: #795548;">■</span> Normal (+100)</div>
            <div class="legend-item"><span style="color: #ffb300;">■</span> Golden (+300)</div>
            <div class="legend-item"><span style="color: #212121;">■</span> Bomb (-200)</div>
            <div class="legend-item mt-small">⚡ 20 Combo = FEVER MODE!</div>
          </div>
          <div class="buttons-row">
            <button v-if="!currentName" @click="startAuth" class="action-btn neon-btn">LOGIN</button>
            <button v-else @click="startGame" class="action-btn neon-btn">START GAME</button>
            <button @click="gameState = 'leaderboard'" class="action-btn">RANKING</button>
            <button v-if="currentName" @click="currentName = ''" class="action-btn">LOGOUT</button>
          </div>
        </div>

        <div v-if="gameState === 'auth'" class="overlay">
          <AuthModal @close="gameState = 'menu'" @auth-success="handleAuthSuccess" />
        </div>

        <div v-if="gameState === 'leaderboard'" class="overlay">
          <Leaderboard :current-score="score" :current-name="currentName" @close="gameState = 'menu'" />
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
}

.top-info {
  text-align: right;
  margin-bottom: 5px;
  color: #ffcc80;
  font-size: 1.2rem;
  letter-spacing: 1px;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 1.5rem;
  background-color: var(--grid-bg);
  padding: 15px 20px;
  border-radius: 8px;
  border: 4px solid var(--hole-color);
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.5);
  height: 80px;
}

.score-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.score .negative {
  color: #ff3366;
}

.combo {
  font-size: 1rem;
  color: #aae;
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.combo-high {
  color: #ffeb3b;
  font-size: 1.2rem;
}

.combo-fever {
  color: #ff00de;
  font-size: 1.2rem;
  text-shadow: 0 0 5px #ff00de;
  animation: shake 0.2s infinite;
}

.multiplier {
  color: #fff;
}

@keyframes popIn {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.timer {
  color: var(--secondary-color);
  font-size: 1.8rem;
}

.timer.warning {
  color: #ff3366;
  animation: pulse 1s infinite;
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
  background-color: rgba(18, 18, 20, 0.95);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
  backdrop-filter: blur(4px);
}

h1 {
  color: var(--secondary-color);
  font-size: 3rem;
  margin-bottom: 5px;
  text-align: center;
  text-shadow: 0 0 10px var(--secondary-color);
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
