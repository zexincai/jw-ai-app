import { http } from '../utils/request.js'

export function getCaptchaApi() {
  return http.get('/code')
}

export function sendSmsCodeApi({ phoneNumber, uuid, code, sendType = 1 }) {
  return http.post('/auth/send/verification/code', { phoneNumber, uuid, code, sendType })
}

export function mobileLoginApi({ phoneNumber, code, uuid }) {
  return http.post('/auth/ai/sysLogin', {
    phoneNumber,
    code,
    uuid,
    forceType: 1,
    sourceType: 3,
    operateSource: 2,
  })
}

export function switchLoginApi({ userId }) {
  return http.post('/auth/ai/switchLogin', { userId })
}
