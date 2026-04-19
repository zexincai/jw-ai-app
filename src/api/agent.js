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
  return http.get('/eng/chat/getChatIMLongConnection', params)
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
  return http.get('/eng/agent/getUserAccountChatList')
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
  return http.post('/eng/agent/add', data)
}

/**
 * 删除会话
 * @param {number|string} id 会话主键ID (pkId)
 * @returns {Promise<{ code: number, msg: string, data: object }>}
 */
export function deleteAgent(id) {
  return http.delete(`/eng/agent/delete/${id}`)
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
  return http.post('/eng/agent/addChatRecordData', data, undefined, { silent: true })
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
  return http.get('/eng/agent/chatRecordDataSearchPage', params)
}

/**
 * 获取 OSS 文件上传临时 Token
 * @returns {Promise<{ code: number, msg: string, data: string }>} data 为上传凭证
 */
export function getUploadToken() {
  return http.get('/eng/file/temporary/token')
}

/**
 * 获取阿里云语音识别 Token
 * @returns {Promise<{ code: number, msg: string, data: string }>} data 为语音识别 Token
 */
export function getAliyunToken() {
  return http.get('/eng/voice/aliyunToken')
}
