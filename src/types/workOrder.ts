/** 工单类型 */
export type WorkOrderType = '项目验收' | '项目赠送'

/** 工单数据模型 */
export interface WorkOrder {
  /** 唯一标识 */
  id: number
  /** 单据编号，自动生成：WO-yyyyMMdd-XXX */
  code: string
  /** 创建时间 ISO 字符串 */
  createTime: string
  /** 创建人 */
  creator: string
  /** 工单类型 */
  type: WorkOrderType
  /** 工期 */
  duration: number
  /** 费用（元） */
  cost: number
}

/** 创建工单时的表单数据（不包含自动生成的字段） */
export interface WorkOrderFormData {
  creator: string
  type: WorkOrderType
  duration: number
  cost: number
}

/** 分页查询参数 */
export interface WorkOrderQuery {
  page: number
  pageSize: number
  keyword?: string
  type?: WorkOrderType | ''
}

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[]
  total: number
}
