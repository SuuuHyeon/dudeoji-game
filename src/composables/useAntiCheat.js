/**
 * 안티치트/매크로 방지 Composable
 *
 * 6가지 방어 기법을 통합 관리합니다:
 * 1. isTrusted 검사 (가짜 클릭 차단)
 * 2. 광클(Rapid Click) 방지
 * 3. 반응속도 하한선 (160ms)
 * 4. 반응속도 표준편차 패턴 분석
 * 5. 클릭 좌표 일관성 분석
 * 6. 순간이동(Teleport) 감지
 * + 허니팟 함정 (DOM 스캐너 유인)
 * + 개발자도구/우클릭 차단
 */
import { ref, onMounted, onUnmounted } from 'vue'
import {
  SUSPICIOUS_CLICK_THRESHOLD,
  SCORE_HARD_CAP,
  SCORE_LOWER_CAP,
  RAPID_CLICK_WINDOW_MS,
  RAPID_CLICK_LIMIT,
  MIN_REACTION_TIME_MS,
  REACTION_TIME_STD_DEV_THRESHOLD,
  REACTION_TIME_SAMPLE_SIZE,
  REACTION_TIME_MAX_HISTORY,
  CLICK_HISTORY_SIZE,
  TELEPORT_MOVE_THRESHOLD,
  TELEPORT_STRIKE_LIMIT,
  COORDINATE_STD_DEV_THRESHOLD,
  COORDINATE_MIN_UNIQUE_HOLES,
  CLICK_EVENT_STALE_MS,
} from '../constants/game.js'

export function useAntiCheat(gameState, score) {
  // ── 상태 ──
  let suspiciousClicks = 0
  let clickTimestamps = []
  let reactionTimes = []
  let lastClickEvent = null
  let clickHistory = []
  let mouseMoveEventCount = 0
  let teleportCount = 0
  let lastInputIsTouch = false

  const showAntiCheatModal = ref(false)

  // 허니팟: DOM 탐색 매크로를 유인하는 투명 가짜 두더지
  const honeypotEntity = ref({
    id: 'trap',
    type: 'normal',
    active: true,
    isHit: false,
    floatingScore: null,
    floatingColor: null,
    timeoutId: null,
    spawnTime: Date.now(),
  })

  // ── 핵심 검사 로직 ──

  /** 안티치트 종합 검사 — 조건 도달 시 게임 강제 종료 */
  const enforceAntiCheat = (quitCallback) => {
    if (gameState.value !== 'playing') return false

    // 반응속도 표준편차 분석 (봇의 일정한 클릭 패턴 검출)
    if (reactionTimes.length >= REACTION_TIME_SAMPLE_SIZE) {
      const mean =
        reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      const variance =
        reactionTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
        reactionTimes.length
      const stdDev = Math.sqrt(variance)

      if (stdDev < REACTION_TIME_STD_DEV_THRESHOLD) {
        suspiciousClicks += 5
        reactionTimes = []
      }
    }

    if (
      suspiciousClicks >= SUSPICIOUS_CLICK_THRESHOLD ||
      score.value > SCORE_HARD_CAP ||
      score.value < SCORE_LOWER_CAP
    ) {
      quitCallback()
      showAntiCheatModal.value = true
      return true
    }

    return false
  }

  /** 허니팟 클릭 시 (DOM 스캐너 적발) */
  const catchMacro = (quitCallback) => {
    suspiciousClicks += 5
    enforceAntiCheat(quitCallback)
  }

  // ── 이벤트 핸들러 ──

  const onCatchUntrustedEvent = (e) => {
    lastClickEvent = { time: Date.now(), x: e.clientX, y: e.clientY }

    if (!e.isTrusted) {
      suspiciousClicks += 5
      // enforceAntiCheat는 게임 로직 측에서 호출됨
    }
  }

  const onTrackInputTypePointer = (e) => {
    onCatchUntrustedEvent(e)
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      lastInputIsTouch = true
    } else if (e.pointerType === 'mouse') {
      lastInputIsTouch = false

      // 광클 실시간 방어
      if (gameState.value === 'playing') {
        const now = Date.now()
        clickTimestamps.push(now)
        clickTimestamps = clickTimestamps.filter(
          (t) => now - t < RAPID_CLICK_WINDOW_MS,
        )

        if (clickTimestamps.length >= RAPID_CLICK_LIMIT) {
          suspiciousClicks += 5
        }
      }
    }
  }

  const onTrackInputTypeTouch = () => {
    lastInputIsTouch = true
  }

  const onMouseMove = () => {
    mouseMoveEventCount++
  }

  // ── 타격 검증 ──

  /**
   * handleHit 에서 호출되는 안티치트 검증 로직
   * @returns {{ blocked: boolean }} blocked가 true이면 타격을 무시해야 합니다.
   */
  const validateHit = (index, spawnTime, holeEl) => {
    // 터치 입력이면 무시
    if (lastInputIsTouch) return { blocked: true }

    // 1. 함수 직접 호출 방어 (Vue Devtools 등)
    if (!lastClickEvent || Date.now() - lastClickEvent.time > CLICK_EVENT_STALE_MS) {
      suspiciousClicks += 5
      return { blocked: true }
    }

    // 2. 좌표 일관성 분석 & 순간이동 감지
    if (holeEl && lastClickEvent) {
      const rect = holeEl.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        const relX = (lastClickEvent.x - rect.left) / rect.width
        const relY = (lastClickEvent.y - rect.top) / rect.height

        clickHistory.push({ index, relX, relY })
        if (clickHistory.length > CLICK_HISTORY_SIZE) clickHistory.shift()

        // [방어 A] 순간이동 감지
        if (!lastInputIsTouch && clickHistory.length >= 2) {
          const lastClick = clickHistory[clickHistory.length - 2]
          if (lastClick.index !== index) {
            if (mouseMoveEventCount < TELEPORT_MOVE_THRESHOLD) {
              teleportCount++
              if (teleportCount >= TELEPORT_STRIKE_LIMIT) {
                suspiciousClicks += 5
                return { blocked: true }
              }
            } else {
              teleportCount = 0
            }
          }
        }
        mouseMoveEventCount = 0

        // [방어 B] 클릭 좌표 일관성 검사
        const uniqueHoles = new Set(clickHistory.map((c) => c.index))
        if (uniqueHoles.size >= COORDINATE_MIN_UNIQUE_HOLES) {
          const allX = clickHistory.map((c) => c.relX)
          const allY = clickHistory.map((c) => c.relY)

          const meanX = allX.reduce((a, b) => a + b, 0) / allX.length
          const meanY = allY.reduce((a, b) => a + b, 0) / allY.length
          const stdDevX = Math.sqrt(
            allX.reduce((a, b) => a + Math.pow(b - meanX, 2), 0) / allX.length,
          )
          const stdDevY = Math.sqrt(
            allY.reduce((a, b) => a + Math.pow(b - meanY, 2), 0) / allY.length,
          )

          if (
            stdDevX < COORDINATE_STD_DEV_THRESHOLD &&
            stdDevY < COORDINATE_STD_DEV_THRESHOLD
          ) {
            suspiciousClicks += 5
            return { blocked: true }
          }
        }
      }
    }

    // 3. 반응속도 하한선 검사
    const reactionTime = Date.now() - spawnTime
    if (reactionTime < MIN_REACTION_TIME_MS) {
      suspiciousClicks++
      return { blocked: true }
    }

    // 정상 반응속도 기록 (표준편차 분석용)
    reactionTimes.push(reactionTime)
    if (reactionTimes.length > REACTION_TIME_MAX_HISTORY) reactionTimes.shift()

    return { blocked: false }
  }

  // ── 상태 초기화 (게임 시작 시) ──

  const reset = () => {
    suspiciousClicks = 0
    clickTimestamps = []
    reactionTimes = []
    clickHistory = []
    mouseMoveEventCount = 0
    teleportCount = 0
    lastClickEvent = null
  }

  /** 현재 의심 점수 확인 */
  const isSuspicious = () => suspiciousClicks >= SUSPICIOUS_CLICK_THRESHOLD

  // ── 이벤트 리스너 관리 ──

  const setupEventListeners = () => {
    window.addEventListener('mousemove', onMouseMove, { capture: true })
    window.addEventListener('click', onCatchUntrustedEvent, { capture: true })
    window.addEventListener('mousedown', onCatchUntrustedEvent, {
      capture: true,
    })
    window.addEventListener('pointerdown', onTrackInputTypePointer, {
      capture: true,
    })
    window.addEventListener('touchstart', onTrackInputTypeTouch, {
      capture: true,
    })

    // 배포 환경에서 우클릭 및 개발자 도구 단축키 차단
    if (!import.meta.env.DEV) {
      window.addEventListener('contextmenu', preventContextMenu)
      window.addEventListener('keydown', preventDevTools)
    }
  }

  const cleanupEventListeners = () => {
    window.removeEventListener('mousemove', onMouseMove, { capture: true })
    window.removeEventListener('click', onCatchUntrustedEvent, {
      capture: true,
    })
    window.removeEventListener('mousedown', onCatchUntrustedEvent, {
      capture: true,
    })
    window.removeEventListener('pointerdown', onTrackInputTypePointer, {
      capture: true,
    })
    window.removeEventListener('touchstart', onTrackInputTypeTouch, {
      capture: true,
    })

    if (!import.meta.env.DEV) {
      window.removeEventListener('contextmenu', preventContextMenu)
      window.removeEventListener('keydown', preventDevTools)
    }
  }

  const preventContextMenu = (e) => e.preventDefault()

  const preventDevTools = (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey &&
        e.shiftKey &&
        (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'U') ||
      (e.metaKey &&
        e.altKey &&
        (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.metaKey && e.shiftKey && e.key === 'C')
    ) {
      e.preventDefault()
    }
  }

  // 자동 등록/해제
  onMounted(setupEventListeners)
  onUnmounted(cleanupEventListeners)

  return {
    showAntiCheatModal,
    honeypotEntity,
    enforceAntiCheat,
    catchMacro,
    validateHit,
    reset,
    isSuspicious,
  }
}
