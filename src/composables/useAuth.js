import { ref, computed } from 'vue'
import { mobileLoginApi, switchLoginApi } from '../api/login.js'

const token = ref('')
const roles = ref([])
const currentRoleId = ref('')

function _mapRole(r) {
  return {
    id: String(r.userId),
    name: r.roleName || r.userName || String(r.userId),
    avatar: (r.roleName || r.userName || 'AI').slice(0, 2).toUpperCase(),
    userId: r.userId,
    userRolePrompt: r.userRolePrompt || '',
    telephone: r.telephone || r.phone || '',
  }
}

function _restore() {
  const t = uni.getStorageSync('jclaw_token')
  const auth = uni.getStorageSync('jclaw_auth')
  if (t) token.value = t
  if (auth) {
    roles.value = (auth.roles || []).map(_mapRole)
    currentRoleId.value = String(auth.currentRoleId || (auth.roles?.[0]?.userId ?? ''))
  }
}

_restore()

const currentRole = computed(() => roles.value.find(r => r.id === currentRoleId.value) || roles.value[0])
const isLoggedIn = computed(() => !!token.value)

async function loginByMobile(phoneNumber, smsCode, smsUuid) {
  uni.setStorageSync('jclaw_last_phone', phoneNumber)
  const res = await mobileLoginApi({ phoneNumber, code: smsCode, uuid: smsUuid })
  const data = res.data || res
  if (!data.access_token) throw new Error(res.msg || '登录失败')

  token.value = data.access_token
  const userList = data.userList || []
  roles.value = userList.map(_mapRole)
  currentRoleId.value = String(userList[0]?.userId ?? '')

  uni.setStorageSync('jclaw_token', data.access_token)
  uni.setStorageSync('jclaw_auth', {
    roles: userList,
    currentRoleId: currentRoleId.value,
  })
}

async function switchRole(roleId) {
  const role = roles.value.find(r => r.id === String(roleId))
  if (!role) return
  const res = await switchLoginApi({ userId: role.userId })
  const data = res.data || res
  if (data.access_token) {
    token.value = data.access_token
    uni.setStorageSync('jclaw_token', data.access_token)
  }
  currentRoleId.value = String(roleId)
  const auth = uni.getStorageSync('jclaw_auth') || {}
  uni.setStorageSync('jclaw_auth', { ...auth, currentRoleId: currentRoleId.value })
}

function logout() {
  token.value = ''
  roles.value = []
  currentRoleId.value = ''
  uni.removeStorageSync('jclaw_token')
  uni.removeStorageSync('jclaw_auth')
}

export function useAuth() {
  return { token, roles, currentRoleId, currentRole, isLoggedIn, loginByMobile, switchRole, logout }
}
