/**
 * Supabase API 서비스 레이어
 * 모든 서버 통신을 중앙에서 관리합니다.
 */
import { supabase } from '../lib/supabase.js'

// ── 인증 ──

/** 로그인: 닉네임 + PIN 검증 */
export async function verifyUserPin(name, pin) {
  const { data, error } = await supabase.rpc('verify_user_pin', {
    p_name: name,
    p_pin: pin,
  })
  if (error) throw error
  return data
}

/** 회원가입: 닉네임 중복 확인 + 생성 */
export async function registerUser(name, pin) {
  const { data, error } = await supabase.rpc('register_user', {
    p_name: name,
    p_pin: pin,
  })
  if (error) throw error
  return data
}

// ── 게임 세션 ──

/** 게임 시작 시 1회용 세션 ID 발급 (시간 검증용) */
export async function startGameSession(name) {
  const { data, error } = await supabase.rpc('start_game_session', {
    p_name: name,
  })
  if (error) throw error
  return data
}

/** 점수 제출: 서버에서 시간 검증 + 최고 점수 갱신 + 히스토리 저장 */
export async function submitSecureScore(sessionId, name, pin, score) {
  const { data, error } = await supabase.rpc('submit_secure_score', {
    p_session_id: sessionId,
    p_name: name,
    p_pin: pin,
    p_score: score,
  })
  if (error) throw error
  return data
}

// ── 랭킹 & 기록 ──

/** 리더보드 상위 N명 조회 */
export async function fetchLeaderboard(limit = 100) {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('name, score')
    .order('score', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/** 특정 유저의 점수 기록 조회 (최신순) */
export async function fetchScoreHistory(name) {
  const { data, error } = await supabase
    .from('score_history')
    .select('created_at, score')
    .eq('name', name)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// ── 패치노트 ──

/** 최근 패치노트 N개 조회 */
export async function fetchPatchNotes(limit = 5) {
  const { data, error } = await supabase
    .from('patch_notes')
    .select('content')
    .order('id', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ? data.map((item) => item.content) : []
}
