<script setup>
import { ref, onMounted } from 'vue'
import { supabase, isMock } from '../lib/supabase.js'

const props = defineProps({
  currentName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

const history = ref([])
const loading = ref(true)

const fetchHistory = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('score_history')
      .select('created_at, score')
      .eq('name', props.currentName)
      .order('created_at', { ascending: false })
      
    if (error) throw error
    history.value = data || []
  } catch (err) {
    console.error('Error fetching history:', err)
  } finally {
    loading.value = false
  }
}

const formatDate = (isoString) => {
  const date = new Date(isoString)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

onMounted(() => {
  fetchHistory()
})
</script>

<template>
  <div class="myrecord-container">
    <h2 class="neon-title">MY RECORD</h2>
    <div class="subtitle">{{ currentName }}'S HISTORY</div>
    
    <div v-if="loading" class="loading">LOADING SCORES...</div>
    
    <div class="scroll-container" v-else>
      <table class="history-table">
        <thead>
          <tr>
            <th>DATE</th>
            <th>SCORE</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, index) in history" :key="index">
            <td class="date">{{ formatDate(entry.created_at) }}</td>
            <td class="score">{{ entry.score }}</td>
          </tr>
          <tr v-if="history.length === 0">
            <td colspan="2" class="empty">NO GAMES PLAYED YET.</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <button class="back-btn" @click="emit('close')">MAIN MENU</button>
  </div>
</template>

<style scoped>
.myrecord-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 500px;
  background-color: rgba(10, 10, 15, 0.95);
  padding: 30px;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 12px;
  border: 2px solid #ff00de;
  box-shadow: 0 0 20px rgba(255, 0, 222, 0.3);
  max-height: 95%; /* Limit height to 95% of parent overlay */
}

.neon-title {
  color: #ff00de;
  text-shadow: 0 0 10px #ff00de, 0 0 20px #ff00de;
  font-size: 2.5rem;
  margin-bottom: 5px;
  text-align: center;
}

.subtitle {
  color: #fff;
  font-size: 1.2rem;
  margin-bottom: 20px;
  letter-spacing: 2px;
}

.scroll-container {
  width: 100%;
  overflow-y: auto;
  flex: 1; /* Automatically shrink to fit remaining space */
  margin-bottom: 20px;
  padding-right: 10px;
}

/* Scrollbar styles */
.scroll-container::-webkit-scrollbar {
  width: 8px;
}
.scroll-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}
.scroll-container::-webkit-scrollbar-thumb {
  background: #ff00de;
  border-radius: 4px;
}

.loading {
  color: #fff;
  font-size: 1.5rem;
  margin: 40px 0;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.history-table {
  width: 100%;
  border-collapse: collapse;
}

th {
  color: #ff00de;
  font-size: 1.2rem;
  text-align: left;
  padding-bottom: 15px;
  border-bottom: 2px solid #333;
  position: sticky;
  top: 0;
  background-color: rgba(10, 10, 15, 0.95);
  z-index: 1;
}

th:last-child {
  text-align: right;
}

td {
  color: #ddd;
  font-size: 1.2rem;
  padding: 10px 0;
  border-bottom: 1px solid #222;
}

td.date {
  color: #888;
}

td.score {
  text-align: right;
  color: #00ffcc;
  font-weight: bold;
  font-size: 1.5rem;
}

.empty {
  text-align: center;
  padding: 30px 0;
  color: #888;
  font-size: 1.2rem;
}

.back-btn {
  font-size: 1.5rem;
  padding: 10px 30px;
  background-color: transparent;
  border: 2px solid #ff00de;
  color: #ff00de;
  margin-top: 10px;
}

.back-btn:hover {
  background-color: #ff00de;
  color: #fff;
}
</style>
