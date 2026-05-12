import { http } from '../utils/request.js'

/**
 * 获取 IM 长连接地址
 * @param {object} params
 * @param {number} params.sourceType 登录来源：PC端:1，智能体-pc端:3，智能体-PC安装版:4
 * @returns {Promise<{
 *   modelType: number, // 部署模式：1 单机，2 集群
 *   wsAddr: string     // WebSocket 连接地址
 * }>}
 */
export function getChatIMLongConnection(params) {
  return http.get('/app/chat/getChatIMLongConnection', params)
}

/**
 * 获取当前用户的会话列表
 * @returns {Promise<Array<{
 *   pkId: number,        // 会话主键ID
 *   chatTitle: string,   // 会话标题
 *   createTime: string,  // 创建时间
 *   createUser: string,  // 创建人
 *   updateTime: string,  // 更新时间
 *   updateUser: string   // 更新人
 * }>>}
 */
export function getUserAccountChatList() {
  return http.get('/app/agent/getUserAccountChatList')
}

/**
 * 新增会话
 * @param {object} data
 * @param {string} data.chatTitle 会话标题
 * @returns {Promise<{
 *   code: number, // 状态码
 *   msg: string,  // 消息
 *   data: number  // 新建会话的主键ID (pkId)
 * }>}
 */
export function addChat(data) {
  return http.post('/app/agent/add', data)
}

/**
 * 删除会话
 * @param {number|string} id 会话主键ID (pkId)
 * @returns {Promise<{ code: number, msg: string, data: object }>}
 */
export function deleteAgent(id) {
  return http.delete(`/app/agent/delete/${id}`)
}

/**
 * 新增会话记录
 * @param {object} data
 * @param {number}   data.fkChatId                     会话ID（来自 addChat 返回的 data）
 * @param {string}   data.chatContent                   消息内容
 * @param {string}   data.chatObject                    发送方：用户:0，智能体:1
 * @param {Array<{
 *   fileType: string,  // 文件类型
 *   fileUrl: string,   // 文件 URL
 *   fileName: string   // 文件名
 * }>} [data.chatRecordFileList] 附件列表（可选）
 * @returns {Promise<{ code: number, msg: string, data: object }>}
 */
export function addChatRecordData(data) {
  return http.post('/app/agent/addChatRecordData', data, undefined, { silent: true })
}

/**
 * 分页查询会话记录
 * @param {object} params
 * @param {number}  params.fkChatId      会话ID（必填）
 * @param {number}  params.pageNum       当前页（必填）
 * @param {number}  params.pageSize      每页条数（必填）
 * @param {string}  [params.beginTime]   查询开始时间
 * @param {string}  [params.endTime]     查询结束时间
 * @param {string}  [params.frontTime]   上一条记录的操作时间（用于游标翻页）
 * @returns {Promise<{
 *   code: number,
 *   msg: string,
 *   data: {
 *     current: number,  // 当前页
 *     size: number,     // 每页大小
 *     total: number,    // 总记录数
 *     records: Array<{
 *       pkId: number,          // 记录主键ID
 *       fkChatId: number,      // 所属会话ID
 *       chatContent: string,   // 消息内容
 *       chatObject: string,    // 发送方：0 用户，1 智能体
 *       chatRecordFileList: Array<{
 *         pkId: number,
 *         fileType: string,
 *         fileUrl: string,
 *         fileName: string
 *       }>
 *     }>
 *   }
 * }>}
 */
export function chatRecordDataSearchPage(params) {
  return http.get('/app/agent/chatRecordDataSearchPage', params)
}

/**
 * 获取 OSS 文件上传临时 Token
 * @returns {Promise<{ code: number, msg: string, data: string }>} data 为上传凭证
 */
export function getUploadToken() {
  return http.get('/app/file/temporary/token')
}

/**
 * 获取阿里云语音识别 Token
 * @returns {Promise<{ code: number, msg: string, data: string }>} data 为语音识别 Token
 */
export function getAliyunToken() {
  return http.get('/app/voice/aliyunToken')
}

/**
 * 分页查询待办任务列表
 * @param {object} params
 * @param {number} params.pageNum 当前页
 * @param {number} [params.pageSize] 每页条数
 * @param {number} [params.messageType] 消息类型（0：待办消息，1：确认消息，2：提醒消息）
 * @returns {Promise<{
 *   code: number, msg: string,
 *   data: { current: number, size: number, total: number,
 *     records: Array<{
 *       pkId: number, fkUserId: number, fkUserName: string,
 *       messageType: number, title: string, businessType: number,
 *       businessTypeName: string, matterType: number, matterStatus: number,
 *       quickWords: string, quickLobsterWords: string,
 *       quickButtonName: string, createTime: string,
 *       projectBidId: number, projectBidName: string,
 *       roleName: string, renewalButton: number,
 *       sealCode: string, sealPersonStatus: number,
 *       type: number, processingTime: string
 *     }>
 *   }
 * }>}
 */
export function searchBacklogPageList(params) {
  return http.get('/eng/agentUser/searchBacklogPageList', params)
}

/**
 * 获取移动端版本信息
 * @returns {Promise<{ code: number, msg: string, data: object }>}
 */
export function getMobileVersionInfo() {
  return http.get('/app/agent/getMobileVersionInfo')
}

/**
 * 获取定时任务列表
 * @returns {Promise<{ code: number, msg: string, data: Array }>}
 */
export function searchTimingTaskByUserId() {
  return http.get('/app/agent/searchTimingTaskByUserId')
}

/**
 * 保存或更新定时任务
 * @param {object} data
 * @returns {Promise<{ code: number, msg: string, data: object }>}
 */
export function saveOrUpdateTimingTask(data) {
  return http.post('/app/agent/saveOrUpdateTimingTask', data)
}
