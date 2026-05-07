<script setup>
import { ref, onUnmounted, computed, onMounted, watch } from 'vue';
import Hole from './components/Hole.vue';
import AuthModal from './components/AuthModal.vue';
import Leaderboard from './components/Leaderboard.vue';
import MyRecord from './components/MyRecord.vue';
import PixelMascot from './components/PixelMascot.vue';
import { supabase } from './lib/supabase.js';

const GAME_DURATION = 30;
const BOARD_SIZE = 16;

// States: 'menu', 'auth', 'playing', 'leaderboard'
const gameState = ref('menu');

const score = ref(0);
const timeLeft = ref(GAME_DURATION);

const combo = ref(0);
const isFever = ref(false);

const currentName = ref('');
const currentPin = ref('');
const dbBestScore = ref(0);

const countdownValue = ref(3);
let countdownTimer = null;

const maxCombo = ref(0);
const bombsHit = ref(0);

const patchNotes = ref([]);

const fetchPatchNotes = async () => {
  try {
    const { data, error } = await supabase
      .from('patch_notes')
      .select('content')
      .order('id', { ascending: false })
      .limit(5); // 최근 5개까지만 가져옵니다

    if (error) throw error;
    if (data) patchNotes.value = data.map((item) => item.content);
  } catch (err) {
    console.error('Failed to fetch patch notes', err);
  }
};

const trackEvent = (eventName, params = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};

const identifyUser = (name) => {
  if (window.gtag) {
    // 구글 애널리틱스에 유저 ID 설정 (G-WCZJ0R9Y0P는 index.html과 동일해야 함)
    window.gtag('config', 'G-WCZJ0R9Y0P', {
      user_id: name,
    });
    // 유저 속성으로 닉네임 저장
    window.gtag('set', 'user_properties', {
      nickname: name,
    });
  }
};

watch(gameState, (newVal) => {
  if (newVal === 'leaderboard') trackEvent('view_leaderboard');
  if (newVal === 'my_record') trackEvent('view_my_record');
});

const createEmptyHole = () => ({
  id: null,
  type: 'normal',
  active: false,
  isHit: false,
  floatingScore: null,
  floatingColor: null,
  timeoutId: null,
  spawnTime: 0,
});

const holes = ref(Array.from({ length: BOARD_SIZE }, createEmptyHole));

let suspiciousClicks = 0;
let clickTimestamps = []; // 마우스 광클 방지를 위한 클릭 시간 기록 배열
let reactionTimes = []; // 매크로의 일정한 반응속도 패턴을 잡기 위한 배열
let lastClickEvent = null; // Vue Devtools 등을 통한 직접 함수 호출 방지용

// DOM 탐색 매크로를 유인하는 '투명 허니팟(가짜 두더지)' 데이터
const honeypotEntity = ref({
  id: 'trap',
  type: 'normal',
  active: true, // 매크로의 레이더에 걸리도록 항상 '활성화' 상태로 둡니다.
  isHit: false,
  floatingScore: null,
  floatingColor: null,
  timeoutId: null,
  spawnTime: Date.now(),
});

function enforceAntiCheat() {
  // 게임 중일 때만 검사하여 조건 도달 시 즉시 포기 처리
  if (gameState.value !== 'playing') return;

  // 인간은 기계처럼 일정한 속도로 계속 클릭할 수 없음을 이용한 표준편차 검사
  if (reactionTimes.length >= 10) {
    const mean =
      reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    const variance =
      reactionTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      reactionTimes.length;
    const stdDev = Math.sqrt(variance);

    // 반응속도 표준편차가 20ms 미만이면 기계(매크로)로 간주
    if (stdDev < 20) {
      console.warn(
        `[매크로 적발] 기계적인 반응속도 일관성 감지 (표준편차: ${stdDev.toFixed(2)}ms)`,
      );
      suspiciousClicks += 5; // 즉시 밴
    }
  }

  if (suspiciousClicks >= 5 || score.value > 30000 || score.value < -5000) {
    console.warn(
      'Abnormal gameplay detected (Macro/Bot). Game forced to quit.',
    );
    // 화면을 메인 메뉴로 먼저 전환하여 렌더링 락(Lock)을 방지합니다.
    quitGame();
    setTimeout(() => {
      alert('잡았다요놈');
    }, 50);
  }
}

const catchMacro = () => {
  suspiciousClicks += 5; // 단 한 번이라도 치면 즉시 섀도우 밴 기준치 초과!
  console.warn('[매크로 적발] 인간은 볼 수 없는 투명 허니팟 타격 감지!');
  enforceAntiCheat();
};

const catchUntrustedEvent = (e) => {
  // 실제 물리적 이벤트 발생 시간 기록 (이벤트 캡처 단계에서 실행되므로 컴포넌트 핸들러보다 먼저 실행됨)
  lastClickEvent = { time: Date.now() };

  // 브라우저 네이티브 보안: 자바스크립트로 강제 발생시킨 가짜 클릭은 isTrusted가 false입니다.
  if (!e.isTrusted) {
    suspiciousClicks += 5; // 즉시 섀도우 밴 기준치 초과
    console.warn('[매크로 적발] 개발자 도구 스크립트(가짜 클릭) 감지!');
    enforceAntiCheat();
  }
};

let lastInputIsTouch = false;

const trackInputTypePointer = (e) => {
  catchUntrustedEvent(e);
  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
    lastInputIsTouch = true;
  } else if (e.pointerType === 'mouse') {
    lastInputIsTouch = false;

    // 오토마우스(광클) 실시간 방어: 0.5초 이내에 8번 이상 마우스 클릭 시 즉시 차단
    if (gameState.value === 'playing') {
      const now = Date.now();
      clickTimestamps.push(now);
      // 최근 500ms(0.5초) 이내의 클릭 기록만 남깁니다.
      clickTimestamps = clickTimestamps.filter((t) => now - t < 500);

      if (clickTimestamps.length >= 8) {
        suspiciousClicks += 5; // 즉시 섀도우 밴 기준치 초과!
        console.warn('[매크로 적발] 비정상적인 광클(Auto-Clicker) 감지!');
        enforceAntiCheat();
      }
    }
  }
};

const trackInputTypeTouch = () => {
  lastInputIsTouch = true;
};

let gameTimer = null;
let spawnTimer = null;
let feverTimer = null;
let gameStartTime = 0;
let consecutiveBombs = 0;

onMounted(() => {
  fetchPatchNotes();
  window.addEventListener('click', catchUntrustedEvent, { capture: true });
  window.addEventListener('mousedown', catchUntrustedEvent, { capture: true });
  window.addEventListener('pointerdown', trackInputTypePointer, {
    capture: true,
  });
  window.addEventListener('touchstart', trackInputTypeTouch, { capture: true });
  // Setup if needed
});

const multiplier = computed(() => {
  if (combo.value >= 20) return 2.0;
  if (combo.value >= 10) return 1.5;
  return 1.0;
});

const authMode = ref('login');

const startAuth = (mode) => {
  authMode.value = mode;
  gameState.value = 'auth';
  trackEvent(mode === 'register' ? 'click_register' : 'click_login');
};

const handleAuthSuccess = (userData) => {
  currentName.value = userData.name;
  currentPin.value = userData.pin;
  dbBestScore.value = userData.score;
  gameState.value = 'menu';

  // Track login/auth success
  identifyUser(userData.name);
  trackEvent(
    authMode.value === 'register' ? 'sign_up_complete' : 'login_success',
    { method: 'pin' },
  );
};

const prepareGame = () => {
  // Track game start
  trackEvent('game_start', { method: 'button' });

  gameState.value = 'countdown';
  countdownValue.value = 3;
  countdownTimer = setInterval(() => {
    countdownValue.value--;
    if (countdownValue.value === 0) {
      clearInterval(countdownTimer);
      startGame();
    }
  }, 1000);
};

const quitGame = () => {
  trackEvent('game_quit');
  clearInterval(gameTimer);
  clearTimeout(spawnTimer);
  clearTimeout(feverTimer);
  isFever.value = false;
  holes.value.forEach((hole) => {
    if (hole && hole.timeoutId) clearTimeout(hole.timeoutId);
    if (hole) {
      hole.active = false;
      hole.isHit = false;
    }
  });
  gameState.value = 'menu';
};

const startGame = () => {
  score.value = 0;
  timeLeft.value = GAME_DURATION;
  combo.value = 0;
  maxCombo.value = 0;
  bombsHit.value = 0;
  isFever.value = false;
  consecutiveBombs = 0;
  suspiciousClicks = 0;
  clickTimestamps = [];
  reactionTimes = [];
  lastClickEvent = null;
  gameState.value = 'playing';
  holes.value = Array.from({ length: BOARD_SIZE }, createEmptyHole);

  gameStartTime = Date.now();

  gameTimer = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    timeLeft.value = Math.max(0, GAME_DURATION - elapsedSeconds);
    if (timeLeft.value <= 0) {
      endGame();
    }
  }, 100); // check more frequently to be precise

  scheduleSpawn();
};

const generateSignature = async (name, score) => {
  const salt =
    import.meta.env.VITE_GAME_SECRET_SALT || 'default_arcade_salt_123!';
  const message = `${name}:${score}:${salt}`;
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
};

const endGame = async () => {
  clearInterval(gameTimer);
  clearTimeout(spawnTimer);
  clearTimeout(feverTimer);
  isFever.value = false;

  // Clear any active entities
  holes.value.forEach((hole) => {
    if (hole && hole.timeoutId) clearTimeout(hole.timeoutId);
    if (hole) {
      hole.active = false;
      hole.isHit = false;
    }
  });

  // Hard Cap check (Anti-cheat for score forgery)
  // Max possible score is around ~20k-25k realistically.
  if (score.value > 30000 || score.value < -5000 || suspiciousClicks >= 5) {
    console.warn('Abnormal gameplay detected (Macro/Bot). Skipping DB upload.');
    // 화면을 리더보드/메뉴로 먼저 전환
    gameState.value = 'menu';
    setTimeout(() => {
      alert('잡았다요놈');
    }, 50);
    return;
  }

  // Track game end with score
  trackEvent('game_end', {
    final_score: score.value,
    max_combo: maxCombo.value,
    bombs_hit: bombsHit.value,
    name: currentName.value,
  });

  // Generate Cryptographic Hash Signature
  const signature = await generateSignature(currentName.value, score.value);

  // Auto-submit score to DB if it's a new best for this user
  if (score.value > dbBestScore.value) {
    try {
      await supabase.rpc('update_best_score', {
        p_name: currentName.value,
        p_pin: currentPin.value,
        p_score: score.value,
        p_signature: signature,
      });
      dbBestScore.value = score.value;
    } catch (err) {
      console.error('Failed to update DB score', err);
    }
  }

  // Always append to history
  if (currentName.value) {
    try {
      await supabase.rpc('insert_score_history', {
        p_name: currentName.value,
        p_pin: currentPin.value,
        p_score: score.value,
        p_signature: signature,
      });
    } catch (err) {
      console.error('Failed to save history', err);
    }
  }

  // Go straight to leaderboard
  gameState.value = 'leaderboard';
};

const getSpawnDelay = () => {
  if (isFever.value) return 375; // 0.8x of previous speed (was 300)

  const minDelay = 500;
  const maxDelay = 1200;
  const progress = (GAME_DURATION - timeLeft.value) / GAME_DURATION;
  return maxDelay - (maxDelay - minDelay) * progress;
};

const getRandomType = () => {
  if (isFever.value) {
    consecutiveBombs = 0;
    return 'golden'; // Only golden in fever
  }

  const rand = Math.random();
  if (rand < 0.15) {
    consecutiveBombs = 0;
    return 'golden';
  }
  if (rand < 0.35) {
    if (consecutiveBombs >= 2) {
      consecutiveBombs = 0;
      return 'normal'; // 2번 연속 폭탄이 나왔다면 이번에는 강제로 일반 두더지 스폰
    }
    consecutiveBombs++;
    return 'bomb';
  }
  consecutiveBombs = 0;
  return 'normal';
};

const getActiveDuration = (type) => {
  if (isFever.value) return 750; // 0.8x of previous speed (was 600)

  const baseDuration = getSpawnDelay() * 1.5;
  if (type === 'golden') return baseDuration * 0.8;
  if (type === 'bomb') return baseDuration * 1.2;
  return baseDuration;
};

const scheduleSpawn = (customDelay = null) => {
  if (gameState.value !== 'playing') return;

  const delay = customDelay !== null ? customDelay : getSpawnDelay();

  spawnTimer = setTimeout(() => {
    const type = spawnEntity();
    // 폭탄이 나왔을 경우, 플레이어가 지루하게 기다리지 않도록 다음 스폰 대기 시간을 40%로 단축시킵니다.
    const nextDelay = type === 'bomb' ? getSpawnDelay() * 0.4 : null;
    scheduleSpawn(nextDelay);
  }, delay);
};

const triggerFever = () => {
  isFever.value = true;
  clearTimeout(feverTimer);
  feverTimer = setTimeout(() => {
    isFever.value = false;
  }, 5000); // 5 seconds of fever
};

const breakCombo = () => {
  combo.value = 0;
};

const spawnEntity = () => {
  if (gameState.value !== 'playing') return null;

  const emptyIndices = [];
  holes.value.forEach((hole, index) => {
    if (!hole || (!hole.active && !hole.isHit)) emptyIndices.push(index);
  });

  if (emptyIndices.length === 0) return null;

  const randomIndex =
    emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  const type = getRandomType();
  const entityId = Date.now();

  const hole = holes.value[randomIndex];
  if (hole && hole.timeoutId) clearTimeout(hole.timeoutId);

  hole.id = entityId;
  hole.type = type;
  hole.isHit = false;
  hole.floatingScore = null;
  hole.floatingColor = null;
  hole.active = true;
  hole.spawnTime = Date.now();

  hole.timeoutId = setTimeout(() => {
    if (hole.id === entityId) {
      // If it naturally hides and wasn't hit, and wasn't a bomb, combo breaks
      if (!hole.isHit && hole.type !== 'bomb') {
        breakCombo();
      }
      hole.active = false;
      hole.isHit = false;
    }
  }, getActiveDuration(type));

  return type;
};

const handleHit = (index, entity) => {
  // 터치 입력인 경우 타격 판정을 무시합니다.
  if (lastInputIsTouch) return;

  if (gameState.value !== 'playing' || !entity.active || entity.isHit) return;

  // 1. 함수 직접 호출(Vue Devtools 등) 방어
  // 진짜 클릭 이벤트가 발생한 지 100ms 이내가 아니라면, 스크립트로 handleHit만 강제 호출한 것임
  if (!lastClickEvent || Date.now() - lastClickEvent.time > 100) {
    suspiciousClicks += 5;
    console.warn('[매크로 적발] 이벤트 없는 비정상 함수 직접 호출 감지!');
    enforceAntiCheat();
    return;
  }

  // 매크로 방지: 반응 속도(Reaction Time) 검사
  // 사람이 시각적 정보를 인지하고 물리적으로 마우스를 누르기까지 보통 200ms 이상 소요됩니다.
  const reactionTime = Date.now() - entity.spawnTime;
  if (reactionTime < 160) {
    suspiciousClicks++;
    console.warn(
      `[매크로 의심] 비인간적인 반응 속도 감지 (${reactionTime}ms).`,
    );
    enforceAntiCheat();
    return; // 타격 판정을 무시합니다.
  }

  // 정상 반응속도 기록 (표준편차 패턴 분석용, 최근 20개만 유지)
  reactionTimes.push(reactionTime);
  if (reactionTimes.length > 20) reactionTimes.shift();

  let baseScore = 0;
  let color = '#fff';

  if (entity.type === 'normal') {
    baseScore = 100;
    color = '#fff';
    combo.value++;
  } else if (entity.type === 'golden') {
    baseScore = 300;
    color = '#ffcc80';
    combo.value++;
  } else if (entity.type === 'bomb') {
    baseScore = -200;
    color = '#ff3366';
    bombsHit.value++;
    breakCombo();
  }

  if (combo.value > maxCombo.value) {
    maxCombo.value = combo.value;
  }

  // Check Fever trigger
  if (combo.value === 20 && !isFever.value) {
    triggerFever();
  }

  // Apply multiplier (bombs don't get multiplied to be fair, or maybe they do? Let's multiply penalties too)
  const scoreChange = Math.floor(baseScore * multiplier.value);
  score.value += scoreChange;

  enforceAntiCheat(); // 점수가 너무 높아졌는지 실시간 검사

  if (holes.value[index] && holes.value[index].id === entity.id) {
    holes.value[index].isHit = true;
    holes.value[index].floatingScore =
      scoreChange > 0 ? `+${scoreChange}` : `${scoreChange}`;
    holes.value[index].floatingColor = color;
    clearTimeout(holes.value[index].timeoutId);

    // 두더지를 성공적으로 잡은 경우 즉시 다음 두더지 스폰
    clearTimeout(spawnTimer);
    const newType = spawnEntity();
    const nextDelay = newType === 'bomb' ? getSpawnDelay() * 0.4 : null;
    scheduleSpawn(nextDelay);

    setTimeout(() => {
      if (holes.value[index] && holes.value[index].id === entity.id) {
        holes.value[index].active = false;
        holes.value[index].isHit = false;
      }
    }, 400);
  }
};

onUnmounted(() => {
  window.removeEventListener('pointerdown', trackInputTypePointer, {
    capture: true,
  });
  window.removeEventListener('touchstart', trackInputTypeTouch, {
    capture: true,
  });
  window.removeEventListener('click', catchUntrustedEvent, { capture: true });
  window.removeEventListener('mousedown', catchUntrustedEvent, {
    capture: true,
  });
  clearInterval(countdownTimer);
  clearInterval(gameTimer);
  clearTimeout(spawnTimer);
  clearTimeout(feverTimer);
});
</script>

<template>
  <div class="app-wrapper" :class="{ 'fever-active': isFever }">
    <div class="game-container">
      <!-- 칠판 패치 노트 (게임 컨테이너 기준 우측 상단 배치) -->
      <div v-if="gameState === 'menu'" class="patch-board">
        <div class="patch-title">📌 패치 노트</div>
        <ul class="patch-list">
          <li v-for="(text, i) in patchNotes" :key="i">
            <span class="patch-version">{{ i + 1 }}.</span>
            {{ text }}
          </li>
        </ul>
      </div>

      <!-- Top Info Bar -->
      <div class="top-info" v-if="currentName">
        <div class="personal-best">TOP: {{ dbBestScore }}</div>
        <button
          v-if="gameState === 'playing'"
          @click="quitGame"
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
            :class="{ warning: timeLeft <= 5 && gameState === 'playing' }"
          >
            TIME: {{ timeLeft }}s
          </div>
        </div>
      </header>

      <!-- Combo Overlay (Absolute positioned to top right) -->
      <div
        v-if="combo > 1 && gameState === 'playing'"
        class="combo-overlay"
        :key="combo"
      >
        <div
          class="huge-combo"
          :class="{ 'combo-high': combo >= 10, 'combo-fever': combo >= 20 }"
        >
          {{ combo }} COMBO!
          <span v-if="multiplier > 1" class="multiplier"
            >x{{ multiplier }}</span
          >
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

        <!-- 매크로 전용 함정: 사람은 볼 수 없고 DOM 스캐너만 클릭합니다. -->
        <div
          style="
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: auto;
            overflow: hidden;
          "
          aria-hidden="true"
        >
          <Hole :entity="honeypotEntity" @hit="catchMacro" />
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
              <button @click="startAuth('login')" class="action-btn neon-btn">
                로그인
              </button>
              <button
                @click="startAuth('register')"
                class="action-btn neon-btn"
              >
                회원가입
              </button>
            </template>
            <button v-else @click="prepareGame" class="action-btn neon-btn">
              게임 시작
            </button>
            <button
              @click="gameState = 'leaderboard'"
              class="action-btn neon-btn"
            >
              랭킹
            </button>
            <button
              v-if="currentName"
              @click="gameState = 'my_record'"
              class="action-btn neon-btn"
            >
              내 기록
            </button>
            <button
              v-if="currentName"
              @click="
                currentName = '';
                identifyUser(null);
              "
              class="action-btn neon-btn"
            >
              로그아웃
            </button>
          </div>
        </div>

        <div v-if="gameState === 'auth'" class="overlay">
          <AuthModal
            :mode="authMode"
            @close="gameState = 'menu'"
            @auth-success="handleAuthSuccess"
          />
        </div>

        <div v-if="gameState === 'countdown'" class="overlay">
          <div class="countdown-text">{{ countdownValue }}</div>
        </div>

        <div v-if="gameState === 'leaderboard'" class="overlay">
          <Leaderboard
            :current-score="score"
            :current-name="currentName"
            @close="gameState = 'menu'"
          />
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
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s;
  box-sizing: border-box;
}

/* Fever Background Animation applied to wrapper if we wanted, but we can't change body from scoped easily. 
   We will rely on CSS variables or global styles if needed, or just animate the app-wrapper. */
.fever-active {
  animation: feverPulse 0.5s infinite alternate;
}

@keyframes feverPulse {
  0% {
    background-color: rgba(255, 0, 100, 0.1);
  }
  100% {
    background-color: rgba(0, 200, 255, 0.1);
  }
}

.game-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  margin: auto;
  position: relative;
  padding: 20px 0;
  box-sizing: border-box;
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
