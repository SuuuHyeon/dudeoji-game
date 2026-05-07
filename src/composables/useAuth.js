/**
 * 인증 상태 관리 Composable
 */
import { ref, computed } from 'vue'
import { useAnalytics } from './useAnalytics.js'

export function useAuth() {
  const { identifyUser, trackAuth, trackAuthSuccess } = useAnalytics()

  const currentName = ref('')
  const currentPin = ref('')
  const dbBestScore = ref(0)

  const isLoggedIn = computed(() => currentName.value !== '')

  /** 인증 시작 (버튼 클릭 시 GA 추적) */
  const onAuthStart = (mode) => {
    trackAuth(mode)
  }

  /** 인증 성공 콜백 */
  const handleAuthSuccess = (userData, mode) => {
    currentName.value = userData.name
    currentPin.value = userData.pin
    dbBestScore.value = userData.score

    identifyUser(userData.name)
    trackAuthSuccess(mode)
  }

  /** 로그아웃 */
  const logout = () => {
    currentName.value = ''
    currentPin.value = ''
    dbBestScore.value = 0
    identifyUser(null)
  }

  /** 서버에서 최고 점수 갱신 확인 후 로컬 상태 업데이트 */
  const updateBestScore = (newScore) => {
    if (newScore > dbBestScore.value) {
      dbBestScore.value = newScore
    }
  }

  return {
    currentName,
    currentPin,
    dbBestScore,
    isLoggedIn,
    onAuthStart,
    handleAuthSuccess,
    logout,
    updateBestScore,
  }
}
