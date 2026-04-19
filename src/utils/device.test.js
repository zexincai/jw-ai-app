import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock uni global
const store = {}
global.uni = {
  getStorageSync: vi.fn(key => store[key] ?? null),
  setStorageSync: vi.fn((key, val) => { store[key] = val }),
}

import { getDeviceId } from './device.js'

describe('getDeviceId', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k])
    vi.clearAllMocks()
    global.uni.getStorageSync.mockImplementation(key => store[key] ?? null)
    global.uni.setStorageSync.mockImplementation((key, val) => { store[key] = val })
  })

  it('returns a 64-char hex string', async () => {
    const id = await getDeviceId('13800138000')
    expect(id).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns same id on repeated calls', async () => {
    const id1 = await getDeviceId('13800138000')
    const id2 = await getDeviceId('13800138000')
    expect(id1).toBe(id2)
  })

  it('returns different ids for different phones', async () => {
    const id1 = await getDeviceId('13800138000')
    const id2 = await getDeviceId('13900139000')
    expect(id1).not.toBe(id2)
  })

  it('falls back to jclaw_last_phone when no phone given', async () => {
    store['jclaw_last_phone'] = '13700137000'
    const id = await getDeviceId()
    expect(uni.getStorageSync).toHaveBeenCalledWith('jclaw_device_keypair_v2_13700137000')
    expect(id).toMatch(/^[0-9a-f]{64}$/)
  })
})
