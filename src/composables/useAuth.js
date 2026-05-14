import { ref, computed } from 'vue'
import { mobileLoginApi, switchLoginApi } from '../api/login.js'
import { useQuickTypes } from './useQuickTypes.js'
import yyPng from '/static/headPortrait/yy.png'
import dlPng from '/static/headPortrait/dl.png'
import jsPng from '/static/headPortrait/js.png'
import jlPng from '/static/headPortrait/jl.png'
import sgPng from '/static/headPortrait/sg.png'
import xmPng from '/static/headPortrait/xm.png'
import gyPng from '/static/headPortrait/gy.png'
import fbPng from '/static/headPortrait/fb.png'
import lwPng from '/static/headPortrait/lw.png'
import sjPng from '/static/headPortrait/sj.png'
import sgjtPng from '/static/headPortrait/sgjt.png'
import zfjgPng from '/static/headPortrait/zfjg.png'
import jsjtPng from '/static/headPortrait/jsjt.png'
import rebarPng from '/static/headPortrait/rebar.png'

const token = ref('')
const roles = ref([])
const currentRoleId = ref('')

const ORG_TYPE_AVATAR = {
  0: yyPng,
  1: dlPng,
  2: jsPng,
  3: jlPng,
  4: sgPng,
  5: xmPng,
  6: gyPng,
  7: fbPng,
  8: lwPng,
  9: sjPng,
  10: sgjtPng,
  11: zfjgPng,
  12: jsjtPng,
  13: rebarPng,
  14: xmPng,
}

function _mapRole(r) {
  const name = r.loginName || r.orgName || String(r.userId)
  return {
    id: String(r.userId),
    name,
    avatar: name.slice(0, 2).toUpperCase(),
    avatarUrl: ORG_TYPE_AVATAR[r.orgType] ?? null,
    orgType: r.orgType,
    orgName: r.orgName || '',
    userId: r.userId,
    userRolePrompt: r.userRolePrompt || '',
    telephone: r.telephone || '',
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
  const res = await switchLoginApi({ phoneNumber: role.telephone, pkId: String(role.userId) })
  const data = res.data || res
  if (data.access_token) {
    token.value = data.access_token
    uni.setStorageSync('jclaw_token', data.access_token)
  }
  currentRoleId.value = String(roleId)
  const auth = uni.getStorageSync('jclaw_auth') || {}
  uni.setStorageSync('jclaw_auth', { ...auth, currentRoleId: currentRoleId.value })
  useQuickTypes().reset()
  useQuickTypes().fetchTabs()
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
