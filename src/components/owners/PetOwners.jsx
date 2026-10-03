import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  Plus,
  RotateCcw,
  Search,
  UserRound,
  Users,
  
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  archiveOwner,
  createOwner,
  exportOwnersCsv,
  getArchivedOwners,
  getOwnerAppointments,
  getOwnerById,
  getOwnerFinancialStatement,
  getOwnerPets,
  getOwners,
  getOwnerStats,
  restoreOwner,
  updateOwner,
} from "../../services/owners.api.js";

const EMPTY_FORM = {
  ownerCode: "",
  firstName: "",
  lastName: "",
  phone: "",
  alternatePhone: "",
  email: "",
  address: "",
  city: "Pokhara",
  isActive: true,
};

const EMPTY_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

function money(value) {
  return `NPR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateOnly(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString();
}

function dateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

function ownerName(owner) {
  return `${owner?.firstName || ""} ${owner?.lastName || ""}`.trim();
}

function PetOwners() {
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView] = useState("active");
  const [owners, setOwners] = useState([]);
  const [stats, setStats] = useState({
    totalOwners: 0,
    activeOwners: 0,
    inactiveOwners: 0,
    newOwners: 0,
    ownersWithPets: 0,
  });
  const [pagination, setPagination] =
    useState(EMPTY_PAGINATION);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All");
  const [cityFilter, setCityFilter] = useState("");
  const [petFilter, setPetFilter] = useState("All");
  const [balanceFilter, setBalanceFilter] =
    useState("All");

  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] =
    useState(true);
  const [busyOwnerId, setBusyOwnerId] = useState(null);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingOwnerId, setEditingOwnerId] =
    useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [selectedOwner, setSelectedOwner] =
    useState(null);
  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const loadStats = useCallback(async () => {
    setIsStatsLoading(true);

    try {
      const result = await getOwnerStats();
      setStats((previous) => ({
        ...previous,
        ...(result?.data || {}),
      }));
    } catch (error) {
      setPageError(error.message);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  const loadOwners = useCallback(
    async (requestedPage = 1) => {
      setIsLoading(true);
      setPageError("");

      try {
        const common = {
          page: requestedPage,
          limit: pagination.limit,
          search: searchTerm.trim(),
        };

        const result =
          view === "archived"
            ? await getArchivedOwners(common)
            : await getOwners({
                ...common,
                isActive:
                  statusFilter === "All"
                    ? ""
                    : statusFilter === "Active",
                city: cityFilter.trim(),
                hasPets:
                  petFilter === "All"
                    ? ""
                    : petFilter === "With pets",
                hasOutstandingBalance:
                  balanceFilter === "Outstanding"
                    ? true
                    : "",
                sortBy: "createdAt",
                sortOrder: "desc",
              });

        setOwners(result?.data || []);
        setPagination(
          result?.pagination || EMPTY_PAGINATION
        );
      } catch (error) {
        setPageError(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [
      balanceFilter,
      cityFilter,
      pagination.limit,
      petFilter,
      searchTerm,
      statusFilter,
      view,
    ]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadOwners(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [loadOwners]);

  useEffect(() => {
    if (location.state?.action !== "add") return;

    openAddForm();
    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate]);

  const pagePetCount = useMemo(
    () =>
      owners.reduce(
        (total, owner) =>
          total +
          (owner._count?.pets ?? owner.pets?.length ?? 0),
        0
      ),
    [owners]
  );

  function clearMessages() {
    setPageError("");
    setSuccessMessage("");
  }

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("All");
    setCityFilter("");
    setPetFilter("All");
    setBalanceFilter("All");
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setFormError("");
  }

  function openAddForm() {
    setEditingOwnerId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(owner) {
    setEditingOwnerId(owner.id);
    setFormData({
      ownerCode: owner.ownerCode || "",
      firstName: owner.firstName || "",
      lastName: owner.lastName || "",
      phone: owner.phone || "",
      alternatePhone: owner.alternatePhone || "",
      email: owner.email || "",
      address: owner.address || "",
      city: owner.city || "",
      isActive: Boolean(owner.isActive),
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (isSubmitting) return;
    setShowForm(false);
    setEditingOwnerId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
  }

  function validateForm() {
    if (!formData.firstName.trim()) {
      return "First name is required.";
    }

    if (!formData.lastName.trim()) {
      return "Last name is required.";
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      return "Provide a valid phone number.";
    }

    if (
      formData.alternatePhone &&
      formData.alternatePhone.replace(/\D/g, "").length < 7
    ) {
      return "Provide a valid alternate phone number.";
    }

    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      return "Provide a valid email address.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    clearMessages();

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim(),
      alternatePhone:
        formData.alternatePhone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      isActive: formData.isActive,
      ...(formData.ownerCode.trim()
        ? { ownerCode: formData.ownerCode.trim() }
        : {}),
    };

    try {
      if (editingOwnerId) {
        await updateOwner(editingOwnerId, payload);
        setSuccessMessage(
          "Pet owner updated successfully."
        );
      } else {
        await createOwner(payload);
        setSuccessMessage(
          "Pet owner created successfully."
        );
      }

      const targetPage = editingOwnerId
        ? pagination.page
        : 1;

      setShowForm(false);
      setEditingOwnerId(null);
      setFormData(EMPTY_FORM);

      await Promise.all([
        loadOwners(targetPage),
        loadStats(),
      ]);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleViewOwner(ownerId) {
    setDetailsLoading(true);
    clearMessages();

    try {
      const result = await getOwnerById(ownerId);
      setSelectedOwner(result?.data || null);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleArchive(owner) {
    const confirmed = window.confirm(
      `Archive ${ownerName(owner)}? Owners with active appointments or outstanding invoices cannot be archived.`
    );

    if (!confirmed) return;

    setBusyOwnerId(owner.id);
    clearMessages();

    try {
      await archiveOwner(owner.id);
      setSuccessMessage(
        "Pet owner archived successfully."
      );

      const targetPage =
        owners.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await Promise.all([
        loadOwners(targetPage),
        loadStats(),
      ]);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBusyOwnerId(null);
    }
  }

  async function handleRestore(owner) {
    const confirmed = window.confirm(
      `Restore ${ownerName(owner)}?`
    );

    if (!confirmed) return;

    setBusyOwnerId(owner.id);
    clearMessages();

    try {
      await restoreOwner(owner.id);
      setSuccessMessage(
        "Pet owner restored successfully."
      );

      const targetPage =
        owners.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await Promise.all([
        loadOwners(targetPage),
        loadStats(),
      ]);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBusyOwnerId(null);
    }
  }

  async function handleExport() {
    clearMessages();

    try {
      await exportOwnersCsv({
        isActive:
          statusFilter === "All"
            ? ""
            : statusFilter === "Active",
      });
      setSuccessMessage(
        "Owner CSV exported successfully."
      );
    } catch (error) {
      setPageError(error.message);
    }
  }

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Pet Owners</h3>
          <p className="text-secondary mb-0">
            Manage pet-owner records, pets, appointments,
            financial statements and archived records.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={handleExport}
            disabled={view === "archived"}
          >
            <Download size={18} />
            Export CSV
          </button>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={openAddForm}
          >
            <Plus size={18} />
            Add Pet Owner
          </button>
        </div>
      </div>

      {pageError && (
        <div className="alert alert-danger alert-dismissible fade show">
          {pageError}
          <button
            type="button"
            className="btn-close"
            onClick={() => setPageError("")}
          />
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show">
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage("")}
          />
        </div>
      )}

      <div className="row g-3 mb-4">
        <SummaryCard
          title="Total Owners"
          value={isStatsLoading ? "…" : stats.totalOwners}
          icon={Users}
          iconClass="bg-primary-subtle text-primary"
        />
        <SummaryCard
          title="Active Owners"
          value={isStatsLoading ? "…" : stats.activeOwners}
          icon={UserRound}
          iconClass="bg-success-subtle text-success"
        />
        <SummaryCard
          title="Owners With Pets"
          value={
            isStatsLoading ? "…" : stats.ownersWithPets
          }
          icon={PawPrint}
          iconClass="bg-info-subtle text-info-emphasis"
        />
        <SummaryCard
          title="New This Month"
          value={isStatsLoading ? "…" : stats.newOwners}
          icon={CalendarDays}
          iconClass="bg-warning-subtle text-warning-emphasis"
        />
      </div>

      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              className={`btn ${
                view === "active"
                  ? "btn-primary"
                  : "btn-light border"
              }`}
              onClick={() => setView("active")}
            >
              Active Records
            </button>
            <button
              type="button"
              className={`btn ${
                view === "archived"
                  ? "btn-primary"
                  : "btn-light border"
              }`}
              onClick={() => setView("archived")}
            >
              Archived Records
            </button>
          </div>

          <div className="d-flex flex-column flex-xl-row gap-3 mb-4">
            <div className="input-group flex-grow-1">
              <span className="input-group-text bg-white border-end-0">
                <Search size={18} />
              </span>
              <input
                type="search"
                className="form-control border-start-0"
                placeholder="Search code, owner, phone, email, address or pet"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />
            </div>

            {view === "active" && (
              <div className="d-flex flex-column flex-sm-row gap-2">
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="All">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <input
                  className="form-control"
                  placeholder="Filter city"
                  value={cityFilter}
                  onChange={(event) =>
                    setCityFilter(event.target.value)
                  }
                />

                <select
                  className="form-select"
                  value={petFilter}
                  onChange={(event) =>
                    setPetFilter(event.target.value)
                  }
                >
                  <option value="All">All owners</option>
                  <option value="With pets">With pets</option>
                  <option value="Without pets">
                    Without pets
                  </option>
                </select>

                <select
                  className="form-select"
                  value={balanceFilter}
                  onChange={(event) =>
                    setBalanceFilter(event.target.value)
                  }
                >
                  <option value="All">All balances</option>
                  <option value="Outstanding">
                    Outstanding balance
                  </option>
                </select>
              </div>
            )}

            <button
              type="button"
              className="btn btn-light border text-nowrap"
              onClick={resetFilters}
            >
              Clear
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <small className="text-secondary">
              Showing {owners.length} of {pagination.total}{" "}
              owners
              {view === "active" &&
                ` · ${pagePetCount} pets on this page`}
            </small>

            {isLoading && (
              <span className="spinner-border spinner-border-sm text-primary" />
            )}
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Owner</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Pets</th>
                  {view === "active" && <th>Balance</th>}
                  <th>Status</th>
                  <th>Registered</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading && owners.length === 0 ? (
                  <tr>
                    <td
                      colSpan={view === "active" ? 8 : 7}
                      className="text-center py-5"
                    >
                      <span className="spinner-border text-primary" />
                      <div className="text-secondary mt-3">
                        Loading pet owners...
                      </div>
                    </td>
                  </tr>
                ) : owners.length > 0 ? (
                  owners.map((owner) => {
                    const isBusy = busyOwnerId === owner.id;
                    const petCount =
                      owner._count?.pets ??
                      owner.pets?.length ??
                      0;

                    return (
                      <tr key={owner.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: 44, height: 44 }}
                            >
                              <UserRound size={20} />
                            </div>
                            <div>
                              <div className="fw-semibold">
                                {ownerName(owner)}
                              </div>
                              <small className="text-secondary">
                                {owner.ownerCode}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="small d-flex align-items-center gap-2 mb-1">
                            <Phone size={14} />
                            {owner.phone}
                          </div>
                          <div className="small text-secondary d-flex align-items-center gap-2">
                            <Mail size={14} />
                            {owner.email || "No email"}
                          </div>
                        </td>

                        <td>
                          <div className="small d-flex align-items-center gap-2">
                            <MapPin size={14} />
                            {[owner.address, owner.city]
                              .filter(Boolean)
                              .join(", ") || "Not provided"}
                          </div>
                        </td>

                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {(owner.pets || [])
                              .slice(0, 3)
                              .map((pet) => (
                                <span
                                  key={pet.id}
                                  className="badge bg-info-subtle text-info-emphasis rounded-pill"
                                >
                                  <PawPrint
                                    size={12}
                                    className="me-1"
                                  />
                                  {pet.name}
                                </span>
                              ))}
                          </div>
                          <small className="text-secondary">
                            {petCount} pet
                            {petCount === 1 ? "" : "s"}
                          </small>
                        </td>

                        {view === "active" && (
                          <td>
                            <span
                              className={
                                Number(
                                  owner.financials
                                    ?.outstandingBalance || 0
                                ) > 0
                                  ? "text-danger fw-semibold"
                                  : "text-success"
                              }
                            >
                              {money(
                                owner.financials
                                  ?.outstandingBalance
                              )}
                            </span>
                          </td>
                        )}

                        <td>
                          <StatusBadge
                            isActive={owner.isActive}
                            archived={view === "archived"}
                          />
                        </td>

                        <td>
                          <small>
                            {dateOnly(owner.createdAt)}
                          </small>
                        </td>

                        <td className="text-end text-nowrap">
                          <div className="d-flex flex-nowrap justify-content-end align-items-center gap-1">
                            {view === "active" ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border"
                                  title="View owner"
                                  onClick={() =>
                                    handleViewOwner(owner.id)
                                  }
                                  disabled={
                                    isBusy || detailsLoading
                                  }
                                >
                                  <Eye size={16} />
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border"
                                  title="Edit owner"
                                  onClick={() =>
                                    openEditForm(owner)
                                  }
                                  disabled={isBusy}
                                >
                                  <Edit3 size={16} />
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  title="Archive owner"
                                  onClick={() =>
                                    handleArchive(owner)
                                  }
                                  disabled={isBusy}
                                >
                                  <Archive size={16} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                                onClick={() =>
                                  handleRestore(owner)
                                }
                                disabled={isBusy}
                              >
                                <RotateCcw size={16} />
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={view === "active" ? 8 : 7}
                      className="text-center py-5"
                    >
                      <PawPrint
                        size={42}
                        className="text-secondary mb-3"
                      />
                      <h6 className="fw-semibold">
                        No pet owners found
                      </h6>
                      <p className="text-secondary small">
                        Change your filters or add a new owner.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-3">
              <small className="text-secondary">
                Page {pagination.page} of{" "}
                {pagination.totalPages}
              </small>

              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() =>
                    loadOwners(pagination.page - 1)
                  }
                  disabled={
                    !pagination.hasPreviousPage || isLoading
                  }
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() =>
                    loadOwners(pagination.page + 1)
                  }
                  disabled={
                    !pagination.hasNextPage || isLoading
                  }
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <OwnerFormModal
          formData={formData}
          editing={Boolean(editingOwnerId)}
          formError={formError}
          isSubmitting={isSubmitting}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {selectedOwner && (
        <OwnerDetailsModal
          owner={selectedOwner}
          onClose={() => setSelectedOwner(null)}
          onEdit={() => {
            openEditForm(selectedOwner);
            setSelectedOwner(null);
          }}
        />
      )}
    </div>
  );
}

function OwnerDetailsModal({ owner, onClose, onEdit }) {
  const [tab, setTab] = useState("overview");
  const [tabData, setTabData] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (tab === "overview") {
      setTabData(null);
      return;
    }

    let cancelled = false;

    async function loadTab() {
      setTabLoading(true);
      setTabError("");

      try {
        let result;

        if (tab === "pets") {
          result = await getOwnerPets(owner.id, {
            page: 1,
            limit: 1000,
          });
        } else if (tab === "appointments") {
          result = await getOwnerAppointments(owner.id, {
            page: 1,
            limit: 1000,
          });
        } else {
          result = await getOwnerFinancialStatement(
            owner.id
          );
        }

        if (!cancelled) setTabData(result?.data || null);
      } catch (error) {
        if (!cancelled) setTabError(error.message);
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    }

    loadTab();
    return () => {
      cancelled = true;
    };
  }, [owner.id, tab]);

  return (
    <ModalShell
      title={ownerName(owner)}
      subtitle={`${owner.ownerCode} · ${
        owner.isActive ? "Active" : "Inactive"
      }`}
      onClose={onClose}
      width="1100px"
      footer={
        <>
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={onEdit}
          >
            <Edit3 size={16} />
            Edit Owner
          </button>
        </>
      }
    >
      <div className="d-flex flex-wrap gap-2 mb-4">
        {[
          ["overview", "Overview", Eye],
          ["pets", "Pets", PawPrint],
          ["appointments", "Appointments", CalendarDays],
          ["statement", "Statement", FileText],
        ].map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 ${
              tab === value
                ? "btn-primary"
                : "btn-light border"
            }`}
            onClick={() => setTab(value)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tabError && (
        <div className="alert alert-danger">{tabError}</div>
      )}

      {tabLoading ? (
        <div className="text-center py-5">
          <span className="spinner-border text-primary" />
        </div>
      ) : tab === "overview" ? (
        <OwnerOverview owner={owner} />
      ) : tab === "pets" ? (
        <PetsPanel data={tabData} />
      ) : tab === "appointments" ? (
        <AppointmentsPanel data={tabData} />
      ) : (
        <StatementPanel data={tabData} />
      )}
    </ModalShell>
  );
}

function OwnerOverview({ owner }) {
  const financials = owner.financials || {};

  return (
    <div className="row g-4">
      <div className="col-md-6">
        <h6 className="fw-bold">Contact Information</h6>
        <DetailRow label="Phone" value={owner.phone} />
        <DetailRow
          label="Alternate Phone"
          value={owner.alternatePhone || "Not provided"}
        />
        <DetailRow
          label="Email"
          value={owner.email || "Not provided"}
        />
        <DetailRow
          label="Address"
          value={
            [owner.address, owner.city]
              .filter(Boolean)
              .join(", ") || "Not provided"
          }
        />
      </div>

      <div className="col-md-6">
        <h6 className="fw-bold">Account Information</h6>
        <DetailRow
          label="Owner Code"
          value={owner.ownerCode}
          
        />
        <DetailRow
          label="Status"
          value={owner.isActive ? "Active" : "Inactive"}
        />
        <DetailRow
          label="Registered"
          value={dateTime(owner.createdAt)}
        />
        <DetailRow
          label="Last Updated"
          value={dateTime(owner.updatedAt)}
        />
      </div>

      <div className="col-12">
        <h6 className="fw-bold">Financial Summary</h6>
        <div className="row g-3">
          <MiniCard
            label="Total Invoiced"
            value={money(financials.totalInvoiced)}
          />
          <MiniCard
            label="Total Paid"
            value={money(financials.totalPaid)}
          />
          <MiniCard
            label="Outstanding"
            value={money(financials.outstandingBalance)}
          />
          <MiniCard
            label="Invoices"
            value={financials.invoiceCount || 0}
          />
        </div>
      </div>

      <div className="col-12">
        <h6 className="fw-bold">Recent Appointments</h6>
        <AppointmentsTable
          appointments={owner.recentAppointments || []}
        />
      </div>
    </div>
  );
}

function PetsPanel({ data }) {
  const pets = data?.pets || [];

  if (pets.length === 0) {
    return <EmptyPanel text="No pets registered for this owner." />;
  }

  return (
    <div className="row g-3">
      {pets.map((pet) => (
        <div key={pet.id} className="col-md-6">
          <div className="border rounded-4 p-3 h-100">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="rounded-circle bg-info-subtle text-info-emphasis p-2">
                <PawPrint size={20} />
              </div>
              <div>
                <div className="fw-bold">{pet.name}</div>
                <small className="text-secondary">
                  {pet.petCode}
                </small>
              </div>
            </div>
            <DetailRow
              label="Species"
              value={pet.species?.name || "Not provided"}
            />
            <DetailRow
              label="Breed"
              value={pet.breed?.name || "Not provided"}
            />
            <DetailRow
              label="Gender"
              value={pet.gender || "Not provided"}
            />
            <DetailRow
              label="Appointments"
              value={pet._count?.appointments || 0}
            />
            <DetailRow
              label="Medical Records"
              value={pet._count?.medicalRecords || 0}
            />
            <DetailRow
              label="Vaccinations"
              value={pet._count?.vaccinations || 0}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AppointmentsPanel({ data }) {
  return (
    <AppointmentsTable appointments={data || []} />
  );
}

function AppointmentsTable({ appointments }) {
  if (!appointments.length) {
    return <EmptyPanel text="No appointments found." />;
  }

  return (
    <div className="table-responsive border rounded-3">
      <table className="table table-sm align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Date</th>
            <th>Pet</th>
            <th>Service</th>
            <th>Veterinarian</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td>{dateTime(appointment.scheduledAt)}</td>
              <td>{appointment.pet?.name || "—"}</td>
              <td>{appointment.service?.name || "—"}</td>
              <td>
                {appointment.veterinarian
                  ? `${appointment.veterinarian.firstName} ${appointment.veterinarian.lastName}`
                  : "—"}
              </td>
              <td>{appointment.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatementPanel({ data }) {
  const summary = data?.summary || {};
  const ledger = data?.ledger || [];

  return (
    <div>
      <div className="row g-3 mb-4">
        <MiniCard
          label="Total Invoiced"
          value={money(summary.totalInvoiced)}
        />
        <MiniCard
          label="Total Paid"
          value={money(summary.totalPaid)}
        />
        <MiniCard
          label="Outstanding"
          value={money(summary.outstandingBalance)}
        />
        <MiniCard
          label="Invoices"
          value={summary.invoiceCount || 0}
        />
      </div>

      {ledger.length === 0 ? (
        <EmptyPanel text="No financial transactions found." />
      ) : (
        <div className="table-responsive border rounded-3">
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th className="text-end">Debit</th>
                <th className="text-end">Credit</th>
                <th className="text-end">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((item) => (
                <tr key={`${item.type}-${item.id}`}>
                  <td>{dateOnly(item.date)}</td>
                  <td>{item.type}</td>
                  <td>{item.reference}</td>
                  <td className="text-end">
                    {money(item.debit)}
                  </td>
                  <td className="text-end">
                    {money(item.credit)}
                  </td>
                  <td className="text-end fw-semibold">
                    {money(item.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OwnerFormModal({
  formData,
  editing,
  formError,
  isSubmitting,
  onChange,
  onSubmit,
  onClose,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSubmitting, onClose]);

  return (
    <ModalShell
      title={editing ? "Edit Pet Owner" : "Add Pet Owner"}
      subtitle="Enter the owner’s account and contact information."
      onClose={onClose}
      width="800px"
      preventClose={isSubmitting}
      footer={
        <>
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="owner-form"
            className="btn btn-primary d-flex align-items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <span className="spinner-border spinner-border-sm" />
            )}
            {editing ? "Update Owner" : "Create Owner"}
          </button>
        </>
      }
    >
      <form id="owner-form" onSubmit={onSubmit}>
        {formError && (
          <div className="alert alert-danger">
            {formError}
          </div>
        )}

        <div className="row g-3">
          <FormInput
            label="Owner Code"
            name="ownerCode"
            value={formData.ownerCode}
            onChange={onChange}
            placeholder="Generated automatically"
            disabled
            col="col-md-6"
          />
          <div className="col-md-6 d-flex align-items-end">
            <div className="form-check form-switch mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                name="isActive"
                checked={formData.isActive}
                onChange={onChange}
                id="owner-active"
              />
              <label
                className="form-check-label"
                htmlFor="owner-active"
              >
                Active owner
              </label>
            </div>
          </div>

          <FormInput
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={onChange}
            required
            col="col-md-6"
          />
          <FormInput
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={onChange}
            required
            col="col-md-6"
          />
          <FormInput
            label="Primary Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={onChange}
            required
            col="col-md-6"
          />
          <FormInput
            label="Alternate Phone"
            name="alternatePhone"
            type="tel"
            value={formData.alternatePhone}
            onChange={onChange}
            col="col-md-6"
          />
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
            col="col-md-6"
          />
          <FormInput
            label="City"
            name="city"
            value={formData.city}
            onChange={onChange}
            col="col-md-6"
          />
          <FormInput
            label="Address"
            name="address"
            value={formData.address}
            onChange={onChange}
            col="col-12"
          />
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width,
  preventClose = false,
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !preventClose
        ) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "rgba(0,0,0,.55)",
      }}
    >
      <div
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: `min(${width}, 100%)`,
          maxHeight: "calc(100vh - 32px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="border-bottom p-3 p-md-4 d-flex justify-content-between align-items-start gap-3">
          <div>
            <h5 className="fw-bold mb-1">{title}</h5>
            {subtitle && (
              <small className="text-secondary">
                {subtitle}
              </small>
            )}
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            disabled={preventClose}
          />
        </div>

        <div
          className="p-3 p-md-4"
          style={{ overflowY: "auto", minHeight: 0 }}
        >
          {children}
        </div>

        {footer && (
          <div className="border-top p-3 d-flex flex-wrap justify-content-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, iconClass }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <small className="text-secondary">{title}</small>
            <h3 className="fw-bold mt-2 mb-0">{value}</h3>
          </div>
          <div
            className={`rounded-3 d-flex align-items-center justify-content-center ${iconClass}`}
            style={{ width: 48, height: 48 }}
          >
            <Icon size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="border rounded-4 p-3 h-100">
        <small className="text-secondary">{label}</small>
        <div className="fw-bold mt-2">{value}</div>
      </div>
    </div>
  );
}

function FormInput({ label, col = "col-12", ...props }) {
  return (
    <div className={col}>
      <label className="form-label">
        {label}
        {props.required && (
          <span className="text-danger ms-1">*</span>
        )}
      </label>
      <input className="form-control" {...props} />
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <small className="text-secondary">{label}</small>
      <small className="fw-semibold text-end text-break">
        {value}
      </small>
    </div>
  );
}

function StatusBadge({ isActive, archived }) {
  const label = archived
    ? "Archived"
    : isActive
      ? "Active"
      : "Inactive";

  const classes = archived
    ? "bg-danger-subtle text-danger"
    : isActive
      ? "bg-success-subtle text-success"
      : "bg-secondary-subtle text-secondary";

  return (
    <span className={`badge rounded-pill ${classes}`}>
      {label}
    </span>
  );
}

function EmptyPanel({ text }) {
  return (
    <div className="text-center text-secondary py-5">
      <PawPrint size={38} className="mb-3" />
      <div>{text}</div>
    </div>
  );
}

export default PetOwners;
