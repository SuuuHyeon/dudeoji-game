// 게임 기본 설정
export const GAME_DURATION = 30
export const BOARD_SIZE = 16
export const COUNTDOWN_START = 3

// 점수 설정
export const SCORE_NORMAL = 100
export const SCORE_GOLDEN = 300
export const SCORE_BOMB = -200

// 피버 모드
export const FEVER_COMBO_THRESHOLD = 20
export const FEVER_DURATION = 5000

// 콤보 배율 기준
export const COMBO_MULTIPLIER_TIER1 = 10  // x1.5
export const COMBO_MULTIPLIER_TIER2 = 20  // x2.0

// 안티치트 하드캡
export const SCORE_HARD_CAP = 30000
export const SCORE_LOWER_CAP = -5000
export const SUSPICIOUS_CLICK_THRESHOLD = 5

// 안티치트 세부 설정
export const RAPID_CLICK_WINDOW_MS = 500
export const RAPID_CLICK_LIMIT = 8
export const MIN_REACTION_TIME_MS = 160
export const REACTION_TIME_STD_DEV_THRESHOLD = 25
export const REACTION_TIME_SAMPLE_SIZE = 10
export const REACTION_TIME_MAX_HISTORY = 20
export const CLICK_HISTORY_SIZE = 10
export const TELEPORT_MOVE_THRESHOLD = 5
export const TELEPORT_STRIKE_LIMIT = 2
export const COORDINATE_STD_DEV_THRESHOLD = 0.05
export const COORDINATE_MIN_UNIQUE_HOLES = 3
export const CLICK_EVENT_STALE_MS = 500

// 스폰 타이밍
export const SPAWN_MIN_DELAY = 500
export const SPAWN_MAX_DELAY = 1200
export const BOMB_NEXT_SPAWN_RATIO = 0.4
export const FEVER_SPAWN_DELAY = 375
export const FEVER_ACTIVE_DURATION = 750
export const GOLDEN_DURATION_RATIO = 0.8
export const BOMB_DURATION_RATIO = 1.2
export const ACTIVE_DURATION_BASE_RATIO = 1.5

// 두더지 타입 확률
export const GOLDEN_SPAWN_CHANCE = 0.15
export const BOMB_SPAWN_CHANCE = 0.35  // 누적 (0.15 ~ 0.35 구간)
export const MAX_CONSECUTIVE_BOMBS = 2

// 타격 후 애니메이션
export const HIT_HIDE_DELAY = 400
