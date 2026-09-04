<template>
  <div v-if="spots.length" class="spot-board">
    <div class="section-label">
      <span>Park yerleri</span>
      <span>
        {{ emptyCount }} boş{{ reservedCount ? ` · ${reservedCount} abone` : '' }}
        <template v-if="selectable">
          · {{ selected ? `Seçilen ${selected}` : 'Boş yere tıkla' }}
        </template>
      </span>
    </div>
    <div class="spot-legend">
      <span class="is-empty">Boş</span>
      <span class="is-occupied">Dolu</span>
      <span class="is-reserved">Abone yeri</span>
    </div>
    <div class="spot-map">
      <button
        v-for="spot in spots"
        :key="spot.code"
        type="button"
        class="spot-cell"
        :class="[
          'is-' + spot.state,
          { 'is-pick': selectable && spot.state === 'empty', 'is-selected': selectable && selected === spot.code },
        ]"
        :disabled="selectable && spot.state !== 'empty'"
        :title="titleFor(spot)"
        @click="onClick(spot)"
      >
        <strong>{{ spot.code }}</strong>
        <em>{{ selected === spot.code ? 'Seçildi' : spot.plate || 'Boş' }}</em>
      </button>
    </div>
    <p v-if="unassignedInside" class="spot-note">
      {{ unassignedInside }} araç henüz yere yazılmadan içeride.
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  spots: { type: Array, default: () => [] },
  emptyCount: { type: Number, default: 0 },
  reservedCount: { type: Number, default: 0 },
  unassignedInside: { type: Number, default: 0 },
  selectable: { type: Boolean, default: false },
  selected: { type: String, default: null },
})

const emit = defineEmits(['select'])

function titleFor(spot) {
  if (props.selectable && props.selected === spot.code) return `${spot.code} seçildi`
  if (spot.state === 'empty') return `${spot.code} boş`
  if (spot.state === 'reserved') return `${spot.code} · abone ${spot.plate}`
  return `${spot.code} · ${spot.plate}`
}

function onClick(spot) {
  if (!props.selectable || spot.state !== 'empty') return
  emit('select', props.selected === spot.code ? null : spot)
}
</script>
