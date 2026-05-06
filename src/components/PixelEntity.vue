<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  isHit: {
    type: Boolean,
    default: false
  }
})

const entityClass = computed(() => {
  return {
    'entity-wrapper': true,
    'is-active': props.active,
    'is-hit': props.isHit,
    [`entity-${props.type}`]: true
  }
})
</script>

<template>
  <div :class="entityClass">
    <!-- Normal Mole -->
    <svg v-if="type === 'normal'" viewBox="0 0 16 16" width="100%" height="100%" shape-rendering="crispEdges">
      <rect x="3" y="6" width="10" height="10" fill="#795548"/>
      <rect x="4" y="5" width="8" height="1" fill="#795548"/>
      <g v-if="!isHit">
        <rect x="5" y="8" width="1" height="1" fill="#000"/>
        <rect x="10" y="8" width="1" height="1" fill="#000"/>
      </g>
      <g v-else>
        <!-- Left X Eye -->
        <rect x="4" y="7" width="1" height="1" fill="#000"/>
        <rect x="6" y="9" width="1" height="1" fill="#000"/>
        <rect x="5" y="8" width="1" height="1" fill="#000"/>
        <rect x="6" y="7" width="1" height="1" fill="#000"/>
        <rect x="4" y="9" width="1" height="1" fill="#000"/>
        <!-- Right X Eye -->
        <rect x="9" y="7" width="1" height="1" fill="#000"/>
        <rect x="11" y="9" width="1" height="1" fill="#000"/>
        <rect x="10" y="8" width="1" height="1" fill="#000"/>
        <rect x="11" y="7" width="1" height="1" fill="#000"/>
        <rect x="9" y="9" width="1" height="1" fill="#000"/>
      </g>
      <rect x="6" y="9" width="4" height="2" fill="#d7ccc8"/>
      <rect x="7" y="9" width="2" height="1" fill="#f48fb1"/>
    </svg>

    <!-- Golden Mole -->
    <svg v-else-if="type === 'golden'" viewBox="0 0 16 16" width="100%" height="100%" shape-rendering="crispEdges">
      <rect x="3" y="6" width="10" height="10" fill="#ffb300"/>
      <rect x="4" y="5" width="8" height="1" fill="#ffb300"/>
      <g v-if="!isHit">
        <rect x="5" y="8" width="1" height="1" fill="#000"/>
        <rect x="10" y="8" width="1" height="1" fill="#000"/>
      </g>
      <g v-else>
        <rect x="4" y="7" width="1" height="1" fill="#000"/>
        <rect x="6" y="9" width="1" height="1" fill="#000"/>
        <rect x="5" y="8" width="1" height="1" fill="#000"/>
        <rect x="6" y="7" width="1" height="1" fill="#000"/>
        <rect x="4" y="9" width="1" height="1" fill="#000"/>
        <rect x="9" y="7" width="1" height="1" fill="#000"/>
        <rect x="11" y="9" width="1" height="1" fill="#000"/>
        <rect x="10" y="8" width="1" height="1" fill="#000"/>
        <rect x="11" y="7" width="1" height="1" fill="#000"/>
        <rect x="9" y="9" width="1" height="1" fill="#000"/>
      </g>
      <rect x="6" y="9" width="4" height="2" fill="#fff9c4"/>
      <rect x="7" y="9" width="2" height="1" fill="#ffcc80"/>
      <rect x="2" y="3" width="1" height="1" fill="#fff"/>
      <rect x="13" y="4" width="1" height="1" fill="#fff"/>
      <rect x="11" y="1" width="1" height="1" fill="#fff"/>
    </svg>

    <!-- Bomb -->
    <svg v-else-if="type === 'bomb'" viewBox="0 0 16 16" width="100%" height="100%" shape-rendering="crispEdges">
      <rect x="4" y="6" width="8" height="8" fill="#212121"/>
      <rect x="3" y="7" width="1" height="6" fill="#212121"/>
      <rect x="12" y="7" width="1" height="6" fill="#212121"/>
      <rect x="5" y="14" width="6" height="1" fill="#212121"/>
      <rect x="5" y="5" width="6" height="1" fill="#212121"/>
      <rect x="5" y="7" width="2" height="2" fill="#757575"/>
      <rect x="6" y="8" width="1" height="1" fill="#eeeeee"/>
      <rect x="7" y="4" width="2" height="1" fill="#9e9e9e"/>
      <rect x="8" y="3" width="1" height="1" fill="#795548"/>
      <rect x="9" y="2" width="1" height="1" fill="#795548"/>
      <rect x="10" y="1" width="2" height="2" fill="#ff9800"/>
      <rect x="11" y="1" width="1" height="1" fill="#ffeb3b"/>
    </svg>
  </div>
</template>

<style scoped>
.entity-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  bottom: 0;
  left: 0;
  transform: translateY(100%);
  transition: transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  pointer-events: none; /* Make clicks pass through to the hole if not fully up, or maybe handled by parent */
  will-change: transform;
}

.entity-wrapper.is-active {
  transform: translateY(0);
  pointer-events: auto; /* Clickable when up */
}

/* Add a slight hover effect to entities */
.entity-wrapper:hover {
  filter: brightness(1.1);
  cursor: pointer;
}

.entity-bomb:hover {
  filter: brightness(1.2) hue-rotate(10deg);
}

.entity-bomb.is-hit {
  filter: invert(1) hue-rotate(180deg);
}
</style>
