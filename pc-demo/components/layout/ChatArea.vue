<template>
  <div class="flex flex-col h-full min-h-0 bg-white relative">
    <template v-if="hasMessages">
      <MessageList class="flex-1 min-h-0" />
      <InputBar />
    </template>
    <WelcomeState v-else />
    <FloatingBacklogButton />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '../../stores/chat'
import MessageList from '../chat/MessageList.vue'
import WelcomeState from '../chat/WelcomeState.vue'
import InputBar from '../chat/InputBar.vue'
import FloatingBacklogButton from '../chat/FloatingBacklogButton.vue'

const store = useChatStore()
const hasMessages = computed(() => store.activeSessionMessages().length > 0)
</script>
