// src/pages/Attendance.jsx (adjust the import path for your project)
// Receptionists manage attendance. Admins/Super Admins have read-only clinic-wide reporting.
// Uses Bootstrap 5 + lucide-react.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowRight, Building2, CalendarDays, Check, CheckCircle2,
  ClipboardCheck, Clock3, Download, Filter, History, LoaderCircle, LogIn,
  LogOut, RefreshCw, Search, ShieldAlert, UserCheck, UserRound, Users,
  X, XCircle, Eye,
} from "lucide-react";
import apiRequest from "../../services/api";

const PREFIX = "/attendance";
// Use the shared clinic branch listing, not /attendance/branches.
const BRANCHES_ENDPOINT = "/branches/attendance";
const PAGE_SIZE = 30;

function todayKathmandu() {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kathmandu",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function firstDayOfMonth(day) {
  return `${day.slice(0, 7)}-01`;
}

// Role controls which actions the UI offers; the backend is the authority.
// Support the login storage formats used across clinic pages, including nested
// user objects and token payloads, so a valid login is not mistaken for a guest.
function normalizedRole(value) {
  if (value && typeof value === "object") {
    return normalizedRole(value.name || value.code || value.value || "");
  }
  return String(value || "").trim().toUpperCase();
}

function getRole() {
  const candidates = ["user", "authUser", "currentUser", "userData", "auth", "authData", "profile", "role"];
  const nestedRole = (value, depth = 0) => {
    if (!value || depth > 6) return "";
    if (typeof value === "string") {
      const role = normalizedRole(value);
      if (["ADMIN", "SUPER_ADMIN", "RECEPTIONIST"].includes(role)) return role;
      if (value.trim().startsWith("{") || value.trim().startsWith("[")) {
        try { return nestedRole(JSON.parse(value), depth + 1); } catch { return ""; }
      }
      return "";
    }
    if (typeof value !== "object") return "";
    const direct = normalizedRole(value.role || value.userRole || value.roleName);
    if (["ADMIN", "SUPER_ADMIN", "RECEPTIONIST"].includes(direct)) return direct;
    for (const key of ["user", "currentUser", "authUser", "profile", "data", "auth", "state"]) {
      const found = nestedRole(value[key], depth + 1);
      if (found) return found;
    }
    return "";
  };

  const stores = [
    typeof localStorage === "undefined" ? null : localStorage,
    typeof sessionStorage === "undefined" ? null : sessionStorage,
  ].filter(Boolean);
  for (const store of stores) {
    for (const key of candidates) {
      try {
        const role = nestedRole(store.getItem(key));
        if (role) return role;
      } catch { /* An inaccessible storage entry is ignored. */ }
    }
    // The JWT is used only for non-security-critical UI role detection.
    // All branch access and attendance writes are verified on the server.
    for (const key of ["accessToken", "access_token", "token", "authToken", "jwt"]) {
      try {
        const raw = store.getItem(key) || "";
        const payload = raw.split(".")[1];
        if (!payload) continue;
        const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=")));
        const role = nestedRole(decoded);
        if (role) return role;
      } catch { /* Invalid or non-JWT storage values are ignored. */ }
    }
  }
  return "";
}

function unwrap(response) {
  if (response?.success === false) throw new Error(response.message || "Request unsuccessful");
  if (response?.data?.success === false) throw new Error(response.data.message || "Request unsuccessful");
  // apiRequest typically returns { success, data }. Also support {data:{success,data}}.
  if (response?.data?.data && !response?.data?.staff && !response?.data?.branches &&
      !response?.data?.records && !response?.data?.pagination) {
    return response.data.data;
  }
  return response?.data ?? response;
}

// The authenticated GET /api/v1/branches currently returns:
// {success:true, message:"Branches fetched successfully", data:[{id,name,...}]}
// Accept an Axios response wrapper and other commonly used API-helper wrappers.
function extractBranches(response) {
  const visited = new Set();
  function findList(value, depth = 0) {
    if (depth > 7 || value == null) return null;
    if (typeof value === "string") {
      try { return findList(JSON.parse(value), depth + 1); } catch { return null; }
    }
    if (Array.isArray(value)) return value;
    if (typeof value !== "object" || visited.has(value)) return null;
    visited.add(value);
    for (const key of ["branches", "data", "results", "items", "payload"]) {
      const found = findList(value[key], depth + 1);
      if (found) return found;
    }
    return null;
  }
  const list = findList(response);
  if (!Array.isArray(list)) {
    throw new Error("Branches response was not an array. Expected { success: true, data: [...] } from GET /api/v1/branches.");
  }
  return list.filter((branch) =>
    branch && typeof branch === "object" && String(branch.id || "").trim() && String(branch.name || "").trim()
  );
}

function displayName(user) {
  if (!user) return "Unknown staff";
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.name || "Unnamed staff";
}

function labelize(text) {
  return String(text || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function displayDay(value) {
  if (!value) return "—";
  const day = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "—";
  const date = new Date(`${day}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? day : date.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
}

function displayTime(value, timezone = "Asia/Kathmandu") {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: timezone,
  });
}

function displayDuration(value) {
  const minutes = Number(value || 0);
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function statusFrom(entry) {
  if (!entry?.attendance) return "NOT_MARKED";
  if (entry.attendance.status === "PRESENT" && entry.attendance.checkInAt && !entry.attendance.checkOutAt) return "CHECKED_IN";
  if (entry.attendance.status === "PRESENT" && entry.attendance.checkOutAt) return "CHECKED_OUT";
  return entry.attendance.status || "NOT_MARKED";
}

const STATUS_LOOKUP = {
  NOT_MARKED: { name: "Not marked", cls: "bg-light text-secondary border" },
  CHECKED_IN: { name: "Checked in", cls: "bg-primary-subtle text-primary border border-primary-subtle" },
  CHECKED_OUT: { name: "Checked out", cls: "bg-success-subtle text-success-emphasis border border-success-subtle" },
  PRESENT: { name: "Present", cls: "bg-success-subtle text-success-emphasis border border-success-subtle" },
  ABSENT: { name: "Absent", cls: "bg-danger-subtle text-danger-emphasis border border-danger-subtle" },
  ON_LEAVE: { name: "On leave", cls: "bg-warning-subtle text-warning-emphasis border border-warning-subtle" },
};

function StatusPill({ status }) {
  const config = STATUS_LOOKUP[status] || STATUS_LOOKUP.NOT_MARKED;
  return <span className={`badge rounded-pill px-3 py-2 fw-semibold ${config.cls}`}>{config.name}</span>;
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="col-6 col-lg-3 col-xxl-2">
      <div className="attendance-metric h-100">
        <span className={`attendance-metric-icon ${color}`}><Icon size={19} /></span>
        <span className="attendance-metric-number">{value ?? 0}</span>
        <span className="attendance-metric-label">{label}</span>
      </div>
    </div>
  );
}

function getActions(entry, date, today, branchId) {
  const record = entry.attendance;
  const active = entry.activeCheckIn;
  const hasWorked = Boolean(record?.checkInAt);
  const activeHere = Boolean(active && active.branchId === branchId);
  return [
    { key: "check-in", label: "Check in", icon: LogIn, cls: "btn-primary",
      disabled: date !== today || hasWorked || Boolean(active) || record?.status === "PRESENT" },
    { key: "check-out", label: "Check out", icon: LogOut, cls: "btn-outline-primary",
      disabled: !activeHere },
    { key: "ABSENT", label: "Mark absent", icon: XCircle, cls: "btn-outline-danger",
      disabled: date > today || hasWorked || Boolean(active) },
    { key: "ON_LEAVE", label: "On leave", icon: CalendarDays, cls: "btn-outline-warning",
      disabled: hasWorked || Boolean(active) },
  ];
}

function AttendanceActionModal({ action, selectedDate, today, onClose, onConfirm, submitting }) {
  const [notes, setNotes] = useState("");
  useEffect(() => {
    function escape(e) { if (e.key === "Escape" && !submitting) onClose(); }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose, submitting]);
  const actionLabels = {
    "check-in": "Check in employee",
    "check-out": "Check out employee",
    ABSENT: "Mark employee absent",
    ON_LEAVE: "Mark employee on leave",
  };
  const displayLabel = actionLabels[action.kind] || "Update attendance";
  const needsNotes = action.kind === "ABSENT" || action.kind === "ON_LEAVE";
  const isCorrection = action.entry.attendance && ["ABSENT", "ON_LEAVE"].includes(action.entry.attendance.status) &&
    action.kind === "check-in";
  return (
    <div className="attendance-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <div className="attendance-dialog" role="dialog" aria-modal="true" aria-label={displayLabel}>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <div className="small fw-semibold text-primary text-uppercase" style={{letterSpacing: ".08em"}}>Attendance action</div>
            <h5 className="fw-bold mb-0 mt-1">{displayLabel}</h5>
          </div>
          <button type="button" className="btn btn-sm btn-light border" aria-label="Close" disabled={submitting} onClick={onClose}><X size={16}/></button>
        </div>
        <div className="attendance-dialog-summary">
          <div className="attendance-avatar"><UserRound size={19}/></div>
          <div><strong>{displayName(action.entry.user)}</strong><small>{labelize(action.entry.user.role)} · {displayDay(action.kind === "check-out" ? action.entry.activeCheckIn?.attendanceDate : selectedDate)}</small></div>
        </div>
        {isCorrection && <div className="alert alert-warning py-2 small">This replaces a previously marked {labelize(action.entry.attendance.status)} record with an actual check-in.</div>}
        {action.kind === "check-out" && <p className="text-secondary small mt-3">The system will use the current time and calculate worked minutes automatically.</p>}
        {action.kind === "ABSENT" && selectedDate === today && <p className="text-secondary small mt-3">Confirm this employee is absent today before saving.</p>}
        {action.kind === "ON_LEAVE" && selectedDate > today && <p className="text-secondary small mt-3">You are recording approved leave for a future date.</p>}
        <form onSubmit={(event) => { event.preventDefault(); onConfirm(notes); }}>
          <label htmlFor="attendance-action-notes" className="form-label fw-semibold small mt-3">
            {needsNotes ? "Reason / remarks" : "Notes (optional)"}
          </label>
          <textarea id="attendance-action-notes" className="form-control" rows={3} maxLength={1000} required={needsNotes}
            value={notes} onChange={(event) => setNotes(event.target.value)}
            placeholder={needsNotes ? "Record leave or absence details" : "Optional shift notes"} />
          <div className="d-flex gap-2 justify-content-end mt-4">
            <button className="btn btn-light border" type="button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="btn btn-primary d-inline-flex align-items-center gap-2" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle size={16} className="attendance-spin"/> : <Check size={16}/>} Save attendance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Read-only detail panel. All notes are visible in full (no ellipsis) and
// includes the receptionist who last recorded the attendance when provided by API.
function AttendanceRecordDetailsModal({ record, person, branch, selectedDate, timezone, onClose }) {
  useEffect(() => {
    const onEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);
  const status = record ? statusFrom({ attendance: record }) : "NOT_MARKED";
  const auditPerson = record?.recordedBy;
  return (
    <div className="attendance-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="attendance-dialog attendance-detail-dialog" role="dialog" aria-modal="true" aria-label="Staff attendance details">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div><small className="text-uppercase text-primary fw-bold">Staff record</small><h5 className="fw-bold mb-0 mt-1">Attendance details</h5></div>
          <button type="button" className="btn btn-light btn-sm border" onClick={onClose} aria-label="Close"><X size={16}/></button>
        </div>
        <div className="attendance-dialog-summary mb-3">
          <span className="attendance-avatar"><UserRound size={19}/></span>
          <div><strong>{displayName(person || record?.user)}</strong><small>{labelize((person || record?.user)?.role)}</small></div>
        </div>
        <div className="d-flex gap-2 align-items-center mb-3"><StatusPill status={status}/><span className="small text-secondary">{displayDay(record?.attendanceDate || selectedDate)}</span></div>
        <div className="attendance-detail-grid">
          <div><span>Branch</span><strong>{branch?.name || record?.branch?.name || "—"}</strong></div>
          <div><span>Check-in</span><strong>{displayTime(record?.checkInAt, timezone)}</strong></div>
          <div><span>Check-out</span><strong>{displayTime(record?.checkOutAt, timezone)}</strong></div>
          <div><span>Worked time</span><strong>{displayDuration(record?.workedMinutes)}</strong></div>
          <div><span>Recorded by</span><strong>{auditPerson ? displayName(auditPerson) : "Not recorded"}</strong></div>
          <div><span>Last updated</span><strong>{record?.updatedAt ? new Date(record.updatedAt).toLocaleString("en-GB", {timeZone: timezone}) : "—"}</strong></div>
        </div>
        <div className="attendance-detail-notes"><div className="fw-bold small mb-2">Leave / absence reason and attendance notes</div><p className="mb-0">{record?.notes || "No notes were recorded."}</p></div>
        <div className="d-flex justify-content-end mt-4"><button type="button" className="btn btn-primary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function exportCsv(records, filename, timezone) {
  const csvEscape = (value) => {
    const raw = String(value ?? "");
    const safe = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [
    ["Date", "Employee", "Role", "Branch", "Status", "Check in", "Check out", "Worked minutes", "Recorded by", "Notes"],
    ...records.map((record) => [
      String(record.attendanceDate || "").slice(0, 10), displayName(record.user),
      labelize(record.user?.role), record.branch?.name || "", record.status,
      displayTime(record.checkInAt, timezone), displayTime(record.checkOutAt, timezone),
      record.workedMinutes ?? "", record.recordedBy ? displayName(record.recordedBy) : "", record.notes || "",
    ]),
  ];
  const csv = "\uFEFF" + lines.map((line) => line.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Attendance() {
  const currentRole = useMemo(getRole, []);
  const canManage = currentRole === "RECEPTIONIST";
  const canRead = canManage || currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(todayKathmandu);
  const [today, setToday] = useState(todayKathmandu);
  const [timezone, setTimezone] = useState("Asia/Kathmandu");
  const [branchLoading, setBranchLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [staff, setStaff] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [tab, setTab] = useState("daily");
  const [historyRows, setHistoryRows] = useState([]);
  const [historyFrom, setHistoryFrom] = useState(() => firstDayOfMonth(todayKathmandu()));
  const [historyTo, setHistoryTo] = useState(todayKathmandu);
  const [historyUserId, setHistoryUserId] = useState("");
  const [leaveStatus, setLeaveStatus] = useState("LEAVE_OR_ABSENT");
  const [historyStatusCounts, setHistoryStatusCounts] = useState({ PRESENT: 0, ABSENT: 0, ON_LEAVE: 0 });
  const [detailRecord, setDetailRecord] = useState(null);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [modalAction, setModalAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const latestOverviewRequest = useRef(0);
  const latestHistoryRequest = useRef(0);

  const loadBranches = useCallback(async () => {
    setBranchLoading(true);
    setError("");
    try {
      const response = await apiRequest(BRANCHES_ENDPOINT);
      const list = extractBranches(response);
      // The generic /branches endpoint does not provide attendance metadata.
      // Role permissions are also enforced by the attendance controllers.
      const viewableBranches = canManage
        ? list.filter((branch) => branch.isActive !== false)
        : list;
      const adminView = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";
      setBranches(viewableBranches);
      if (viewableBranches.length === 0) {
        setError("The branch API returned no active branches. Check clinic branch status and role permissions.");
      }
      setToday(todayKathmandu());
      setTimezone("Asia/Kathmandu");
      setBranchId((old) =>
        (old === "all" && adminView) || viewableBranches.some((branch) => branch.id === old)
          ? old
          : adminView ? "all" : (viewableBranches[0]?.id || "")
      );
    } catch (requestError) {
      setBranches([]);
      setBranchId("");
      setError(requestError.message || "Unable to load clinic branches");
    } finally { setBranchLoading(false); }
  }, [canManage, currentRole]);

  const loadOverview = useCallback(async () => {
    const requestId = ++latestOverviewRequest.current;
    if (!branchId) { setStaff([]); setSummary(null); return; }
    setOverviewLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ branchId, date });
      const payload = unwrap(await apiRequest(`${PREFIX}/staff/overview?${params}`));
      if (requestId !== latestOverviewRequest.current) return;
      setStaff(Array.isArray(payload.staff) ? payload.staff : []);
      setSummary(payload.summary || null);
      if (payload.today) setToday(payload.today);
      if (payload.timezone) setTimezone(payload.timezone);
    } catch (requestError) {
      if (requestId === latestOverviewRequest.current) {
        setStaff([]);
        setSummary(null);
        setError(requestError.message || "Unable to load attendance");
      }
    } finally { if (requestId === latestOverviewRequest.current) setOverviewLoading(false); }
  }, [branchId, date]);

  const loadHistory = useCallback(async (page = 1) => {
    const requestId = ++latestHistoryRequest.current;
    if (!branchId) return;
    setHistoryLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ branchId, from: historyFrom, to: historyTo,
        page: String(page), limit: String(PAGE_SIZE) });
      if (tab === "leave") params.set("status", leaveStatus);
      if (historyUserId) params.set("userId", historyUserId);
      const payload = unwrap(await apiRequest(`${PREFIX}/staff/history?${params}`));
      if (requestId !== latestHistoryRequest.current) return;
      setHistoryRows(Array.isArray(payload.records) ? payload.records : []);
      setHistoryStatusCounts(payload.statusCounts || { PRESENT: 0, ABSENT: 0, ON_LEAVE: 0 });
      setHistoryPagination(payload.pagination || { page, total: 0, totalPages: 0 });
    } catch (requestError) {
      if (requestId === latestHistoryRequest.current) {
        setHistoryRows([]);
        setHistoryStatusCounts({ PRESENT: 0, ABSENT: 0, ON_LEAVE: 0 });
        setHistoryPagination({ page, total: 0, totalPages: 0 });
        setError(requestError.message || "Unable to load attendance history");
      }
    } finally { if (requestId === latestHistoryRequest.current) setHistoryLoading(false); }
  }, [branchId, historyFrom, historyTo, historyUserId, tab, leaveStatus]);

  useEffect(() => {
    if (!canRead) { setBranchLoading(false); return; }
    loadBranches();
  }, [canRead, loadBranches]);

  useEffect(() => {
    if (branchId && canRead) loadOverview();
    return () => { latestOverviewRequest.current++; };
  }, [branchId, canRead, loadOverview]);

  useEffect(() => {
    setSelectedUserId("");
    setHistoryUserId("");
  }, [branchId]);

  useEffect(() => {
    if ((tab === "history" || tab === "leave") && branchId && canRead) loadHistory(1);
    return () => { latestHistoryRequest.current++; };
  }, [tab, branchId, canRead, loadHistory]);

  const visibleStaff = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return staff.filter((entry) => !needle ||
      displayName(entry.user).toLowerCase().includes(needle) ||
      labelize(entry.user.role).toLowerCase().includes(needle));
  }, [staff, search]);
  const selectedEntry = staff.find((entry) => entry.user.id === selectedUserId) || null;
  const historyStaffUsers = useMemo(() => {
    const byId = new Map();
    staff.forEach((entry) => byId.set(entry.user.id, entry.user));
    return [...byId.values()].sort((a,b) => displayName(a).localeCompare(displayName(b)));
  }, [staff]);

  async function confirmAction(notes) {
    if (!canManage || !modalAction || !branchId || submitting) return;
    const { kind, entry } = modalAction;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const body = { userId: entry.user.id, branchId, notes };
      let endpoint = `${PREFIX}/staff/mark`;
      if (kind === "check-in") endpoint = `${PREFIX}/staff/check-in`;
      else if (kind === "check-out") endpoint = `${PREFIX}/staff/check-out`;
      else { body.date = date; body.status = kind; }
      const response = await apiRequest(endpoint, { method: "POST", body: JSON.stringify(body) });
      // NOTE: if your services/api.js expects an object body rather than JSON,
      // replace the line above with: apiRequest(endpoint, { method: "POST", body });
      if (response?.success === false || response?.data?.success === false) {
        throw new Error(response.message || response?.data?.message || "Unable to save attendance");
      }
      setSuccess(`${displayName(entry.user)}: attendance saved successfully.`);
      setModalAction(null);
      await loadOverview();
      if (tab === "history") await loadHistory(historyPagination.page || 1);
    } catch (requestError) {
      setError(requestError?.message || "Could not update attendance");
      setModalAction(null);
    } finally { setSubmitting(false); }
  }

  function openAction(kind, entry) {
    if (!canManage || !entry || !branchId || branchId === "all") return;
    setModalAction({ kind, entry });
    setSuccess("");
    setError("");
  }

  if (!canRead) {
    return (
      <div className="card border-0 shadow-sm rounded-4 p-5 text-center">
        <ShieldAlert size={42} className="text-danger mx-auto mb-3" />
        <h4 className="fw-bold">Attendance management is restricted</h4>
        <p className="text-secondary mb-0">Receptionists manage attendance. Admins and Super Admins can view attendance and leave records. {currentRole ? `Your current role is ${labelize(currentRole)}.` : "Your login role could not be identified from this browser session. Sign out and log in again so the frontend receives the user role."}</p>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      <header className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1"><ClipboardCheck className="text-primary" size={26} /><h3 className="fw-bold mb-0">Staff Attendance</h3></div>
          <p className="text-secondary mb-0">{canManage
            ? "Reception desk · Check staff in or out and manage leave and absence"
            : "Clinic-wide employee attendance and leave reporting · Read-only administrator access"}</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="attendance-role-chip"><ShieldAlert size={14} /> {canManage ? "Receptionist · Manage attendance" : "Admin · View only"}</span>
          <button type="button" className="btn btn-light border d-inline-flex align-items-center gap-2"
            disabled={branchLoading || overviewLoading} onClick={() => { loadBranches(); if (branchId) loadOverview(); }}>
            <RefreshCw size={16} className={branchLoading || overviewLoading ? "attendance-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger d-flex align-items-center justify-content-between gap-2" role="alert"><span className="d-flex align-items-center gap-2"><AlertCircle size={18}/>{error}</span><button type="button" className="btn-close" aria-label="Dismiss error" onClick={() => setError("")}/></div>}
      {success && <div className="alert alert-success d-flex justify-content-between align-items-center gap-2" role="status"><span className="d-flex align-items-center gap-2"><CheckCircle2 size={18}/>{success}</span><button type="button" className="btn-close" aria-label="Dismiss message" onClick={() => setSuccess("")}/></div>}

      <section className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3 p-lg-4">
          <div className="row g-3 align-items-end">
            <div className="col-sm-6 col-lg-4">
              <label htmlFor="attendance-branch" className="form-label small fw-semibold"><Building2 size={15} className="me-1"/> Working branch</label>
              <select id="attendance-branch" className="form-select" value={branchId} disabled={branchLoading} onChange={(e) => setBranchId(e.target.value)}>
                {!canManage && <option value="all">All branches (clinic-wide)</option>}
                {!branches.length && canManage && <option value="">{branchLoading ? "Loading branches..." : "No assigned branches"}</option>}
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.isMain ? " (Main)" : ""}{branch.isActive === false ? " · Inactive" : ""}</option>)}
              </select>
              <div className={`small mt-1 ${branches.length ? "text-success" : "text-secondary"}`} role="status">
                {branchLoading ? "Loading branches from clinic API…" :
                  branches.length ? `${branches.length} clinic branch${branches.length === 1 ? "" : "es"} available` :
                  "No branches loaded — check the error above and click Refresh."}
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <label htmlFor="attendance-date" className="form-label small fw-semibold"><CalendarDays size={15} className="me-1"/> Attendance date</label>
              <input id="attendance-date" type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="col-sm-6 col-lg-auto">
              <button type="button" className="btn btn-outline-primary w-100" onClick={() => setDate(today)} disabled={date === today}>Today</button>
            </div>
            <div className="col-sm-6 col-lg">
              <div className="attendance-info-strip"><Clock3 size={16}/> Timezone: {timezone.replace("_", " ")}</div>
            </div>
          </div>
        </div>
      </section>

      <nav className="attendance-tabs mb-4" aria-label="Attendance views">
        <button type="button" className={tab === "daily" ? "active" : ""} onClick={() => setTab("daily")}><Users size={17}/> Daily register</button>
        <button type="button" className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><History size={17}/> Attendance history</button>
        <button type="button" className={tab === "leave" ? "active" : ""} onClick={() => setTab("leave")}><CalendarDays size={17}/> Leave & absences</button>
      </nav>

      {tab === "daily" && (
        <>
          {!canManage && <div className="alert alert-info d-flex gap-2 align-items-center small"><ShieldAlert size={18}/> Administrator view: You may review all staff and their leave/absence details, but only a receptionist can change attendance.</div>}
          <div className="row g-3 mb-4">
            <MetricCard icon={Users} label={branchId === "all" ? "Staff / branch entries" : "Total staff"} value={summary?.total} color="attendance-icon-blue" />
            <MetricCard icon={UserCheck} label="Present" value={summary?.present} color="attendance-icon-green" />
            <MetricCard icon={LogIn} label="Currently checked in" value={summary?.checkedIn} color="attendance-icon-blue" />
            <MetricCard icon={LogOut} label="Checked out" value={summary?.checkedOut} color="attendance-icon-green" />
            <MetricCard icon={XCircle} label="Absent" value={summary?.absent} color="attendance-icon-red" />
            <MetricCard icon={CalendarDays} label="On leave" value={summary?.onLeave} color="attendance-icon-orange" />
          </div>

          {canManage && <section className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex align-items-center gap-2 mb-3"><UserRound size={18} className="text-primary"/><h5 className="fw-bold mb-0">Choose employee</h5></div>
              <p className="text-secondary small mb-3">Select a staff member assigned to this branch, then record their attendance.</p>
              <div className="row g-3 align-items-end">
                <div className="col-lg-5">
                  <label htmlFor="attendance-employee" className="form-label small fw-semibold">Employee</label>
                  <select id="attendance-employee" className="form-select" disabled={overviewLoading || !staff.length} value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                    <option value="">Select staff member</option>
                    {staff.map((entry) => <option key={entry.user.id} value={entry.user.id}>{displayName(entry.user)} — {labelize(entry.user.role)}</option>)}
                  </select>
                </div>
                <div className="col-lg-7">
                  {selectedEntry ? (
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <StatusPill status={statusFrom(selectedEntry)} />
                      {getActions(selectedEntry, date, today, branchId).map(({ key, label, icon: Icon, cls, disabled }) => (
                        <button key={key} type="button" className={`btn btn-sm d-inline-flex align-items-center gap-1 ${cls}`}
                          disabled={disabled || submitting} onClick={() => openAction(key, selectedEntry)}>
                          <Icon size={15}/>{label}
                        </button>
                      ))}
                    </div>
                  ) : <div className="small text-secondary attendance-placeholder">Choose a user to enable attendance actions.</div>}
                </div>
              </div>
            </div>
          </section>}

          <section className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-3 p-lg-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                <div><h5 className="fw-bold mb-1">Daily staff register</h5><p className="small text-secondary mb-0">{displayDay(date)} · {summary?.unmarked ?? 0} staff not yet marked{branchId === "all" ? " · Employees with multiple branches appear per branch" : ""}</p></div>
                <div className="input-group" style={{maxWidth: 290}}><span className="input-group-text bg-white border-end-0"><Search size={16}/></span><input className="form-control border-start-0" type="search" placeholder="Search staff or role" aria-label="Search employees" value={search} onChange={(e) => setSearch(e.target.value)}/></div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle attendance-table">
                  <thead><tr><th>Employee</th>{branchId === "all" && <th>Branch</th>}<th>Attendance</th><th>Check-in</th><th>Check-out</th><th>Work time</th><th>Notes</th><th className="text-end">Actions</th></tr></thead>
                  <tbody>
                    {overviewLoading ? <tr><td colSpan={branchId === "all" ? 8 : 7} className="text-center py-5"><LoaderCircle size={26} className="attendance-spin text-primary mb-2"/><div className="small text-secondary">Loading staff attendance…</div></td></tr> :
                      visibleStaff.length === 0 ? <tr><td colSpan={branchId === "all" ? 8 : 7} className="text-center py-5"><Users className="text-secondary mb-2" size={32}/><div className="fw-semibold">No employees found</div><div className="small text-secondary">Check the selected branch or search.</div></td></tr> :
                      visibleStaff.map((entry) => {
                        const record = entry.attendance;
                        return (
                          <tr key={`${entry.user.id}:${entry.branch?.id || branchId}`}>
                            <td><div className="d-flex align-items-center gap-2"><span className="attendance-avatar"><UserRound size={17}/></span><div><div className="fw-semibold">{displayName(entry.user)}</div><small className="text-secondary">{labelize(entry.user.role)}</small></div></div></td>
                            {branchId === "all" && <td>{entry.branch?.name || "—"}</td>}
                            <td><StatusPill status={statusFrom(entry)}/>{entry.activeCheckIn?.branchId !== (entry.branch?.id || branchId) && entry.activeCheckIn && <small className="d-block text-warning-emphasis mt-1">Active at {entry.activeCheckIn.branch?.name}</small>}</td>
                            <td>{displayTime(record?.checkInAt, timezone)}</td>
                            <td>{displayTime(record?.checkOutAt, timezone)}</td>
                            <td>{displayDuration(record?.workedMinutes)}</td>
                            <td><span className="attendance-note" title={record?.notes || ""}>{record?.notes || "—"}</span></td>
                            <td className="text-end"><div className="d-flex align-items-center justify-content-end flex-wrap gap-1">
                              {canManage && getActions(entry, date, today, branchId).map(({ key, label, icon: Icon, disabled, cls }) => (
                                <button key={key} type="button" title={label} aria-label={`${label} ${displayName(entry.user)}`}
                                  className={`btn btn-sm ${cls}`} disabled={disabled || submitting}
                                  onClick={() => openAction(key, entry)}><Icon size={15}/></button>
                              ))}
                              <button type="button" className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
                                onClick={() => setDetailRecord({ record: entry.attendance, person: entry.user, branch: entry.branch, date })}
                                title="View full attendance details"><Eye size={15}/>{!canManage && " Details"}</button>
                            </div></td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>
              <div className="small text-secondary mt-2">Unmarked does not mean absent. Only receptionists can mark absence or leave. Check-in and check-out times are recorded by the server.</div>
            </div>
          </section>
        </>
      )}

      {(tab === "history" || tab === "leave") && (
        <section className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-3 p-lg-4">
            <div className="d-flex justify-content-between flex-wrap align-items-start gap-3 mb-3">
              <div>
                <h5 className="fw-bold mb-1">{tab === "leave" ? "Staff leave & absence register" : "Attendance history"}</h5>
                <p className="small text-secondary mb-0">{tab === "leave"
                  ? "Review employee leave, absence dates, reasons, and who recorded each entry. View-only for administrators."
                  : "Review previous shifts, absences, leave, notes and worked hours."}</p>
              </div>
              <button type="button" className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                disabled={!historyRows.length} onClick={() => exportCsv(historyRows, `${tab}-${historyFrom}-to-${historyTo}-page-${historyPagination.page}.csv`, timezone)}>
                <Download size={16}/> Export current page
              </button>
            </div>
            <div className="row g-3 mb-4">
              <MetricCard icon={CalendarDays} label="Leave days / entries" value={historyStatusCounts.ON_LEAVE || 0} color="attendance-icon-orange"/>
              <MetricCard icon={XCircle} label="Absent days / entries" value={historyStatusCounts.ABSENT || 0} color="attendance-icon-red"/>
              <MetricCard icon={UserCheck} label="Present entries" value={historyStatusCounts.PRESENT || 0} color="attendance-icon-green"/>
            </div>
            <div className="row g-2 align-items-end mb-4">
              <div className="col-sm-6 col-lg-2"><label className="form-label fw-semibold small">From date</label><input type="date" className="form-control" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)}/></div>
              <div className="col-sm-6 col-lg-2"><label className="form-label fw-semibold small">To date</label><input type="date" className="form-control" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)}/></div>
              <div className="col-sm-6 col-lg-3"><label className="form-label fw-semibold small">Employee</label><select className="form-select" value={historyUserId} onChange={(e) => setHistoryUserId(e.target.value)}>
                <option value="">All employees</option>{historyStaffUsers.map((user) => <option key={user.id} value={user.id}>{displayName(user)}</option>)}
              </select></div>
              {tab === "leave" && <div className="col-sm-6 col-lg-3"><label className="form-label fw-semibold small">Record type</label><select className="form-select" value={leaveStatus} onChange={(e) => setLeaveStatus(e.target.value)}>
                <option value="LEAVE_OR_ABSENT">All leave & absences</option>
                <option value="ON_LEAVE">On leave only</option>
                <option value="ABSENT">Absent only</option>
              </select></div>}
              <div className="col-sm-6 col-lg-auto"><button type="button" className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2" disabled={historyLoading || !branchId || historyFrom > historyTo} onClick={() => loadHistory(1)}><Filter size={16}/> Apply filters</button></div>
            </div>
            <div className="table-responsive"><table className="table table-hover align-middle attendance-table">
              <thead><tr><th>Date</th><th>Employee</th><th>Branch</th><th>Status</th><th>Check-in</th><th>Check-out</th><th>Duration</th><th>Recorded by</th><th>Reason / notes</th><th>Details</th></tr></thead>
              <tbody>{historyLoading ? <tr><td colSpan="10" className="text-center py-5"><LoaderCircle className="attendance-spin text-primary" size={26}/><div className="small text-secondary mt-2">Loading records…</div></td></tr> :
                historyRows.length === 0 ? <tr><td colSpan="10" className="text-center py-5"><History size={32} className="text-secondary mb-2"/><div>No records for these filters.</div></td></tr> :
                historyRows.map((row) => <tr key={row.id}>
                  <td className="fw-semibold">{displayDay(row.attendanceDate)}</td>
                  <td><strong>{displayName(row.user)}</strong><small className="d-block text-secondary">{labelize(row.user?.role)}</small></td>
                  <td>{row.branch?.name || "—"}</td>
                  <td><StatusPill status={statusFrom({ attendance: row })}/></td>
                  <td>{displayTime(row.checkInAt, timezone)}</td><td>{displayTime(row.checkOutAt, timezone)}</td>
                  <td>{displayDuration(row.workedMinutes)}</td>
                  <td>{row.recordedBy ? displayName(row.recordedBy) : "—"}</td>
                  <td><span className={tab === "leave" ? "attendance-full-note" : "attendance-note"} title={row.notes || ""}>{row.notes || "—"}</span></td>
                  <td><button className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" type="button"
                    onClick={() => setDetailRecord({ record: row, person: row.user, branch: row.branch, date: row.attendanceDate })}><Eye size={15}/> View</button></td>
                </tr>)}
              </tbody>
            </table></div>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
              <span className="small text-secondary">{historyPagination.total || 0} records · Page {historyPagination.page || 1} of {Math.max(1, historyPagination.totalPages || 1)}</span>
              <div className="d-flex gap-2"><button className="btn btn-light border btn-sm" type="button" disabled={historyLoading || (historyPagination.page || 1) <= 1} onClick={() => loadHistory(historyPagination.page - 1)}>Previous</button>
                <button className="btn btn-light border btn-sm d-inline-flex align-items-center gap-1" type="button" disabled={historyLoading || (historyPagination.page || 1) >= (historyPagination.totalPages || 1)} onClick={() => loadHistory(historyPagination.page + 1)}>Next <ArrowRight size={14}/></button></div>
            </div>
          </div>
        </section>
      )}

      {detailRecord && <AttendanceRecordDetailsModal record={detailRecord.record} person={detailRecord.person}
        branch={detailRecord.branch} selectedDate={detailRecord.date} timezone={timezone} onClose={() => setDetailRecord(null)}/>}
      {canManage && modalAction && <AttendanceActionModal key={`${modalAction.entry.user.id}:${modalAction.kind}`} action={modalAction} selectedDate={date} today={today} onClose={() => setModalAction(null)} submitting={submitting} onConfirm={confirmAction}/>}
      <style>{ATTENDANCE_STYLES}</style>
    </div>
  );
}

const ATTENDANCE_STYLES = `
.attendance-page { color:#1e293b; padding-bottom:25px; }
.attendance-role-chip { display:inline-flex;align-items:center;gap:6px;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;padding:8px 11px;border-radius:100px;font-size:12px;font-weight:650; }
.attendance-page .card { background:#fff; }
.attendance-info-strip { display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#64748b;font-size:12px;min-height:39px; }
.attendance-tabs { display:inline-flex;gap:5px;background:#eaf0f7;border-radius:12px;padding:5px;border:1px solid #e2e8f0; }
.attendance-tabs button { border:0;background:transparent;color:#64748b;border-radius:9px;padding:10px 17px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700; }
.attendance-tabs button.active { background:white;color:#1d4ed8;box-shadow:0 2px 8px #0f172a16; }
.attendance-metric { border-radius:15px;border:1px solid #e2e8f0;box-shadow:0 2px 10px #0f172a06;background:white;padding:17px;display:flex;flex-direction:column;gap:8px; }
.attendance-metric-icon { width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:11px; }
.attendance-icon-blue { background:#eff6ff;color:#2563eb; }
.attendance-icon-green { background:#ecfdf5;color:#059669; }
.attendance-icon-red { background:#fef2f2;color:#dc2626; }
.attendance-icon-orange { background:#fffbeb;color:#d97706; }
.attendance-metric-number { font-size:28px;line-height:1;font-weight:800;color:#0f172a; }
.attendance-metric-label { color:#64748b;font-size:12px;font-weight:600; }
.attendance-page .attendance-table { --bs-table-bg:transparent;font-size:12px;white-space:nowrap; }
.attendance-table thead th { background:#f8fafc;color:#64748b;font-weight:700;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:14px 11px; }
.attendance-table tbody td { padding:13px 11px;vertical-align:middle; }
.attendance-table button { min-width:29px;display:inline-flex;justify-content:center;align-items:center; }
.attendance-avatar { width:35px;height:35px;border-radius:11px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
.attendance-note { display:inline-block;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#64748b;vertical-align:middle; }
.attendance-full-note { display:block;min-width:160px;max-width:350px;white-space:pre-wrap;overflow-wrap:anywhere;color:#475569;line-height:1.55; }
.attendance-detail-dialog { width:min(600px,100%);max-height:92vh;overflow:auto; }
.attendance-detail-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;padding:16px;border-radius:12px;border:1px solid #e2e8f0; }
.attendance-detail-grid span { color:#64748b;font-size:11px;display:block; }
.attendance-detail-grid strong { font-weight:650;font-size:13px;overflow-wrap:anywhere; }
.attendance-detail-notes { background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-top:15px;padding:15px; }
.attendance-detail-notes p { white-space:pre-wrap;overflow-wrap:anywhere;color:#334155;font-size:13px; }
@media(max-width:520px) { .attendance-detail-grid {grid-template-columns:1fr;} }
.attendance-placeholder { border:1px dashed #cbd5e1;border-radius:10px;padding:10px 14px; }
.attendance-overlay { position:fixed;inset:0;background:#0f172ab8;display:flex;align-items:center;justify-content:center;padding:16px;z-index:2100; }
.attendance-dialog { width:min(480px,100%);background:white;border-radius:18px;padding:24px;box-shadow:0 24px 75px #0004; }
.attendance-dialog-summary { border:1px solid #e2e8f0;background:#f8fafc;border-radius:11px;padding:12px;display:flex;align-items:center;gap:12px; }
.attendance-dialog-summary small { display:block;color:#64748b;margin-top:3px; }
.attendance-spin { animation:attendance-spin-keyframe .85s linear infinite; }
@keyframes attendance-spin-keyframe { to {transform:rotate(360deg);} }
@media(max-width:560px) { .attendance-tabs { width:100%; } .attendance-tabs button { flex:1;justify-content:center;padding:10px 7px;font-size:12px; } .attendance-dialog { padding:17px; } }
`;
