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

/* ------------------------------------------------------------------ */
/* Assets                                                              */
/* ------------------------------------------------------------------ */
export type AssetStatus = 'In-Use' | 'Repair' | 'Decommissioned'

export interface Asset {
  asset_id: number
  asset_tag: string
  serial_number: string
  status: AssetStatus
  model_id: number
  model_name: string
  category: string
  risk_class: string
  manufacturer: string
  supplier: string | null
  location_id: number
  room_name: string
  department_id: number
  department: string
  purchase_date: string
  purchase_cost: number
  warranty_expiry: string | null
  warranty_status: 'None' | 'Active' | 'Expiring' | 'Expired'
  runtime_hours: number
  age_years: number
  decommissioned_at: string | null
  decommission_reason: string | null
  lifetime_maintenance_cost: number
  open_alerts: number
}

export interface ScheduleStatus {
  schedule_id: number
  asset_id: number
  asset_tag: string
  model_name: string
  department: string
  type_id: number
  type_name: string
  interval_basis: 'CALENDAR' | 'RUNTIME'
  interval_days: number | null
  interval_hours: number | null
  alert_lead_days: number
  alert_lead_hours: number
  last_performed_date: string | null
  last_performed_hours: number | null
  next_due_date: string | null
  next_due_hours: number | null
  current_runtime_hours: number
  is_active: number
  days_remaining: number | null
  hours_remaining: number | null
  due_state: 'Overdue' | 'Due Soon' | 'OK'
}

export interface Transfer {
  transfer_id: number
  transferred_at: string
  transferred_by: string
  reason: string | null
  from_location: string
  to_location: string
}

export interface StatusHistoryEntry {
  history_id: number
  old_status: AssetStatus | null
  new_status: AssetStatus
  changed_at: string
  changed_by: string
  remarks: string | null
}

export interface WorkOrderSummary {
  work_order_id: number
  wo_number: string
  asset_id: number
  asset_tag: string
  model_name: string
  department: string
  type_name: string
  is_preventive: number
  is_calibration: number
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: 'Open' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled'
  description: string
  resolution_notes: string | null
  created_by: string
  opened_at: string
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  labor_cost: number
  parts_cost: number
  total_cost: number
  technicians: string | null
  days_open: number
}

export interface AssetDetail {
  asset: Asset
  schedules: ScheduleStatus[]
  transfers: Transfer[]
  status_history: StatusHistoryEntry[]
  work_orders: WorkOrderSummary[]
}

/* dropdown data from /api/lookups/<name>/ */
export interface DepartmentOption {
  department_id: number
  code: string
  name: string
}
export interface LocationOption {
  location_id: number
  department_id: number
  department: string
  room_name: string
  label: string
}
export interface ModelOption {
  model_id: number
  model_name: string
  category: string
  manufacturer: string
  label: string
}
export interface SupplierOption {
  vendor_id: number
  name: string
}

/* ------------------------------------------------------------------ */
/* Work orders                                                         */
/* ------------------------------------------------------------------ */
export type WorkOrderStatus = WorkOrderSummary['status']

export interface LaborLine {
  assignment_id: number
  technician_id: number
  technician: string
  specialization: string | null
  role: 'Lead' | 'Assistant'
  hours_worked: number
  hourly_rate: number
  labor_cost: number
  assigned_at: string
}

export interface PartLine {
  wo_part_id: number
  part_id: number
  part_number: string
  part_name: string
  quantity: number
  unit_cost: number
  line_cost: number
  used_at: string
}

export interface CalibrationRecord {
  calibration_id: number
  calibrated_on: string
  result: 'Pass' | 'Fail' | 'Adjusted'
  certificate_no: string | null
  notes: string | null
}

export interface WorkOrderDetail {
  work_order: WorkOrderSummary
  labor: LaborLine[]
  parts: PartLine[]
  calibration: CalibrationRecord | null
}

export interface MaintenanceTypeOption {
  type_id: number
  name: string
  is_preventive: number
  is_calibration: number
}

export interface TechnicianOption {
  technician_id: number
  employee_no: string
  full_name: string
  specialization: string | null
  hourly_rate: number
  is_active: number
}

export interface PartOption {
  part_id: number
  part_number: string
  name: string
  unit_cost: number
  quantity_on_hand: number
  reorder_level: number
  is_low_stock: number
}
