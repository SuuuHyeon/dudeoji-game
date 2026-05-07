/**
 * 게임 핵심 로직 Composable
 *
 * 스폰 시스템, 타격 처리, 콤보/피버, 타이머, 점수 계산을 관리합니다.
 */
import { ref, computed, onUnmounted } from 'vue'
import {
  GAME_DURATION,
  BOARD_SIZE,
  COUNTDOWN_START,
  SCORE_NORMAL,
  SCORE_GOLDEN,
  SCORE_BOMB,
  FEVER_COMBO_THRESHOLD,
  FEVER_DURATION,
  COMBO_MULTIPLIER_TIER1,
  COMBO_MULTIPLIER_TIER2,
  SPAWN_MIN_DELAY,
  SPAWN_MAX_DELAY,
  BOMB_NEXT_SPAWN_RATIO,
  FEVER_SPAWN_DELAY,
  FEVER_ACTIVE_DURATION,
  GOLDEN_DURATION_RATIO,
  BOMB_DURATION_RATIO,
  ACTIVE_DURATION_BASE_RATIO,
  GOLDEN_SPAWN_CHANCE,
  BOMB_SPAWN_CHANCE,
  MAX_CONSECUTIVE_BOMBS,
  HIT_HIDE_DELAY,
  SCORE_HARD_CAP,
  SCORE_LOWER_CAP,
  SUSPICIOUS_CLICK_THRESHOLD,
} from '../constants/game.js'
import { startGameSession, submitSecureScore } from '../services/api.js'
import { useAnalytics } from './useAnalytics.js'

export function useGame(auth, antiCheat) {
  const { trackGameStart, trackGameEnd, trackGameQuit } = useAnalytics()

  // ── 게임 상태 ──
  // States: 'menu', 'auth', 'playing', 'countdown', 'leaderboard', 'my_record'
  const gameState = ref('menu')

  const score = ref(0)
  const timeLeft = ref(GAME_DURATION)
  const combo = ref(0)
  const maxCombo = ref(0)
  const bombsHit = ref(0)
  const isFever = ref(false)
  const countdownValue = ref(COUNTDOWN_START)

  const holeElements = ref([])

  // ── 내부 변수 ──
  let gameTimer = null
  let spawnTimer = null
  let feverTimer = null
  let countdownTimer = null
  let gameStartTime = 0
  let consecutiveBombs = 0
  let currentSessionId = null

  // ── Computed ──

  const multiplier = computed(() => {
    if (combo.value >= COMBO_MULTIPLIER_TIER2) return 2.0
    if (combo.value >= COMBO_MULTIPLIER_TIER1) return 1.5
    return 1.0
  })

  // ── 구멍(Hole) 데이터 ──

  const createEmptyHole = () => ({
    id: null,
    type: 'normal',
    active: false,
    isHit: false,
    floatingScore: null,
    floatingColor: null,
    timeoutId: null,
    spawnTime: 0,
  })

  const holes = ref(Array.from({ length: BOARD_SIZE }, createEmptyHole))

  // ── 스폰 시스템 ──

  const getSpawnDelay = () => {
    if (isFever.value) return FEVER_SPAWN_DELAY

    const progress = (GAME_DURATION - timeLeft.value) / GAME_DURATION
    return SPAWN_MAX_DELAY - (SPAWN_MAX_DELAY - SPAWN_MIN_DELAY) * progress
  }

  const getRandomType = () => {
    if (isFever.value) {
      consecutiveBombs = 0
      return 'golden'
    }

    const rand = Math.random()
    if (rand < GOLDEN_SPAWN_CHANCE) {
      consecutiveBombs = 0
      return 'golden'
    }
    if (rand < BOMB_SPAWN_CHANCE) {
      if (consecutiveBombs >= MAX_CONSECUTIVE_BOMBS) {
        consecutiveBombs = 0
        return 'normal'
      }
      consecutiveBombs++
      return 'bomb'
    }
    consecutiveBombs = 0
    return 'normal'
  }

  const getActiveDuration = (type) => {
    if (isFever.value) return FEVER_ACTIVE_DURATION

    const baseDuration = getSpawnDelay() * ACTIVE_DURATION_BASE_RATIO
    if (type === 'golden') return baseDuration * GOLDEN_DURATION_RATIO
    if (type === 'bomb') return baseDuration * BOMB_DURATION_RATIO
    return baseDuration
  }

  const spawnEntity = () => {
    if (gameState.value !== 'playing') return null

    const emptyIndices = []
    holes.value.forEach((hole, index) => {
      if (!hole || (!hole.active && !hole.isHit)) emptyIndices.push(index)
    })

    if (emptyIndices.length === 0) return null

    const randomIndex =
      emptyIndices[Math.floor(Math.random() * emptyIndices.length)]
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
    hole.spawnTime = Date.now()

    hole.timeoutId = setTimeout(() => {
      if (hole.id === entityId) {
        if (!hole.isHit && hole.type !== 'bomb') {
          breakCombo()
        }
        hole.active = false
        hole.isHit = false
      }
    }, getActiveDuration(type))

    return type
  }

  const scheduleSpawn = (customDelay = null) => {
    if (gameState.value !== 'playing') return

    const delay = customDelay !== null ? customDelay : getSpawnDelay()

    spawnTimer = setTimeout(() => {
      const type = spawnEntity()
      const nextDelay = type === 'bomb' ? getSpawnDelay() * BOMB_NEXT_SPAWN_RATIO : null
      scheduleSpawn(nextDelay)
    }, delay)
  }

  // ── 콤보 & 피버 ──

  const breakCombo = () => {
    combo.value = 0
  }

  const triggerFever = () => {
    isFever.value = true
    clearTimeout(feverTimer)
    feverTimer = setTimeout(() => {
      isFever.value = false
    }, FEVER_DURATION)
  }

  // ── 타격 처리 ──

  const handleHit = (index, entity) => {
    if (gameState.value !== 'playing' || !entity.active || entity.isHit) return

    // 안티치트 검증 위임
    const holeEl = holeElements.value[index]?.$el
    const { blocked } = antiCheat.validateHit(index, entity.spawnTime, holeEl)
    if (blocked) {
      antiCheat.enforceAntiCheat(quitGame)
      return
    }

    let baseScore = 0
    let color = '#fff'

    if (entity.type === 'normal') {
      baseScore = SCORE_NORMAL
      color = '#fff'
      combo.value++
    } else if (entity.type === 'golden') {
      baseScore = SCORE_GOLDEN
      color = '#ffcc80'
      combo.value++
    } else if (entity.type === 'bomb') {
      baseScore = SCORE_BOMB
      color = '#ff3366'
      bombsHit.value++
      breakCombo()
    }

    if (combo.value > maxCombo.value) {
      maxCombo.value = combo.value
    }

    // 피버 트리거 체크
    if (combo.value === FEVER_COMBO_THRESHOLD && !isFever.value) {
      triggerFever()
    }

    const scoreChange = Math.floor(baseScore * multiplier.value)
    score.value += scoreChange

    // 실시간 점수 검증
    antiCheat.enforceAntiCheat(quitGame)

    if (holes.value[index] && holes.value[index].id === entity.id) {
      holes.value[index].isHit = true
      holes.value[index].floatingScore =
        scoreChange > 0 ? `+${scoreChange}` : `${scoreChange}`
      holes.value[index].floatingColor = color
      clearTimeout(holes.value[index].timeoutId)

      // 즉시 다음 두더지 스폰
      clearTimeout(spawnTimer)
      const newType = spawnEntity()
      const nextDelay =
        newType === 'bomb' ? getSpawnDelay() * BOMB_NEXT_SPAWN_RATIO : null
      scheduleSpawn(nextDelay)

      setTimeout(() => {
        if (holes.value[index] && holes.value[index].id === entity.id) {
          holes.value[index].active = false
          holes.value[index].isHit = false
        }
      }, HIT_HIDE_DELAY)
    }
  }

  // ── 게임 흐름 ──

  const clearAllTimers = () => {
    clearInterval(gameTimer)
    clearInterval(countdownTimer)
    clearTimeout(spawnTimer)
    clearTimeout(feverTimer)
  }

  const clearActiveHoles = () => {
    holes.value.forEach((hole) => {
      if (hole && hole.timeoutId) clearTimeout(hole.timeoutId)
      if (hole) {
        hole.active = false
        hole.isHit = false
      }
    })
  }

  const prepareGame = () => {
    trackGameStart()
    gameState.value = 'countdown'
    countdownValue.value = COUNTDOWN_START
    countdownTimer = setInterval(() => {
      countdownValue.value--
      if (countdownValue.value === 0) {
        clearInterval(countdownTimer)
        startGame()
      }
    }, 1000)
  }

  const startGame = async () => {
    score.value = 0
    timeLeft.value = GAME_DURATION
    combo.value = 0
    maxCombo.value = 0
    bombsHit.value = 0
    isFever.value = false
    consecutiveBombs = 0
    currentSessionId = null
    gameState.value = 'playing'

    // 안티치트 초기화
    antiCheat.reset()

    // 서버에서 1회용 세션 발급
    if (auth.currentName.value) {
      try {
        const data = await startGameSession(auth.currentName.value)
        if (data) currentSessionId = data
      } catch (err) {
        console.error('Session init failed')
      }
    }

    holes.value = Array.from({ length: BOARD_SIZE }, createEmptyHole)
    gameStartTime = Date.now()

    gameTimer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000)
      timeLeft.value = Math.max(0, GAME_DURATION - elapsedSeconds)
      if (timeLeft.value <= 0) {
        endGame()
      }
    }, 100)

    scheduleSpawn()
  }

  const endGame = async () => {
    clearAllTimers()
    isFever.value = false
    clearActiveHoles()

    // 안티치트 최종 검사
    if (
      score.value > SCORE_HARD_CAP ||
      score.value < SCORE_LOWER_CAP ||
      antiCheat.isSuspicious()
    ) {
      gameState.value = 'menu'
      antiCheat.showAntiCheatModal.value = true
      return
    }

    // GA4 추적
    trackGameEnd({
      score: score.value,
      maxCombo: maxCombo.value,
      bombsHit: bombsHit.value,
      name: auth.currentName.value,
    })

    // 서버에 점수 제출
    if (currentSessionId && auth.currentName.value) {
      try {
        const data = await submitSecureScore(
          currentSessionId,
          auth.currentName.value,
          auth.currentPin.value,
          score.value,
        )
        if (data) {
          auth.updateBestScore(score.value)
        }
      } catch (err) {
        // silent fail
      }
    }

    gameState.value = 'leaderboard'
  }

  const quitGame = () => {
    trackGameQuit()
    clearAllTimers()
    isFever.value = false
    clearActiveHoles()
    antiCheat.reset()
    gameState.value = 'menu'
  }

  // 컴포넌트 언마운트 시 정리
  onUnmounted(() => {
    clearAllTimers()
  })

  return {
    // 상태
    gameState,
    score,
    timeLeft,
    combo,
    maxCombo,
    bombsHit,
    isFever,
    countdownValue,
    holes,
    holeElements,

    // Computed
    multiplier,

    // 함수
    prepareGame,
    startGame,
    endGame,
    quitGame,
    handleHit,
  }
}
