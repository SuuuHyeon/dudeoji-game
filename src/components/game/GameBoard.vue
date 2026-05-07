<script setup>
import Hole from './Hole.vue'

const props = defineProps({
  holes: { type: Array, required: true },
  honeypotEntity: { type: Object, required: true },
})

const emit = defineEmits(['hit', 'catch-macro'])

// holeElements는 부모가 안티치트 좌표 분석을 위해 접근해야 하므로 expose
const holeElements = defineModel('holeElements', { type: Array, default: () => [] })
</script>

<template>
  <div class="board-wrapper">
    <div class="grid">
      <Hole
        v-for="(entity, index) in holes"
        :key="index"
        :ref="
          (el) => {
            if (el) holeElements[index] = el
          }
        "
        :entity="entity"
        @hit="emit('hit', index, entity)"
      />
    </div>

    <!-- 매크로 전용 함정: 사람은 볼 수 없고 DOM 스캐너만 클릭합니다. -->
    <div
      style="
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: auto;
        overflow: hidden;
      "
      aria-hidden="true"
    >
      <Hole :entity="honeypotEntity" @hit="emit('catch-macro')" />
    </div>

    <!-- Overlays slot -->
    <slot />
  </div>
</template>

<style scoped>
.board-wrapper {
  position: relative;
  background-color: var(--grid-bg);
  padding: 15px;
  border-radius: 12px;
  border: 4px solid var(--hole-color);
  box-shadow: 0 8px 0 rgba(0, 0, 0, 0.5);
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 15px;
  width: 100%;
  aspect-ratio: 1 / 1;
}
</style>
