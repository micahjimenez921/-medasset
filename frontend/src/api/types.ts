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
  maintenance_cost_ytd: number | null
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
  acquisition_type: 'Public bidding' | 'Donation'
  donor: string | null
  location_id: number
  room_name: string
  department_id: number
  department: string
  purchase_date: string
  purchase_cost: number | null
  warranty_expiry: string | null
  warranty_status: 'None' | 'Active' | 'Expiring' | 'Expired'
  runtime_hours: number
  age_years: number
  decommissioned_at: string | null
  decommission_reason: string | null
  lifetime_maintenance_cost: number | null
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
  service_report_no: string | null
  created_by: string
  opened_at: string
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  labor_cost: number | null
  parts_cost: number | null
  total_cost: number | null
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
  team: string
  company: string | null
  kind: 'Staff' | 'External'
  user_id: number | null
  role: 'Lead' | 'Assistant'
  hours_worked: number
  hourly_rate: number | null
  labor_cost: number | null
  assigned_at: string
}

export interface PartLine {
  wo_part_id: number
  part_id: number
  part_number: string
  part_name: string
  quantity: number
  unit_cost: number | null
  line_cost: number | null
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
  team: string
  hourly_rate: number | null
  is_active: number
  company: string | null
  kind: 'Staff' | 'External'
  user_id: number | null
  username: string | null
}

/** One row of the Technicians page (sp_list_technicians) */
export interface TechnicianRow {
  technician_id: number
  employee_no: string
  first_name: string
  last_name: string
  full_name: string
  specialization: string | null
  team: string
  company: string | null
  contact_number: string | null
  email: string | null
  hourly_rate: number
  is_active: number
  kind: 'Staff' | 'External'
  user_id: number | null
  username: string | null
  active_jobs: number
}

export interface LinkableAccount {
  user_id: number
  username: string
  full_name: string
}

export interface TechnicianListData {
  technicians: TechnicianRow[]
  available_accounts: LinkableAccount[]
}

export const STAFF_TEAMS = ['In-house maintenance', 'Provincial engineering'] as const
export const EXTERNAL_TEAMS = ['Outsourced contractor', 'Manufacturer service'] as const

export interface PartOption {
  part_id: number
  part_number: string
  name: string
  unit_cost: number | null
  quantity_on_hand: number
  reorder_level: number
  is_low_stock: number
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */
export interface AlertItem {
  alert_id: number
  schedule_id: number
  asset_id: number
  asset_tag: string
  model_name: string
  department: string
  type_name: string
  alert_type: 'UPCOMING' | 'OVERDUE'
  severity: 'Warning' | 'Critical'
  message: string
  status: 'Open' | 'Acknowledged' | 'Resolved'
  generated_at: string
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  work_order_id: number | null
}

/* ------------------------------------------------------------------ */
/* Audit + job logs                                                    */
/* ------------------------------------------------------------------ */
export interface AuditLogEntry {
  audit_id: number
  table_name: string
  record_id: number
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  /** JSON text written by the database trigger */
  old_values: string | null
  new_values: string | null
  changed_by: string
  changed_at: string
}

export interface JobLogEntry {
  job_log_id: number
  job_name: string
  triggered_by: 'EVENT' | 'MANUAL'
  alerts_created: number
  run_by: string | null
  ran_at: string
}

// ---------------------------------------------------------------------
// Sign-in, users and security
// ---------------------------------------------------------------------
export type RoleName = 'Administrator' | 'Technician' | 'Viewer'

export interface AuthUser {
  user_id: number
  username: string
  full_name: string
  email: string | null
  role: RoleName
  must_change_password: boolean
  permissions: string[]
}

export interface UserRow {
  user_id: number
  username: string
  full_name: string
  email: string | null
  role_id: number
  role_name: RoleName
  is_active: number
  must_change_password: number
  is_locked: number
  last_login_at: string | null
  password_changed_at: string | null
  created_at: string
  created_by: string
}

export interface RoleInfo {
  role_id: number
  name: RoleName
  description: string
  active_users: number
}

export interface PermissionInfo {
  permission_id: number
  code: string
  category: string
  description: string
}

export interface RoleMatrixData {
  roles: RoleInfo[]
  permissions: PermissionInfo[]
  grants: { role_id: number; permission_code: string }[]
}

export interface SecurityEvent {
  event_id: number
  event_type: string
  user_id: number | null
  username: string | null
  actor: string | null
  ip_address: string | null
  detail: string | null
  created_at: string
}

/** Returned once when an account is created or a password is reset. */
export interface TemporaryPasswordResult {
  user_id: number
  username: string
  temporary_password: string
}
