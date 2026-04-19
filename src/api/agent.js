import { http } from '../utils/request.js'

export function getChatIMLongConnection(params) {
  return http.get('/eng/chat/getChatIMLongConnection', params)
}

export function getUserAccountChatList() {
  return http.get('/eng/agent/getUserAccountChatList')
}

export function addChat(data) {
  return http.post('/eng/agent/add', data)
}

export function deleteAgent(id) {
  return http.delete(`/eng/agent/delete/${id}`)
}

export function addChatRecordData(data) {
  return http.post('/eng/agent/addChatRecordData', data)
}

export function chatRecordDataSearchPage(params) {
  return http.get('/eng/agent/chatRecordDataSearchPage', params)
}

export function getUploadToken() {
  return http.get('/eng/file/temporary/token')
}

export function getAliyunToken() {
  return http.get('/eng/voice/aliyunToken')
}
