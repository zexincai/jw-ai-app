import { http } from '../utils/request.js'

/**
 * 获取快捷语列表
 * @param {string} quickType  0:待办事项 1:录入资料 2:查询记录 3:汇总数据
 */
export function getChatQuickList(quickType) {
  return http.get('/app/chatQuick/getUserAccountChatQuickList', { quickType })
}

/**
 * 新增快捷语
 * @param {{ quickType: string, quickTitle: string, quickWords: string }} params
 */
export function addChatQuick(params) {
  return http.post('/app/chatQuick/add', params)
}

/**
 * 删除快捷语
 * @param {string} pkId
 */
export function deleteChatQuick(pkId) {
  return http.delete('/app/chatQuick/delete', { pkId })
}

/**
 * 获取快捷语类型列表
 * @returns {Promise<Array<{ quickTypeTitle: string, quickTypeValue: string }>>}
 */
export function getQuickTypeList() {
  return http.get('/app/chatQuick/getQuickTypeList')
}
