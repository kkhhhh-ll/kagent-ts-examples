/** 团队计划 */
export interface TeamPlan {
  /** 唯一标识 */
  id: number
  /** 计划日期 YYYY-MM-DD */
  date: string
  /** 计划内容 */
  content: string
  /** 填写人 */
  creator: string
  /** 拜访时间 HH:mm */
  visitTime: string
  /** 创建时间 ISO 字符串 */
  createTime: string
}

/** 创建/编辑计划表单数据 */
export interface PlanFormData {
  date: string
  content: string
  creator: string
  visitTime: string
}
