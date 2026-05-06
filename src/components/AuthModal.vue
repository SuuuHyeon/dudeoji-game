<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'

const emit = defineEmits(['close', 'auth-success'])

const step = ref('name') // 'name', 'verify_pin', 'create_pin'
const name = ref('')
const pin = ref('')
const errorMsg = ref('')
const loading = ref(false)
const dbRecord = ref(null)

const validateName = () => {
  name.value = name.value.trim().toUpperCase().replace(/[^A-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g, '').slice(0, 8)
}

const validatePin = () => {
  pin.value = pin.value.replace(/[^0-9]/g, '').slice(0, 4)
}

const checkName = async () => {
  if (name.value.length < 2) {
    errorMsg.value = 'NAME MUST BE 2-8 CHARS'
    return
  }
  
  errorMsg.value = ''
  loading.value = true
  
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('name', name.value)
      .single()
      
    // single() throws an error if no rows found in real Supabase
    // Our mock returns data: null if not found
    
    if (data) {
      dbRecord.value = data
      step.value = 'verify_pin'
    } else {
      // Not found
      step.value = 'create_pin'
    }
  } catch (err) {
    if (err.code === 'PGRST116') {
      // Supabase specific error for single() finding no rows
      step.value = 'create_pin'
    } else {
      errorMsg.value = 'ERROR CONNECTING TO DB'
    }
  } finally {
    loading.value = false
  }
}

const submitPin = async () => {
  if (pin.value.length !== 4) {
    errorMsg.value = 'PIN MUST BE 4 DIGITS'
    return
  }

  errorMsg.value = ''
  loading.value = true

  try {
    if (step.value === 'verify_pin') {
      if (dbRecord.value.pin === pin.value) {
        // Success
        emit('auth-success', { name: name.value, score: dbRecord.value.score || 0 })
      } else {
        errorMsg.value = 'INCORRECT PIN!'
        pin.value = ''
      }
    } else if (step.value === 'create_pin') {
      // Create new record
      const { error } = await supabase.from('leaderboard').insert({
        name: name.value,
        pin: pin.value,
        score: 0
      })
      if (error) throw error
      
      emit('auth-success', { name: name.value, score: 0 })
    }
  } catch (err) {
    errorMsg.value = 'ERROR SAVING TO DB'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <button class="close-btn" @click="emit('close')">X</button>
    <h2 class="neon-text">PLAYER LOGIN</h2>
    
    <div v-if="step === 'name'" class="form-group">
      <p class="instruction">ENTER NICKNAME (MAX 8)</p>
      <input 
        type="text" 
        v-model="name" 
        @input="validateName"
        @keyup.enter="checkName"
        class="arcade-input"
        placeholder="PLAYER1"
        :disabled="loading"
        autofocus
      />
      <button class="action-btn neon-btn" @click="checkName" :disabled="loading">
        {{ loading ? 'WAIT...' : 'NEXT' }}
      </button>
    </div>

    <div v-if="step === 'verify_pin'" class="form-group">
      <p class="instruction">WELCOME BACK! ENTER 4-DIGIT PIN</p>
      <input 
        type="password" 
        v-model="pin" 
        @input="validatePin"
        @keyup.enter="submitPin"
        class="arcade-input pin-input"
        placeholder="****"
        :disabled="loading"
        autofocus
      />
      <button class="action-btn neon-btn" @click="submitPin" :disabled="loading">
        {{ loading ? 'WAIT...' : 'LOGIN' }}
      </button>
    </div>

    <div v-if="step === 'create_pin'" class="form-group">
      <p class="instruction">NEW PLAYER! SET A 4-DIGIT PIN</p>
      <input 
        type="password" 
        v-model="pin" 
        @input="validatePin"
        @keyup.enter="submitPin"
        class="arcade-input pin-input"
        placeholder="****"
        :disabled="loading"
        autofocus
      />
      <button class="action-btn neon-btn" @click="submitPin" :disabled="loading">
        {{ loading ? 'WAIT...' : 'REGISTER' }}
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
  gap: 15px;
}

.instruction {
  color: #aaa;
  font-size: 1.2rem;
  text-align: center;
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

.action-btn {
  width: 100%;
  margin-top: 10px;
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
  animation: shake 0.3s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>
