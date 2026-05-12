import { http } from '../utils/request'

export interface CaptchaData {
  img: string
  smallImage: string
  slidingWidth: number
  code: number
  oriImageWidth: number
  slidingHeight: number
  captchaType: string
  oriImageHeight: number
  uuid: string
  yHeight: number
}

/**
 * 获取验证码图片
 */
export function getCaptchaApi() {
  return http.get<CaptchaData>('/code')
}

/**
 * 发送验证码
 * @param phoneNumber 手机号
 * @param uuid 图形验证码uuid
 * @param code 拖动滑块的距离 (x坐标)
 */
export function sendSmsCodeApi(phoneNumber: string, uuid: string, code: number) {
  return http.post<string>('/auth/send/verification/code', {
    phoneNumber,
    uuid,
    code,
    sendType: 1,
  })
}

export interface LoginParams {
  phoneNumber: string
  code: string // SMS 验证码
  uuid: string // sendSmsCodeApi 返回的 uuid
  password?: string
  forceType?: number
  sourceType?: number
}

/**
 * 手机号验证码登录
 */
export function mobileLoginApi(params: LoginParams) {
  return http.post('/auth/sysLogin', {
    password: '',
    forceType: 0,
    sourceType: 1,
    ...params,
  })
}
