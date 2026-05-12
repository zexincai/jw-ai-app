<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      @click="emit('close')"
    >
      <div
        class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800">OpenClaw 连接状态</h3>
          <button
            @click="emit('close')"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X :size="20" />
          </button>
        </div>

        <!-- Status Display -->
        <div class="mb-6">
          <!-- Verifying -->
          <div v-if="status === 'verifying'" class="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
            <div class="animate-spin">
              <Loader2 :size="20" class="text-yellow-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-yellow-800">正在连接...</p>
              <p class="text-xs text-yellow-600 mt-1">验证 Token 并建立连接</p>
            </div>
          </div>

          <!-- Connected -->
          <div v-else-if="status === 'connected'" class="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle2 :size="20" class="text-green-600" />
            <div>
              <p class="text-sm font-medium text-green-800">连接成功</p>
              <p class="text-xs text-green-600 mt-1">OpenClaw 服务已就绪</p>
            </div>
          </div>

          <!-- Failed -->
          <div v-else-if="status === 'failed'" class="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle :size="20" class="text-red-600 mt-0.5" />
            <div class="flex-1">
              <p class="text-sm font-medium text-red-800">连接失败</p>
              <p class="text-xs text-red-600 mt-1">{{ error || '无法连接到 OpenClaw 服务' }}</p>
            </div>
          </div>

          <!-- Idle -->
          <div v-else class="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Circle :size="20" class="text-gray-400" />
            <div>
              <p class="text-sm font-medium text-gray-800">未连接</p>
              <p class="text-xs text-gray-600 mt-1">等待连接 OpenClaw 服务</p>
            </div>
          </div>
        </div>

        <!-- Token Input (only show when failed) -->
        <div v-if="status === 'failed'" class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            OpenClaw Token
          </label>
          <input
            v-model="tokenInput"
            type="text"
            placeholder="输入 OpenClaw Token"
            :disabled="testing"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p v-if="testResult === 'success'" class="mt-2 text-xs text-green-600">
            ✓ Token 验证成功
          </p>
          <p v-else-if="testResult === 'failed'" class="mt-2 text-xs text-red-600">
            ✗ Token 验证失败，请检查是否正确
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            v-if="status === 'failed' && !testResult"
            @click="handleTestToken"
            :disabled="!tokenInput.trim() || testing"
            class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
          <button
            v-if="status === 'failed' && testResult === 'success'"
            @click="handleUpdateToken"
            class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存并重连
          </button>
          <button
            v-if="status === 'failed' && !testResult"
            @click="emit('close')"
            class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            v-if="status === 'connected'"
            @click="emit('close')"
            class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Loader2, CheckCircle2, AlertCircle, Circle } from 'lucide-vue-next'
import { getDeviceIdentity, signPayload } from '../utils/device'

const props = defineProps<{
  visible: boolean
  status: 'idle' | 'verifying' | 'connected' | 'failed'
  error: string | null
}>()

const emit = defineEmits<{
  close: []
  retry: []
  updateToken: [token: string]
  notPaired: [error: Error]
}>()

const tokenInput = ref('')
const testing = ref(false)
const testResult = ref<'success' | 'failed' | null>(null)

watch(() => props.visible, (visible) => {
  if (visible) {
    tokenInput.value = ''
    testResult.value = null
  }
})

watch(tokenInput, () => {
  testResult.value = null
})

async function handleTestToken() {
  if (!tokenInput.value.trim()) return

  testing.value = true
  testResult.value = null

  try {
    const url = import.meta.env.VITE_OPENCLAW_WS_URL ?? 'ws://127.0.0.1:18789'
    const testWs = new WebSocket(url)
    const device = await getDeviceIdentity()

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        testWs.close()
        reject(new Error('连接超时'))
      }, 10000)

      let challengeReceived = false
      let requestId = ''

      testWs.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Test received:', data)

          // 收到 connect.challenge，发送 connect 请求
          if (data.type === 'event' && data.event === 'connect.challenge') {
            challengeReceived = true
            requestId = crypto.randomUUID()

            const nonce = data.payload?.nonce || ''
            const signedAt = Date.now()
            const SCOPES = [
              "operator.admin",
              "operator.approvals",
              "operator.pairing",
              "operator.read",
              "operator.write",
            ]
            const payload = [
              "v2",
              device.deviceId,
              "gateway-client",
              "backend",
              "operator",
              SCOPES.join(","),
              String(signedAt),
              tokenInput.value.trim(),
              nonce,
            ].join("|")
            const signature = await signPayload(payload)

            // 发送完整的 connect 请求
            testWs.send(JSON.stringify({
              type: 'req',
              id: requestId,
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: 'gateway-client',
                  version: '1.0.0',
                  platform: 'web',
                  mode: 'backend'
                },
                role: 'operator',
                scopes: SCOPES,
                caps: [],
                auth: { token: tokenInput.value.trim() },
                device: {
                  id: device.deviceId,
                  publicKey: device.publicKeyBase64,
                  signedAt,
                  nonce,
                  signature,
                },
                locale: 'zh-CN',
                userAgent: navigator.userAgent
              }
            }))
          }

          // 收到 connect 响应（通过 id 匹配）
          if (data.type === 'res' && data.id === requestId) {
            clearTimeout(timeout)
            testWs.close()
            if (data.ok) {
              resolve()
            } else {
              const errorCode = data.error?.code || 'UNKNOWN'
              const errorMsg = data.error?.message || 'Token 无效'
              const error = new Error(`${errorCode}: ${errorMsg}`)

              // 检查是否是 NOT_PAIRED 错误
              if (errorCode === 'NOT_PAIRED') {
                // Token 有效但设备未配对，保存 token
                emit('updateToken', tokenInput.value.trim())
                emit('notPaired', error)
              }

              reject(error)
            }
          }
        } catch (e) {
          console.error('Failed to parse message:', e)
          clearTimeout(timeout)
          reject(e)
        }
      }

      testWs.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('连接失败'))
      }

      testWs.onclose = () => {
        clearTimeout(timeout)
        if (!challengeReceived) {
          reject(new Error('未收到服务器响应'))
        }
      }
    })

    testResult.value = 'success'
    // 测试成功后保存 token 并关闭弹窗
    emit('updateToken', tokenInput.value.trim())
    emit('close')
  } catch (e: any) {
    console.error('Connection test failed:', e)

    // 检查是否是配对相关的错误
    const errorMsg = e.message || ''
    if (errorMsg.includes('NOT_PAIRED') || errorMsg.includes('PAIRING_REQUIRED')) {
      emit('notPaired', e)
    }

    testResult.value = 'failed'
  } finally {
    testing.value = false
  }
}

function handleUpdateToken() {
  if (tokenInput.value.trim()) {
    emit('updateToken', tokenInput.value.trim())
    tokenInput.value = ''
    testResult.value = null
  }
}
</script>
