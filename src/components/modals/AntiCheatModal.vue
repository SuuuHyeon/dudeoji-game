<script setup>
defineEmits(['close']);
</script>

<template>
  <div class="modal-content">
    <div class="siren">🚨</div>
    <h2 class="warning-title">잡았다 요놈!</h2>
    <p class="warning-desc">
      비정상적인 플레이(매크로, 오토클릭 등)가<br />
      감지되어 게임이 강제 종료되었습니다.
    </p>
    <p class="warning-sub">정정당당하게 실력으로 승부해 주세요!</p>
    <button @click="$emit('close')" class="action-btn neon-btn warning-btn">
      확인
    </button>
  </div>
</template>

<style scoped>
.modal-content {
  background-color: rgba(20, 10, 15, 0.95);
  border: 4px solid #ff3366;
  padding: 40px 30px;
  border-radius: 12px;
  text-align: center;
  color: #fff;
  box-shadow: 0 0 30px rgba(255, 51, 102, 0.5);
  max-width: 90%;
  width: 400px;
}

.siren {
  font-size: 3rem;
  margin-bottom: 10px;
  animation: pulse 1s infinite alternate;
}

.warning-title {
  color: #ff3366;
  font-size: 2.2rem;
  margin-bottom: 20px;
  text-shadow: 0 0 15px #ff3366;
  letter-spacing: 2px;
}

.warning-desc {
  font-size: 1.2rem;
  line-height: 1.5;
  margin-bottom: 15px;
  color: #ffcc80;
}

.warning-sub {
  font-size: 1rem;
  color: #aaa;
  margin-bottom: 30px;
}

.warning-btn {
  border-color: #ff3366;
  color: #ff3366;
  box-shadow: 0 0 10px rgba(255, 51, 102, 0.5);
  font-size: 1.2rem;
  padding: 12px 30px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
}

.warning-btn:hover {
  background-color: #ff3366;
  color: #fff;
  box-shadow: 0 0 20px #ff3366;
}

@keyframes pulse {
  from {
    transform: scale(0.9);
    opacity: 0.8;
  }
  to {
    transform: scale(1.1);
    opacity: 1;
  }
}
</style>
