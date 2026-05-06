<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'

const props = defineProps({
  mode: {
    type: String,
    required: true, // 'login' or 'register'
  }
})

const emit = defineEmits(['close', 'auth-success'])

const name = ref('')
const pin = ref('')
const errorMsg = ref('')
const loading = ref(false)

const title = computed(() => props.mode === 'login' ? '로그인' : '회원가입')
const buttonText = computed(() => props.mode === 'login' ? '로그인' : '가입하기')

const validateName = () => {
  name.value = name.value.trim().toUpperCase().replace(/[^A-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g, '').slice(0, 8)
}

const validatePin = () => {
  pin.value = pin.value.replace(/[^0-9]/g, '').slice(0, 4)
}

const handleSubmit = async () => {
  if (name.value.length < 2) {
    errorMsg.value = '닉네임은 2~8글자여야 합니다.'
    return
  }
  if (pin.value.length !== 4) {
    errorMsg.value = '핀 번호는 4자리 숫자여야 합니다.'
    return
  }

  errorMsg.value = ''
  loading.value = true

  try {
    // 1. Check if name exists
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('name', name.value)
      .single()

    const nameExists = data !== null

    // Ignore PGRST116 error (no rows returned) as it just means the name is available
    if (error && error.code !== 'PGRST116') throw error

    if (props.mode === 'login') {
      if (!nameExists) {
        errorMsg.value = '존재하지 않는 닉네임입니다.'
        pin.value = ''
      } else if (data.pin !== pin.value) {
        errorMsg.value = '잘못된 핀 번호입니다.'
        pin.value = ''
      } else {
        // Success
        emit('auth-success', { name: name.value, score: data.score || 0 })
      }
    } else if (props.mode === 'register') {
      if (nameExists) {
        errorMsg.value = '이미 사용 중인 닉네임입니다.'
        pin.value = ''
      } else {
        // Insert new record
        const { error: insertError } = await supabase.from('leaderboard').insert({
          name: name.value,
          pin: pin.value,
          score: 0
        })
        if (insertError) throw insertError
        
        emit('auth-success', { name: name.value, score: 0 })
      }
    }
  } catch (err) {
    console.error(err)
    errorMsg.value = '데이터베이스 오류가 발생했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <button class="close-btn" @click="emit('close')">X</button>
    <h2 class="neon-text">{{ title }}</h2>
    
    <div class="form-group">
      <div class="input-wrapper">
        <p class="instruction">닉네임 (최대 8자)</p>
        <input 
          type="text" 
          v-model="name" 
          @input="validateName"
          @keyup.enter="handleSubmit"
          class="arcade-input"
          placeholder="PLAYER1"
          :disabled="loading"
          autofocus
        />
      </div>

      <div class="input-wrapper">
        <p class="instruction">비밀번호 (숫자 4자리)</p>
        <input 
          type="password" 
          v-model="pin" 
          @input="validatePin"
          @keyup.enter="handleSubmit"
          class="arcade-input pin-input"
          placeholder="****"
          :disabled="loading"
        />
      </div>

      <button class="action-btn neon-btn submit-btn" @click="handleSubmit" :disabled="loading">
        {{ loading ? '잠시만요...' : buttonText }}
      </button>
    </div>

    <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 400px;
  background-color: rgba(10, 10, 15, 0.95);
  padding: 40px;
  border-radius: 12px;
  border: 2px solid var(--secondary-color);
  box-shadow: 0 0 20px rgba(0, 204, 255, 0.3);
  position: relative;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  box-shadow: none;
  padding: 5px 10px;
}
.close-btn:hover {
  color: var(--primary-color);
  transform: none;
}

.neon-text {
  color: #fff;
  text-shadow: 0 0 10px var(--secondary-color), 0 0 20px var(--secondary-color);
  font-size: 2.5rem;
  margin-bottom: 30px;
}

.form-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 20px;
}

.input-wrapper {
  width: 100%;
}

.instruction {
  color: #aaa;
  font-size: 1.1rem;
  text-align: left;
  margin-bottom: 5px;
}

.arcade-input {
  background-color: #000;
  border: 2px solid #555;
  color: #00ffcc;
  font-family: var(--font-pixel);
  font-size: 2rem;
  padding: 10px;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.3s;
}
.arcade-input:focus {
  border-color: #00ffcc;
  box-shadow: 0 0 10px rgba(0, 255, 204, 0.3);
}
.pin-input {
  letter-spacing: 10px;
}

.submit-btn {
  width: 100%;
  margin-top: 10px;
}

.action-btn {
  font-size: 1.2rem;
  padding: 15px 25px;
}

.neon-btn {
  border-color: #00ffcc;
  box-shadow: 0 0 10px #00ffcc;
}
.neon-btn:hover:not(:disabled) {
  background-color: #00ffcc;
  color: #000;
}
.neon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.error-msg {
  color: #ff3366;
  margin-top: 20px;
  font-size: 1.2rem;
  text-align: center;
  text-shadow: 0 0 5px rgba(255, 51, 102, 0.5);
  animation: shake 0.3s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>
