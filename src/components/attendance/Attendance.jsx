import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardCheck,
  Download,
  LoaderCircle,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import apiRequest from "../../services/api";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
const STAFF_ROLES = new Set([
  "VETERINARIAN", "VET_ASSISTANT", "RECEPTIONIST", "CASHIER", "INVENTORY_MANAGER",
]);
const STATUS_LABELS = {
  PRESENT: "Present",
  ABSENT: "Absent",
  ON_LEAVE: "On leave",
};

function getStoredUser() {
  try {
    for (const key of ["user", "authUser", "currentUser"]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const user = parsed?.user || parsed?.data?.user || parsed?.data || parsed;
      if (user && typeof user === "object" && user.role) return user;
    }
  } catch (error) {
    console.error("Unable to read signed-in user", error);
  }
  return null;
}

function extractArray(response, keys = []) {
  const candidates = [
    response, response?.data, response?.data?.data,
    ...keys.flatMap((key) => [
      response?.[key], response?.data?.[key], response?.data?.data?.[key],
    ]),
  ];
  return candidates.find(Array.isArray) || [];
}

function todayInKathmandu() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function firstDayOfMonth(dateString) {
  return `${dateString.slice(0, 7)}-01`;
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NP", {
    timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(date);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  // attendanceDate is a date-only field stored as midnight UTC.
  return new Intl.DateTimeFormat("en-NP", {
    timeZone: "UTC", year: "numeric", month: "short", day: "numeric",
  }).format(date);
}

function formatMinutes(value) {
  const minutes = Math.max(0, Number(value) || 0);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function fullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unknown employee";
}

function statusBadge(status) {
  const style = status === "PRESENT"
    ? "bg-success-subtle text-success"
    : status === "ABSENT"
      ? "bg-danger-subtle text-danger"
      : "bg-warning-subtle text-warning-emphasis";
  return <span className={`badge rounded-pill ${style}`}>{STATUS_LABELS[status] || status || "—"}</span>;
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function SummaryCard({ label, value, icon: Icon, tone = "primary" }) {
  return (
    <div className="col-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body d-flex align-items-center justify-content-between gap-2">
          <div>
            <small className="text-secondary">{label}</small>
            <h3 className="fw-bold mb-0 mt-1">{value}</h3>
          </div>
          <div className={`p-3 rounded-3 bg-${tone}-subtle text-${tone}`}>
            <Icon size={23} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Notice({ message, kind = "danger", onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${kind} d-flex align-items-start gap-2 rounded-3`} role="alert">
      {kind === "danger" ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
      <div className="flex-grow-1">{message}</div>
      {onClose && <button type="button" className="btn-close" aria-label="Dismiss" onClick={onClose} />}
    </div>
  );
}

function Attendance() {
  const user = useMemo(getStoredUser, []);
  const role = String(user?.role || "").toUpperCase();
  const isAdmin = ADMIN_ROLES.has(role);
  const isEmployee = STAFF_ROLES.has(role);

  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchError, setBranchError] = useState("");
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  // Staff state: one selected branch for check-in, all owned records for history.
  const [checkInBranch, setCheckInBranch] = useState("");
  // Optional employee note to save with a successful check-in.
  const [checkInNotes, setCheckInNotes] = useState("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [myToday, setMyToday] = useState([]);
  const [activeCheckIn, setActiveCheckIn] = useState(null);
  const [myHistory, setMyHistory] = useState([]);
  const [myLoading, setMyLoading] = useState(false);
  const [historyFrom, setHistoryFrom] = useState(() => firstDayOfMonth(todayInKathmandu()));
  const [historyTo, setHistoryTo] = useState(todayInKathmandu);
  const [historyBranch, setHistoryBranch] = useState("all");
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Admin state: branch/day filtering and marking employee absence or leave.
  const [reportBranch, setReportBranch] = useState("all");
  const [reportDate, setReportDate] = useState(todayInKathmandu);
  const [reportSearch, setReportSearch] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [reportRows, setReportRows] = useState([]);
  const [reportPagination, setReportPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [reportLoading, setReportLoading] = useState(false);
  const [markBranch, setMarkBranch] = useState("");
  const [markUser, setMarkUser] = useState("");
  const [markDate, setMarkDate] = useState(todayInKathmandu);
  const [markStatus, setMarkStatus] = useState("ABSENT");
  const [markNotes, setMarkNotes] = useState("");
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchBranches() {
      setBranchesLoading(true);
      setBranchError("");
      try {
        const response = await apiRequest("/users/me/branches");
        if (cancelled) return;
        const activeBranches = extractArray(response, ["branches"])
          .filter((branch) => branch?.id && branch?.isActive !== false);
        setBranches(activeBranches);
        setCheckInBranch((previous) =>
          activeBranches.some((branch) => branch.id === previous)
            ? previous
            : activeBranches.find((branch) => branch.isMain)?.id || activeBranches[0]?.id || ""
        );
        setMarkBranch((previous) =>
          activeBranches.some((branch) => branch.id === previous)
            ? previous
            : activeBranches.find((branch) => branch.isMain)?.id || activeBranches[0]?.id || ""
        );
      } catch (error) {
        if (cancelled) return;
        setBranches([]);
        setBranchError(getErrorMessage(error, "Unable to load your accessible branches."));
      } finally {
        if (!cancelled) setBranchesLoading(false);
      }
    }
    fetchBranches();
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    if (!isEmployee) return undefined;
    let cancelled = false;
    async function fetchEmployee() {
      setMyLoading(true);
      try {
        const [todayResponse, historyResponse] = await Promise.all([
          apiRequest("/attendance/me/today"),
          apiRequest(`/attendance/me/history?from=${historyFrom}&to=${historyTo}`),
        ]);
        if (cancelled) return;
        const todayData = todayResponse?.data?.data || todayResponse?.data || todayResponse;
        setMyToday(Array.isArray(todayData?.today) ? todayData.today : []);
        setActiveCheckIn(todayData?.activeCheckIn || null);
        setMyHistory(extractArray(historyResponse, ["records", "attendance"]));
      } catch (error) {
        if (!cancelled) setNotice(getErrorMessage(error, "Could not retrieve your attendance."));
      } finally {
        if (!cancelled) setMyLoading(false);
      }
    }
    fetchEmployee();
    return () => { cancelled = true; };
  }, [isEmployee, historyFrom, historyTo, reloadKey]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    async function fetchReport() {
      setReportLoading(true);
      try {
        const params = new URLSearchParams({ date: reportDate, page: String(reportPage), limit: "50" });
        if (reportBranch !== "all") params.set("branchId", reportBranch);
        const result = await apiRequest(`/attendance/admin?${params.toString()}`);
        if (cancelled) return;
        const data = result?.data?.data || result?.data || result;
        setReportRows(Array.isArray(data?.records) ? data.records : []);
        setReportPagination(data?.pagination || { page: reportPage, total: 0, totalPages: 0 });
      } catch (error) {
        if (!cancelled) {
          setReportRows([]);
          setNotice(getErrorMessage(error, "Unable to retrieve branch attendance."));
        }
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    }
    fetchReport();
    return () => { cancelled = true; };
  }, [isAdmin, reportBranch, reportDate, reportPage, reloadKey]);

  useEffect(() => {
    if (!isAdmin || !markBranch || !branches.some((branch) => branch.id === markBranch)) {
      setStaff([]);
      setMarkUser("");
      return undefined;
    }
    let cancelled = false;
    async function fetchStaff() {
      setStaffLoading(true);
      try {
        const collected = [];
        let page = 1;
        while (page <= 50) {
          const params = new URLSearchParams({
            branchId: markBranch, isActive: "true", page: String(page), limit: "100",
          });
          const result = await apiRequest(`/users?${params.toString()}`);
          if (cancelled) return;
          const batch = extractArray(result, ["users"]);
          collected.push(...batch);
          const pagination = result?.data?.pagination || result?.data?.data?.pagination || result?.pagination;
          const lastPage = Number(pagination?.totalPages);
          if ((Number.isFinite(lastPage) && lastPage > 0 && page >= lastPage) || batch.length < 100) break;
          page += 1;
        }
        if (cancelled) return;
        const employees = collected.filter((entry) =>
          entry?.id && STAFF_ROLES.has(String(entry.role || "").toUpperCase()) && entry.isActive !== false
        );
        setStaff(employees);
        setMarkUser((previous) => employees.some((item) => item.id === previous) ? previous : "");
      } catch (error) {
        if (!cancelled) {
          setStaff([]);
          setNotice(getErrorMessage(error, "Unable to load staff for the selected branch."));
        }
      } finally {
        if (!cancelled) setStaffLoading(false);
      }
    }
    fetchStaff();
    return () => { cancelled = true; };
  }, [isAdmin, markBranch, branches, reloadKey]);

  async function performAttendanceAction(action) {
    if (busy) return;
    if (action === "check-in" && !checkInBranch) {
      setNotice("Choose a branch before checking in.");
      return;
    }
    setBusy(true);
    setNotice("");
    setSuccess("");
    try {
      const response = await apiRequest(`/attendance/me/${action}`, {
        method: "POST",
        ...(action === "check-in" ? {
          body: JSON.stringify({
            branchId: checkInBranch,
            notes: checkInNotes.trim() || null,
          }),
        } : {
          body: JSON.stringify({ notes: checkOutNotes.trim() || null }),
        }),
      });
      setSuccess(response?.message || (action === "check-in" ? "Checked in successfully." : "Checked out successfully."));
      // Clear only after a successful check-in; retain text if the request fails.
      if (action === "check-in") setCheckInNotes("");
      if (action === "check-out") setCheckOutNotes("");
      reload();
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not update your attendance."));
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkAttendance(event) {
    event.preventDefault();
    if (busy) return;
    if (!markBranch || !markUser) {
      setNotice("Select a branch and employee before marking attendance.");
      return;
    }
    setBusy(true);
    setNotice("");
    setSuccess("");
    try {
      const response = await apiRequest("/attendance/admin/mark", {
        method: "POST",
        body: JSON.stringify({
          userId: markUser, branchId: markBranch, date: markDate,
          status: markStatus, notes: markNotes.trim() || null,
        }),
      });
      setSuccess(response?.message || "Attendance marked successfully.");
      setMarkNotes("");
      setReportDate(markDate);
      setReportBranch(markBranch);
      setReportPage(1);
      reload();
    } catch (error) {
      setNotice(getErrorMessage(error, "Could not mark attendance."));
    } finally {
      setBusy(false);
    }
  }

  const visibleHistory = useMemo(() =>
    myHistory.filter((record) => historyBranch === "all" || record.branchId === historyBranch),
  [myHistory, historyBranch]);

  const matchingReportRows = useMemo(() => {
    const term = reportSearch.trim().toLowerCase();
    if (!term) return reportRows;
    return reportRows.filter((record) =>
      [fullName(record.user), record.user?.role, record.branch?.name]
        .some((text) => String(text || "").toLowerCase().includes(term))
    );
  }, [reportRows, reportSearch]);

  const reportStats = useMemo(() => ({
    recorded: reportRows.length,
    present: reportRows.filter((row) => row.status === "PRESENT").length,
    absent: reportRows.filter((row) => row.status === "ABSENT").length,
    leave: reportRows.filter((row) => row.status === "ON_LEAVE").length,
  }), [reportRows]);

  function exportReport() {
    const rows = [
      ["Date", "Employee", "Role", "Branch", "Status", "Check in", "Check out", "Worked minutes", "Notes"],
      ...matchingReportRows.map((record) => [
        formatDate(record.attendanceDate), fullName(record.user), record.user?.role || "",
        record.branch?.name || "", record.status || "", formatTime(record.checkInAt),
        formatTime(record.checkOutAt), record.workedMinutes ?? 0, record.notes || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${reportDate}-page-${reportPage}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (!isAdmin && !isEmployee) {
    return <Notice message="Your account does not have permission to use attendance." />;
  }

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <ClipboardCheck size={24} className="text-primary" />
            <h3 className="fw-bold mb-0">Attendance</h3>
          </div>
          <p className="text-secondary mb-0">
            {isAdmin ? "Monitor staff attendance across your clinic branches." : "Check in and out at your assigned branch and review your attendance."}
          </p>
        </div>
        <button type="button" className="btn btn-light border d-flex align-items-center justify-content-center gap-2" onClick={reload} disabled={busy || branchesLoading || myLoading || reportLoading}>
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      <Notice message={branchError} />
      <Notice message={notice} onClose={() => setNotice("")} />
      <Notice message={success} kind="success" onClose={() => setSuccess("")} />

      {isAdmin ? (
        <>
          <div className="alert alert-primary border-0 rounded-4 d-flex align-items-start gap-2">
            <ShieldCheck size={20} className="flex-shrink-0 mt-1" />
            <span>Administrators manage attendance for clinic employees. ADMIN and SUPER_ADMIN accounts do not clock in or out.</span>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-3 p-md-4">
              <h5 className="fw-bold mb-3">Branch attendance report</h5>
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label fw-semibold" htmlFor="attendance-report-branch">Branch</label>
                  <select id="attendance-report-branch" className="form-select" value={reportBranch} onChange={(event) => { setReportBranch(event.target.value); setReportPage(1); }} disabled={branchesLoading}>
                    <option value="all">All branches</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold" htmlFor="attendance-report-date">Date</label>
                  <input id="attendance-report-date" type="date" className="form-control" value={reportDate} onChange={(event) => { setReportDate(event.target.value); setReportPage(1); }} />
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-semibold" htmlFor="attendance-report-search">Search on this page</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><Search size={16} /></span>
                    <input id="attendance-report-search" className="form-control" value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Employee or role" />
                  </div>
                </div>
                <div className="col-md-2">
                  <button type="button" className="btn btn-outline-primary w-100 d-flex justify-content-center align-items-center gap-2" onClick={exportReport} disabled={!matchingReportRows.length}>
                    <Download size={16} /> Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <SummaryCard label="Records on page" value={reportStats.recorded} icon={Users} />
            <SummaryCard label="Present" value={reportStats.present} icon={CheckCircle2} tone="success" />
            <SummaryCard label="Marked absent" value={reportStats.absent} icon={AlertCircle} tone="danger" />
            <SummaryCard label="On leave" value={reportStats.leave} icon={CalendarDays} tone="warning" />
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                <h5 className="fw-bold mb-0">Attendance records</h5>
                <small className="text-secondary">{reportPagination.total || 0} recorded entries</small>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light"><tr>
                    <th>Employee</th><th>Branch</th><th>Status</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Notes</th>
                  </tr></thead>
                  <tbody>
                    {reportLoading ? (
                      <tr><td colSpan="7" className="text-center text-secondary py-5"><LoaderCircle size={22} className="me-2" />Loading attendance...</td></tr>
                    ) : matchingReportRows.length === 0 ? (
                      <tr><td colSpan="7" className="text-center text-secondary py-5">No recorded attendance for this selection. Unrecorded staff are not automatically marked absent.</td></tr>
                    ) : matchingReportRows.map((record) => (
                      <tr key={record.id}>
                        <td><div className="fw-semibold">{fullName(record.user)}</div><small className="text-secondary">{String(record.user?.role || "").replaceAll("_", " ")}</small></td>
                        <td><span className="d-inline-flex align-items-center gap-1"><Building2 size={14} />{record.branch?.name || "—"}</span></td>
                        <td>{statusBadge(record.status)}</td>
                        <td>{formatTime(record.checkInAt)}</td>
                        <td>{formatTime(record.checkOutAt)}</td>
                        <td>{formatMinutes(record.workedMinutes)}</td>
                        <td className="small text-secondary">{record.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportPagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <button className="btn btn-sm btn-light border" type="button" disabled={reportPage <= 1 || reportLoading} onClick={() => setReportPage((page) => page - 1)}>Previous</button>
                  <small className="text-secondary">Page {reportPage} of {reportPagination.totalPages}</small>
                  <button className="btn btn-sm btn-light border" type="button" disabled={reportPage >= reportPagination.totalPages || reportLoading} onClick={() => setReportPage((page) => page + 1)}>Next</button>
                </div>
              )}
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-3 p-md-4">
              <h5 className="fw-bold mb-1">Mark absence or leave</h5>
              <p className="text-secondary small mb-3">For staff assigned to the selected branch. Existing checked-in records cannot be overwritten.</p>
              <form onSubmit={handleMarkAttendance} className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fw-semibold" htmlFor="attendance-mark-branch">Branch</label>
                  <select id="attendance-mark-branch" className="form-select" value={markBranch} onChange={(event) => { setMarkBranch(event.target.value); setMarkUser(""); }} required>
                    <option value="">Select branch</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold" htmlFor="attendance-mark-user">Employee</label>
                  <select id="attendance-mark-user" className="form-select" value={markUser} onChange={(event) => setMarkUser(event.target.value)} disabled={!markBranch || staffLoading} required>
                    <option value="">{staffLoading ? "Loading employees..." : "Select employee"}</option>
                    {staff.map((employee) => <option key={employee.id} value={employee.id}>{fullName(employee)} ({String(employee.role).replaceAll("_", " ")})</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold" htmlFor="attendance-mark-date">Date</label>
                  <input id="attendance-mark-date" type="date" className="form-control" value={markDate} onChange={(event) => setMarkDate(event.target.value)} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold" htmlFor="attendance-mark-status">Status</label>
                  <select id="attendance-mark-status" className="form-select" value={markStatus} onChange={(event) => setMarkStatus(event.target.value)}>
                    <option value="ABSENT">Absent</option>
                    <option value="ON_LEAVE">On leave</option>
                  </select>
                </div>
                <div className="col-md-8">
                  <label className="form-label fw-semibold" htmlFor="attendance-mark-notes">Notes (optional)</label>
                  <input id="attendance-mark-notes" className="form-control" value={markNotes} onChange={(event) => setMarkNotes(event.target.value)} maxLength={1000} placeholder="Reason or remarks" />
                </div>
                <div className="col-12">
                  <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2" disabled={busy || staffLoading || !markBranch || !markUser}>
                    {busy ? <LoaderCircle size={17} /> : <ClipboardCheck size={17} />} Save attendance
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                <div><h5 className="fw-bold mb-1">My attendance today</h5><p className="text-secondary small mb-0">{formatDate(`${todayInKathmandu()}T00:00:00Z`)} · Nepal time</p></div>
                <span className={`badge rounded-pill px-3 py-2 ${activeCheckIn ? "bg-success-subtle text-success" : "bg-secondary-subtle text-secondary"}`}>
                  {activeCheckIn ? "Currently checked in" : "Not checked in"}
                </span>
              </div>
              {activeCheckIn && (
                <div className="alert alert-success border-0 rounded-3 d-flex align-items-center gap-2">
                  <Clock3 size={19} />
                  <span>Working at <strong>{activeCheckIn.branch?.name || "your assigned branch"}</strong> since {formatTime(activeCheckIn.checkInAt)} · {formatMinutes(Math.floor((nowMs - new Date(activeCheckIn.checkInAt).getTime()) / 60000))} elapsed</span>
                </div>
              )}
              <div className="row g-3 align-items-end">
                <div className="col-md-6">
                  <label className="form-label fw-semibold" htmlFor="attendance-checkin-branch">Assigned branch</label>
                  {branches.length === 1 ? (
                    <div className="form-control bg-light d-flex align-items-center gap-2"><Building2 size={16} />{branches[0].name} (automatic)</div>
                  ) : (
                    <select id="attendance-checkin-branch" className="form-select" value={checkInBranch} onChange={(event) => setCheckInBranch(event.target.value)} disabled={Boolean(activeCheckIn) || branchesLoading}>
                      <option value="">Choose branch</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  )}
                </div>
                {!activeCheckIn ? (
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="attendance-checkin-notes">
                      Check-in notes <span className="text-secondary fw-normal">(optional)</span>
                    </label>
                    <textarea
                      id="attendance-checkin-notes"
                      className="form-control"
                      rows={2}
                      maxLength={1000}
                      value={checkInNotes}
                      onChange={(event) => setCheckInNotes(event.target.value)}
                      placeholder="Any updates or remarks for this shift (not required)"
                      disabled={busy || branchesLoading}
                    />
                    <small className="text-secondary">{checkInNotes.length}/1000 characters · You can leave this blank.</small>
                  </div>
                ) : (
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="attendance-checkout-notes">
                      Check-out notes <span className="text-secondary fw-normal">(optional)</span>
                    </label>
                    <textarea
                      id="attendance-checkout-notes"
                      className="form-control"
                      rows={2}
                      maxLength={1000}
                      value={checkOutNotes}
                      onChange={(event) => setCheckOutNotes(event.target.value)}
                      placeholder="Handover details or end-of-shift updates (not required)"
                      disabled={busy || myLoading}
                    />
                    <small className="text-secondary">{checkOutNotes.length}/1000 characters · You can check out without writing anything.</small>
                  </div>
                )}
                <div className="col-12 d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-success d-inline-flex align-items-center justify-content-center gap-2 flex-fill" onClick={() => performAttendanceAction("check-in")} disabled={busy || myLoading || branchesLoading || Boolean(activeCheckIn) || !checkInBranch || myToday.some((record) => record.branchId === checkInBranch)}>
                    {busy ? <LoaderCircle size={17} /> : <LogIn size={17} />} Check in
                  </button>
                  <button type="button" className="btn btn-outline-danger d-inline-flex align-items-center justify-content-center gap-2 flex-fill" onClick={() => performAttendanceAction("check-out")} disabled={busy || myLoading || !activeCheckIn}>
                    <LogOut size={17} /> Check out
                  </button>
                </div>
              </div>
              {!branchesLoading && branches.length === 0 && <p className="text-danger small mt-3 mb-0">No active branch is assigned to your account. Ask an administrator to assign one.</p>}
              {!activeCheckIn && myToday.some((record) => record.branchId === checkInBranch) && (
                <p className="text-secondary small mt-3 mb-0">You already have an attendance record for this branch today. Select another assigned branch if you worked there too.</p>
              )}
              <p className="text-secondary small mt-3 mb-0">One check-in per employee, branch and day. You must check out before checking into a different branch.</p>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-3 p-md-4">
              <h5 className="fw-bold mb-3">Today's records</h5>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light"><tr><th>Branch</th><th>Status</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Notes</th></tr></thead>
                  <tbody>
                    {myLoading ? <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr> : myToday.length === 0 ? (
                      <tr><td colSpan="6" className="text-center text-secondary py-4">No attendance recorded today.</td></tr>
                    ) : myToday.map((record) => (
                      <tr key={record.id}><td>{record.branch?.name || "—"}</td><td>{statusBadge(record.status)}</td><td>{formatTime(record.checkInAt)}</td><td>{formatTime(record.checkOutAt)}</td><td>{formatMinutes(record.workedMinutes)}</td><td className="small text-secondary" style={{ whiteSpace: "pre-wrap", minWidth: 140 }}>{record.notes || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-3 p-md-4">
              <h5 className="fw-bold mb-3">My attendance history</h5>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label htmlFor="attendance-history-from" className="form-label fw-semibold">From</label>
                  <input id="attendance-history-from" type="date" className="form-control" value={historyFrom} max={historyTo} onChange={(event) => setHistoryFrom(event.target.value)} />
                </div>
                <div className="col-md-4">
                  <label htmlFor="attendance-history-to" className="form-label fw-semibold">To</label>
                  <input id="attendance-history-to" type="date" className="form-control" value={historyTo} min={historyFrom} onChange={(event) => setHistoryTo(event.target.value)} />
                </div>
                <div className="col-md-4">
                  <label htmlFor="attendance-history-branch" className="form-label fw-semibold">Branch</label>
                  <select id="attendance-history-branch" className="form-select" value={historyBranch} onChange={(event) => setHistoryBranch(event.target.value)}>
                    <option value="all">All branches</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light"><tr><th>Date</th><th>Branch</th><th>Status</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Notes</th></tr></thead>
                  <tbody>
                    {myLoading ? <tr><td colSpan="7" className="text-center py-4">Loading...</td></tr> : visibleHistory.length === 0 ? (
                      <tr><td colSpan="7" className="text-center text-secondary py-4">No attendance found for this period.</td></tr>
                    ) : visibleHistory.map((record) => (
                      <tr key={record.id}><td>{formatDate(record.attendanceDate)}</td><td>{record.branch?.name || "—"}</td><td>{statusBadge(record.status)}</td><td>{formatTime(record.checkInAt)}</td><td>{formatTime(record.checkOutAt)}</td><td>{formatMinutes(record.workedMinutes)}</td><td className="small text-secondary" style={{ whiteSpace: "pre-wrap", minWidth: 140 }}>{record.notes || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
      <style>{`.attendance-spin { animation: attendance-rotate 1s linear infinite; } @keyframes attendance-rotate { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default Attendance;
