<template>
  <div class="flex items-center gap-2 min-w-0">
    <div
      class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-medium text-gray-500 overflow-hidden border border-blue-100">
      <img v-if="getAvatarByOrgType(auth.currentRole.value?.orgType)"
        :src="getAvatarByOrgType(auth.currentRole.value?.orgType)!" class="w-full h-full object-cover" />
      <img v-else-if="auth.currentRole.value?.avatar" :src="auth.currentRole.value?.avatar"
        class="w-full h-full object-cover" />
      <span v-else>{{ roleInitial }}</span>
    </div>
    <span class="flex-1 text-xs text-gray-500 truncate min-w-0">{{ roleName }}</span>
    <button @click="showSettings = true"
      class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
      title="设置">
      <Settings :size="20" />
    </button>
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Settings } from 'lucide-vue-next'
import { useAuth } from '../../composables/useAuth'
import { getAvatarByOrgType } from '../../utils/avatar'
import SettingsModal from './SettingsModal.vue'

const auth = useAuth()
const showSettings = ref(false)

const roleName = computed(() => auth.currentRole.value?.loginName ?? '未登录')
const roleInitial = computed(() => roleName.value.slice(0, 1))
</script>
