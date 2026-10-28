import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, Building2, Plus, MapPin, Phone, Mail,
  Star, X, RefreshCw, Pencil, Trash2, Power,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Branches.css";
import { API_BASE_URL } from "../../config/api.js";

const INITIAL_FORM = { name: "", address: "", phone: "", email: "", isMain: false };
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

function getAuthToken() {
  return localStorage.getItem("accessToken") || localStorage.getItem("token");
}

function getUserRole() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return String(user?.role || user?.userRole || user?.data?.role || user?.user?.role || "")
      .trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
  } catch {
    return "";
  }
}

async function branchRequest(method, branchId = null, body = null, action = "") {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token is required. Please log in again.");

  const base = `${API_BASE_URL}/branches`;
  const path = branchId ? `/${encodeURIComponent(branchId)}` : "";
  const url = `${base}${path}${action ? `/${action}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== null ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== null ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    if (response.status === 401) throw new Error(result?.message || "Session expired. Please log in again.");
    if (response.status === 403) throw new Error(result?.message || "You do not have permission to manage branches.");
    throw new Error(result?.message || `Request failed (${response.status})`);
  }
  return result;
}

export default function Branches() {
  const navigate = useNavigate();
  const isAdmin = ADMIN_ROLES.includes(getUserRole());
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ ...INITIAL_FORM });

  const loadBranches = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const result = await branchRequest("GET");
      const data = result?.data ?? result?.branches ?? result;
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("GET_BRANCHES_ERROR:", err);
      setError(err.message || "Could not load branches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadBranches();
    else setLoading(false);
  }, [isAdmin, loadBranches]);

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  function openAddForm() {
    setEditingBranch(null);
    setForm({ ...INITIAL_FORM });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(branch) {
    setEditingBranch(branch);
    setForm({
      name: branch.name || "",
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      isMain: Boolean(branch.isMain),
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving || busyId) return;
    setShowForm(false);
    setEditingBranch(null);
    setFormError("");
    setForm({ ...INITIAL_FORM });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isAdmin || saving || busyId) return;
    if (!form.name.trim()) {
      setFormError("Branch name is required.");
      return;
    }
    const mainExists = branches.some((branch) => branch.isMain && branch.id !== editingBranch?.id);
    if (form.isMain && mainExists) {
      setFormError("A main branch already exists. Unset it first.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      isMain: form.isMain,
    };
    setSaving(true);
    setFormError("");
    setSuccess("");
    try {
      if (editingBranch) {
        await branchRequest("PUT", editingBranch.id, payload);
        setSuccess("Branch updated successfully.");
      } else {
        await branchRequest("POST", null, payload);
        setSuccess("Branch created successfully.");
      }
      setShowForm(false);
      setEditingBranch(null);
      setForm({ ...INITIAL_FORM });
      await loadBranches(true);
    } catch (err) {
      console.error("SAVE_BRANCH_ERROR:", err);
      setFormError(err.message || "Could not save branch.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(branch) {
    if (saving || busyId) return;
    const activate = branch.isActive === false;
    if (!activate && branch.isMain) {
      setFormError("Main branch cannot be deactivated. Set another branch as main first.");
      setError("Main branch cannot be deactivated. Set another branch as main first.");
      return;
    }
    const action = activate ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${action} "${branch.name}"?`)) return;
    setBusyId(branch.id);
    setFormError("");
    setError("");
    setSuccess("");
    try {
      await branchRequest("PATCH", branch.id, null, action);
      setSuccess(`"${branch.name}" ${activate ? "activated" : "deactivated"} successfully.`);
      // Refresh the modal's source data by closing it after a successful status change.
      if (editingBranch?.id === branch.id) {
        setShowForm(false);
        setEditingBranch(null);
      }
      await loadBranches(true);
    } catch (err) {
      console.error("CHANGE_BRANCH_STATUS_ERROR:", err);
      setError(err.message || `Could not ${action} branch.`);
      if (showForm) setFormError(err.message || `Could not ${action} branch.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(branch) {
    if (saving || busyId) return;
    if (branch.isMain) {
      setError("Main branch cannot be deleted. Set another branch as main first.");
      setFormError("Main branch cannot be deleted. Set another branch as main first.");
      return;
    }
    if (!window.confirm(`Permanently delete "${branch.name}"? This cannot be undone. Branches with appointments or assigned users cannot be deleted.`)) return;
    setBusyId(branch.id);
    setError("");
    setFormError("");
    setSuccess("");
    try {
      await branchRequest("DELETE", branch.id);
      if (editingBranch?.id === branch.id) {
        setShowForm(false);
        setEditingBranch(null);
      }
      setSuccess(`"${branch.name}" permanently deleted.`);
      await loadBranches(true);
    } catch (err) {
      console.error("DELETE_BRANCH_ERROR:", err);
      setError(err.message || "Could not delete branch.");
      if (showForm) setFormError(err.message || "Could not delete branch.");
    } finally {
      setBusyId(null);
    }
  }

  const totalBranches = branches.length;
  const activeBranches = branches.filter((branch) => branch.isActive !== false).length;
  const mainBranch = branches.find((branch) => branch.isMain);
  const mainBranchExists = branches.some((branch) => branch.isMain);
  const working = Boolean(saving || busyId);

  if (!isAdmin) {
    return (
      <div className="container-fluid py-5 text-center">
        <Building2 size={48} className="text-danger mb-3" />
        <h4 className="fw-bold">Access Denied</h4>
        <p className="text-secondary">Only Admin and Super Admin can access Branch Management.</p>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3 py-md-4 branches-page">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <button type="button" className="btn btn-light border" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard"><ArrowLeft size={18} /></button>
          <div><h3 className="fw-bold mb-1">Branch Management</h3><p className="text-secondary mb-0">Manage all your clinic branches</p></div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-light border d-flex align-items-center gap-2" onClick={() => loadBranches(true)} disabled={loading || refreshing || working}>
            <RefreshCw size={17} className={refreshing ? "branch-spin" : ""} /> Refresh
          </button>
          <button type="button" className="btn btn-primary d-flex align-items-center gap-2" onClick={openAddForm} disabled={working}>
            <Plus size={18} /> Add Branch
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {success && <div className="alert alert-success alert-dismissible fade show" role="status">{success}<button type="button" className="btn-close" aria-label="Close" onClick={() => setSuccess("")} /></div>}

      <div className="row g-3 mb-4">
        {[
          { label: "Total Branches", value: totalBranches, icon: <Building2 size={24} />, color: "primary" },
          { label: "Active Branches", value: activeBranches, icon: <Building2 size={24} />, color: "success" },
          { label: "Main Branch", value: mainBranch?.name || "Not assigned", icon: <Star size={24} />, color: "warning" },
        ].map((stat) => (
          <div className="col-md-4" key={stat.label}>
            <div className="card branch-stat-card h-100"><div className="card-body p-4 d-flex align-items-center justify-content-between">
              <div><p className="text-secondary mb-2">{stat.label}</p><h4 className="fw-bold mb-0">{stat.value}</h4></div>
              <div className={`branch-stat-icon bg-${stat.color}-subtle text-${stat.color}`}>{stat.icon}</div>
            </div></div>
          </div>
        ))}
      </div>

      <div className="mb-3"><h5 className="fw-bold mb-1">All Branches</h5><p className="text-secondary small mb-0">View your registered clinic locations</p></div>
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading branches</span></div><p className="text-secondary mt-3">Loading branches...</p></div>
      ) : branches.length === 0 && !error ? (
        <div className="card branch-empty-card"><div className="card-body text-center py-5">
          <Building2 size={44} className="text-secondary mb-3" /><h5 className="fw-bold">No branches found</h5>
          <p className="text-secondary">Add your first clinic branch to get started.</p>
          <button type="button" className="btn btn-primary" onClick={openAddForm}><Plus size={17} className="me-2" />Add Branch</button>
        </div></div>
      ) : (
        <div className="row g-3">
          {branches.map((branch) => {
            const active = branch.isActive !== false;
            return (
              <div className="col-md-6 col-xl-4" key={branch.id}>
                <div className="card branch-card h-100"><div className="card-body p-4">
                  <div className="d-flex align-items-start gap-3 mb-3">
                    <div className="branch-icon"><Building2 size={24} /></div>
                    <div className="flex-grow-1 min-w-0">
                      <h5 className="fw-bold mb-2">{branch.name}</h5>
                      <div className="d-flex gap-2 flex-wrap">
                        {branch.isMain && <span className="badge bg-primary-subtle text-primary">Main Branch</span>}
                        <span className={`badge ${active ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>{active ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-2 text-secondary"><MapPin size={16} className="flex-shrink-0" /><span className="small">{branch.address || "No address provided"}</span></div>
                    <div className="d-flex align-items-center gap-2 text-secondary"><Phone size={16} className="flex-shrink-0" /><span className="small">{branch.phone || "No phone provided"}</span></div>
                    {branch.email && <div className="d-flex align-items-center gap-2 text-secondary"><Mail size={16} className="flex-shrink-0" /><span className="small text-break">{branch.email}</span></div>}
                  </div>
                  <hr className="my-3" />
                  <div className="d-flex justify-content-end gap-2 flex-wrap">
                    <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2" onClick={() => openEditForm(branch)} disabled={working}><Pencil size={15} /> Edit</button>
                    <button type="button" className={`btn btn-sm ${active ? "btn-outline-warning" : "btn-outline-success"} d-flex align-items-center gap-2`} onClick={() => handleToggleActive(branch)} disabled={working || (active && branch.isMain)} title={active && branch.isMain ? "Main branch cannot be deactivated" : undefined}>
                      <Power size={15} /> {busyId === branch.id ? "Processing..." : active ? "Deactivate" : "Activate"}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger d-flex align-items-center gap-2" onClick={() => handleDelete(branch)} disabled={working || branch.isMain} title={branch.isMain ? "Main branch cannot be deleted" : "Permanently delete branch"}>
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div></div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="branch-modal-overlay">
          <div className="card branch-modal shadow-lg" role="dialog" aria-modal="true" aria-labelledby="branch-form-title">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div><h5 id="branch-form-title" className="fw-bold mb-1">{editingBranch ? "Edit Branch" : "Add New Branch"}</h5><p className="text-secondary small mb-0">{editingBranch ? "Update the branch information" : "Enter clinic branch information"}</p></div>
                <button type="button" className="btn btn-light border-0" onClick={closeForm} disabled={working} aria-label="Close form"><X size={19} /></button>
              </div>
              {formError && <div className="alert alert-danger" role="alert">{formError}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3"><label htmlFor="branch-name" className="form-label fw-semibold">Branch Name *</label><input id="branch-name" className="form-control" required maxLength={150} value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="e.g. Lakeside Branch" /></div>
                <div className="mb-3"><label htmlFor="branch-address" className="form-label fw-semibold">Address</label><input id="branch-address" className="form-control" maxLength={500} value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="e.g. Lakeside, Pokhara" /></div>
                <div className="mb-3"><label htmlFor="branch-phone" className="form-label fw-semibold">Phone</label><input id="branch-phone" type="tel" className="form-control" maxLength={30} value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="Branch contact number" /></div>
                <div className="mb-3"><label htmlFor="branch-email" className="form-label fw-semibold">Email</label><input id="branch-email" type="email" className="form-control" value={form.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="branch@example.com" /></div>
                {editingBranch && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Branch Status</label>
                    <div><span className={`badge ${editingBranch.isActive !== false ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger"}`}>{editingBranch.isActive !== false ? "Active" : "Inactive"}</span></div>
                    <small className="text-secondary">Use the Activate/Deactivate button below to change status.</small>
                  </div>
                )}
                <div className="form-check mb-4">
                  <input id="isMain" type="checkbox" className="form-check-input" checked={form.isMain} disabled={mainBranchExists && editingBranch?.isMain !== true} onChange={(e) => updateForm("isMain", e.target.checked)} />
                  <label className="form-check-label fw-semibold" htmlFor="isMain">Set as Main Branch</label>
                  {mainBranchExists && editingBranch?.isMain !== true && <small className="d-block text-secondary">A main branch already exists. Unset the current main branch first.</small>}
                </div>
                <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                  {editingBranch ? (
                    <div className="d-flex gap-2 flex-wrap">
                      <button type="button" className={`btn btn-sm ${editingBranch.isActive !== false ? "btn-outline-warning" : "btn-outline-success"}`} onClick={() => handleToggleActive(editingBranch)} disabled={working || (editingBranch.isActive !== false && editingBranch.isMain)}>
                        <Power size={15} className="me-1" />{editingBranch.isActive !== false ? "Deactivate Branch" : "Activate Branch"}
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(editingBranch)} disabled={working || editingBranch.isMain}><Trash2 size={15} className="me-1" />Delete Permanently</button>
                    </div>
                  ) : <span />}
                  <div className="d-flex justify-content-end gap-2 ms-auto">
                    <button type="button" className="btn btn-light border" onClick={closeForm} disabled={working}>Cancel</button>
                    <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={working}>
                      {saving ? <><span className="spinner-border spinner-border-sm" role="status" />Saving...</> : <>{editingBranch ? <Pencil size={17} /> : <Plus size={17} />}{editingBranch ? "Save Changes" : "Create Branch"}</>}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
