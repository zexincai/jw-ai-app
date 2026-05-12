export interface QuickAction {
  id: string
  label: string
  message?: string,
  messageList?: QuickAction[]
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'todo',    label: '待办事项', messageList: [{ id: 'todo', label: '显示我的待办事项', message: '显示我的待办事项' }, { id: 'todo', label: '显示所有待办事项', message: '显示所有待办事项' }] },
  { id: 'record',  label: '录入资料', message: '我要录入资料' },
  { id: 'query',   label: '查询记录', message: '查询记录' },
  { id: 'summary', label: '汇总数据', message: '汇总数据' },
]
