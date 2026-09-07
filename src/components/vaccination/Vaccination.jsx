import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Edit3,
  Eye,
  Filter,
  LoaderCircle,
  PawPrint,
  Plus,
  RefreshCw,
  Search,
  Send,
  BellRing,
  ShieldCheck,
  Syringe,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";

import vaccinationService from "../../services/vaccination.service.js";

const API_STATUSES = ["SCHEDULED", "ADMINISTERED", "MISSED", "CANCELLED"];

const createEmptyForm = () => ({
  petId: "",
  vaccineItemId: "",
  administeredById: "",
  vaccineName: "",
  batchNumber: "",
  status: "SCHEDULED",
  scheduledDate: "",
  administeredDate: "",
  nextDueDate: "",
  dose: "",
  route: "Subcutaneous",
  site: "",
  notes: "",
});

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const displayStatus = (value = "") =>
  String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const arrayFromResponse = (response, keys = []) => {
  if (Array.isArray(response?.data)) return response.data;
  for (const key of keys) {
    if (Array.isArray(response?.data?.[key])) return response.data[key];
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
};

const normalizeVaccination = (record) => ({
  ...record,
  vaccinationId: record.vaccinationNo || record.id,
  patientName: record.pet?.name || "Unknown pet",
  ownerName:
    [record.pet?.owner?.firstName, record.pet?.owner?.lastName]
      .filter(Boolean)
      .join(" ") || "Unknown owner",
  ownerId: record.pet?.owner?.id || record.ownerId || null,
  ownerEmail: record.pet?.owner?.email || null,
  ownerPhone: record.pet?.owner?.phone || null,
  species: record.pet?.species?.name || "Not specified",
  breed: record.pet?.breed?.name || "Not specified",
  gender: displayStatus(record.pet?.gender || "UNKNOWN"),
  age: record.pet?.approximateAge || "Not specified",
  vaccineType: record.vaccineItem?.name || record.vaccineName,
  doseNumber: record.dose || "Not specified",
  dateAdministered: record.administeredDate,
  administeredBy:
    [record.administeredBy?.firstName, record.administeredBy?.lastName]
      .filter(Boolean)
      .join(" ") || "Not assigned",
});

function Vaccination() {
  const [vaccinations, setVaccinations] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedVaccination, setSelectedVaccination] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [formError, setFormError] = useState("");

  const [pets, setPets] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [petSearch, setPetSearch] = useState("");
  const [vaccineSearch, setVaccineSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminderLoading, setReminderLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  const loadVaccinations = useCallback(
    async (page = 1) => {
      const response = await vaccinationService.getVaccinations({
        page,
        limit: pagination.limit,
        search: searchTerm.trim(),
        status: statusFilter,
        dateFrom,
        dateTo,
        sortOrder: "desc",
      });

      const records = arrayFromResponse(response, ["vaccinations", "items"]);
      setVaccinations(records.map(normalizeVaccination));
      setPagination((previous) => ({
        ...previous,
        ...(response?.pagination || response?.data?.pagination || {}),
      }));
    },
    [pagination.limit, searchTerm, statusFilter, dateFrom, dateTo],
  );

  const loadStats = useCallback(async () => {
    const response = await vaccinationService.getStats({ dateFrom, dateTo });
    setStats(response?.data || null);
  }, [dateFrom, dateTo]);

  const reload = useCallback(
    async (page = pagination.page) => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([loadVaccinations(page), loadStats()]);
      } catch (requestError) {
        setError(requestError.message || "Unable to load vaccination records.");
      } finally {
        setLoading(false);
      }
    },
    [loadVaccinations, loadStats, pagination.page],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => reload(1), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (location.state?.action === "add") {
      openAddForm();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state]);

  useEffect(() => {
    if (!showForm) return;

    const loadSelections = async () => {
      try {
        const [petResponse, vaccineResponse, vetResponse] = await Promise.all([
          vaccinationService.getPets({ search: petSearch.trim(), page: 1, limit: 50 }),
          vaccinationService.getVaccineInventory({
            search: vaccineSearch.trim(),
            page: 1,
            limit: 100,
          }),
          vaccinationService.getVeterinarians({ page: 1, limit: 100 }),
        ]);

        setPets(arrayFromResponse(petResponse, ["pets", "items"]));
        setVaccines(arrayFromResponse(vaccineResponse, ["items", "inventoryItems"]));
        setVeterinarians(arrayFromResponse(vetResponse, ["users", "items"]));
      } catch (requestError) {
        setFormError(requestError.message || "Unable to load form options.");
      }
    };

    const timer = window.setTimeout(loadSelections, 250);
    return () => window.clearTimeout(timer);
  }, [showForm, petSearch, vaccineSearch]);

  const summary = useMemo(() => {
    const byStatus = stats?.byStatus || {};
    const value = (status) =>
      Number(byStatus?.[status]?.count ?? byStatus?.[status] ?? 0);

    return {
      total: Number(stats?.total ?? pagination.total ?? vaccinations.length),
      administered: Number(stats?.administered ?? value("ADMINISTERED")),
      scheduled: Number(stats?.scheduled ?? value("SCHEDULED")),
      missed: Number(stats?.missed ?? value("MISSED")),
    };
  }, [stats, pagination.total, vaccinations.length]);

  const urgentVaccinations = useMemo(
    () =>
      vaccinations
        .filter((item) => item.status === "MISSED" || item.status === "SCHEDULED")
        .sort(
          (a, b) =>
            new Date(a.nextDueDate || a.scheduledDate || 0) -
            new Date(b.nextDueDate || b.scheduledDate || 0),
        )
        .slice(0, 5),
    [vaccinations],
  );

  function openAddForm() {
    setEditingId(null);
    setFormData(createEmptyForm());
    setPetSearch("");
    setVaccineSearch("");
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setFormData({
      petId: item.petId || item.pet?.id || "",
      vaccineItemId: item.vaccineItemId || item.vaccineItem?.id || "",
      administeredById: item.administeredById || item.administeredBy?.id || "",
      vaccineName: item.vaccineName || "",
      batchNumber: item.batchNumber || "",
      status: item.status || "SCHEDULED",
      scheduledDate: toDateInput(item.scheduledDate),
      administeredDate: toDateInput(item.administeredDate),
      nextDueDate: toDateInput(item.nextDueDate),
      dose: item.dose || "",
      route: item.route || "Subcutaneous",
      site: item.site || "",
      notes: item.notes || "",
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(createEmptyForm());
    setFormError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "vaccineItemId") {
        const vaccine = vaccines.find((item) => item.id === value);
        if (vaccine) next.vaccineName = vaccine.name;
      }

      return next;
    });

    setFormError("");
  }

  function validateForm() {
    if (!formData.petId) return "Select a registered pet.";
    if (!formData.vaccineName.trim()) return "Vaccine name is required.";

    if (formData.status === "SCHEDULED" && !formData.scheduledDate) {
      return "Scheduled date is required for a scheduled vaccination.";
    }

    if (formData.status === "ADMINISTERED" && !formData.administeredDate) {
      return "Administered date is required.";
    }

    if (
      formData.nextDueDate &&
      formData.administeredDate &&
      formData.nextDueDate < formData.administeredDate
    ) {
      return "Next due date cannot be earlier than the administered date.";
    }

    return "";
  }

  function buildPayload() {
    return {
      petId: formData.petId,
      vaccineItemId: formData.vaccineItemId || null,
      administeredById: formData.administeredById || null,
      vaccineName: formData.vaccineName.trim(),
      batchNumber: formData.batchNumber.trim() || null,
      status: formData.status,
      scheduledDate: formData.scheduledDate || null,
      administeredDate: formData.administeredDate || null,
      nextDueDate: formData.nextDueDate || null,
      dose: formData.dose.trim() || null,
      route: formData.route || null,
      site: formData.site.trim() || null,
      notes: formData.notes.trim() || null,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setError("");
      setSuccess("");

      const payload = buildPayload();

      if (editingId) {
        await vaccinationService.update(editingId, payload);
        setSuccess("Vaccination record updated successfully.");
      } else if (formData.status === "ADMINISTERED") {
        const createResponse = await vaccinationService.create({
          ...payload,
          status: "SCHEDULED",
          administeredDate: null,
        });
        const created = createResponse?.data;
        await vaccinationService.administer(created.id, {
          vaccineItemId: payload.vaccineItemId,
          administeredById: payload.administeredById,
          administeredDate: payload.administeredDate,
          nextDueDate: payload.nextDueDate,
          batchNumber: payload.batchNumber,
          dose: payload.dose,
          route: payload.route,
          site: payload.site,
          notes: payload.notes,
        });
        setSuccess("Vaccination recorded and stock updated successfully.");
      } else {
        await vaccinationService.create(payload);
        setSuccess("Vaccination scheduled successfully.");
      }

      closeForm();
      await reload(1);
    } catch (requestError) {
      setFormError(requestError.message || "Unable to save vaccination record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete the vaccination record for ${item.patientName}?`)) {
      return;
    }

    try {
      setSaving(true);
      await vaccinationService.delete(item.id);
      setSuccess("Vaccination record deleted.");
      if (selectedVaccination?.id === item.id) setSelectedVaccination(null);
      await reload(1);
    } catch (requestError) {
      setError(requestError.message || "Unable to delete vaccination record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdminister(item) {
    if (!window.confirm(`Mark ${item.vaccineName} as administered to ${item.patientName}?`)) {
      return;
    }

    try {
      setSaving(true);
      await vaccinationService.administer(item.id, {
        administeredDate: new Date().toISOString(),
        administeredById: item.administeredById || null,
        vaccineItemId: item.vaccineItemId || null,
        nextDueDate: item.nextDueDate || null,
        batchNumber: item.batchNumber || null,
        dose: item.dose || null,
        route: item.route || null,
        site: item.site || null,
        notes: item.notes || null,
      });
      setSuccess("Vaccination marked as administered and vaccine stock deducted.");
      setSelectedVaccination(null);
      await reload();
    } catch (requestError) {
      setError(requestError.message || "Unable to administer vaccination.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(item) {
    const reason = window.prompt("Cancellation reason:");
    if (reason === null) return;

    try {
      setSaving(true);
      await vaccinationService.cancel(item.id, {
        reason: reason.trim() || "Vaccination cancelled",
      });
      setSuccess("Vaccination cancelled.");
      setSelectedVaccination(null);
      await reload();
    } catch (requestError) {
      setError(requestError.message || "Unable to cancel vaccination.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMissed(item) {
    if (!window.confirm(`Mark ${item.patientName}'s vaccination as missed?`)) return;

    try {
      setSaving(true);
      await vaccinationService.markMissed(item.id, {
        notes: item.notes || null,
      });
      setSuccess("Vaccination marked as missed.");
      setSelectedVaccination(null);
      await reload();
    } catch (requestError) {
      setError(requestError.message || "Unable to mark vaccination as missed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendAllReminders() {
    if (
      !window.confirm(
        "Send vaccination reminder SMS messages to all eligible owners?"
      )
    ) {
      return;
    }

    try {
      setReminderLoading("all");
      setError("");
      setSuccess("");

      const response = await vaccinationService.sendAllReminders();
      const data = response?.data || response || {};

      const sent =
        data.sent ??
        data.successCount ??
        data.sentCount ??
        data.totalSent;

      const failed =
        data.failed ??
        data.failedCount ??
        data.totalFailed;

      const suffix = [
        sent !== undefined ? `${sent} sent` : "",
        failed !== undefined ? `${failed} failed` : "",
      ]
        .filter(Boolean)
        .join(", ");

      setSuccess(
        suffix
          ? `Vaccination reminders processed successfully (${suffix}).`
          : data.message || "Vaccination reminders sent successfully."
      );
    } catch (requestError) {
      setError(
        requestError.message || "Unable to send vaccination reminders."
      );
    } finally {
      setReminderLoading("");
    }
  }

  async function handleSendOwnerReminder(item) {
    if (!item?.ownerId) {
      setError("This vaccination record does not have a linked owner.");
      return;
    }

    if (!item?.ownerPhone) {
      setError(
        `${item.ownerName || "This owner"} does not have a phone number saved.`
      );
      return;
    }

    if (
      !window.confirm(
        `Send a vaccination reminder SMS to ${item.ownerName} at ${item.ownerPhone}?`
      )
    ) {
      return;
    }

    try {
      setReminderLoading(`owner:${item.ownerId}`);
      setError("");
      setSuccess("");

      const response = await vaccinationService.sendOwnerReminder(item.ownerId);
      const data = response?.data || response || {};

      setSuccess(
        data.message ||
          `Vaccination reminder sent to ${item.ownerName} successfully.`
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          `Unable to send reminder to ${item.ownerName}.`
      );
    } finally {
      setReminderLoading("");
    }
  }

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  }

  function exportCsv() {
    const rows = [
      [
        "Vaccination ID",
        "Patient",
        "Owner",
        "Owner Email",
        "Species",
        "Breed",
        "Vaccine",
        "Dose",
        "Scheduled Date",
        "Administered Date",
        "Next Due Date",
        "Batch Number",
        "Administered By",
        "Status",
      ],
      ...vaccinations.map((item) => [
        item.vaccinationId,
        item.patientName,
        item.ownerName,
        item.ownerEmail || "",
        item.species,
        item.breed,
        item.vaccineName,
        item.dose,
        formatDate(item.scheduledDate),
        formatDate(item.administeredDate),
        formatDate(item.nextDueDate),
        item.batchNumber || "",
        item.administeredBy,
        item.status,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vaccinations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="vaccination-page position-relative">
      {(saving || loading) && <LoadingOverlay label={saving ? "Processing vaccination..." : "Loading vaccinations..."} />}

      <section className="vaccination-hero rounded-4 p-4 p-lg-5 mb-4 position-relative overflow-hidden">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />

        <div className="row align-items-center g-4 position-relative">
          <div className="col-lg-7">
            <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-75 px-3 py-2 rounded-pill text-primary small fw-semibold mb-3">
              <ShieldCheck size={16} /> Preventive healthcare management
            </div>

            <h2 className="fw-bold mb-3">Keep every pet protected and every vaccine on schedule.</h2>
            <p className="text-secondary mb-4" style={{ maxWidth: 650 }}>
              Manage vaccination schedules, administration, vaccine inventory, due dates and owner SMS reminders from one workspace.
            </p>

            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary d-flex align-items-center gap-2 px-4" onClick={openAddForm}>
                <Plus size={18} /> Add Vaccination
              </button>
              <button type="button" className="btn btn-light border d-flex align-items-center gap-2 px-4" onClick={exportCsv}>
                <Download size={18} /> Export CSV
              </button>
              <button
                type="button"
                className="btn btn-outline-primary d-flex align-items-center gap-2 px-4"
                onClick={handleSendAllReminders}
                disabled={Boolean(reminderLoading)}
              >
                {reminderLoading === "all" ? (
                  <LoaderCircle size={18} className="spinner-border-sm" />
                ) : (
                  <BellRing size={18} />
                )}
                {reminderLoading === "all" ? "Sending..." : "Send All Reminders"}
              </button>
              <button type="button" className="btn btn-light border d-flex align-items-center gap-2 px-4" onClick={() => reload()}>
                <RefreshCw size={18} /> Refresh
              </button>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="hero-summary bg-white rounded-4 p-4 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <small className="text-secondary">Vaccination overview</small>
                  <h6 className="fw-bold mb-0">Current protection status</h6>
                </div>
                <div className="hero-icon"><Syringe size={24} /></div>
              </div>

              <div className="row g-2">
                <MiniStat label="Total Records" value={summary.total} />
                <MiniStat label="Administered" value={summary.administered} />
                <MiniStat label="Scheduled" value={summary.scheduled} />
                <MiniStat label="Missed" value={summary.missed} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <AlertMessage type="danger" message={error} onClose={() => setError("")} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess("")} />}

      <div className="row g-4">
        <aside className="col-xl-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-2">
                  <Filter size={18} className="text-primary" />
                  <h6 className="fw-bold mb-0">Filters</h6>
                </div>
                <button type="button" className="btn btn-sm btn-link text-decoration-none" onClick={resetFilters}>Reset</button>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Search</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0"><Search size={17} /></span>
                  <input type="search" className="form-control border-start-0" placeholder="Pet, owner, vaccine or batch" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Status</label>
                <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All statuses</option>
                  {API_STATUSES.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">From date</label>
                <input type="date" className="form-control" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold">To date</label>
                <input type="date" className="form-control" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </div>

              <div className="border-top pt-4">
                <small className="text-secondary">Showing results</small>
                <div className="d-flex justify-content-between align-items-end mt-1">
                  <h3 className="fw-bold mb-0">{vaccinations.length}</h3>
                  <span className="small text-secondary">of {pagination.total} records</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mt-4">
            <div className="card-body p-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-warning-emphasis" />
                <h6 className="fw-bold mb-0">Attention Required</h6>
              </div>

              <div className="vaccination-timeline">
                {urgentVaccinations.length ? urgentVaccinations.map((item) => (
                  <button type="button" key={item.id} className="timeline-item border-0 bg-transparent text-start p-0 w-100" onClick={() => setSelectedVaccination(item)}>
                    <span className={`timeline-dot ${item.status === "MISSED" ? "timeline-dot-danger" : ""}`} />
                    <div>
                      <small className={item.status === "MISSED" ? "text-danger fw-semibold" : "text-primary fw-semibold"}>{displayStatus(item.status)}</small>
                      <div className="fw-semibold small mt-1">{item.patientName}</div>
                      <small className="text-secondary">{item.vaccineName}</small>
                    </div>
                  </button>
                )) : <p className="small text-secondary mb-0">No urgent vaccination records.</p>}
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mt-4 reminder-card">
            <div className="card-body p-4">
              <div className="d-flex align-items-start gap-3">
                <div className="reminder-icon">
                  <BellRing size={20} />
                </div>
                <div className="flex-grow-1">
                  <h6 className="fw-bold mb-1">Owner SMS Reminders</h6>
                  <p className="small text-secondary mb-3">
                    Send reminders to all owners who are eligible for upcoming
                    or due vaccinations.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={handleSendAllReminders}
                    disabled={Boolean(reminderLoading)}
                  >
                    {reminderLoading === "all" ? (
                      <LoaderCircle size={15} className="spinner-border-sm" />
                    ) : (
                      <Send size={15} />
                    )}
                    {reminderLoading === "all"
                      ? "Sending reminders..."
                      : "Send All Reminders"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="col-xl-9">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
            <div>
              <h5 className="fw-bold mb-1">Vaccination Records</h5>
              <p className="text-secondary small mb-0">Review vaccine history, schedules, due dates and clinical details.</p>
            </div>
            <span className="small text-secondary">Page {pagination.page} of {pagination.totalPages || 1}</span>
          </div>

          <div className="row g-4">
            {!loading && vaccinations.length ? vaccinations.map((item) => (
              <div className="col-md-6" key={item.id}>
                <VaccinationCard
                  item={item}
                  onView={() => setSelectedVaccination(item)}
                  onEdit={() => openEditForm(item)}
                  onDelete={() => handleDelete(item)}
                  onAdminister={() => handleAdminister(item)}
                  onSendReminder={() => handleSendOwnerReminder(item)}
                  reminderLoading={reminderLoading === `owner:${item.ownerId}`}
                />
              </div>
            )) : !loading ? (
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body text-center py-5">
                    <Syringe size={48} className="text-secondary mb-3" />
                    <h5 className="fw-bold">No vaccination records found</h5>
                    <p className="text-secondary">Change your filters or add a vaccination record.</p>
                    <button type="button" className="btn btn-primary" onClick={openAddForm}>Add Vaccination</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="d-flex justify-content-between align-items-center mt-4">
            <button type="button" className="btn btn-outline-secondary" disabled={loading || pagination.page <= 1} onClick={() => reload(pagination.page - 1)}>Previous</button>
            <button type="button" className="btn btn-outline-secondary" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => reload(pagination.page + 1)}>Next</button>
          </div>
        </main>
      </div>

      <button type="button" className="floating-add-vaccination btn btn-primary rounded-circle shadow" onClick={openAddForm} aria-label="Add vaccination"><Plus size={24} /></button>

      {showForm && (
        <VaccinationFormModal
          formData={formData}
          formError={formError}
          editing={Boolean(editingId)}
          saving={saving}
          pets={pets}
          vaccines={vaccines}
          veterinarians={veterinarians}
          petSearch={petSearch}
          vaccineSearch={vaccineSearch}
          setPetSearch={setPetSearch}
          setVaccineSearch={setVaccineSearch}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {selectedVaccination && (
        <VaccinationDetailsModal
          item={selectedVaccination}
          saving={saving}
          onClose={() => setSelectedVaccination(null)}
          onEdit={() => { openEditForm(selectedVaccination); setSelectedVaccination(null); }}
          onAdminister={() => handleAdminister(selectedVaccination)}
          onMissed={() => handleMissed(selectedVaccination)}
          onCancel={() => handleCancel(selectedVaccination)}
          onSendReminder={() => handleSendOwnerReminder(selectedVaccination)}
          reminderLoading={
            reminderLoading === `owner:${selectedVaccination.ownerId}`
          }
        />
      )}

      <style>{`
        .vaccination-hero { background: linear-gradient(135deg, rgba(var(--bs-primary-rgb), .12), rgba(var(--bs-primary-rgb), .035)), #fff; border: 1px solid rgba(var(--bs-primary-rgb), .12); }
        .hero-orb { position: absolute; border-radius: 50%; background: rgba(var(--bs-primary-rgb), .08); pointer-events: none; }
        .hero-orb-one { width: 220px; height: 220px; top: -90px; right: -60px; }
        .hero-orb-two { width: 125px; height: 125px; bottom: -70px; right: 30%; }
        .hero-summary { border: 1px solid rgba(var(--bs-primary-rgb), .1); }
        .hero-icon { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; border-radius: 16px; color: var(--bs-primary); background: rgba(var(--bs-primary-rgb), .1); }
        .mini-stat { border-radius: 14px; background: var(--bs-light); padding: 14px; }
        .vaccination-card { border: 1px solid rgba(var(--bs-primary-rgb), .08) !important; transition: transform .2s ease, box-shadow .2s ease; }
        .vaccination-card:hover { transform: translateY(-4px); box-shadow: 0 .75rem 1.75rem rgba(0,0,0,.08) !important; }
        .patient-avatar { width: 54px; height: 54px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--bs-primary); background: rgba(var(--bs-primary-rgb), .1); }
        .record-info { display: flex; align-items: center; gap: 10px; font-size: .9rem; color: var(--bs-secondary-color); }
        .record-info-icon { width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--bs-primary); background: rgba(var(--bs-primary-rgb), .08); }
        .vaccination-timeline { position: relative; }
        .vaccination-timeline::before { content: ""; position: absolute; left: 5px; top: 8px; bottom: 8px; width: 2px; background: rgba(var(--bs-primary-rgb), .16); }
        .timeline-item { position: relative; display: grid; grid-template-columns: 18px 1fr; gap: 12px; padding-bottom: 22px !important; }
        .timeline-item:last-child { padding-bottom: 0 !important; }
        .timeline-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 4px; z-index: 1; background: var(--bs-primary); box-shadow: 0 0 0 4px rgba(var(--bs-primary-rgb), .12); }
        .timeline-dot-danger { background: var(--bs-danger); box-shadow: 0 0 0 4px rgba(var(--bs-danger-rgb), .12); }
        .reminder-card { border: 1px solid rgba(var(--bs-primary-rgb), .12) !important; background: linear-gradient(180deg, rgba(var(--bs-primary-rgb), .045), #fff); }
        .reminder-icon { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--bs-primary); background: rgba(var(--bs-primary-rgb), .1); }
        .reminder-button { border-radius: 12px; }
        .floating-add-vaccination { position: fixed; right: 28px; bottom: 28px; width: 58px; height: 58px; z-index: 1030; display: flex; align-items: center; justify-content: center; }
        @media (max-width: 767.98px) { .vaccination-hero { padding: 24px !important; } .floating-add-vaccination { right: 18px; bottom: 18px; width: 52px; height: 52px; } }
      `}</style>
    </div>
  );
}

function VaccinationCard({
  item,
  onView,
  onEdit,
  onDelete,
  onAdminister,
  onSendReminder,
  reminderLoading,
}) {
  return (
    <article className="vaccination-card card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between gap-3 mb-4">
          <div className="d-flex gap-3">
            <div className="patient-avatar"><PawPrint size={24} /></div>
            <div>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <VaccinationStatusBadge status={item.status} />
                <span className="badge rounded-pill bg-light text-dark border">{item.vaccineItem?.name || item.vaccineName}</span>
              </div>
              <h5 className="fw-bold mb-1">{item.patientName}</h5>
              <small className="text-secondary">{item.species} · {item.breed}</small>
            </div>
          </div>

          <div className="d-flex gap-1">
            <button type="button" className="btn btn-sm btn-light border" onClick={onEdit} title="Edit"><Edit3 size={16} /></button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={onDelete} title="Delete"><Trash2 size={16} /></button>
          </div>
        </div>

        <div className="border rounded-4 p-3 mb-4">
          <small className="text-secondary d-block mb-1">Vaccine</small>
          <div className="fw-bold">{item.vaccineName}</div>
          <small className="text-secondary">{item.dose || "Dose not specified"} · Batch {item.batchNumber || "N/A"}</small>
        </div>

        <div className="d-grid gap-3 mb-4">
          <RecordInfo icon={UserRound} text={`Owner: ${item.ownerName}`} />
          <RecordInfo icon={CalendarDays} text={`Scheduled: ${formatDate(item.scheduledDate)}`} />
          <RecordInfo icon={Clock3} text={`Next due: ${formatDate(item.nextDueDate)}`} />
          <RecordInfo icon={ShieldCheck} text={`By: ${item.administeredBy}`} />
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 border-top">
          <div className="d-flex flex-wrap gap-2">
            {item.status === "SCHEDULED" && (
              <button
                type="button"
                className="btn btn-sm btn-success d-flex align-items-center gap-1"
                onClick={onAdminister}
              >
                <Syringe size={15} /> Administer
              </button>
            )}

            {(item.status === "SCHEDULED" || item.status === "MISSED") && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 reminder-button"
                onClick={onSendReminder}
                disabled={reminderLoading || !item.ownerId || !item.ownerPhone}
                title={
                  !item.ownerId
                    ? "No linked owner"
                    : !item.ownerPhone
                      ? "Owner phone number is not available"
                      : "Send reminder SMS to owner"
                }
              >
                {reminderLoading ? (
                  <LoaderCircle size={15} className="spinner-border-sm" />
                ) : (
                  <Send size={15} />
                )}
                {reminderLoading ? "Sending..." : "Remind Owner"}
              </button>
            )}
          </div>

          <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={onView}>
            Details <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function VaccinationFormModal({
  formData,
  formError,
  editing,
  saving,
  pets,
  vaccines,
  veterinarians,
  petSearch,
  vaccineSearch,
  setPetSearch,
  setVaccineSearch,
  onChange,
  onSubmit,
  onClose,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,.55)" }}>
      <form onSubmit={onSubmit} className="bg-white rounded-4 shadow-lg" style={{ width: "min(1100px, 100%)", height: "calc(100vh - 32px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="border-bottom p-3 p-md-4 d-flex justify-content-between gap-3" style={{ flexShrink: 0 }}>
          <div>
            <h5 className="fw-bold mb-1">{editing ? "Edit Vaccination Record" : "Add Vaccination Record"}</h5>
            <small className="text-secondary">Select a registered pet and enter scheduling or administration details.</small>
          </div>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="p-3 p-md-4" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          {formError && <div className="alert alert-danger">{formError}</div>}

          <FormSection title="Patient information">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Search pet</label>
                <input className="form-control mb-2" value={petSearch} onChange={(event) => setPetSearch(event.target.value)} placeholder="Pet name, owner or pet code" />
                <select className="form-select" name="petId" value={formData.petId} onChange={onChange} required>
                  <option value="">Select pet</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} — {[pet.owner?.firstName, pet.owner?.lastName].filter(Boolean).join(" ") || "Owner unavailable"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Vaccination status</label>
                <select className="form-select" name="status" value={formData.status} onChange={onChange} disabled={editing && formData.status === "ADMINISTERED"}>
                  <option value="SCHEDULED">Scheduled</option>
                  {!editing && <option value="ADMINISTERED">Administer now</option>}
                  {editing && <option value="MISSED">Missed</option>}
                  {editing && <option value="CANCELLED">Cancelled</option>}
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Vaccine information">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Search vaccine inventory</label>
                <input className="form-control mb-2" value={vaccineSearch} onChange={(event) => setVaccineSearch(event.target.value)} placeholder="Vaccine name or SKU" />
                <select className="form-select" name="vaccineItemId" value={formData.vaccineItemId} onChange={onChange}>
                  <option value="">No linked inventory item</option>
                  {vaccines.map((vaccine) => (
                    <option key={vaccine.id} value={vaccine.id}>
                      {vaccine.name} — Stock: {Number(vaccine.currentStock || 0)} {vaccine.unit || "units"}
                    </option>
                  ))}
                </select>
              </div>

              <FormInput label="Vaccine Name" name="vaccineName" value={formData.vaccineName} onChange={onChange} required col="col-md-6" />
              <FormInput label="Dose" name="dose" value={formData.dose} onChange={onChange} placeholder="Dose 1 / Booster / 1 ml" col="col-md-4" />
              <FormInput label="Batch Number" name="batchNumber" value={formData.batchNumber} onChange={onChange} col="col-md-4" />
              <FormSelect label="Route" name="route" value={formData.route} onChange={onChange} options={["Subcutaneous", "Intramuscular", "Oral", "Intranasal", "Other"]} col="col-md-4" />
              <FormInput label="Injection Site" name="site" value={formData.site} onChange={onChange} col="col-md-6" />
              <div className="col-md-6">
                <label className="form-label">Administered By</label>
                <select className="form-select" name="administeredById" value={formData.administeredById} onChange={onChange}>
                  <option value="">Select veterinarian</option>
                  {veterinarians.map((vet) => (
                    <option key={vet.id} value={vet.id}>{[vet.firstName, vet.lastName].filter(Boolean).join(" ")}</option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Dates and reminder">
            <div className="row g-3">
              <FormInput label="Scheduled Date" name="scheduledDate" type="date" value={formData.scheduledDate} onChange={onChange} required={formData.status === "SCHEDULED"} col="col-md-4" />
              <FormInput label="Administered Date" name="administeredDate" type="date" value={formData.administeredDate} onChange={onChange} required={formData.status === "ADMINISTERED"} col="col-md-4" />
              <FormInput label="Next Due Date" name="nextDueDate" type="date" value={formData.nextDueDate} onChange={onChange} col="col-md-4" />
            </div>
            <small className="text-secondary d-block mt-2">SMS reminders can be sent manually from this page to the pet owner when a valid phone number is saved.</small>
          </FormSection>

          <FormSection title="Clinical notes">
            <textarea className="form-control" name="notes" rows="5" value={formData.notes} onChange={onChange} placeholder="Reaction, follow-up advice or additional notes" />
          </FormSection>
        </div>

        <div className="border-top p-3 d-flex justify-content-end gap-2" style={{ flexShrink: 0, backgroundColor: "#fff" }}>
          <button type="button" className="btn btn-light border" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><LoaderCircle size={16} className="me-2" />Saving...</> : editing ? "Update Record" : formData.status === "ADMINISTERED" ? "Record Administration" : "Schedule Vaccination"}
          </button>
        </div>
      </form>
    </div>
  );
}

function VaccinationDetailsModal({
  item,
  saving,
  onClose,
  onEdit,
  onAdminister,
  onMissed,
  onCancel,
  onSendReminder,
  reminderLoading,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <div role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,.55)" }}>
      <div className="bg-white rounded-4 shadow-lg" style={{ width: "min(920px, 100%)", maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="p-4 text-white" style={{ flexShrink: 0, background: "linear-gradient(135deg, var(--bs-primary), rgba(var(--bs-primary-rgb), .78))" }}>
          <div className="d-flex justify-content-between gap-3">
            <div>
              <div className="d-flex flex-wrap gap-2 mb-3"><VaccinationStatusBadge status={item.status} /></div>
              <h3 className="fw-bold mb-1">{item.patientName}</h3>
              <p className="text-white-50 mb-0">{item.vaccinationId} · {item.vaccineName}</p>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
        </div>

        <div className="p-3 p-md-4" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
          <div className="row g-4">
            <div className="col-md-6">
              <DetailPanel title="Patient and owner">
                <DetailRow label="Patient" value={item.patientName} />
                <DetailRow label="Owner" value={item.ownerName} />
                <DetailRow label="Owner email" value={item.ownerEmail || "Not available"} />
                <DetailRow label="Owner phone" value={item.ownerPhone || "Not available"} />
                <DetailRow label="Species" value={`${item.species} · ${item.breed}`} />
                <DetailRow label="Gender" value={item.gender} />
              </DetailPanel>
            </div>

            <div className="col-md-6">
              <DetailPanel title="Vaccine">
                <DetailRow label="Vaccine Name" value={item.vaccineName} />
                <DetailRow label="Inventory Item" value={item.vaccineItem?.name || "Not linked"} />
                <DetailRow label="Dose" value={item.dose || "Not set"} />
                <DetailRow label="Batch" value={item.batchNumber || "Not set"} />
                <DetailRow label="Route" value={item.route || "Not set"} />
                <DetailRow label="Site" value={item.site || "Not set"} />
              </DetailPanel>
            </div>

            <div className="col-md-6">
              <DetailPanel title="Schedule and administration">
                <DetailRow label="Scheduled" value={formatDate(item.scheduledDate)} />
                <DetailRow label="Administered" value={formatDate(item.administeredDate)} />
                <DetailRow label="Next Due" value={formatDate(item.nextDueDate)} />
                <DetailRow label="Administered By" value={item.administeredBy} />
                <DetailRow label="Status" value={displayStatus(item.status)} />
              </DetailPanel>
            </div>

            <div className="col-md-6">
              <DetailPanel title="Reminder eligibility">
                <DetailRow
                  label="Owner phone"
                  value={item.ownerPhone || "Not available"}
                />
                <DetailRow
                  label="Reminder date"
                  value={formatDate(item.nextDueDate || item.scheduledDate)}
                />
                <DetailRow
                  label="Can send SMS"
                  value={item.ownerId && item.ownerPhone ? "Yes" : "No"}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm w-100 mt-3 d-flex align-items-center justify-content-center gap-2"
                  onClick={onSendReminder}
                  disabled={
                    reminderLoading ||
                    !item.ownerId ||
                    !item.ownerPhone ||
                    item.status === "CANCELLED"
                  }
                >
                  {reminderLoading ? (
                    <LoaderCircle size={15} className="spinner-border-sm" />
                  ) : (
                    <Send size={15} />
                  )}
                  {reminderLoading
                    ? "Sending reminder..."
                    : "Send Reminder SMS"}
                </button>
              </DetailPanel>
            </div>

            <div className="col-12">
              <DetailPanel title="Clinical notes"><p className="small text-secondary mb-0">{item.notes || "No additional notes."}</p></DetailPanel>
            </div>
          </div>
        </div>

        <div className="border-top p-3 d-flex flex-wrap justify-content-end gap-2" style={{ flexShrink: 0 }}>
          <button type="button" className="btn btn-light border" onClick={onClose}>Close</button>
          {item.status !== "CANCELLED" && (
            <button
              type="button"
              className="btn btn-outline-primary d-flex align-items-center gap-2"
              disabled={saving || reminderLoading || !item.ownerId || !item.ownerPhone}
              onClick={onSendReminder}
            >
              {reminderLoading ? (
                <LoaderCircle size={16} className="spinner-border-sm" />
              ) : (
                <Send size={16} />
              )}
              {reminderLoading ? "Sending..." : "Remind Owner"}
            </button>
          )}
          {item.status === "SCHEDULED" && <button type="button" className="btn btn-outline-warning" disabled={saving} onClick={onMissed}>Mark Missed</button>}
          {item.status === "SCHEDULED" && <button type="button" className="btn btn-outline-danger" disabled={saving} onClick={onCancel}>Cancel</button>}
          {item.status === "SCHEDULED" && <button type="button" className="btn btn-success d-flex align-items-center gap-2" disabled={saving} onClick={onAdminister}><Syringe size={16} />Administer</button>}
          {item.status !== "ADMINISTERED" && <button type="button" className="btn btn-primary d-flex align-items-center gap-2" disabled={saving} onClick={onEdit}><Edit3 size={16} />Edit Record</button>}
        </div>
      </div>
    </div>
  );
}

function LoadingOverlay({ label }) {
  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 2500, background: "rgba(255,255,255,.75)", backdropFilter: "blur(2px)" }}>
      <div className="bg-white shadow rounded-4 px-4 py-3 d-flex align-items-center gap-3"><LoaderCircle className="spinner-border-sm" size={22} /><span className="fw-semibold">{label}</span></div>
    </div>
  );
}

function AlertMessage({ type, message, onClose }) {
  return <div className={`alert alert-${type} d-flex justify-content-between align-items-center`}><span>{message}</span><button type="button" className="btn-close" onClick={onClose} /></div>;
}

function MiniStat({ label, value }) {
  return <div className="col-6"><div className="mini-stat"><small className="text-secondary">{label}</small><h4 className="fw-bold mb-0 mt-1">{value}</h4></div></div>;
}

function RecordInfo({ icon: Icon, text }) {
  return <div className="record-info"><span className="record-info-icon"><Icon size={16} /></span><span>{text}</span></div>;
}

function FormSection({ title, children }) {
  return <section className="mb-4"><h6 className="fw-bold border-bottom pb-2 mb-3">{title}</h6>{children}</section>;
}

function FormInput({ label, col = "col-12", ...inputProps }) {
  return <div className={col}><label className="form-label">{label}{inputProps.required && <span className="text-danger ms-1">*</span>}</label><input className="form-control" {...inputProps} /></div>;
}

function FormSelect({ label, options, col = "col-12", ...selectProps }) {
  return <div className={col}><label className="form-label">{label}</label><select className="form-select" {...selectProps}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function DetailPanel({ title, children }) {
  return <div className="border rounded-4 p-3 h-100"><h6 className="fw-bold mb-3">{title}</h6>{children}</div>;
}

function DetailRow({ label, value }) {
  return <div className="d-flex justify-content-between gap-3 border-bottom py-2"><small className="text-secondary">{label}</small><small className="fw-semibold text-end">{value}</small></div>;
}

function VaccinationStatusBadge({ status }) {
  const classes = {
    ADMINISTERED: "bg-success-subtle text-success",
    SCHEDULED: "bg-primary-subtle text-primary",
    MISSED: "bg-danger-subtle text-danger",
    CANCELLED: "bg-secondary-subtle text-secondary",
  };

  const icons = {
    ADMINISTERED: CheckCircle2,
    SCHEDULED: Clock3,
    MISSED: AlertTriangle,
    CANCELLED: XCircle,
  };

  const Icon = icons[status] || Syringe;
  return <span className={`badge rounded-pill d-inline-flex align-items-center gap-1 ${classes[status] || "bg-light text-secondary"}`}><Icon size={12} />{displayStatus(status)}</span>;
}

export default Vaccination;
