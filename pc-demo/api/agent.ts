/**
 * 建网科技工程管理系统 - 智能体模块 API
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

/**
 * 分页响应
 * @description 分页数据封装
 */
export interface PageInfo<T = any> {
  /** 当前页 */
  current: number
  /** 每页大小 */
  size: number
  /** 总记录数 */
  total: number
  /** 列表数据 */
  records: T[]
}

// ==================== 智能体用户管理 - 请求参数接口 ====================

/**
 * 智能会话文件记录
 * @description 会话文件信息（请求参数）
 */
export interface ChatRecordFile {
  /** 文件类型 */
  fileType?: string
  /** 文件URL */
  fileUrl?: string
  /** 文件名称 */
  fileName?: string
}

/**
 * 新增智能体会话记录请求参数
 * @description 新增智能体会话记录表数据
 */
export interface EngAgentUserChatAdd {
  chatTitle: string
}
export interface EngAgentUserChatAddVo {
  chatTitle: string
  /** 状态码 */
  code: number
  /** 响应数据 */
  data: number
  /** 消息 */
  msg: string
}

/**
 * 新增智能体会话记录请求参数
 * @description 新增智能体会话记录表数据
 */
export interface EngAgentUserChatRecordAdd {
  /** 会话ID */
  fkChatId?: number
  /** 会话记录内容 */
  chatContent?: string
  /** 会话对象(用户：0, 智能体:1) */
  chatObject?: string
  /** 文件列表 */
  chatRecordFileList?: ChatRecordFile[]
}

// ==================== 智能体用户管理 - 响应数据接口 ====================

/**
 * 智能体用户信息
 * @description 智能体用户视图对象
 */
/**
 * 智能体用户信息
 * @description 智能体用户视图对象
 */
export interface EngAgentUserVo {
  /** 证件号码 */
  cardNum?: string
  /** 证件类型 */
  certType?: string
  /** 组织ID */
  fkOrgId?: number
  /** 组织名称 */
  orgName?: string
  /** 组织状态 */
  orgStatus?: number
  /** 组织类型 */
  orgType?: number
  /** 主键ID */
  pkId?: number
  /** 头像URL */
  portraitUrl?: string
  /** 真实姓名 */
  realName?: string
  /** 实名认证状态 */
  realNameVerify?: number
  /** 性别 */
  sex?: number
  /** 简称 */
  shortName?: string
  /** 手机号 */
  telephone?: string
  /** 用户关联的定时任务编码列表 */
  timingTaskCodeList?: number[]
}

// ==================== 智能体会话管理 - 响应数据接口 ====================

/**
 * 智能会话文件记录 VO
 * @description 会话文件视图对象
 */
export interface ChatRecordFileVO {
  /** 文件类型 */
  fileType?: string
  /** 文件URL */
  fileUrl?: string
  /** 主键ID */
  pkId?: number
  /** 文件名称 */
  fileName?: string
}

/**
 * 智能体会话记录 VO
 * @description 智能体会话记录视图对象
 */
export interface EngAgentUserChatRecordVO {
  /** 智能体会话ID（关联表 agent_user_chat） */
  fkChatId?: number
  /** 主键ID */
  pkId?: number
  kChatId?: number
  /** 会话记录内容 */
  chatContent?: string
  /** 会话对象(用户：0, 智能体:1) */
  chatObject?: string
  /** 文件列表 */
  chatRecordFileList?: ChatRecordFileVO[]
}

/**
 * 智能体会话 VO
 * @description 智能体会话视图对象
 */
export interface EngAgentUserChatVO {
  /** 会话标题 */
  chatTitle?: string
  /** 创建时间 */
  createTime?: string
  /** 创建人 */
  createUser?: string
  /** 主键ID */
  pkId?: number
  /** 更新时间 */
  updateTime?: string
  /** 更新人 */
  updateUser?: string
}

// ==================== API 接口 ====================

// -------- 智能体会话管理 --------


/**
 * 新增智能体会话表数据
 * @summary 新增会话
 * @param params 记录参数
 */
export function addChat(params: EngAgentUserChatAdd) {
  return http.post<AjaxResult<EngAgentUserChatAddVo>>('/eng/agent/add', params)
}

/**
 * 新增智能体会话记录表数据
 * @summary 新增会话记录
 * @param params 记录参数
 */
export function addChatRecordData(params: EngAgentUserChatRecordAdd) {
  return http.post<AjaxResult<object>>('/eng/agent/addChatRecordData', params)
}

/**
 * 删除智能体会话表
 * @summary 删除会话
 * @param pkId 主键ID
 */
export function deleteAgent(pkId: string) {
  return http.delete<AjaxResult<object>>('/eng/agent/delete', { pkId })
}

/**
 * 根据条件查询智能体会话表
 * @summary 获取会话列表
 * @param chatTitle 会话标题（可选）
 */
export function getUserAccountChatList(chatTitle: string) {
  return http.get<AjaxResult<EngAgentUserChatVO[]>>('/eng/agent/getUserAccountChatList', { chatTitle })
}

/**
 * 根据会话ID获取会话数据（分页）
 * @summary 分页查询会话记录
 * @param params 查询参数
 */
export function chatRecordDataSearchPage(params: {
  /** 查询开始时间 */
  beginTime?: string
  /** 查询结束时间 */
  endTime?: string
  /** 智能体会话ID（关联表 agent_user_chat） */
  fkChatId: number
  /** 前面的操作时间 */
  frontTime?: string
  /** 当前页 */
  pageNum: number
  /** 记录数 */
  pageSize: number
}) {
  return http.get<AjaxResult<PageInfo<EngAgentUserChatRecordVO>>>('/eng/agent/chatRecordDataSearchPage', params)
}

// -------- 智能体用户管理 --------

/**
 * 获取当前登陆者个人信息
 * @summary 获取当前用户信息
 * 新增 timingTaskCodeList字段，返回用户关联的定时任务编码列表
 */
export function getPersonalUserInfo() {
  return http.get<AjaxResult<EngAgentUserVo>>('/eng/agentUser/personal/info')
}

// -------- IM 长连接 --------

/**
 * 获取IM长连接地址
 * @param sourceType 登录来源 1: PC端, 3: 智能体-pc端, 4: 智能体-PC安装版
 */
export interface ChatIMLongConnectionVO {
  modelType: number  // 1: 单机, 2: 集群
  wsAddr: string
}

export function getChatIMLongConnection(params: { sourceType: number }) {
  return http.get<AjaxResult<ChatIMLongConnectionVO>>('/eng/chat/getChatIMLongConnection', params)
}

/**
 * 版本信息 VO
 * @description 版本信息视图对象
 */
export interface EngVersionVo {
  /** 启用状态 (待更新: 1, 已更新: 2) */
  enableStatus?: number
  /** 强制更新 (否: 0, 是: 1) */
  forceStatus?: string
  /** 备注 */
  remark?: string
  /** 版本更新开始时间 */
  updateBeginTime?: string
  /** 更新内容 */
  updateContent?: string
  /** 版本更新结束时间 */
  updateEndTime?: string
  /** 当前版本号 */
  versionCode?: string
}

/**
 * 获取移动端版本信息
 * @summary 获取版本信息列表
 * @param mobileType PC端(PC端: 2, 智能体-PC端: 6, 智能体-移动端: 7)
 */
export function getMobileVersionInfo(mobileType: string) {
  return http.get<EngVersionVo[]>('/eng/version/getMobileVersionInfo', { mobileType })
}


// -------- 字典管理 --------

/**
 * 字典项 VO
 * @description 字典数据视图对象
 */
export interface DictItemVo {
  /** 字典编码 */
  dictCode?: string
  /** 字典值 */
  dictValue?: string
}

/**
 * 获取字典数据
 * @summary 获取任务编码
 * @param dictType 字典类型 (82: 任务编码)
 */
export function findDictByType(dictType: number) {
  return http.get<AjaxResult<DictItemVo[]>>('/eng/dict/findDictByType', { dictType })
}
// -------- 定时任务管理 --------

/**
 * 任务开始时间
 */
export interface TaskStartTime {
  hour?: number
  minute?: number
  nano?: number
  second?: number
}

/**
 * 任务规则详情
 */
export interface TimingTaskRuleDetails {
  dayNum?: number // 代表时间（循环类型等于1时 类型（1-7）1代表周一，循环类型等于2时 类型（1-31）代表每日多少号
  taskDate?: string // 任务时间 格式： yyyy-MM-dd, 只有每日、每年使用
  taskStartTime?: string // 开始时间，格式：HH:MM:SS
}

/**
 * 任务规则
 */
export interface TimingTaskRule {
  circulateType?: number // 循环类型(每日：0，每周：1，每月：2，每年：3)
  timingTaskRuleDetailsList?: TimingTaskRuleDetails[]
  workType?: number // 工作类型(单次：0,循环：1)
}

/**
 * 智能体定时任务 VO
 */
export interface AgentTimingTaskVo {
  enableStatus?: number
  taskCode?: number
  timingTaskRuleList?: TimingTaskRule[]
}

/**
 * 根据当前用户查询智能体定时任务列表
 * @summary 查询定时任务列表
 */
export function searchTimingTaskByUserId() {
  return http.get<AjaxResult<AgentTimingTaskVo[]>>('/eng/agentTimingTask/searchByUserId')
}

/**
 * 新增或更新定时任务
 * @summary 保存定时任务
 * @param params 任务参数
 */
export function saveOrUpdateTimingTask(params: AgentTimingTaskVo) {
  return http.post<AjaxResult<number>>('/eng/agentTimingTask/saveOrUpdate', params)
}


// -------- 待办任务管理 --------

/**
 * 待办任务项 VO
 * @description 待办任务视图对象
 */
export interface BacklogItemVo {
  /** 用章流程归属业务id */
  belongSealBusinessId?: number
  /** 业务类型：0:生产 1:计量结算 2:盘点 3:设计变更 4:用章管理 6:单位质量评定流程 7:分部质量评定流程 8:年度进度审批流程 9:季度进度审批流程 10:月度进度审批流程 11:分包合同审批流程 12:供货合同审批流程 13:供应商请款审批流程 14:分包商请款审批流程 15:成本审批流程 21:加工计价审批流程 22:加工合同审批流程 4:甲供盘点 */
  bizType?: number
  /** 业务类型：1:施工验收流程待办 2:业主计量流程待办 3:分包计价流程待办 4:变更设计流程待办 5:会议签到 6:技术交底 7:盘点流程待办 8:申请用章流程待办 9:收发文待办 10:商务用户续费 11:付费用户续费 12:短信签名申请 13:短信赠送及充值申请 14:合同签署 15:工资结算 16:工资发放 17:收发文指定人员待办 */
  businessType?: number
  /** 待办类型名称 */
  businessTypeName?: string
  /** 创建时间 */
  createTime?: string
  /** 创建用户（关联表sys_user） */
  createUser?: number
  /** 对应业务id */
  fkBusinessId?: number
  /** 流程实例ID（关联工作流的实例ID） */
  fkFlowCaseId?: string
  /** 流程任务ID */
  fkFlowTaskId?: string
  /** 节点ID（关联表：base_workflow_node） */
  fkNodeId?: number
  /** 关联人ID（关联表sys_user） */
  fkUserId?: number
  /** 负责人名称 */
  fkUserName?: string
  /** 办理状态（0:待办 1:已办 2:已过期） */
  handleStatus?: number
  /** 事项状态（0:正常待办 1:发起用章待办） */
  matterStatus?: number
  /** 事项类型：1:施工验收流程待办 2:业主计量流程待办 3:分包计价流程待办 4:变更设计流程待办 5:会议签到 6:技术交底 7:盘点流程待办 8:申请用章流程待办 9:收发文指定单位待办 10:商务用户续费 11:付费用户续费 12:短信签名申请 13:短信赠送及充值申请 14:合同签署 15:工资结算 16:工资发放 17:收发文指定人员待办 18:授权待办 19:质量隐患排查待办 20:安全隐患排查待办 21:甲供盘点流程待办 22:质量教育 23:安全教育 24:单位质量评定流程 25:分部质量评定流程 26:年度进度审批流程 27:季度进度审批流程 28:月度进度审批流程 29:分包合同审批流程 30:供货合同审批流程 31:供应商请款审批流程 32:分包商请款审批流程 33:成本审批流程 34:物资签收单 35:物资入库单 36:加工计价 37:加工合同审批流程 */
  matterType?: number
  /** 模拟发送：0，私下发送：1 */
  mechanismType?: number
  /** 消息类型（0：待办消息，1：确认消息，2：提醒消息），由缓存时本地标记 */
  messageType?: number
  /** 主键 */
  pkId?: number
  /** 处理意见 */
  processingOpinion?: string
  /** 处理结果 */
  processingResult?: string
  /** 处理时间 */
  processingTime?: string
  /** 标段项目ID */
  projectBidId?: number
  /** 标段项目名称（注意：需要续期才有返回） */
  projectBidName?: string
  /** 待办操作按钮名称 */
  quickButtonName?: string
  /** 小龙虾词语 */
  quickLobsterWords?: string
  /** 用户词语 */
  quickWords?: string
  /** 续期按钮显示（不显示：0 显示：1） */
  renewalButton?: number
  /** 负责岗位 */
  roleName?: string
  /** 业务场景：matterStatus=1时只有用到，1:生产 2:业主计量 3:分包计价 4:设计变更 5:盘点 6:甲供盘点 */
  sealCode?: string
  /** 是否盖章人节点（0:否 1:是） */
  sealPersonStatus?: number
  /** 标题 */
  title?: string
  /** 资金计划类型：0:资金预付款 1:资金进度款 2:资金审批 */
  type?: number
}

/**
 * 分页查询待办任务列表
 * @summary 查询待办任务
 * @param params 查询参数
 */
export function searchBacklogPageList(params?: {
  pageNum: number,
  pageSize?: number,
  messageType?: number // 消息类型（0：待办消息，1：确认消息，2：提醒消息）
}) {
  return http.get<AjaxResult<PageInfo<BacklogItemVo>>>('/eng/agentUser/searchBacklogPageList', params)
}