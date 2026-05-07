<script setup>
import { ref } from 'vue'
import PixelEntity from './PixelEntity.vue'

const props = defineProps({
  entity: {
    type: Object, // { id: number, type: 'normal'|'golden'|'bomb', active: boolean }
    default: null
  }
})

const emit = defineEmits(['hit'])

const handleHit = (event) => {
  if (!event || !event.isTrusted) return // Block scripted clicks

  if (props.entity && props.entity.active) {
    emit('hit', props.entity)
  }
}
</script>

<template>
  <div class="hole-container" @mousedown.prevent="handleHit" @touchstart.prevent="handleHit">
    <div class="hole-shadow"></div>
    <div class="entity-mask">
      <PixelEntity 
        v-if="entity" 
        :type="entity.type" 
        :active="entity.active" 
        :is-hit="entity.isHit"
      />
    </div>
    <!-- Floating Score -->
    <div v-if="entity && entity.isHit" class="floating-score" :style="{ color: entity.floatingColor }">
      {{ entity.floatingScore }}
    </div>
    <!-- Front dirt lip to make it look like they come out of the ground -->
    <div class="hole-lip-front"></div>
  </div>
</template>

<style scoped>
.hole-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  /* background-color: var(--grid-bg); */
  border-radius: 8px;
}

.hole-shadow {
  position: absolute;
  bottom: 10%;
  left: 10%;
  width: 80%;
  height: 40%;
  background-color: var(--hole-color);
  border-radius: 50%;
  box-shadow: var(--hole-shadow);
  z-index: 1;
}

.entity-mask {
  position: absolute;
  bottom: 20%;
  left: 15%;
  width: 70%;
  height: 80%;
  overflow: hidden;
  z-index: 2;
  /* border: 1px solid red; /* for debugging */
}

.hole-lip-front {
  position: absolute;
  bottom: 10%;
  left: 10%;
  width: 80%;
  height: 20%;
  background-color: var(--grid-bg);
  border-radius: 50%;
  z-index: 3;
  clip-path: polygon(0 50%, 100% 50%, 100% 100%, 0 100%);
}

.floating-score {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translate(-50%, 0);
  font-size: 2.8rem;
  font-weight: 900;
  letter-spacing: 2px;
  z-index: 10;
  pointer-events: none;
  animation: floatUp 0.8s ease-out forwards;
  text-shadow: 
    -2px -2px 0 #000,
     2px -2px 0 #000,
    -2px  2px 0 #000,
     2px  2px 0 #000,
     0px  4px 0 rgba(0,0,0,0.5);
}

@keyframes floatUp {
  0% { transform: translate(-50%, 0); opacity: 1; }
  100% { transform: translate(-50%, -50px); opacity: 0; }
}
</style>
