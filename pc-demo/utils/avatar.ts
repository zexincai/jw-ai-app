/**
 * 根据组织类型获取对应的预设头像
 * @param orgType 组织类型
 */
export function getAvatarByOrgType(orgType?: number): string | null {
  if (orgType === undefined || orgType === null) return null;

  const mapping: Record<number, string> = {
    0: 'yy.png',
    1: 'dl.png',
    2: 'js.png',
    3: 'jl.png',
    4: 'sg.png',
    5: 'xm.png',
    6: 'gy.png',
    7: 'fb.png',
    8: 'lw.png',
    9: 'sj.png',
    10: 'sgjt.png',
    11: 'zfjg.png',
    12: 'jsjt.png',
    13: 'rebar.png',
    14: 'xm.png',
  };

  const fileName = mapping[orgType];
  if (!fileName) return null;

  // 使用 URL 构造函数确保在 Vite 中正确加载资源
  return new URL(`../assets/headPortrait/${fileName}`, import.meta.url).href;
}
