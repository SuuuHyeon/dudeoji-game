/**
 * Google Analytics (GA4) 이벤트 추적 Composable
 */

const GA_MEASUREMENT_ID = 'G-WCZJ0R9Y0P'

export function useAnalytics() {
  /** 범용 GA4 이벤트 전송 */
  const trackEvent = (eventName, params = {}) => {
    if (window.gtag) {
      window.gtag('event', eventName, params)
    }
  }

  /** 유저 식별 (로그인 후 호출) */
  const identifyUser = (name) => {
    if (window.gtag) {
      // 구글 애널리틱스에 유저 ID 설정
      window.gtag('config', GA_MEASUREMENT_ID, {
        user_id: name,
      })
      // 유저 속성으로 닉네임 저장
      window.gtag('set', 'user_properties', {
        nickname: name,
      })
    }
  }

  /** 인증 관련 이벤트 */
  const trackAuth = (mode) => {
    trackEvent(mode === 'register' ? 'click_register' : 'click_login')
  }

  const trackAuthSuccess = (mode) => {
    trackEvent(
      mode === 'register' ? 'sign_up_complete' : 'login_success',
      { method: 'pin' },
    )
  }

  /** 게임 이벤트 */
  const trackGameStart = () => {
    trackEvent('game_start', { method: 'button' })
  }

  const trackGameEnd = ({ score, maxCombo, bombsHit, name }) => {
    trackEvent('game_end', {
      final_score: score,
      max_combo: maxCombo,
      bombs_hit: bombsHit,
      name,
    })
  }

  const trackGameQuit = () => {
    trackEvent('game_quit')
  }

  /** 화면 전환 이벤트 */
  const trackViewLeaderboard = () => {
    trackEvent('view_leaderboard')
  }

  const trackViewMyRecord = () => {
    trackEvent('view_my_record')
  }

  return {
    trackEvent,
    identifyUser,
    trackAuth,
    trackAuthSuccess,
    trackGameStart,
    trackGameEnd,
    trackGameQuit,
    trackViewLeaderboard,
    trackViewMyRecord,
  }
}
