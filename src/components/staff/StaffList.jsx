import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import {
  changeUserStatus,
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  resetUserPassword,
  updateUser,
} from "../../services/users.api.js";

/*
 * IMPORTANT:
 * These values must exactly match your Prisma UserRole enum.
 * Remove or rename any value that does not exist in schema.prisma.
 */
const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrator" },
  { value: "VETERINARIAN", label: "Veterinarian" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "LAB_TECHNICIAN", label: "Lab Technician" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "GROOMER", label: "Groomer" },
  { value: "CASHIER", label: "Cashier" },
];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: "VETERINARIAN",
  licenseNumber: "",
  specialization: "",
  avatarUrl: "",
};

function formatRole(role) {
  if (!role) return "Unknown";
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString();
}

function StaffList() {
  const location = useLocation();
  const navigate = useNavigate();

  const [staff, setStaff] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isViewing, setIsViewing] = useState(false);

  const loadStaff = useCallback(
    async (requestedPage = 1) => {
      setIsLoading(true);
      setPageError("");

      try {
        const result = await getUsers({
          page: requestedPage,
          limit: pagination.limit,
          search: searchTerm.trim(),
          role: roleFilter === "All" ? "" : roleFilter,
          status:
            statusFilter === "All"
              ? "all"
              : statusFilter.toLowerCase(),
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        setStaff(result?.data?.users || []);
        setPagination((previous) => ({
          ...previous,
          ...(result?.data?.pagination || {}),
        }));
      } catch (error) {
        setPageError(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, roleFilter, searchTerm, statusFilter]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStaff(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [loadStaff]);

  useEffect(() => {
    if (location.state?.action !== "add") return;

    openAddForm();

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate]);

  const activeCount = useMemo(
    () => staff.filter((member) => member.isActive).length,
    [staff]
  );

  const inactiveCount = useMemo(
    () => staff.filter((member) => !member.isActive).length,
    [staff]
  );

  const veterinarianCount = useMemo(
    () =>
      staff.filter((member) => member.role === "VETERINARIAN")
        .length,
    [staff]
  );

  function clearMessages() {
    setPageError("");
    setSuccessMessage("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormError("");
  }

  function openAddForm() {
    setEditingUserId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(member) {
    setEditingUserId(member.id);
    setFormData({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      phone: member.phone || "",
      password: "",
      confirmPassword: "",
      role: member.role || "VETERINARIAN",
      licenseNumber: member.licenseNumber || "",
      specialization: member.specialization || "",
      avatarUrl: member.avatarUrl || "",
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (isSubmitting) return;

    setShowForm(false);
    setEditingUserId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
  }

  function validateForm() {
    if (formData.firstName.trim().length < 2) {
      return "First name must contain at least 2 characters.";
    }

    if (formData.lastName.trim().length < 2) {
      return "Last name must contain at least 2 characters.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Please enter a valid email address.";
    }

    if (!ROLE_OPTIONS.some((role) => role.value === formData.role)) {
      return "Please select a valid staff role.";
    }

    if (formData.avatarUrl.trim()) {
      try {
        new URL(formData.avatarUrl.trim());
      } catch {
        return "Avatar URL must be a valid URL.";
      }
    }

    if (!editingUserId) {
      if (formData.password.length < 8) {
        return "Password must contain at least 8 characters.";
      }

      if (!/[a-z]/.test(formData.password)) {
        return "Password must contain a lowercase letter.";
      }

      if (!/[A-Z]/.test(formData.password)) {
        return "Password must contain an uppercase letter.";
      }

      if (!/[0-9]/.test(formData.password)) {
        return "Password must contain a number.";
      }

      if (formData.password !== formData.confirmPassword) {
        return "Passwords do not match.";
      }
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
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || null,
      role: formData.role,
      licenseNumber: formData.licenseNumber.trim() || null,
      specialization: formData.specialization.trim() || null,
      avatarUrl: formData.avatarUrl.trim() || null,
    };

    try {
      if (editingUserId) {
        await updateUser(editingUserId, payload);
        setSuccessMessage("Staff account updated successfully.");
      } else {
        await createUser({
          ...payload,
          password: formData.password,
        });
        setSuccessMessage("Staff account created successfully.");
      }

      const targetPage = editingUserId ? pagination.page : 1;
      setShowForm(false);
      setEditingUserId(null);
      setFormData(EMPTY_FORM);
      await loadStaff(targetPage);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleViewStaff(userId) {
    setIsViewing(true);
    clearMessages();

    try {
      const result = await getUserById(userId);
      setSelectedStaff(result?.data?.user || null);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setIsViewing(false);
    }
  }

  async function handleStatusChange(member) {
    const nextStatus = !member.isActive;
    const fullName = `${member.firstName} ${member.lastName}`.trim();

    const confirmed = window.confirm(
      `${nextStatus ? "Activate" : "Deactivate"} ${fullName}?`
    );

    if (!confirmed) return;

    setBusyUserId(member.id);
    clearMessages();

    try {
      await changeUserStatus(member.id, nextStatus);
      setSuccessMessage(
        nextStatus
          ? "Staff account activated successfully."
          : "Staff account deactivated successfully."
      );
      await loadStaff(pagination.page);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDelete(member) {
    const fullName = `${member.firstName} ${member.lastName}`.trim();

    const confirmed = window.confirm(
      `Delete ${fullName}? This staff account will be deactivated and removed from the staff list.`
    );

    if (!confirmed) return;

    setBusyUserId(member.id);
    clearMessages();

    try {
      await deleteUser(member.id);
      setSuccessMessage("Staff account deleted successfully.");

      const nextPage =
        staff.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await loadStaff(nextPage);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleGenerateTemporaryPassword(member) {
    const fullName = `${member.firstName} ${member.lastName}`.trim();

    const confirmed = window.confirm(
      `Generate a new temporary password for ${fullName}? Their existing sessions will be revoked.`
    );

    if (!confirmed) return;

    setBusyUserId(member.id);
    clearMessages();

    try {
      const result = await resetUserPassword(member.id, {
        generateTemporaryPassword: true,
      });

      const temporaryPassword =
        result?.data?.temporaryPassword || "";

      if (temporaryPassword) {
        window.prompt(
          "Temporary password generated. Copy it now because it will not be displayed again:",
          temporaryPassword
        );
      }

      setSuccessMessage("Staff password reset successfully.");
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBusyUserId(null);
    }
  }

  function resetFilters() {
    setSearchTerm("");
    setRoleFilter("All");
    setStatusFilter("All");
  }

  function handleExport() {
    const rows = [
      [
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Role",
        "Status",
        "License Number",
        "Specialization",
        "Last Login",
        "Created At",
      ],
      ...staff.map((member) => [
        member.firstName,
        member.lastName,
        member.email,
        member.phone || "",
        formatRole(member.role),
        member.isActive ? "Active" : "Inactive",
        member.licenseNumber || "",
        member.specialization || "",
        formatDate(member.lastLoginAt),
        formatDate(member.createdAt),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "clinic-staff.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Staff List</h3>
          <p className="text-secondary mb-0">
            Manage clinic staff accounts, access roles and account status.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={handleExport}
            disabled={staff.length === 0}
          >
            <Download size={18} />
            Export
          </button>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={openAddForm}
          >
            <Plus size={18} />
            Add Staff
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
          title="Total Staff"
          value={pagination.total}
          icon={Users}
          iconClass="bg-primary-subtle text-primary"
        />

        <SummaryCard
          title="Active on Page"
          value={activeCount}
          icon={BadgeCheck}
          iconClass="bg-success-subtle text-success"
        />

        <SummaryCard
          title="Inactive on Page"
          value={inactiveCount}
          icon={Power}
          iconClass="bg-warning-subtle text-warning-emphasis"
        />

        <SummaryCard
          title="Veterinarians on Page"
          value={veterinarianCount}
          icon={Stethoscope}
          iconClass="bg-info-subtle text-info-emphasis"
        />
      </div>

      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-xl-row gap-3 mb-4">
            <div className="input-group flex-grow-1">
              <span className="input-group-text bg-white border-end-0">
                <Search size={18} />
              </span>

              <input
                type="search"
                className="form-control border-start-0"
                placeholder="Search name, email, phone, licence or specialisation"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="All">All roles</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button
                type="button"
                className="btn btn-light border text-nowrap"
                onClick={resetFilters}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <small className="text-secondary">
              Showing {staff.length} of {pagination.total} staff members
            </small>

            {isLoading && (
              <span className="spinner-border spinner-border-sm text-primary" />
            )}
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Staff Member</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Professional Details</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {isLoading && staff.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <span className="spinner-border text-primary" />
                      <div className="text-secondary mt-3">
                        Loading staff members...
                      </div>
                    </td>
                  </tr>
                ) : staff.length > 0 ? (
                  staff.map((member) => {
                    const isBusy = busyUserId === member.id;

                    return (
                      <tr key={member.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <Avatar member={member} size={46} />

                            <div>
                              <div className="fw-semibold">
                                {member.firstName} {member.lastName}
                              </div>
                              <small className="text-secondary">
                                Added {formatDate(member.createdAt)}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="small d-flex align-items-center gap-2 mb-1">
                            <Mail size={14} />
                            {member.email}
                          </div>
                          <div className="small text-secondary d-flex align-items-center gap-2">
                            <Phone size={14} />
                            {member.phone || "Not provided"}
                          </div>
                        </td>

                        <td>
                          <span className="badge bg-primary-subtle text-primary rounded-pill">
                            {formatRole(member.role)}
                          </span>
                        </td>

                        <td>
                          <div className="small fw-semibold">
                            {member.specialization || "Not specified"}
                          </div>
                          <small className="text-secondary">
                            {member.licenseNumber
                              ? `Licence: ${member.licenseNumber}`
                              : "No licence number"}
                          </small>
                        </td>

                        <td>
                          <StatusBadge isActive={member.isActive} />
                        </td>

                        <td>
                          <small>{formatDate(member.lastLoginAt)}</small>
                        </td>

                        <td className="text-end">
                          <div className="d-flex justify-content-end align-items-center gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="View staff"
                              onClick={() => handleViewStaff(member.id)}
                              disabled={isBusy || isViewing}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="Edit staff"
                              onClick={() => openEditForm(member)}
                              disabled={isBusy}
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="Generate temporary password"
                              onClick={() =>
                                handleGenerateTemporaryPassword(member)
                              }
                              disabled={isBusy}
                            >
                              <KeyRound size={16} />
                            </button>

                            <button
                              type="button"
                              className={`btn btn-sm ${
                                member.isActive
                                  ? "btn-outline-warning"
                                  : "btn-outline-success"
                              }`}
                              title={
                                member.isActive
                                  ? "Deactivate staff"
                                  : "Activate staff"
                              }
                              onClick={() => handleStatusChange(member)}
                              disabled={isBusy}
                            >
                              <Power size={16} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              title="Delete staff"
                              onClick={() => handleDelete(member)}
                              disabled={isBusy}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <Users size={44} className="text-secondary mb-3" />
                      <h6 className="fw-semibold">No staff members found</h6>
                      <p className="text-secondary small">
                        Change the filters or add a new staff account.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={openAddForm}
                      >
                        Add Staff
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 border-top pt-3 mt-3">
              <small className="text-secondary">
                Page {pagination.page} of {pagination.totalPages}
              </small>

              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() => loadStaff(pagination.page - 1)}
                  disabled={!pagination.hasPreviousPage || isLoading}
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() => loadStaff(pagination.page + 1)}
                  disabled={!pagination.hasNextPage || isLoading}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <StaffFormModal
          formData={formData}
          formError={formError}
          editing={Boolean(editingUserId)}
          isSubmitting={isSubmitting}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {selectedStaff && (
        <StaffDetailsModal
          member={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onEdit={() => {
            openEditForm(selectedStaff);
            setSelectedStaff(null);
          }}
          onResetPassword={() =>
            handleGenerateTemporaryPassword(selectedStaff)
          }
        />
      )}
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

function Avatar({ member, size }) {
  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={`${member.firstName} ${member.lastName}`}
        className="rounded-circle object-fit-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <UserRound size={Math.round(size * 0.46)} />
    </div>
  );
}

function StaffFormModal({
  formData,
  formError,
  editing,
  isSubmitting,
  onChange,
  onSubmit,
  onClose,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
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
        backgroundColor: "rgba(0, 0, 0, 0.55)",
      }}
    >
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: "min(900px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div className="border-bottom p-3 p-md-4 d-flex justify-content-between align-items-start gap-3">
          <div>
            <h5 id="staff-form-title" className="fw-bold mb-1">
              {editing ? "Edit Staff Account" : "Add Staff Account"}
            </h5>
            <small className="text-secondary">
              Enter account, contact and professional information.
            </small>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            disabled={isSubmitting}
          />
        </div>

        <div
          className="p-3 p-md-4"
          style={{ overflowY: "auto", minHeight: 0 }}
        >
          {formError && (
            <div className="alert alert-danger">{formError}</div>
          )}

          <FormSection title="Account Information">
            <div className="row g-3">
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
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={onChange}
                required
                col="col-md-6"
              />

              <FormInput
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={onChange}
                placeholder="98XXXXXXXX"
                col="col-md-6"
              />

              <FormSelect
                label="Role"
                name="role"
                value={formData.role}
                onChange={onChange}
                options={ROLE_OPTIONS}
                col="col-md-6"
              />

              <FormInput
                label="Avatar URL"
                name="avatarUrl"
                type="url"
                value={formData.avatarUrl}
                onChange={onChange}
                placeholder="https://example.com/avatar.jpg"
                col="col-md-6"
              />

              {!editing && (
                <>
                  <FormInput
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={onChange}
                    autoComplete="new-password"
                    required
                    col="col-md-6"
                  />

                  <FormInput
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={onChange}
                    autoComplete="new-password"
                    required
                    col="col-md-6"
                  />

                  <div className="col-12">
                    <small className="text-secondary">
                      Password must contain at least 8 characters, including
                      uppercase, lowercase and a number.
                    </small>
                  </div>
                </>
              )}
            </div>
          </FormSection>

          <FormSection title="Professional Information">
            <div className="row g-3">
              <FormInput
                label="Licence Number"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={onChange}
                col="col-md-6"
              />

              <FormInput
                label="Specialisation"
                name="specialization"
                value={formData.specialization}
                onChange={onChange}
                col="col-md-6"
              />
            </div>
          </FormSection>
        </div>

        <div className="border-top p-3 d-flex justify-content-end gap-2">
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
            className="btn btn-primary d-flex align-items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <span className="spinner-border spinner-border-sm" />
            )}
            {editing ? "Update Staff" : "Create Staff"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StaffDetailsModal({
  member,
  onClose,
  onEdit,
  onResetPassword,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
      }}
    >
      <div
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: "min(760px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="border-bottom p-3 p-md-4 d-flex justify-content-between align-items-start">
          <div className="d-flex align-items-center gap-3">
            <Avatar member={member} size={54} />

            <div>
              <h5 id="staff-details-title" className="fw-bold mb-1">
                {member.firstName} {member.lastName}
              </h5>
              <small className="text-secondary">
                {formatRole(member.role)}
              </small>
            </div>
          </div>

          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        <div className="p-3 p-md-4" style={{ overflowY: "auto" }}>
          <div className="d-flex flex-wrap gap-2 mb-4">
            <StatusBadge isActive={member.isActive} />
            <span className="badge bg-primary-subtle text-primary rounded-pill">
              <ShieldCheck size={13} className="me-1" />
              {formatRole(member.role)}
            </span>
          </div>

          <div className="row g-4">
            <div className="col-md-6">
              <h6 className="fw-bold">Contact Information</h6>
              <DetailRow label="Email" value={member.email} />
              <DetailRow
                label="Phone"
                value={member.phone || "Not provided"}
              />
            </div>

            <div className="col-md-6">
              <h6 className="fw-bold">Professional Information</h6>
              <DetailRow label="Role" value={formatRole(member.role)} />
              <DetailRow
                label="Licence"
                value={member.licenseNumber || "Not provided"}
              />
              <DetailRow
                label="Specialisation"
                value={member.specialization || "Not provided"}
              />
            </div>

            <div className="col-md-6">
              <h6 className="fw-bold">Account Activity</h6>
              <DetailRow
                label="Last Login"
                value={formatDate(member.lastLoginAt)}
              />
              <DetailRow
                label="Created"
                value={formatDate(member.createdAt)}
              />
              <DetailRow
                label="Last Updated"
                value={formatDate(member.updatedAt)}
              />
            </div>

            <div className="col-md-6">
              <h6 className="fw-bold">Clinic Account</h6>
              <DetailRow label="User ID" value={member.id} />
              <DetailRow
                label="Clinic ID"
                value={member.clinicId || "Not available"}
              />
            </div>
          </div>
        </div>

        <div className="border-top p-3 d-flex flex-wrap justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={onResetPassword}
          >
            <KeyRound size={16} />
            Reset Password
          </button>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={onEdit}
          >
            <Edit3 size={16} />
            Edit Staff
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="mb-4">
      <h6 className="fw-bold border-bottom pb-2 mb-3">{title}</h6>
      {children}
    </section>
  );
}

function FormInput({ label, col = "col-12", ...inputProps }) {
  return (
    <div className={col}>
      <label className="form-label">
        {label}
        {inputProps.required && (
          <span className="text-danger ms-1">*</span>
        )}
      </label>
      <input className="form-control" {...inputProps} />
    </div>
  );
}

function FormSelect({
  label,
  options,
  col = "col-12",
  ...selectProps
}) {
  return (
    <div className={col}>
      <label className="form-label">{label}</label>
      <select className="form-select" {...selectProps}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <small className="text-secondary">{label}</small>
      <small className="fw-semibold text-end text-break">{value}</small>
    </div>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`badge rounded-pill ${
        isActive
          ? "bg-success-subtle text-success"
          : "bg-secondary-subtle text-secondary"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export default StaffList;
