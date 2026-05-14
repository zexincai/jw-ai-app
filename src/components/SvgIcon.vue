<template>
  <image
    :src="`/static/icon-${name}.svg`"
    class="svg-icon"
    :style="{ width: size + 'rpx', height: size + 'rpx' }"
    mode="aspectFit"
  />
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 40 },
})
</script>

<style scoped>
.svg-icon {
  flex-shrink: 0;
}
</style>
