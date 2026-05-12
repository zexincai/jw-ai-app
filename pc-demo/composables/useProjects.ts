import { computed } from 'vue'
import { useChatStore } from '../stores/chat'
import type { Project } from '../stores/chat'
import { useAuth } from './useAuth'

const STORAGE_KEY = 'jclaw_projects'
const ACTIVE_PROJECT_KEY = 'jclaw_active_project'

function defaultProjects(): Project[] {
  return [
    { id: 'role-sales', name: '销售助手', channelId: 'agent:sales:main' },
    { id: 'role-service', name: '客服专员', channelId: 'agent:service:main' },
    { id: 'role-analyst', name: '数据分析', channelId: 'agent:analyst:main' },
    { id: 'role-hr', name: '招聘专员', channelId: 'agent:hr:main' },
    { id: 'role-finance', name: '财务助手', channelId: 'agent:finance:main' },
  ]
}

function load(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : defaultProjects()
  } catch { return defaultProjects() }
}

function save(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function useProjects() {
  const store = useChatStore()

  function init() {
    const { roles, isLoggedIn } = useAuth()
    // 登录后优先使用接口返回的角色列表
    if (isLoggedIn.value && roles.value.length) {
      store.projects = roles.value.map(r => ({
        id: r.userId,
        name: r.orgName,
        avatar: r.avatar,
        orgType: r.orgType,
        isMaster: r.isMaster,
        // 如果 API 不再提供 channelId，使用基于 userId 的默认值
        channelId: `agent:${r.userId}:main`,
      }))
      // 尝试从 localStorage 恢复上次选择的项目
      const savedActiveId = localStorage.getItem(ACTIVE_PROJECT_KEY)
      if (savedActiveId && store.projects.find(p => p.id === savedActiveId)) {
        store.activeProjectId = savedActiveId
      } else if (!store.activeProjectId || !store.projects.find(p => p.id === store.activeProjectId)) {
        store.activeProjectId = store.projects[0]?.id ?? ''
      }
      return
    }
    const stored = load()
    const isOldDefault = stored.length === 1 && stored[0].id === 'all'
    store.projects = isOldDefault ? defaultProjects() : stored
    if (!store.activeProjectId || isOldDefault) {
      store.activeProjectId = store.projects[0]?.id ?? ''
    }
  }

  function setActive(projectId: string) {
    store.activeProjectId = projectId
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId)
  }

  function addProject(name: string, channelId: string) {
    const p: Project = { id: crypto.randomUUID(), name, channelId }
    store.projects.push(p)
    save(store.projects)
  }

  function removeProject(id: string) {
    store.projects = store.projects.filter(p => p.id !== id)
    save(store.projects)
    if (store.activeProjectId === id) {
      store.activeProjectId = store.projects[0]?.id ?? ''
    }
  }

  const activeProject = computed(() => store.activeProject())

  return { init, setActive, addProject, removeProject, activeProject }
}
