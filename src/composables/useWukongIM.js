import { ref } from 'vue'
import { WKSDK, Channel, ChannelTypePerson, MessageText } from 'wukongimjssdk'
import { getChatIMLongConnection } from '../api/agent.js'

const status = ref('disconnected')
const _messageHandlers = new Set()
let _telephone = ''
let _listenersAdded = false

function _statusListener(s) {
  if (s === 1) status.value = 'connected'
  else if (s === 2) status.value = 'connecting'
  else status.value = 'disconnected'
}

function _messageListener(msg) {
  _messageHandlers.forEach(h => h(msg))
}

async function connect(userId, telephone, token) {
  _telephone = String(telephone)

  const res = await getChatIMLongConnection({ sourceType: 3 })
  const d = res.data || res
  const { modelType, wsAddr } = d

  const sdk = WKSDK.shared()
  if (modelType === 2) {
    sdk.config.provider.connectAddrCallback = (cb) => cb(wsAddr)
  } else {
    sdk.config.addr = wsAddr
  }
  sdk.config.uid = String(userId)
  sdk.config.token = token

  if (!_listenersAdded) {
    sdk.connectManager.addConnectStatusListener(_statusListener)
    sdk.chatManager.addMessageListener(_messageListener)
    _listenersAdded = true
  }

  status.value = 'connecting'
  sdk.connectManager.connect()
}

function _ensureListeners() {
  if (_listenersAdded) return
  const sdk = WKSDK.shared()
  sdk.connectManager.addConnectStatusListener(_statusListener)
  sdk.chatManager.addMessageListener(_messageListener)
  _listenersAdded = true
}

function disconnect() {
  const sdk = WKSDK.shared()
  sdk.connectManager.removeConnectStatusListener(_statusListener)
  sdk.chatManager.removeMessageListener(_messageListener)
  _listenersAdded = false
  sdk.connectManager.disconnect()
  status.value = 'disconnected'
}

function reconnect() {
  _ensureListeners()
  WKSDK.shared().connectManager.connect()
}

function sendText(text) {
  const channel = new Channel(_telephone, ChannelTypePerson)
  const msg = new MessageText(text)
  WKSDK.shared().chatManager.send(msg, channel)
}

function onMessage(handler) {
  _messageHandlers.add(handler)
}

export function useWukongIM() {
  return { status, connect, disconnect, reconnect, sendText, onMessage }
}
