/** Shapes of the JSON returned by the Django API (they mirror the stored procedure result sets). */

export interface DashboardSummary {
  total_assets: number
  in_use: number
  in_repair: number
  decommissioned: number
  open_alerts: number
  overdue_alerts: number
  active_work_orders: number
  active_schedules: number
  overdue_schedules: number
  warranties_expiring: number
  low_stock_parts: number
  maintenance_cost_ytd: number
}

export interface DepartmentCount {
  department: string
  assets: number
  in_repair: number | null
}

export interface AttentionItem {
  schedule_id: number
  asset_id: number
  asset_tag: string
  model_name: string
  department: string
  type_name: string
  interval_basis: 'CALENDAR' | 'RUNTIME'
  due_state: 'Overdue' | 'Due Soon' | 'OK'
  days_remaining: number | null
  hours_remaining: number | null
}

export interface DashboardData {
  summary: DashboardSummary
  by_department: DepartmentCount[]
  attention: AttentionItem[]
}

export interface CostRow {
  work_orders: number
  labor_cost: number
  parts_cost: number
  total_cost: number
}

export interface CostReport {
  by_department: (CostRow & { department: string })[]
  by_category: (CostRow & { category: string })[]
  by_type: { kind: 'Preventive' | 'Corrective'; work_orders: number; total_cost: number }[]
  top_assets: { asset_tag: string; model_name: string; department: string; work_orders: number; total_cost: number }[]
  by_month: { month_no: number; work_orders: number; total_cost: number }[]
}
