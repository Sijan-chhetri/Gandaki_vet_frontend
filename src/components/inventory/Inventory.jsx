import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Barcode, Boxes, Building2, CalendarDays, CheckCircle2,
  Download, Edit3, FolderCog, Package, Plus, RefreshCw, Search,
  Trash2, TrendingDown, X,
} from "lucide-react";
import inventoryService from "../../services/inventory.service.js";
import apiRequest from "../../services/api";

// These values match enum InventoryItemType in schema.prisma.
const ITEM_TYPES = ["MEDICINE", "VACCINE", "CONSUMABLE", "FOOD", "ACCESSORY", "EQUIPMENT", "OTHER"];
const UNITS = ["Piece", "Box", "Bottle", "Vial", "Strip", "Kit", "Pack", "Bag", "Tube", "Can", "Tablet", "Capsule", "Millilitre"];
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

const emptyItem = (branchId = "") => ({
  branchId, name: "", genericName: "", type: "MEDICINE", categoryId: "",
  unit: "Piece", purchasePrice: "", sellingPrice: "", openingStock: "",
  reorderLevel: "", taxPercent: "", requiresBatch: false, isActive: true,
  sku: "", barcode: "", expiryDate: "",
});
const emptyCategory = () => ({ name: "", description: "" });
const emptyBatch = () => ({ batchNumber: "", quantity: "", costPrice: "", manufactureDate: "", expiryDate: "", reason: "" });
const emptyAdjustment = () => ({ quantity: "", batchId: "", reason: "" });
const money = (v) => `NPR ${Number(v || 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
const titleCase = (s = "") => String(s).toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const dateInput = (v) => (v ? String(v).slice(0, 10) : "");
const dateLabel = (v) => dateInput(v) || "Not set";
const stockStatus = (item) => !item.isActive ? "Inactive" : Number(item.currentStock) <= 0 ? "Out of Stock" : Number(item.currentStock) <= Number(item.reorderLevel) ? "Low Stock" : "In Stock";
const statusColor = { "In Stock": "success", "Out of Stock": "danger", "Low Stock": "warning", Inactive: "secondary" };
function getUser() {
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    return stored?.user || stored?.data?.user || stored?.data || stored;
  }
  catch { return null; }
}
function dataArray(response, keys = []) {
  const root = response?.data?.data ?? response?.data ?? response;
  for (const value of [root, response, ...keys.map((key) => root?.[key]), ...keys.map((key) => response?.[key])]) {
    if (Array.isArray(value)) return value;
  }
  return [];
}
function errorMessage(error) { return error?.message || "The request could not be completed."; }
function cleanItem(form, editing) {
  const data = {
    branchId: form.branchId, name: form.name.trim(), genericName: form.genericName.trim() || null,
    type: form.type, categoryId: form.categoryId || null, unit: form.unit,
    purchasePrice: Number(form.purchasePrice || 0), sellingPrice: Number(form.sellingPrice || 0),
    reorderLevel: Number(form.reorderLevel || 0), taxPercent: Number(form.taxPercent || 0),
    requiresBatch: Boolean(form.requiresBatch), isActive: Boolean(form.isActive),
    sku: form.sku.trim() || null, barcode: form.barcode.trim() || null,
    expiryDate: form.expiryDate || null,
  };
  if (!editing) data.currentStock = form.requiresBatch ? 0 : Number(form.openingStock || 0);
  return data;
}

function Modal({ title, children, onClose, size = "modal-lg" }) {
  return <>
    <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
      <div className={`modal-dialog ${size} modal-dialog-centered modal-dialog-scrollable`}>
        <div className="modal-content border-0 shadow">
          <div className="modal-header"><h5 className="modal-title fw-bold">{title}</h5>
            <button type="button" className="btn btn-light" onClick={onClose} aria-label="Close"><X size={18}/></button>
          </div>
          <div className="modal-body p-4">{children}</div>
        </div>
      </div>
    </div>
    <div className="modal-backdrop fade show" />
  </>;
}
function Field({ label, value, onChange, type = "text", required = false, min, step, disabled = false, children, help }) {
  return <div className="col-md-6">
    <label className="form-label fw-semibold small">{label}</label>
    {children || <input className="form-control" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required} min={min} step={step} disabled={disabled} />}
    {help && <small className="text-secondary">{help}</small>}
  </div>;
}
function Actions({ busy, onCancel, label = "Save" }) {
  return <div className="d-flex justify-content-end gap-2 mt-4">
    <button className="btn btn-light border" type="button" onClick={onCancel}>Cancel</button>
    <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving..." : label}</button>
  </div>;
}

export default function Inventory() {
  const role = String(getUser()?.role || "").toUpperCase();
  const isAdmin = ADMIN_ROLES.has(role);
  const [branches, setBranches] = useState([]);
  const [branchLoading, setBranchLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: "", categoryId: "", type: "", stockStatus: "", isActive: "true" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyItem());
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory());
  const [batchItem, setBatchItem] = useState(null);
  const [batchForm, setBatchForm] = useState(emptyBatch());
  const [stockItem, setStockItem] = useState(null);
  const [stockMode, setStockMode] = useState("add");
  const [stockBatches, setStockBatches] = useState([]);
  const [stockForm, setStockForm] = useState(emptyAdjustment());
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const alert = (message) => { setError(message); setSuccess(""); };
  const updateForm = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateCategoryForm = (key, value) => setCategoryForm((f) => ({ ...f, [key]: value }));
  const updateBatchForm = (key, value) => setBatchForm((f) => ({ ...f, [key]: value }));
  const updateStockForm = (key, value) => setStockForm((f) => ({ ...f, [key]: value }));
  const branchName = (id) => branches.find((b) => b.id === id)?.name || "Unassigned";
  const selectedBranchName = selectedBranch === "all" ? "All branches" : branchName(selectedBranch);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBranchLoading(true);
      try {
        // Admins may need GET /branches to see every branch; staff use their assignments.
        let response;
        if (isAdmin) {
          try { response = await apiRequest("/branches"); }
          catch { response = await apiRequest("/users/me/branches"); }
        } else {
          response = await apiRequest("/users/me/branches");
        }
        if (cancelled) return;
        const list = dataArray(response, ["branches"]).filter((b) => b?.id && b.isActive !== false);
        setBranches(list);
        setSelectedBranch((old) => old && (old === "all" || list.some((b) => b.id === old)) ? old : isAdmin ? "all" : list.length === 1 ? list[0].id : "all");
      } catch (e) { if (!cancelled) alert(`Unable to load branches: ${errorMessage(e)}`); }
      finally { if (!cancelled) setBranchLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const loadCategories = useCallback(async () => {
    const response = await inventoryService.getCategories();
    setCategories(dataArray(response, ["categories"]));
  }, []);

  const loadPage = useCallback(async (page = 1) => {
    if (!selectedBranch) return;
    setLoading(true);
    setError("");
    try {
      // Filter and summary APIs must accept branchId in inventory.service.js.
      const params = { ...filters, search: search.trim(), branchId: selectedBranch, page, limit: pagination.limit, sortBy: "createdAt", sortOrder: "desc" };
      const [listResult, categoryResult, statsResult] = await Promise.all([
        inventoryService.getItems(params),
        inventoryService.getCategories(),
        inventoryService.getStats({ branchId: selectedBranch }),
      ]);
      setItems(dataArray(listResult, ["items"]));
      setCategories(dataArray(categoryResult, ["categories"]));
      setStats(statsResult?.data?.data ?? statsResult?.data ?? null);
      setPagination((p) => ({ ...p, ...(listResult?.pagination || listResult?.data?.pagination || {}), page }));
    } catch (e) { alert(errorMessage(e)); }
    finally { setLoading(false); }
  }, [selectedBranch, filters, search, pagination.limit]);

  useEffect(() => {
    if (branchLoading || !selectedBranch) return undefined;
    const timer = window.setTimeout(() => { loadPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [branchLoading, selectedBranch, filters, search, refreshKey, loadPage]);

  const refresh = () => setRefreshKey((k) => k + 1);
  const showCreate = () => {
    setEditingItem(null);
    const branchId = selectedBranch === "all" ? (branches.length === 1 ? branches[0].id : "") : selectedBranch;
    setForm(emptyItem(branchId)); setError(""); setItemModal(true);
  };
  const showEdit = (item) => {
    setEditingItem(item);
    setForm({
      ...emptyItem(item.branchId || ""),
      name: item.name || "", genericName: item.genericName || "", type: item.type || "MEDICINE",
      categoryId: item.categoryId || "", unit: item.unit || "Piece",
      purchasePrice: String(item.purchasePrice ?? ""), sellingPrice: String(item.sellingPrice ?? ""),
      reorderLevel: String(item.reorderLevel ?? ""), taxPercent: String(item.taxPercent ?? ""),
      requiresBatch: Boolean(item.requiresBatch), isActive: Boolean(item.isActive),
      sku: item.sku || "", barcode: item.barcode || "", expiryDate: dateInput(item.expiryDate),
    });
    setError(""); setItemModal(true);
  };

  async function submitItem(e) {
    e.preventDefault();
    if (!form.branchId || form.branchId === "all") return alert("Choose a real branch for this item.");
    if (!branches.some((b) => b.id === form.branchId)) return alert("Selected branch is not accessible.");
    if (!form.name.trim() || !form.unit.trim()) return alert("Name and unit are required.");
    if (!ITEM_TYPES.includes(form.type)) return alert("Invalid inventory item type.");
    if (form.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.expiryDate)) return alert("Invalid expiry date.");
    if (!editingItem && Number(form.openingStock || 0) < 0) return alert("Opening stock cannot be negative.");
    setSaving(true); setError(""); setSuccess("");
    try {
      const payload = cleanItem(form, Boolean(editingItem));
      if (editingItem) {
        // Item transfers across branches need their own audited workflow.
        await inventoryService.updateItem(editingItem.id, payload);
        setSuccess("Inventory item updated successfully.");
      } else {
        const result = await inventoryService.createItem(payload);
        const created = result?.data?.data || result?.data || result;
        if (form.requiresBatch && Number(form.openingStock) > 0) {
          setBatchItem(created);
          setBatchForm({ ...emptyBatch(), quantity: form.openingStock, costPrice: form.purchasePrice, expiryDate: form.expiryDate, reason: "Opening batch stock" });
        }
        setSuccess("Inventory item created successfully.");
      }
      setItemModal(false); refresh();
    } catch (e2) { alert(errorMessage(e2)); }
    finally { setSaving(false); }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete ${item.name} from ${branchName(item.branchId)}? Items with stock cannot be deleted.`)) return;
    try { await inventoryService.deleteItem(item.id); setSuccess("Item deleted."); refresh(); }
    catch (e) { alert(errorMessage(e)); }
  }
  async function showDetails(item) {
    setDetails(item); setDetailsLoading(true);
    try { const result = await inventoryService.getItem(item.id); setDetails(result?.data?.data || result?.data || result); }
    catch (e) { setDetails(null); alert(errorMessage(e)); }
    finally { setDetailsLoading(false); }
  }
  async function showAdjustment(item, mode) {
    try {
      const result = item.requiresBatch ? await inventoryService.getBatches(item.id) : { data: [] };
      setStockBatches(dataArray(result, ["batches"]));
      setStockItem(item); setStockMode(mode); setStockForm(emptyAdjustment()); setError("");
    } catch (e) { alert(errorMessage(e)); }
  }
  async function submitAdjustment(e) {
    e.preventDefault();
    if (!(Number(stockForm.quantity) > 0)) return alert("Quantity must be greater than zero.");
    if (stockItem.requiresBatch && !stockForm.batchId) return alert("Choose a batch for this item.");
    setSaving(true); setError("");
    try {
      await inventoryService.adjustStock(stockItem.id, {
        branchId: stockItem.branchId,
        type: stockMode === "add" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
        quantity: Number(stockForm.quantity), batchId: stockForm.batchId || null,
        reason: stockForm.reason.trim() || null, referenceType: "MANUAL_ADJUSTMENT",
      });
      setStockItem(null); setSuccess("Stock adjusted successfully."); refresh();
    } catch (e2) { alert(errorMessage(e2)); }
    finally { setSaving(false); }
  }
  function showBatch(item) {
    setBatchItem(item);
    setBatchForm({ ...emptyBatch(), costPrice: String(item.purchasePrice ?? "") });
    setError("");
  }
  async function submitBatch(e) {
    e.preventDefault();
    if (!batchForm.batchNumber.trim() || !(Number(batchForm.quantity) > 0)) return alert("Batch number and positive quantity are required.");
    if (batchForm.manufactureDate && batchForm.expiryDate && batchForm.expiryDate <= batchForm.manufactureDate) return alert("Expiry must be after manufacture date.");
    setSaving(true); setError("");
    try {
      await inventoryService.createBatch(batchItem.id, {
        branchId: batchItem.branchId, batchNumber: batchForm.batchNumber.trim(),
        quantity: Number(batchForm.quantity), costPrice: Number(batchForm.costPrice || 0),
        manufactureDate: batchForm.manufactureDate || null, expiryDate: batchForm.expiryDate || null,
        reason: batchForm.reason.trim() || "Batch stock received",
      });
      setBatchItem(null); setSuccess("Batch created successfully."); refresh();
    } catch (e2) { alert(errorMessage(e2)); }
    finally { setSaving(false); }
  }
  function showCategoryManager(category = null) {
    setEditingCategory(category);
    setCategoryForm(category ? { name: category.name, description: category.description || "" } : emptyCategory());
    setCategoryModal(true); setError("");
  }
  async function submitCategory(e) {
    e.preventDefault();
    if (!categoryForm.name.trim()) return alert("Category name is required.");
    setSaving(true); setError("");
    try {
      const payload = { name: categoryForm.name.trim(), description: categoryForm.description.trim() || null };
      if (editingCategory) await inventoryService.updateCategory(editingCategory.id, payload);
      else await inventoryService.createCategory(payload);
      setEditingCategory(null); setCategoryForm(emptyCategory());
      await loadCategories(); setSuccess("Category saved successfully.");
    } catch (e2) { alert(errorMessage(e2)); }
    finally { setSaving(false); }
  }
  async function deleteCategory(category) {
    if (!window.confirm(`Delete category ${category.name}?`)) return;
    try { await inventoryService.deleteCategory(category.id); setSuccess("Category deleted."); await loadCategories(); refresh(); }
    catch (e) { alert(errorMessage(e)); }
  }
  async function exportCsv() {
    try { await inventoryService.exportCsv({ branchId: selectedBranch }); }
    catch (e) { alert(errorMessage(e)); }
  }

  const attention = useMemo(() => items.filter((i) => ["Low Stock", "Out of Stock"].includes(stockStatus(i))).slice(0, 5), [items]);
  return <div className="container-fluid py-4">
    <div className="rounded-4 border bg-white p-4 mb-4">
      <div className="row align-items-center g-3">
        <div className="col-xl-7">
          <span className="badge bg-primary-subtle text-primary mb-2"><Boxes size={15} className="me-1"/>Branch-wise clinic inventory</span>
          <h2 className="fw-bold mb-1">Inventory management</h2>
          <p className="text-secondary mb-3">Manage medicines, batches, optional expiry dates and stock independently for each branch.</p>
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-primary" onClick={showCreate} disabled={branchLoading || !branches.length}><Plus size={16} className="me-2"/>Add item</button>
            <button className="btn btn-light border" onClick={() => showCategoryManager()}><FolderCog size={16} className="me-2"/>Categories</button>
            <button className="btn btn-light border" onClick={exportCsv} disabled={!selectedBranch}><Download size={16} className="me-2"/>Export CSV</button>
          </div>
        </div>
        <div className="col-xl-5">
          <div className="row g-2">
            {[["Total items", stats?.totalItems, Package], ["Low stock", stats?.lowStockItems, TrendingDown], ["Out of stock", stats?.outOfStockItems, AlertTriangle], ["Cost value", money(stats?.stockValue?.cost), CheckCircle2]].map(([label, value, Icon]) => <div key={label} className="col-6"><div className="border rounded-3 p-3 h-100"><Icon size={18} className="text-primary mb-2"/><div className="small text-secondary">{label}</div><div className="fw-bold">{value ?? 0}</div></div></div>)}
          </div>
        </div>
      </div>
    </div>
    {error && <div className="alert alert-danger d-flex justify-content-between"><span>{error}</span><button className="btn-close" onClick={() => setError("")} /></div>}
    {success && <div className="alert alert-success d-flex justify-content-between"><span>{success}</span><button className="btn-close" onClick={() => setSuccess("")} /></div>}
    <div className="card border-0 shadow-sm rounded-4 mb-4"><div className="card-body p-4"><div className="row g-3">
      <div className="col-lg-4"><label className="form-label fw-semibold">Branch</label><div className="input-group"><span className="input-group-text bg-white"><Building2 size={17}/></span><select className="form-select" value={selectedBranch} onChange={(e) => { setSelectedBranch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} disabled={branchLoading}>
        {branches.length !== 1 && <option value="all">All accessible branches</option>}
        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.isMain ? " (Main)" : ""}</option>)}
      </select></div></div>
      <div className="col-lg-4"><label className="form-label fw-semibold">Search inventory</label><div className="input-group"><span className="input-group-text bg-white"><Search size={17}/></span><input className="form-control" placeholder="Name, SKU, barcode" value={search} onChange={(e) => setSearch(e.target.value)}/></div></div>
      <div className="col-lg-2"><label className="form-label fw-semibold">Item type</label><select className="form-select" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}><option value="">All types</option>{ITEM_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</select></div>
      <div className="col-lg-2"><label className="form-label fw-semibold">Stock status</label><select className="form-select" value={filters.stockStatus} onChange={(e) => setFilters((f) => ({ ...f, stockStatus: e.target.value }))}><option value="">All levels</option><option value="low-stock">Low stock</option><option value="out-of-stock">Out of stock</option></select></div>
      <div className="col-lg-4"><label className="form-label fw-semibold">Category</label><select className="form-select" value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="col-lg-3"><label className="form-label fw-semibold">Activity</label><select className="form-select" value={filters.isActive} onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}><option value="">All items</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
      <div className="col-lg-5 d-flex align-items-end justify-content-end gap-2"><button className="btn btn-light border" onClick={() => { setFilters({ search: "", categoryId: "", type: "", stockStatus: "", isActive: "true" }); setSearch(""); }}>Reset filters</button><button className="btn btn-outline-primary" onClick={refresh}><RefreshCw size={16} className="me-1"/>Refresh</button></div>
    </div></div></div>
    {attention.length > 0 && <div className="alert alert-warning rounded-4"><AlertTriangle size={18} className="me-2"/><strong>Stock attention:</strong> {attention.map((i) => `${i.name} (${branchName(i.branchId)})`).join(", ")}</div>}
    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
      <div className="card-header bg-white p-3 d-flex justify-content-between"><strong>Inventory records — {selectedBranchName}</strong><small className="text-secondary">{pagination.total} items</small></div>
      <div className="table-responsive"><table className="table table-hover align-middle mb-0"><thead className="table-light"><tr><th className="ps-3">Item</th><th>Branch</th><th>Category</th><th>Stock</th><th>Expiry date</th><th>Price</th><th>Status</th><th className="text-end pe-3">Actions</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={8} className="py-5 text-center">Loading inventory...</td></tr> : items.length === 0 ? <tr><td colSpan={8} className="py-5 text-center text-secondary">No inventory found for the selected branch and filters.</td></tr> : items.map((item) => <tr key={item.id}>
          <td className="ps-3"><button className="btn btn-link p-0 fw-semibold text-decoration-none text-start" onClick={() => showDetails(item)}>{item.name}</button><div className="small text-secondary">{item.genericName || titleCase(item.type)} · {item.sku || "No SKU"}</div></td>
          <td><Building2 size={14} className="me-1"/>{item.branch?.name || branchName(item.branchId)}</td>
          <td>{item.category?.name || "—"}</td><td><strong>{Number(item.currentStock)}</strong> {item.unit}<div className="small text-secondary">Reorder: {Number(item.reorderLevel)}</div></td>
          <td><ExpiryText date={item.expiryDate}/>{item.requiresBatch && <div className="small text-primary">Batch tracked</div>}</td>
          <td>{money(item.sellingPrice)}<div className="small text-secondary">Cost: {money(item.purchasePrice)}</div></td>
          <td><span className={`badge text-bg-${statusColor[stockStatus(item)]}`}>{stockStatus(item)}</span></td>
          <td className="text-end pe-3"><div className="dropdown"><button className="btn btn-sm btn-light border dropdown-toggle" data-bs-toggle="dropdown" type="button">Actions</button><ul className="dropdown-menu dropdown-menu-end shadow-sm">
            <li><button className="dropdown-item" onClick={() => showDetails(item)}>View details</button></li><li><button className="dropdown-item" onClick={() => showEdit(item)}>Edit item</button></li>
            {item.requiresBatch && <li><button className="dropdown-item" onClick={() => showBatch(item)}>Add batch</button></li>}
            <li><button className="dropdown-item" onClick={() => showAdjustment(item, "add")}>Add stock</button></li><li><button className="dropdown-item" onClick={() => showAdjustment(item, "remove")}>Remove stock</button></li>
            <li><hr className="dropdown-divider"/></li><li><button className="dropdown-item text-danger" onClick={() => deleteItem(item)}>Delete item</button></li>
          </ul></div></td>
        </tr>)}
      </tbody></table></div>
      <div className="card-footer bg-white d-flex align-items-center justify-content-between p-3"><small>Page {pagination.page} of {Math.max(1, pagination.totalPages || 1)}</small><div className="btn-group"><button className="btn btn-sm btn-outline-secondary" disabled={loading || pagination.page <= 1} onClick={() => loadPage(pagination.page - 1)}>Previous</button><button className="btn btn-sm btn-outline-secondary" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => loadPage(pagination.page + 1)}>Next</button></div></div>
    </div>

    {itemModal && <Modal title={editingItem ? "Edit inventory item" : "Add inventory item"} size="modal-xl" onClose={() => setItemModal(false)}><form onSubmit={submitItem}>
      <h6 className="fw-bold border-bottom pb-2">Branch and item details</h6><div className="row g-3">
        <Field label="Branch (required)" help={editingItem ? "Branch cannot be changed by editing an item. Use a dedicated stock transfer workflow." : "Items and stock are stored separately for each branch."}>
          <select className="form-select" required value={form.branchId} disabled={Boolean(editingItem)} onChange={(e) => updateForm("branchId", e.target.value)}><option value="">Select branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        </Field>
        <Field label="Item name" value={form.name} required onChange={(v) => updateForm("name", v)}/><Field label="Generic name (optional)" value={form.genericName} onChange={(v) => updateForm("genericName", v)}/>
        <Field label="Item type"><select className="form-select" value={form.type} onChange={(e) => updateForm("type", e.target.value)}>{ITEM_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</select></Field>
        <Field label="Category"><select className="form-select" value={form.categoryId} onChange={(e) => updateForm("categoryId", e.target.value)}><option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Unit"><select className="form-select" value={form.unit} onChange={(e) => updateForm("unit", e.target.value)}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
      </div>
      <h6 className="fw-bold border-bottom pb-2 mt-4">Stock, pricing and expiry</h6><div className="row g-3">
        {!editingItem && <Field label={form.requiresBatch ? "Opening stock for first batch" : "Opening stock"} type="number" min="0" step="0.01" value={form.openingStock} onChange={(v) => updateForm("openingStock", v)} help={form.requiresBatch ? "The first batch will be created after saving the item." : "Optional; leave empty for zero."}/>}
        <Field label="Reorder level" type="number" min="0" step="0.01" value={form.reorderLevel} onChange={(v) => updateForm("reorderLevel", v)}/><Field label="Purchase price" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(v) => updateForm("purchasePrice", v)}/>
        <Field label="Selling price" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(v) => updateForm("sellingPrice", v)}/><Field label="Tax percent" type="number" min="0" step="0.01" value={form.taxPercent} onChange={(v) => updateForm("taxPercent", v)}/>
        <Field label="Expiry date (optional)" type="date" value={form.expiryDate} onChange={(v) => updateForm("expiryDate", v)} help="Leave blank for items without expiry. Batch expiry dates can be recorded separately."/>
      </div>
      <h6 className="fw-bold border-bottom pb-2 mt-4">Identifiers and settings</h6><div className="row g-3">
        <Field label="SKU (optional)" value={form.sku} onChange={(v) => updateForm("sku", v)}/><Field label="Barcode (optional)" value={form.barcode} onChange={(v) => updateForm("barcode", v)}/>
      </div><div className="d-flex gap-4 mt-3">
        <label className="form-check"><input className="form-check-input" type="checkbox" checked={form.requiresBatch} disabled={Boolean(editingItem && Number(editingItem.currentStock) > 0)} onChange={(e) => updateForm("requiresBatch", e.target.checked)}/> <span className="form-check-label">Requires batch tracking</span></label>
        <label className="form-check"><input className="form-check-input" type="checkbox" checked={form.isActive} onChange={(e) => updateForm("isActive", e.target.checked)}/> <span className="form-check-label">Active item</span></label>
      </div><Actions busy={saving} onCancel={() => setItemModal(false)} label={editingItem ? "Save changes" : "Create item"}/>
    </form></Modal>}

    {categoryModal && <Modal title="Inventory categories" onClose={() => setCategoryModal(false)}><form onSubmit={submitCategory} className="border rounded-3 p-3 mb-3"><h6>{editingCategory ? "Edit category" : "Add category"}</h6><div className="row g-3"><Field label="Category name" required value={categoryForm.name} onChange={(v) => updateCategoryForm("name", v)}/><Field label="Description" value={categoryForm.description} onChange={(v) => updateCategoryForm("description", v)}/></div><div className="d-flex justify-content-end gap-2 mt-3"><button className="btn btn-light border" type="button" onClick={() => { setEditingCategory(null); setCategoryForm(emptyCategory()); }}>Clear</button><button className="btn btn-primary" type="submit" disabled={saving}>Save category</button></div></form><div className="list-group">{categories.map((c) => <div key={c.id} className="list-group-item d-flex justify-content-between align-items-center"><div><strong>{c.name}</strong><div className="small text-secondary">{c.description || "No description"} · {c._count?.items ?? 0} items</div></div><div className="btn-group"><button className="btn btn-sm btn-outline-primary" onClick={() => showCategoryManager(c)}><Edit3 size={15}/></button><button className="btn btn-sm btn-outline-danger" disabled={Number(c._count?.items || 0) > 0} onClick={() => deleteCategory(c)}><Trash2 size={15}/></button></div></div>)}</div></Modal>}

    {stockItem && <Modal title={`${stockMode === "add" ? "Add" : "Remove"} stock — ${stockItem.name}`} onClose={() => setStockItem(null)}><form onSubmit={submitAdjustment}><p className="alert alert-light border">Branch: <strong>{branchName(stockItem.branchId)}</strong> · Available: <strong>{Number(stockItem.currentStock)} {stockItem.unit}</strong></p><div className="row g-3"><Field label="Quantity" type="number" min="0.01" step="0.01" required value={stockForm.quantity} onChange={(v) => updateStockForm("quantity", v)}/>{stockItem.requiresBatch && <Field label="Batch"><select className="form-select" value={stockForm.batchId} required onChange={(e) => updateStockForm("batchId", e.target.value)}><option value="">Select batch</option>{stockBatches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber} · {Number(b.quantityAvailable)} available · Expires: {dateLabel(b.expiryDate)}</option>)}</select></Field>}<div className="col-12"><label className="form-label">Reason (optional)</label><textarea className="form-control" rows={2} value={stockForm.reason} onChange={(e) => updateStockForm("reason", e.target.value)}/></div></div><Actions busy={saving} onCancel={() => setStockItem(null)} label="Confirm adjustment"/></form></Modal>}

    {batchItem && <Modal title={`Add batch — ${batchItem.name}`} onClose={() => setBatchItem(null)}><form onSubmit={submitBatch}><p className="small text-secondary">Branch: {branchName(batchItem.branchId)}</p><div className="row g-3"><Field label="Batch number" value={batchForm.batchNumber} onChange={(v) => updateBatchForm("batchNumber", v)} required/><Field label="Quantity" type="number" min="0.01" step="0.01" value={batchForm.quantity} onChange={(v) => updateBatchForm("quantity", v)} required/><Field label="Cost price" type="number" min="0" step="0.01" value={batchForm.costPrice} onChange={(v) => updateBatchForm("costPrice", v)}/><Field label="Manufacture date (optional)" type="date" value={batchForm.manufactureDate} onChange={(v) => updateBatchForm("manufactureDate", v)}/><Field label="Expiry date (optional)" type="date" value={batchForm.expiryDate} onChange={(v) => updateBatchForm("expiryDate", v)} help="Different batches can have different expiry dates."/><div className="col-12"><label className="form-label">Reason (optional)</label><textarea className="form-control" rows={2} value={batchForm.reason} onChange={(e) => updateBatchForm("reason", e.target.value)}/></div></div><Actions busy={saving} onCancel={() => setBatchItem(null)} label="Create batch and add stock"/></form></Modal>}

    {details && <Modal title="Inventory item details" size="modal-xl" onClose={() => setDetails(null)}>{detailsLoading ? <p>Loading item details...</p> : <><div className="d-flex justify-content-between gap-3 mb-3"><div><h4 className="fw-bold">{details.name}</h4><span className="text-secondary">{titleCase(details.type)} · {details.branch?.name || branchName(details.branchId)}</span></div><button className="btn btn-outline-primary" onClick={() => { setDetails(null); showEdit(details); }}>Edit item</button></div><div className="row g-3 mb-3">{[["Stock", `${Number(details.currentStock)} ${details.unit}`], ["Reorder level", Number(details.reorderLevel)], ["Purchase price", money(details.purchasePrice)], ["Selling price", money(details.sellingPrice)], ["Expiry date", dateLabel(details.expiryDate)], ["SKU", details.sku || "Not set"], ["Barcode", details.barcode || "Not set"], ["Branch", details.branch?.name || branchName(details.branchId)]].map(([label, value]) => <div className="col-sm-6 col-lg-3" key={label}><div className="rounded-3 border p-3 h-100"><small className="text-secondary">{label}</small><div className="fw-semibold">{value}</div></div></div>)}</div><h6 className="fw-bold">Batches</h6>{details.batches?.length ? <div className="table-responsive"><table className="table table-sm"><thead><tr><th>Batch</th><th>Available</th><th>Expiry</th><th>Cost</th></tr></thead><tbody>{details.batches.map((b) => <tr key={b.id}><td>{b.batchNumber}</td><td>{Number(b.quantityAvailable)}</td><td>{dateLabel(b.expiryDate)}</td><td>{money(b.costPrice)}</td></tr>)}</tbody></table></div> : <p className="text-secondary small">No batches recorded.</p>}</>}</Modal>}
  </div>;
}

function ExpiryText({ date }) {
  if (!date) return <small className="text-secondary"><CalendarDays size={13} className="me-1"/>Not set</small>;
  const value = dateInput(date);
  const localISODate = (d) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };
  const today = localISODate(new Date());
  const tomorrowMonth = localISODate(new Date(Date.now() + 30 * 86400000));
  const status = value < today ? "text-danger" : value <= tomorrowMonth ? "text-warning" : "text-secondary";
  return <small className={status}><CalendarDays size={13} className="me-1"/>{value}{value < today ? " · Expired" : ""}</small>;
}
