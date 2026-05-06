<script setup>
import { ref, onMounted } from 'vue'
import { supabase, isMock } from '../lib/supabase.js'

const props = defineProps({
  currentScore: {
    type: Number,
    default: null
  },
  currentName: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close'])

const scores = ref([])
const loading = ref(true)

const fetchScores = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('name, score')
      .order('score', { ascending: false })
      .limit(10)
      
    if (error) throw error
    scores.value = data
  } catch (err) {
    console.error('Error fetching leaderboard:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchScores()
})
</script>

<template>
  <div class="leaderboard-container">
    <h2 class="neon-title">HALL OF FAME</h2>
    <div v-if="isMock" class="mock-warning">LOCAL RANKING MODE</div>
    
    <div v-if="loading" class="loading">LOADING SCORES...</div>
    
    <table v-else class="score-table">
      <thead>
        <tr>
          <th>RANK</th>
          <th>NAME</th>
          <th>SCORE</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="(entry, index) in scores" 
          :key="index"
          :class="{ 'current-player': entry.name === currentName && entry.score === currentScore }"
        >
          <td class="rank">
            <span v-if="index === 0">👑 1ST</span>
            <span v-else-if="index === 1">🥈 2ND</span>
            <span v-else-if="index === 2">🥉 3RD</span>
            <span v-else>{{ index + 1 }}TH</span>
          </td>
          <td class="name">{{ entry.name }}</td>
          <td class="score">{{ entry.score }}</td>
        </tr>
        <tr v-if="scores.length === 0">
          <td colspan="3" class="empty">NO SCORES YET. BE THE FIRST!</td>
        </tr>
      </tbody>
    </table>
    
    <button class="back-btn" @click="emit('close')">MAIN MENU</button>
  </div>
</template>

<style scoped>
.leaderboard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 500px;
  background-color: rgba(10, 10, 15, 0.95);
  padding: 30px;
  border-radius: 12px;
  border: 2px solid var(--secondary-color);
  box-shadow: 0 0 20px rgba(0, 204, 255, 0.3);
}

.neon-title {
  color: #00ffcc;
  text-shadow: 0 0 10px #00ffcc, 0 0 20px #00ffcc;
  font-size: 2.5rem;
  margin-bottom: 5px;
  text-align: center;
}

.mock-warning {
  color: #ffb300;
  font-size: 1rem;
  margin-bottom: 20px;
  animation: pulse-mock 2s infinite;
}

@keyframes pulse-mock {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
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

.score-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
}

th {
  color: var(--primary-color);
  font-size: 1.2rem;
  text-align: left;
  padding-bottom: 15px;
  border-bottom: 2px solid #333;
}

th:last-child {
  text-align: right;
}

td {
  color: #ddd;
  font-size: 1.5rem;
  padding: 10px 0;
  border-bottom: 1px solid #222;
}

td.rank {
  color: #888;
  font-size: 1.2rem;
  width: 25%;
}

td.name {
  letter-spacing: 2px;
}

td.score {
  text-align: right;
  color: var(--secondary-color);
  font-weight: bold;
}

tr.current-player td {
  color: #fff;
  font-weight: bold;
  animation: highlight 1.5s infinite alternate;
}

tr.current-player td.score {
  color: #00ffcc;
}

@keyframes highlight {
  from { text-shadow: 0 0 5px rgba(255, 255, 255, 0.5); }
  to { text-shadow: 0 0 15px rgba(255, 255, 255, 1); }
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
  border: 2px solid var(--primary-color);
  color: var(--primary-color);
}

.back-btn:hover {
  background-color: var(--primary-color);
  color: #fff;
}
</style>
