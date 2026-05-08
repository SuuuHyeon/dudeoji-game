<script setup>
import { watch, onMounted, ref } from 'vue';
import { useAuth } from './composables/useAuth.js';
import { useAntiCheat } from './composables/useAntiCheat.js';
import { useGame } from './composables/useGame.js';
import { useAnalytics } from './composables/useAnalytics.js';
import { fetchPatchNotes } from './services/api.js';

// Components
import GameHeader from './components/game/GameHeader.vue';
import GameBoard from './components/game/GameBoard.vue';
import CountdownOverlay from './components/game/CountdownOverlay.vue';
import MainMenu from './components/menu/MainMenu.vue';
import PatchBoard from './components/menu/PatchBoard.vue';
import AuthModal from './components/auth/AuthModal.vue';
import Leaderboard from './components/leaderboard/Leaderboard.vue';
import MyRecord from './components/leaderboard/MyRecord.vue';
import AntiCheatModal from './components/modals/AntiCheatModal.vue';

// ── Composables ──
const auth = useAuth();
const { trackViewLeaderboard, trackViewMyRecord } = useAnalytics();

// antiCheat는 gameState/score를 참조해야 하므로 프록시 ref를 통해 연결합니다.
const gameStateRef = ref('menu');
const scoreRef = ref(0);

const antiCheat = useAntiCheat(gameStateRef, scoreRef);
const game = useGame(auth, antiCheat);

// useGame이 소유하는 gameState/score를 antiCheat 프록시와 동기화
watch(game.gameState, (val) => {
  gameStateRef.value = val;
});
watch(game.score, (val) => {
  scoreRef.value = val;
});

// holeElements를 game에 연결
const holeElements = game.holeElements;

// ── 패치노트 ──
const patchNotes = ref([]);
onMounted(async () => {
  try {
    patchNotes.value = await fetchPatchNotes();
  } catch (err) {
    // silent fail
  }
});

// ── 화면 전환 이벤트 추적 ──
watch(game.gameState, (newVal) => {
  if (newVal === 'leaderboard') trackViewLeaderboard();
  if (newVal === 'my_record') trackViewMyRecord();
});

// ── 인증 모드 ──
const authMode = ref('login');

const onShowAuth = (mode) => {
  authMode.value = mode;
  auth.onAuthStart(mode);
  game.gameState.value = 'auth';
};

const onAuthSuccess = (userData) => {
  auth.handleAuthSuccess(userData, authMode.value);
  game.gameState.value = 'menu';
};

const onLogout = () => {
  auth.logout();
};

// ── 게임 시작 전 봇 검증 ──
const onPrepareGame = () => {
  if (antiCheat.detectWebDriver()) {
    alert(
      '비정상적인 접근(자동화 프로그램)이 감지되었습니다.\n정상적인 브라우저 환경에서 플레이해주세요.',
    );
    return;
  }
  // 통과 시 정상적으로 게임 준비
  game.prepareGame();
};

// ── 게임 보드 이벤트 ──
const onHit = (index, entity) => {
  game.handleHit(index, entity);
};

const onCatchMacro = () => {
  antiCheat.catchMacro(game.abortGameWithLog);
};
</script>

<template>
  <div class="app-wrapper" :class="{ 'fever-active': game.isFever.value }">
    <div class="game-container">
      <!-- 패치노트 칠판 (메뉴 화면에서만 표시) -->
      <PatchBoard v-if="game.gameState.value === 'menu'" :notes="patchNotes" />

      <!-- 게임 상단: 점수, 타이머, 콤보, 포기 버튼 -->
      <GameHeader
        :score="game.score.value"
        :time-left="game.timeLeft.value"
        :combo="game.combo.value"
        :multiplier="game.multiplier.value"
        :is-fever="game.isFever.value"
        :db-best-score="auth.dbBestScore.value"
        :current-name="auth.currentName.value"
        :is-playing="game.gameState.value === 'playing'"
        @quit="game.quitGame"
      />

      <!-- 게임 보드 -->
      <GameBoard
        :holes="game.holes.value"
        :honeypot-entity="antiCheat.honeypotEntity.value"
        v-model:hole-elements="holeElements"
        @hit="onHit"
        @catch-macro="onCatchMacro"
      >
        <!-- 오버레이들은 board-wrapper 내부에 위치 -->

        <!-- 메인 메뉴 -->
        <MainMenu
          v-if="game.gameState.value === 'menu'"
          :current-name="auth.currentName.value"
          @start-game="onPrepareGame"
          @show-auth="onShowAuth"
          @show-leaderboard="game.gameState.value = 'leaderboard'"
          @show-my-record="game.gameState.value = 'my_record'"
          @logout="onLogout"
        />

        <!-- 인증 모달 -->
        <div v-if="game.gameState.value === 'auth'" class="overlay">
          <AuthModal
            :mode="authMode"
            @close="game.gameState.value = 'menu'"
            @auth-success="onAuthSuccess"
          />
        </div>

        <!-- 카운트다운 -->
        <CountdownOverlay
          v-if="game.gameState.value === 'countdown'"
          :value="game.countdownValue.value"
        />

        <!-- 리더보드 -->
        <div v-if="game.gameState.value === 'leaderboard'" class="overlay">
          <Leaderboard
            :current-score="game.score.value"
            :current-name="auth.currentName.value"
            @close="game.gameState.value = 'menu'"
          />
        </div>

        <!-- 내 기록 -->
        <div v-if="game.gameState.value === 'my_record'" class="overlay">
          <MyRecord
            :current-name="auth.currentName.value"
            @close="game.gameState.value = 'menu'"
          />
        </div>

        <!-- 안티치트 경고 모달 -->
        <div
          v-if="antiCheat.showAntiCheatModal.value"
          class="overlay"
          style="z-index: 2000"
        >
          <AntiCheatModal @close="antiCheat.showAntiCheatModal.value = false" />
        </div>
      </GameBoard>
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

.fever-active .game-container :deep(.board-wrapper) {
  border-color: #ff00de;
  box-shadow: 0 0 30px rgba(255, 0, 222, 0.5);
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
</style>
