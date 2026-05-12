/**
 * 建网科技工程管理系统 - 智能体快捷会话模块 API
 * 基于 Swagger 文档自动生成
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
 * 新增智能体会话模板请求参数
 * @description 新增智能体会话模板数据
 */
export interface EngAgentChatQuickAdd {
  /** 内容 */
  quickWords?: string
  /** 快捷类型（0：待办事项，1：录入资料，2：查询记录，3：汇总数据） */
  quickType: string
  /** 标题 */
  quickTitle?: string
}

/**
 * 修改智能体会话模板请求参数
 * @description 修改智能体会话模板数据
 */
export interface EngAgentChatQuickUpdate {
  /** 主键ID */
  pkId?: string
  /** 内容 */
  quickWords?: string
  /** 快捷类型（0：待办事项，1：录入资料，2：查询记录，3：汇总数据） */
  quickType: string
  /** 标题 */
  quickTitle?: string
}

// ==================== 响应数据接口 ====================

/**
 * 智能体快捷会话模板 VO
 * @description 智能体会话模板视图对象
 */
export interface EngAgentChatQuickVO {
  /** 主键ID */
  pkId?: string
  /** 内容 */
  quickWords?: string
  /** 快捷类型（0：待办事项，1：录入资料，2：查询记录，3：汇总数据） */
  quickType: string
  /** 标题 */
  quickTitle?: string
}

// ==================== API 接口 ====================

/**
 * 新增智能体会话模板数据
 * @summary 新增快捷会话模板
 * @param params 模板参数
 */
export function addChatQuick(params: EngAgentChatQuickAdd) {
  return http.post<AjaxResult<number>>('/eng/chatQuick/add', params)
}

/**
 * 删除智能体会话模板
 * @summary 删除快捷会话模板
 * @param pkId 主键ID
 */
export function deleteChatQuick(pkId: string) {
  return http.delete<AjaxResult<object>>('/eng/chatQuick/delete', { pkId })
}

/**
 * 根据快捷类型获取信息
 * @summary 获取快捷会话模板列表
 * @param quickType 快捷类型（0：待办事项，1：录入资料，2：查询记录，3：汇总数据）
 */
export function getUserAccountChatQuickList(quickType: string) {
  return http.get<AjaxResult<EngAgentChatQuickVO[]>>('/eng/chatQuick/getUserAccountChatQuickList', { quickType })
}

/**
 * 修改智能体会话模板数据
 * @summary 更新快捷会话模板
 * @param params 模板参数
 */
export function updateChatQuick(params: EngAgentChatQuickUpdate) {
  return http.put<AjaxResult<object>>('/eng/chatQuick/update', params)
}

export interface QuickTypeItem {
  quickTypeTitle: string
  quickTypeValue: string
}

/**
 * 获取快捷语类型列表
 */
export function getQuickTypeList() {
  return http.get<AjaxResult<QuickTypeItem[]>>('/eng/chatQuick/getQuickTypeList')
}

// ==================== 常量枚举 ====================

/** 快捷会话类型 */
export const QuickType = {
  待办事项: '0',
  录入资料: '1',
  查询记录: '2',
  汇总数据: '3'
} as const

/** 快捷会话类型映射 */
export const QuickTypeMap: Record<string, string> = {
  '0': '待办事项',
  '1': '录入资料',
  '2': '查询记录',
  '3': '汇总数据'
}
