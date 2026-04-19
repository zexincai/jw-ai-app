import nacl from 'tweetnacl'
import sha256 from 'js-sha256'

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function getDeviceId(phoneNumber) {
  const phone = phoneNumber || uni.getStorageSync('jclaw_last_phone') || 'anonymous'
  const storageKey = `jclaw_device_keypair_v2_${phone}`
  let stored = uni.getStorageSync(storageKey)
  if (!stored) {
    const kp = nacl.sign.keyPair()
    stored = { publicKeyHex: toHex(kp.publicKey), secretKeyHex: toHex(kp.secretKey) }
    uni.setStorageSync(storageKey, stored)
  }
  const pubBytes = new Uint8Array(stored.publicKeyHex.match(/.{2}/g).map(h => parseInt(h, 16)))
  return sha256(pubBytes)
}
