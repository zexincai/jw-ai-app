/**
 * 设备标识工具 (Ed25519 via TweetNaCl)
 * 用于确保设备 ID 与手机号一一对应
 *
 * 核心逻辑：
 * 1. 每个手机号对应一个唯一的 Ed25519 密钥对
 * 2. deviceId 是 publicKey 的 SHA-256 哈希值
 * 3. 身份在同一手机号下跨会话持久化
 */

import nacl from 'tweetnacl'
import { sha256 } from 'js-sha256'

const STORAGE_KEY_PREFIX = 'jclaw_device_keypair_v2'
const LAST_PHONE_KEY = 'jclaw_last_phone'

// 内存缓存
let identityCache = null
let identityCacheKey = ''

/**
 * Base64-URL 安全编码（无 padding）
 * @param {Uint8Array} data
 * @returns {string}
 */
export function base64UrlEncode(data) {
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 获取设备完整身份
 * @param {string|null} [phoneNumber] 手机号
 * @returns {Promise<{privateKey: Uint8Array, publicKeyBase64: string, deviceId: string}>}
 */
export async function getDeviceIdentity(phoneNumber) {
  const finalPhone = phoneNumber || uni.getStorageSync(LAST_PHONE_KEY)
  const storageKey = finalPhone ? `${STORAGE_KEY_PREFIX}_${finalPhone}` : STORAGE_KEY_PREFIX

  // 缓存检查
  if (identityCache && identityCacheKey === storageKey) {
    return identityCache
  }

  const stored = uni.getStorageSync(storageKey)
  if (stored) {
    try {
      const { privateKeyBase64, publicKeyBase64, deviceId } = JSON.parse(stored)
      const privateKey = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0))
      const identity = { privateKey, publicKeyBase64, deviceId }
      identityCache = identity
      identityCacheKey = storageKey
      return identity
    } catch { /* 损坏则重新生成 */ }
  }

  // 生成新密钥对
  const keyPair = nacl.sign.keyPair()
  const publicKeyBase64 = base64UrlEncode(keyPair.publicKey)

  // deviceId = publicKey 的 sha256 摘要
  const deviceId = sha256.array(keyPair.publicKey)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const privateKeyBase64 = base64UrlEncode(keyPair.secretKey)
  const toStore = JSON.stringify({ privateKeyBase64, publicKeyBase64, deviceId })
  uni.setStorageSync(storageKey, toStore)

  const identity = { privateKey: keyPair.secretKey, publicKeyBase64, deviceId }
  identityCache = identity
  identityCacheKey = storageKey
  return identity
}

/**
 * 获取设备 ID (Client ID) — 用于 HTTP 请求头
 * @param {string|null} [phoneNumber]
 * @returns {Promise<string>}
 */
export async function getDeviceId(phoneNumber) {
  const identity = await getDeviceIdentity(phoneNumber)
  return identity.deviceId
}

/**
 * 使用设备私钥对 payload 签名
 * @param {string} payload
 * @param {string|null} [phoneNumber]
 * @returns {Promise<string>} Base64-URL 签名
 */
export async function signPayload(payload, phoneNumber) {
  const identity = await getDeviceIdentity(phoneNumber)
  const message = new TextEncoder().encode(payload)
  const signature = nacl.sign.detached(message, identity.privateKey)
  return base64UrlEncode(signature)
}
