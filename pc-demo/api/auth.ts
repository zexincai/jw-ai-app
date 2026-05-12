/**
 * 建网科技工程管理系统 - 登录认证模块 API
 * 基于 Swagger 文档自动生成
 * Host: 192.168.2.99:9199
 * BasePath: /auth
 */

import { http } from '../utils/request'

// ==================== 通用响应体 ====================

/**
 * 通用响应封装
 * @description 统一响应格式
 */
export interface AjaxResult<T = any> {
  /** 状态码 */
  code: number
  /** 响应数据 */
  data: T
  /** 消息 */
  msg: string
}

// ==================== 请求参数接口 ====================

/**
 * PC端登陆请求参数
 * @description PC端账号登录请求信息
 */
export interface UserLoginPc {
  /** 验证码 */
  code?: string
  /** 是否强制登陆：否：0，是：1 */
  forceType: number
  /** 手机号 */
  phoneNumber: string
  /** 登陆来源：固定值：1 */
  sourceType: number
  /** 唯一标识 */
  uuid?: string
}

/**
 * APP端登陆请求参数
 * @description APP登陆请求信息
 */
export interface UserLoginApp {
  /** 验证码，手机号登录必填 */
  code?: string
  /** 设备token */
  deviceToken?: string
  /** 设备平台类型(Android：1，iOS：2,macOS:3) */
  deviceType?: number
  /** 是否强制登陆：否：0，是：1 */
  forceType: number
  /** 手机号，手机号登录必填 */
  phoneNumber: string
  /** 登陆来源：固定值：2 */
  sourceType: number
  /** 标签集合 */
  tagList?: string[]
  /** 唯一标识，手机号登录必填 */
  uuid?: string
}

/**
 * H5端登陆请求参数
 * @description H5登陆请求信息
 */
export interface UserLoginH5 {
  /** 验证码 */
  code: string
  /** 客户ID */
  customId: number
  /** 手机号 */
  phoneNumber: string
  /** 标段ID */
  projectBidId: number
  /** 唯一标识 */
  uuid: string
}

/**
 * PC端AI账号登陆请求参数
 * @description PC登陆请求信息
 */
export interface UserAILoginPc {
  /** 验证码 */
  code?: string
  /** 是否强制登陆：否：0，是：1 */
  forceType: number
  /** 操作来源(2：智能体-pc端，3：智能体-PC安装版) */
  operateSource: number
  /** 手机号 */
  phoneNumber: string
  /** 登陆来源：固定值：3 */
  sourceType: number
  /** 唯一标识 */
  uuid?: string
}

/**
 * APP端AI账号登陆请求参数
 * @description APP登陆请求信息
 */
export interface UserAILoginApp {
  /** 验证码，手机号登录必填 */
  code?: string
  /** 设备token */
  deviceToken?: string
  /** 设备平台类型(Android：1，iOS：2,macOS:3) */
  deviceType?: number
  /** 是否强制登陆：否：0，是：1 */
  forceType: number
  /** 手机号，手机号登录必填 */
  phoneNumber: string
  /** 登陆来源：固定值：3 */
  sourceType: number
  /** 标签集合 */
  tagList?: string[]
  /** 唯一标识，手机号登录必填 */
  uuid?: string
}

/**
 * PC端注册请求参数
 * @description pc端组织账号注册
 */
export interface OrgRegisterPc {
  /** 验证码 */
  code: string
  /** 联系电话 */
  linkPhone: string
  /** 公司名称 */
  orgName: string
  /** 组织类型：6 供应商 7分包商 13 钢筋加工厂 */
  orgType: number
  /** 供应编码 字典23 普通材料供应商supply_common 混凝土搅拌站supply_beton (供应商时必填) */
  supplyCode?: string
  /** uuid唯一标识 */
  uuid: string
}

/**
 * APP端注册请求参数
 * @description app端组织账号注册
 */
export interface OrgRegisterApp {
  /** 验证码 */
  code: string
  /** 联系电话 */
  linkPhone: string
  /** 公司名称 */
  orgName?: string
  /** 组织类型：6 供应商 7分包商 13 钢筋加工厂 15劳务工人 */
  orgType: number
  /** 供应编码 字典23 普通材料供应商supply_common 混凝土搅拌站supply_beton (供应商时必填) */
  supplyCode?: string
  /** uuid唯一标识 */
  uuid: string
}

/**
 * 短信验证码请求参数
 * @description 短信验证码
 */
export interface SysSmsAdd {
  /** 验证码 */
  code: string
  /** 手机号 */
  phoneNumber: string
  /** 用途类型 登陆：1，找回密码：3，账号注册：4 */
  sendType: number
  /** 唯一标识 */
  uuid: string
}

/**
 * 切换账号登陆请求参数
 * @description 切换账号登陆-通用
 */
export interface SwitchAccountLogin {
  /** 设备token，sourceType=2时 */
  deviceToken?: string
  /** 设备平台类型(Android：1，iOS：2,macOS:3) sourceType=2时 */
  deviceType?: number
  /** 手机号 */
  phoneNumber: string
  /** 用户主键ID */
  pkId: number
  /** 登陆来源：pc:1, app:2，AI：3 */
  sourceType: number
  /** 标签集合，sourceType=2时 */
  tagList?: string[]
}

/**
 * 重新登陆请求参数
 * @description 账号重新登陆-通用
 */
export interface SwitchAccountAnewLogin {
  /** 验证码 */
  code?: string
  /** 设备token，sourceType=2时 */
  deviceToken?: string
  /** 设备平台类型(Android：1，iOS：2,macOS:3) sourceType=2时 */
  deviceType?: number
  /** 原来token */
  oldToken: string
  /** 手机号 */
  phoneNumber: string
  /** 用户主键ID */
  pkId: number
  /** 登陆来源（pc:1,app:2） */
  sourceType: number
  /** 唯一标识 */
  uuid?: string
}

/**
 * 实名认证请求参数
 */
export interface IdentityAuthParams {
  /** 姓名 */
  name: string
  /** 证件类型 */
  certType: string
  /** 证件号码 */
  cardNum: string
  /** 手机号 */
  telephone: string
  /** 业务类型 (1: 实名) */
  distinguishType: string | number
  /** 类型 */
  type: number
  /** 验证码 (可选) */
  code?: string
  /** UUID (可选) */
  uuid?: string
  [key: string]: any
}

/**
 * 认证状态查询参数
 */
export interface AuthStateParams {
  /** 业务类型 (0) */
  distinguishType: number
  /** 业务ID */
  pkId: string | number
  [key: string]: any
}

/**
 * 认证结果返回
 */
export interface IdentityAuthVo {
  /** 面部识别 URL */
  faceSwipingUrl: string
  /** 业务辨别 ID */
  userFaceDistinguishId: string
  /** 倒计时 */
  countdownTime: number
}

/**
 * 认证状态返回
 */
export interface AuthStateVo {
  /** 状态 2: 成功, 3: 失败 */
  status: number
  /** 错误信息 */
  errorInfo?: string
}

// ==================== 响应数据接口 ====================

/**
 * 用户认证状态
 * @description 用户认证状态vo
 */
export interface AuthStatusVo {
  /** 状态 0:实名认证 1:核身认证 2:直接登录 */
  checkStatus?: number
  /** 手机号 */
  mobile?: string
}

/**
 * 账号信息
 * @description 账号信息
 */
export interface LoginUserVo {
  /** 用户认证信息 */
  authStatusVo?: AuthStatusVo
  /** 是否管理员 0:不是 1:是 */
  isMaster?: number
  /** 登陆用户名称 */
  loginName?: string
  /** 组织名称 */
  orgName?: string
  /** 组织类型 */
  orgType?: number
  /** 组织类型名称 */
  orgTypeName?: string
  /** 账号状态 0:禁用 1:启用 2:已过期 */
  pastStatus?: number
  /** 手机号 */
  telephone?: string
  /** 登陆用户id */
  userId?: number
  /** 用户角色-提示语 AI专用 */
  userRolePrompt?: string
}

/**
 * PC端登陆返回数据
 * @description 登陆返回体
 */
export interface AuthLoginPCVo {
  /** 有效令牌 */
  access_token?: string
  /** 设置有效期为xx秒 */
  expires_in?: string
  /** 账号信息集合 */
  userList?: LoginUserVo[]
}

/**
 * APP端登陆返回数据
 * @description 登陆返回体
 */
export interface AuthLoginAppVo {
  /** 有效令牌 */
  access_token?: string
  /** 设置有效期为xx秒 */
  expires_in?: string
  /** 账号信息集合 */
  userList?: LoginUserVo[]
}

/**
 * H5端登陆返回数据
 * @description 登陆返回体
 */
export interface AuthLoginH5Vo {
  /** 有效令牌 */
  access_token?: string
  /** 客户类型（0 建设单位子公司 , 1 监理公司 ,2 项目部 ,3 供应商, 4 分包单位 ,5 设计院 ,6 施工单位集团公司，7 政府监管单位 ，8 建设单位集团公司 ，9 施工单位子公司,10 钢筋加工厂，11 混凝土搅拌站) */
  customType?: number
  /** 设置有效期为xx秒 */
  expires_in?: string
  /** 页面权限 */
  pagePermissions?: string[]
  /** 按钮权限 */
  permissions?: string[]
  /** 供应商供货类型 */
  supplyCode?: string
}

/**
 * 扫码登陆返回数据
 * @description 扫码登陆返回体
 */
export interface AuthScanCodeLoginVo {
  /** 有效令牌 */
  access_token?: string
  /** 错误信息提示 */
  errorMsg?: string
  /** 设置有效期为xx秒 */
  expires_in?: string
  /** 登陆状态：1：待扫码，2：扫码未确认，3：扫码已确认，4：登陆成功，5：已取消，6：存在异常的 */
  loginStatus?: number
  /** 账号信息集合 */
  userList?: LoginUserVo[]
}

/**
 * 切换账号返回数据
 * @description 切换账号返回体
 */
export interface AuthSwitchLoginVo {
  /** 有效令牌 */
  access_token?: string
  /** 设置有效期为xx秒 */
  expires_in?: string
}

/**
 * 重新登陆返回数据
 * @description 重新登陆返回体
 */
export interface AuthSwitchAnewLoginVo {
  /** 有效令牌 */
  access_token?: string
  /** 设置有效期为xx秒 */
  expires_in?: string
}

/**
 * 注册返回数据
 * @description APP端、PC端注册立即登陆返回体
 */
export interface AuthUserLoginRegisterVo {
  /** 有效令牌 */
  access_token?: string
  /** 设置有效期为xx秒 */
  expires_in?: string
  /** 账号信息集合 */
  userList?: LoginUserVo[]
}

/**
 * 账号有效性返回数据
 * @description 账号登陸是否过期信息
 */
export interface LoginAccountEffectiveVo {
  /** 错误提示语 */
  errorMsg?: string
  /** 账号是否过期（是：true,否：false） */
  isEffective?: boolean
  /** token标志，用于重新登陆 */
  tokenSign?: string
}

/**
 * 扫码登陆前置条件
 * @description 扫码登陆前置条件
 */
export interface ScanCodePreconditionsVo {
  /** 失效时间，毫秒值 */
  expireTime?: number
  /** 扫码标识 */
  scanCode?: string
  /** 服务器北京时间 */
  serviceTime?: string
}

// ==================== API 接口 ====================

/**
 * 账号登陆-PC
 * @summary 账号登陆-PC端
 */
export function sysLogin(params: UserLoginPc) {
  return http.post<AjaxResult<AuthLoginPCVo>>('/auth/sysLogin', params)
}

/**
 * 退出登陆-PC
 * @summary PC端退出登录
 */
export function sysLogout() {
  return http.delete<AjaxResult<object>>('/auth/sysLogout')
}

/**
 * 账号登陆-APP
 * @summary APP端账号登录
 * @param params 登录参数
 */
export function appSysLogin(params: UserLoginApp) {
  return http.post<AjaxResult<AuthLoginAppVo>>('/auth/app/sysLogin', params)
}

/**
 * 退出登陆-APP
 * @summary APP端退出登录
 */
export function appSysLogout() {
  return http.delete<AjaxResult<object>>('/auth/app/sysLogout')
}

/**
 * H5端登陆
 * @summary H5端扫码登录
 * @param params 登录参数
 */
export function h5SysLogin(params: UserLoginH5) {
  return http.post<AjaxResult<AuthLoginH5Vo>>('/auth/h5/sysLogin', params)
}

/**
 * AI账号登陆-PC
 * @summary AI账号PC端登录
 * @param params 登录参数
 */
export function aiSysLoginPc(params: UserAILoginPc) {
  return http.post<AjaxResult<AuthLoginPCVo>>('/auth/ai/sysLogin', params)
}

/**
 * AI退出登陆-PC
 * @summary AI账号PC端退出登录
 */
export function aiSysLogoutPc() {
  return http.delete<AjaxResult<object>>('/auth/ai/sysLogout')
}

/**
 * AI账号登陆-APP
 * @summary AI账号APP端登录
 * @param params 登录参数
 */
export function aiSysLoginApp(params: UserAILoginApp) {
  return http.post<AjaxResult<AuthLoginAppVo>>('/auth/ai/app/sysLogin', params)
}

/**
 * AI退出登陆-APP
 * @summary AI账号APP端退出登录
 */
export function aiSysLogoutApp() {
  return http.delete<AjaxResult<object>>('/auth/ai/app/sysLogout')
}

/**
 * 账号注册-PC
 * @summary PC端组织账号注册
 * @param params 注册参数
 */
export function pcRegister(params: OrgRegisterPc) {
  return http.post<AjaxResult<AuthUserLoginRegisterVo>>('/auth/pc/register', params)
}

/**
 * 账号注册-APP
 * @summary APP端组织账号注册
 * @param params 注册参数
 */
export function appRegister(params: OrgRegisterApp) {
  return http.post<AjaxResult<AuthUserLoginRegisterVo>>('/auth/app/register', params)
}

/**
 * 发送短信验证码-通用
 * @summary 发送短信验证码
 * @param params 短信参数（用途类型：1-登录，3-找回密码，4-账号注册）
 */
export function sendVerificationCode(params: SysSmsAdd) {
  return http.post<AjaxResult<string>>('/auth/send/verification/code', params)
}

/**
 * 查看账号是否可用-通用版
 * @summary 检查账号是否可用
 * @param loginName 登录账号
 */
export function accountAvailable(loginName: string) {
  return http.get<AjaxResult<boolean>>('/auth/account/available', { loginName })
}

/**
 * 查看token是否有效
 * @summary 检查Token有效性
 * @param token 账号token
 */
export function accountEffective(token: string) {
  return http.get<AjaxResult<LoginAccountEffectiveVo>>('/auth/account/effective', { token })
}

/**
 * 刷新当前账号token
 * @summary 刷新Token
 */
export function refreshToken() {
  return http.get<AjaxResult<object>>('/auth/account/refreshToken')
}

/**
 * 账号注册校验企业名称
 * @summary 检查企业名称是否可用
 * @param orgName 企业名称
 */
export function checkOrgName(orgName: string) {
  return http.get<AjaxResult<boolean>>('/auth/checkOrgName', { orgName })
}

/**
 * 根据手机号获取账号列表-通用
 * @summary 根据手机号获取账号列表
 * @param sourceType 登陆来源（pc：1，app:2,AI:3）
 * @param switchType 账号标识是否切换账号获取（否：0，是：1）
 */
export function findUserByTelephone(sourceType: number, switchType: number) {
  return http.get<AjaxResult<LoginUserVo[]>>('/auth/findUserByTelephone', { sourceType, switchType })
}

/**
 * 判断手机号是否是当前账号的手机号-PC
 * @summary 验证手机号归属
 * @param loginName 登录账号
 * @param telephone 手机号
 */
export function isCurrentUsersTelephone(loginName: string, telephone: string) {
  return http.get<AjaxResult<boolean>>('/auth/isCurrentUsersTelephone', { loginName, telephone })
}

/**
 * 切换账号-通用
 * @summary 切换账号
 * @param params 切换参数
 */
export function switchLogin(params: SwitchAccountLogin) {
  return http.post<AjaxResult<AuthSwitchLoginVo>>('/auth/switchLogin', params)
}

/**
 * 重新登陆-通用
 * @summary 重新登录（Token过期后）
 * @param params 重新登录参数
 */
export function switchAnewLogin(params: SwitchAccountAnewLogin) {
  return http.post<AjaxResult<AuthSwitchAnewLoginVo>>('/auth/switchAnewLogin', params)
}

/**
 * 提交实名认证信息
 */
export function noTokenFaceSwiping(params: IdentityAuthParams) {
  return http.post<IdentityAuthVo>('/eng/enterprise/personActualAuth', params)
}

/**
 * 直接获取认证二维码 (重新授权)
 */
export function noTokenFaceSwipingNoParam() {
  return http.post<IdentityAuthVo>('/eng/enterprise/personAuthorization', {})
}

/**
 * 查询认证状态
 */
export function userFaceDistinguishState(params: AuthStateParams) {
  return http.get<AuthStateVo>('/eng/public/judgeBusinessSuccess', params)
}

/**
 * 获取二维码唯一标识
 */
export function addQRCode() {
  return http.get<string>('/eng/public/addQRCode')
}

/**
 * 查询二维码扫码状态
 */
export function queryQRCode(unique: string) {
  return http.get<AjaxResult<number>>('/eng/public/queryQRCode', { unique })
}

/**
 * 限制账号登陆前置条件
 */
export function scanCodePreconditions(userId?: string) {
  return http.get<AjaxResult<ScanCodePreconditionsVo>>('/auth/scanCode/preconditions', userId ? { userId } : undefined)
}

/**
 * 扫码PC端码登陆
 * @summary 扫码确认登录
 * @param scanCode 扫码登陆唯一标识
 */
export function scanCodeLogin(scanCode: string) {
  return http.post<AjaxResult<AuthScanCodeLoginVo>>('/auth/scanCode/login?' + scanCode)
}

/**
 * 根据token获取数据大屏跳转链接
 * @summary 获取数据大屏跳转地址
 * @param token 账号token
 */
export function dataScreen(token: string) {
  return http.get<AjaxResult<RedirectView>>('/auth/dataScreen', { token })
}

/**
 * 外部系统登录（智能地磅）
 * @summary 智能地磅系统登录
 * @param username 用户名
 * @param password 密码
 */
export function thirdPartyLogin(username: string, password: string) {
  return http.post<AjaxResult<string>>('/auth/user/login?' + new URLSearchParams({ username, password }).toString())
}

/**
 * 重定向视图
 * @description 数据大屏跳转链接响应
 */
export interface RedirectView {
  /** 应用上下文 */
  applicationContext?: object
  /** 属性映射 */
  attributesMap?: Record<string, any>
  /** Bean名称 */
  beanName?: string
  /** 内容类型 */
  contentType?: string
  /** 是否暴露路径变量 */
  exposePathVariables?: boolean
  /** 主机列表 */
  hosts?: string[]
  /** 是否传播查询属性 */
  propagateQueryProperties?: boolean
  /** 是否重定向视图 */
  redirectView?: boolean
  /** 请求上下文属性 */
  requestContextAttribute?: string
  /** 静态属性 */
  staticAttributes?: Record<string, any>
  /** 跳转URL */
  url?: string
}

// ==================== 常量枚举 ====================

/** 登录来源类型 */
export const SourceType = {
  PC: 1,   // PC端
  APP: 2,  // APP端
  AI: 3    // AI端
} as const

/** 设备平台类型 */
export const DeviceType = {
  Android: 1,
  iOS: 2,
  macOS: 3
} as const

/** 发送短信类型 */
export const SendType = {
  Login: 1,       // 登录
  FindPassword: 3, // 找回密码
  Register: 4     // 账号注册
} as const

/** 客户类型 */
export const CustomType = {
  建设单位子公司: 0,
  监理公司: 1,
  项目部: 2,
  供应商: 3,
  分包单位: 4,
  设计院: 5,
  施工单位集团公司: 6,
  政府监管单位: 7,
  建设单位集团公司: 8,
  施工单位子公司: 9,
  钢筋加工厂: 10,
  混凝土搅拌站: 11
} as const

/** 组织类型 */
export const OrgType = {
  供应商: 6,
  分包商: 7,
  钢筋加工厂: 13,
  劳务工人: 15
} as const

/** 供应编码 */
export const SupplyCode = {
  普通材料供应商: 'supply_common',
  混凝土搅拌站: 'supply_beton'
} as const
