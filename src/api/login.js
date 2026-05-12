import { http } from '../utils/request.js'

/**
 * 获取图形验证码
 * @returns {Promise<{
 *   img: string,           // 背景图 base64
 *   smallImage: string,    // 滑块图 base64
 *   slidingWidth: number,  // 滑块宽度
 *   slidingHeight: number, // 滑块高度
 *   oriImageWidth: number, // 背景图宽度
 *   oriImageHeight: number,// 背景图高度
 *   yHeight: number,       // 滑块 y 坐标
 *   captchaType: string,   // 验证码类型
 *   uuid: string,          // 验证码唯一标识，发送短信时传入
 *   code: number           // 保留字段
 * }>}
 */
export function getCaptchaApi() {
  return http.get('/code')
}

/**
 * 发送短信验证码
 * @param {object} params
 * @param {string} params.phoneNumber  手机号
 * @param {string} params.uuid         图形验证码 uuid（来自 getCaptchaApi）
 * @param {number} params.code         拖动滑块的距离（x 坐标）
 * @param {number} [params.sendType=1] 用途类型：登录:1，找回密码:3，账号注册:4
 * @returns {Promise<string>} 返回新的 uuid，登录时作为 mobileLoginApi 的 uuid 参数
 */
export function sendSmsCodeApi({ phoneNumber, uuid, code, sendType = 1 }) {
  return http.post('/auth/send/verification/code', { phoneNumber, uuid, code, sendType })
}

/**
 * 手机号验证码登录（AI 移动端）
 * @param {object} params
 * @param {string} params.phoneNumber 手机号
 * @param {string} params.code        短信验证码
 * @param {string} params.uuid        sendSmsCodeApi 返回的 uuid
 * @returns {Promise<{
 *   access_token: string,  // 登录令牌，后续请求放入 Authorization 头
 *   expires_in: string,    // 令牌有效期（秒）
 *   userList: Array<{
 *     userId: number,          // 用户主键ID
 *     loginName: string,       // 登录账号名
 *     orgName: string,         // 所属组织名称
 *     orgType: number,         // 组织类型
 *     telephone: string,       // 手机号
 *     pastStatus: number,      // 账号状态：0 禁用，1 启用，2 已过期
 *     isMaster: number,        // 是否管理员：0 否，1 是
 *     userRolePrompt: string,  // AI 角色提示语
 *   }>
 * }>}
 */
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

/**
 * 切换登录账号
 * @param {object} params
 * @param {string} params.phoneNumber 手机号
 * @param {string} params.pkId        目标账号的用户主键ID字符串（来自 mobileLoginApi 返回的 userList[].userId）
 * @returns {Promise<{
 *   access_token: string, // 新账号的登录令牌
 *   expires_in: string    // 令牌有效期（秒）
 * }>}
 */
export function switchLoginApi({ phoneNumber, pkId }) {
  return http.post('/auth/switchLogin', { phoneNumber, pkId, sourceType: 3 })
}

// ── 扫码登录 ──

/**
 * 新增二维码
 * @returns {Promise<{ data: string }>} data 为二维码唯一标识
 */
export function addQRCode() {
  return http.get('/eng/public/addQRCode')
}

/**
 * 查询二维码扫描状态
 * @param {string} unique 二维码唯一标识
 * @returns {Promise<{ data: number }>} 扫描状态码
 */
export function queryQRCode(unique) {
  return http.get('/eng/public/queryQRCode', { unique })
}

/**
 * 扫码登录
 * @param {string} scanCode 扫码登录唯一标识
 * @returns {Promise<*>}
 */
export function scanCodeLogin(scanCode) {
  return http.post(`/auth/scanCode/login?${scanCode}`)
}

/**
 * 扫码前检查条件
 * @param {string} [userId]
 * @returns {Promise<*>}
 */
export function scanCodePreconditions(userId) {
  return http.get('/auth/scanCode/preconditions', userId ? { userId } : undefined)
}
