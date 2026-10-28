
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  BadgeCheck,
  Building2,
  Check,
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
  X,
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

import { API_BASE_URL } from "../../config/api.js";

// =====================================================
// CONSTANTS
// =====================================================

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrator" },
  { value: "SUPER_ADMIN", label: "Super Administrator" },
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
  branchIds: [],
};

const EMPTY_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

// =====================================================
// HELPERS
// =====================================================

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function formatRole(role) {
  if (!role) return "Unknown";

  return role
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function formatDate(value) {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function getAuthToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token")
  );
}

function getCurrentUserRole() {
  try {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    return String(
      user?.role ||
      user?.userRole ||
      user?.data?.role ||
      user?.user?.role ||
      ""
    )
      .trim()
      .toUpperCase();
  } catch {
    return "";
  }
}

function getAssignedBranchIds(member) {
  if (Array.isArray(member?.userBranches)) {
    return member.userBranches
      .map((item) => item.branchId || item.branch?.id)
      .filter(Boolean);
  }

  if (Array.isArray(member?.branches)) {
    return member.branches
      .map((branch) => branch.id)
      .filter(Boolean);
  }

  return [];
}

function getAssignedBranches(member) {
  if (Array.isArray(member?.userBranches)) {
    return member.userBranches
      .map((item) => item.branch)
      .filter(Boolean);
  }

  return Array.isArray(member?.branches)
    ? member.branches
    : [];
}

// =====================================================
// BRANCH API
// =====================================================

async function getClinicBranches() {
  const token = getAuthToken();

  if (!token) {
    throw new Error(
      "Authentication token is required. Please log in again."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/branches`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
        "Failed to load clinic branches."
    );
  }

  const data =
    result?.data ??
    result?.branches ??
    [];

  return Array.isArray(data) ? data : [];
}

// =====================================================
// MAIN STAFF LIST COMPONENT
// =====================================================

export default function StaffList() {
  const location = useLocation();
  const navigate = useNavigate();

  // Staff
  const [staff, setStaff] = useState([]);
  const [pagination, setPagination] =
    useState(EMPTY_PAGINATION);

  // Branches
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] =
    useState(true);
  const [branchesError, setBranchesError] =
    useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] =
    useState("All");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [busyUserId, setBusyUserId] = useState(null);

  // Messages
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] =
    useState(null);
  const [formData, setFormData] = useState({
    ...EMPTY_FORM,
  });
  const [formError, setFormError] = useState("");

  // Details
  const [selectedStaff, setSelectedStaff] =
    useState(null);
  const [isViewing, setIsViewing] =
    useState(false);

  const currentUserRole = getCurrentUserRole();

  // Only SUPER_ADMIN can assign SUPER_ADMIN.
  const availableRoles = useMemo(() => {
    if (currentUserRole === "SUPER_ADMIN") {
      return ROLE_OPTIONS;
    }

    return ROLE_OPTIONS.filter(
      (role) => role.value !== "SUPER_ADMIN"
    );
  }, [currentUserRole]);

  // ===================================================
  // LOAD STAFF
  // ===================================================

  const loadStaff = useCallback(
    async (requestedPage = 1) => {
      setIsLoading(true);
      setPageError("");

      try {
        const result = await getUsers({
          page: requestedPage,
          limit: pagination.limit,
          search: searchTerm.trim(),
          role:
            roleFilter === "All"
              ? ""
              : roleFilter,
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
        setPageError(
          error.message ||
            "Could not load staff members."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      pagination.limit,
      roleFilter,
      searchTerm,
      statusFilter,
    ]
  );

  // ===================================================
  // LOAD BRANCHES
  // ===================================================

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesError("");

    try {
      const data = await getClinicBranches();
      setBranches(data);
    } catch (error) {
      setBranchesError(
        error.message ||
          "Could not load clinic branches."
      );
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStaff(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [loadStaff]);

  useEffect(() => {
    if (location.state?.action !== "add") {
      return;
    }

    openAddForm();

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate]);

  // ===================================================
  // STATISTICS
  // ===================================================

  const activeCount = useMemo(
    () =>
      staff.filter((member) => member.isActive)
        .length,
    [staff]
  );

  const inactiveCount = useMemo(
    () =>
      staff.filter((member) => !member.isActive)
        .length,
    [staff]
  );

  const veterinarianCount = useMemo(
    () =>
      staff.filter(
        (member) =>
          member.role === "VETERINARIAN"
      ).length,
    [staff]
  );

  const activeBranches = useMemo(
    () =>
      branches.filter(
        (branch) => branch.isActive
      ),
    [branches]
  );

  // ===================================================
  // HELPERS
  // ===================================================

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

  function handleBranchToggle(branchId) {
    setFormData((previous) => {
      const selected =
        previous.branchIds.includes(branchId);

      return {
        ...previous,
        branchIds: selected
          ? previous.branchIds.filter(
              (id) => id !== branchId
            )
          : [...previous.branchIds, branchId],
      };
    });

    setFormError("");
  }

  function handleSelectAllBranches() {
    setFormData((previous) => ({
      ...previous,
      branchIds: activeBranches.map(
        (branch) => branch.id
      ),
    }));

    setFormError("");
  }

  function handleClearBranches() {
    setFormData((previous) => ({
      ...previous,
      branchIds: [],
    }));

    setFormError("");
  }

  // ===================================================
  // OPEN ADD FORM
  // ===================================================

  function openAddForm() {
    setEditingUserId(null);

    setFormData({
      ...EMPTY_FORM,
      branchIds: [],
    });

    setFormError("");
    setShowForm(true);

    loadBranches();
  }

  // ===================================================
  // OPEN EDIT FORM
  // ===================================================

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
      licenseNumber:
        member.licenseNumber || "",
      specialization:
        member.specialization || "",
      avatarUrl: member.avatarUrl || "",

      // Preselect assigned branches
      branchIds: getAssignedBranchIds(member),
    });

    setFormError("");
    setShowForm(true);

    loadBranches();
  }

  // ===================================================
  // CLOSE FORM
  // ===================================================

  function closeForm() {
    if (isSubmitting) return;

    setShowForm(false);
    setEditingUserId(null);

    setFormData({
      ...EMPTY_FORM,
      branchIds: [],
    });

    setFormError("");
  }

  // ===================================================
  // VALIDATE FORM
  // ===================================================

  function validateForm() {
    if (formData.firstName.trim().length < 2) {
      return "First name must contain at least 2 characters.";
    }

    if (formData.lastName.trim().length < 2) {
      return "Last name must contain at least 2 characters.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      return "Please enter a valid email address.";
    }

    if (
      !availableRoles.some(
        (role) => role.value === formData.role
      )
    ) {
      // Existing SUPER_ADMIN can still be edited
      // by another SUPER_ADMIN.
      if (
        !(
          formData.role === "SUPER_ADMIN" &&
          currentUserRole === "SUPER_ADMIN"
        )
      ) {
        return "Please select a valid staff role.";
      }
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

      if (
        formData.password !==
        formData.confirmPassword
      ) {
        return "Passwords do not match.";
      }
    }

    // Non-admin staff require branch assignments.
    if (!isAdminRole(formData.role)) {
      if (branchesLoading) {
        return "Clinic branches are still loading.";
      }

      if (branchesError) {
        return "Could not load branches. Please refresh and try again.";
      }

      if (formData.branchIds.length === 0) {
        return "Please assign at least one branch to this staff member.";
      }

      const invalidBranch =
        formData.branchIds.some(
          (id) =>
            !activeBranches.some(
              (branch) => branch.id === id
            )
        );

      if (invalidBranch) {
        return "One or more selected branches are inactive or unavailable.";
      }
    }

    return "";
  }

  // ===================================================
  // CREATE / UPDATE STAFF
  // ===================================================

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
      licenseNumber:
        formData.licenseNumber.trim() || null,
      specialization:
        formData.specialization.trim() || null,
      avatarUrl:
        formData.avatarUrl.trim() || null,

      // Staff: multiple branch IDs
      // Admin: automatic access to all branches
      ...(!isAdminRole(formData.role)
        ? {
            branchIds: formData.branchIds,
          }
        : {}),
    };

    try {
      if (editingUserId) {
        await updateUser(editingUserId, payload);

        setSuccessMessage(
          "Staff account and branch assignments updated successfully."
        );
      } else {
        await createUser({
          ...payload,
          password: formData.password,
        });

        setSuccessMessage(
          "Staff account created successfully."
        );
      }

      const targetPage = editingUserId
        ? pagination.page
        : 1;

      setShowForm(false);
      setEditingUserId(null);

      setFormData({
        ...EMPTY_FORM,
        branchIds: [],
      });

      await loadStaff(targetPage);
    } catch (error) {
      setFormError(
        error.message ||
          "Could not save staff account."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // ===================================================
  // VIEW STAFF
  // ===================================================

  async function handleViewStaff(userId) {
    setIsViewing(true);
    clearMessages();

    try {
      const result = await getUserById(userId);

      setSelectedStaff(
        result?.data?.user || null
      );
    } catch (error) {
      setPageError(error.message);
    } finally {
      setIsViewing(false);
    }
  }

  // ===================================================
  // ACTIVATE / DEACTIVATE STAFF
  // ===================================================

  async function handleStatusChange(member) {
    const nextStatus = !member.isActive;

    const fullName =
      `${member.firstName} ${member.lastName}`.trim();

    const confirmed = window.confirm(
      `${nextStatus ? "Activate" : "Deactivate"} ${fullName}?`
    );

    if (!confirmed) return;

    setBusyUserId(member.id);
    clearMessages();

    try {
      await changeUserStatus(
        member.id,
        nextStatus
      );

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

  // ===================================================
  // DELETE STAFF
  // ===================================================

  async function handleDelete(member) {
    const fullName =
      `${member.firstName} ${member.lastName}`.trim();

    const confirmed = window.confirm(
      `Delete ${fullName}? This staff account will be deactivated and removed from the staff list.`
    );

    if (!confirmed) return;

    setBusyUserId(member.id);
    clearMessages();

    try {
      await deleteUser(member.id);

      setSuccessMessage(
        "Staff account deleted successfully."
      );

      const nextPage =
        staff.length === 1 &&
        pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await loadStaff(nextPage);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBusyUserId(null);
    }
  }

  // ===================================================
  // RESET PASSWORD
  // ===================================================

  async function handleGenerateTemporaryPassword(
    member
  ) {
    const fullName =
      `${member.firstName} ${member.lastName}`.trim();

    const confirmed = window.confirm(
      `Generate a new temporary password for ${fullName}? Their existing sessions will be revoked.`
    );

    if (!confirmed) return;

    setBusyUserId(member.id);
    clearMessages();

    try {
      const result = await resetUserPassword(
        member.id,
        {
          generateTemporaryPassword: true,
        }
      );

      const temporaryPassword =
        result?.data?.temporaryPassword || "";

      if (temporaryPassword) {
        window.prompt(
          "Temporary password generated. Copy it now because it will not be displayed again:",
          temporaryPassword
        );
      }

      setSuccessMessage(
        "Staff password reset successfully."
      );
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBusyUserId(null);
    }
  }

  // ===================================================
  // RESET FILTERS
  // ===================================================

  function resetFilters() {
    setSearchTerm("");
    setRoleFilter("All");
    setStatusFilter("All");
  }

  // ===================================================
  // EXPORT STAFF
  // ===================================================

  function handleExport() {
    const rows = [
      [
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Role",
        "Assigned Branches",
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

        isAdminRole(member.role)
          ? "All Branches"
          : getAssignedBranches(member)
              .map((branch) => branch.name)
              .join(", "),

        member.isActive
          ? "Active"
          : "Inactive",

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

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div>
      {/* HEADER */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            Staff List
          </h3>

          <p className="text-secondary mb-0">
            Manage clinic staff, roles, branch
            assignments and account status.
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

      {/* ERROR */}
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

      {/* SUCCESS */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show">
          {successMessage}

          <button
            type="button"
            className="btn-close"
            onClick={() =>
              setSuccessMessage("")
            }
          />
        </div>
      )}

      {/* SUMMARY CARDS */}
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

      {/* STAFF TABLE */}
      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">

          {/* FILTERS */}
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
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  All roles
                </option>

                {ROLE_OPTIONS.map((role) => (
                  <option
                    key={role.value}
                    value={role.value}
                  >
                    {role.label}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="All">
                  All statuses
                </option>
                <option value="Active">
                  Active
                </option>
                <option value="Inactive">
                  Inactive
                </option>
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
              Showing {staff.length} of{" "}
              {pagination.total} staff members
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
                  <th>Assigned Branches</th>
                  <th>Professional Details</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading &&
                staff.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-5"
                    >
                      <span className="spinner-border text-primary" />

                      <div className="text-secondary mt-3">
                        Loading staff members...
                      </div>
                    </td>
                  </tr>
                ) : staff.length > 0 ? (
                  staff.map((member) => {
                    const isBusy =
                      busyUserId === member.id;

                    const assignedBranches =
                      getAssignedBranches(member);

                    return (
                      <tr key={member.id}>
                        {/* STAFF */}
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <Avatar
                              member={member}
                              size={46}
                            />

                            <div>
                              <div className="fw-semibold">
                                {member.firstName}{" "}
                                {member.lastName}
                              </div>

                              <small className="text-secondary">
                                Added{" "}
                                {formatDate(
                                  member.createdAt
                                )}
                              </small>
                            </div>
                          </div>
                        </td>

                        {/* CONTACT */}
                        <td>
                          <div className="small d-flex align-items-center gap-2 mb-1">
                            <Mail size={14} />
                            {member.email}
                          </div>

                          <div className="small text-secondary d-flex align-items-center gap-2">
                            <Phone size={14} />
                            {member.phone ||
                              "Not provided"}
                          </div>
                        </td>

                        {/* ROLE */}
                        <td>
                          <span className="badge bg-primary-subtle text-primary rounded-pill">
                            {formatRole(
                              member.role
                            )}
                          </span>
                        </td>

                        {/* BRANCHES */}
                        <td>
                          {isAdminRole(
                            member.role
                          ) ? (
                            <span className="badge bg-success-subtle text-success rounded-pill">
                              <ShieldCheck
                                size={13}
                                className="me-1"
                              />
                              All Branches
                            </span>
                          ) : assignedBranches.length >
                            0 ? (
                            <div className="d-flex flex-wrap gap-1">
                              {assignedBranches.map(
                                (branch) => (
                                  <span
                                    key={branch.id}
                                    className={`badge rounded-pill ${
                                      branch.isActive
                                        ? "bg-info-subtle text-info-emphasis"
                                        : "bg-secondary-subtle text-secondary"
                                    }`}
                                  >
                                    <Building2
                                      size={12}
                                      className="me-1"
                                    />
                                    {branch.name}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="badge bg-danger-subtle text-danger">
                              Not Assigned
                            </span>
                          )}
                        </td>

                        {/* PROFESSIONAL */}
                        <td>
                          <div className="small fw-semibold">
                            {member.specialization ||
                              "Not specified"}
                          </div>

                          <small className="text-secondary">
                            {member.licenseNumber
                              ? `Licence: ${member.licenseNumber}`
                              : "No licence number"}
                          </small>
                        </td>

                        {/* STATUS */}
                        <td>
                          <StatusBadge
                            isActive={
                              member.isActive
                            }
                          />
                        </td>

                        {/* LAST LOGIN */}
                        <td>
                          <small>
                            {formatDate(
                              member.lastLoginAt
                            )}
                          </small>
                        </td>

                        {/* ACTIONS */}
                        <td className="text-end">
                          <div className="d-flex justify-content-end align-items-center gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="View staff"
                              onClick={() =>
                                handleViewStaff(
                                  member.id
                                )
                              }
                              disabled={
                                isBusy || isViewing
                              }
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="Edit staff"
                              onClick={() =>
                                openEditForm(
                                  member
                                )
                              }
                              disabled={isBusy}
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="Generate temporary password"
                              onClick={() =>
                                handleGenerateTemporaryPassword(
                                  member
                                )
                              }
                              disabled={isBusy}
                            >
                              <KeyRound
                                size={16}
                              />
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
                              onClick={() =>
                                handleStatusChange(
                                  member
                                )
                              }
                              disabled={isBusy}
                            >
                              <Power
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              title="Delete staff"
                              onClick={() =>
                                handleDelete(
                                  member
                                )
                              }
                              disabled={isBusy}
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-5"
                    >
                      <Users
                        size={44}
                        className="text-secondary mb-3"
                      />

                      <h6 className="fw-semibold">
                        No staff members found
                      </h6>

                      <p className="text-secondary small">
                        Change the filters or
                        add a new staff account.
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

          {/* PAGINATION */}
          {pagination.totalPages > 1 && (
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 border-top pt-3 mt-3">
              <small className="text-secondary">
                Page {pagination.page} of{" "}
                {pagination.totalPages}
              </small>

              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() =>
                    loadStaff(
                      pagination.page - 1
                    )
                  }
                  disabled={
                    !pagination.hasPreviousPage ||
                    isLoading
                  }
                >
                  <ChevronLeft
                    size={18}
                  />
                </button>

                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() =>
                    loadStaff(
                      pagination.page + 1
                    )
                  }
                  disabled={
                    !pagination.hasNextPage ||
                    isLoading
                  }
                >
                  <ChevronRight
                    size={18}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <StaffFormModal
          formData={formData}
          formError={formError}
          editing={Boolean(editingUserId)}
          isSubmitting={isSubmitting}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
          branches={branches}
          branchesLoading={branchesLoading}
          branchesError={branchesError}
          onRefreshBranches={loadBranches}
          onBranchToggle={handleBranchToggle}
          onSelectAllBranches={
            handleSelectAllBranches
          }
          onClearBranches={
            handleClearBranches
          }
          availableRoles={availableRoles}
        />
      )}

      {/* STAFF DETAILS */}
      {selectedStaff && (
        <StaffDetailsModal
          member={selectedStaff}
          onClose={() =>
            setSelectedStaff(null)
          }
          onEdit={() => {
            openEditForm(
              selectedStaff
            );
            setSelectedStaff(null);
          }}
          onResetPassword={() =>
            handleGenerateTemporaryPassword(
              selectedStaff
            )
          }
        />
      )}
    </div>
  );
}

// =====================================================
// SUMMARY CARD
// =====================================================

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <small className="text-secondary">
              {title}
            </small>

            <h3 className="fw-bold mt-2 mb-0">
              {value}
            </h3>
          </div>

          <div
            className={`rounded-3 d-flex align-items-center justify-content-center ${iconClass}`}
            style={{
              width: 48,
              height: 48,
            }}
          >
            <Icon size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// AVATAR
// =====================================================

function Avatar({ member, size }) {
  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={`${member.firstName} ${member.lastName}`}
        className="rounded-circle object-fit-cover flex-shrink-0"
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <div
      className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
      style={{
        width: size,
        height: size,
      }}
    >
      <UserRound
        size={Math.round(size * 0.46)}
      />
    </div>
  );
}

// =====================================================
// ADD / EDIT STAFF MODAL
// =====================================================

function StaffFormModal({
  formData,
  formError,
  editing,
  isSubmitting,
  onChange,
  onSubmit,
  onClose,
  branches,
  branchesLoading,
  branchesError,
  onRefreshBranches,
  onBranchToggle,
  onSelectAllBranches,
  onClearBranches,
  availableRoles,
}) {
  const adminSelected =
    isAdminRole(formData.role);

  const activeBranches = branches.filter(
    (branch) => branch.isActive
  );

  const selectedCount =
    formData.branchIds.length;

  const allSelected =
    activeBranches.length > 0 &&
    activeBranches.every(
      (branch) =>
        formData.branchIds.includes(branch.id)
    );

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(event) {
      if (
        event.key === "Escape" &&
        !isSubmitting
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isSubmitting, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-form-title"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !isSubmitting
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
        backgroundColor:
          "rgba(0, 0, 0, 0.55)",
      }}
    >
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: "min(900px, 100%)",
          maxHeight:
            "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* MODAL HEADER */}
        <div className="border-bottom p-3 p-md-4 d-flex justify-content-between align-items-start gap-3">
          <div>
            <h5
              id="staff-form-title"
              className="fw-bold mb-1"
            >
              {editing
                ? "Edit Staff Account"
                : "Add Staff Account"}
            </h5>

            <small className="text-secondary">
              Manage account details,
              professional information
              and branch access.
            </small>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            disabled={isSubmitting}
          />
        </div>

        {/* SCROLLABLE CONTENT */}
        <div
          className="p-3 p-md-4"
          style={{
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          {formError && (
            <div className="alert alert-danger">
              {formError}
            </div>
          )}

          {/* ACCOUNT INFO */}
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
                options={availableRoles}
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
                    value={
                      formData.password
                    }
                    onChange={onChange}
                    autoComplete="new-password"
                    required
                    col="col-md-6"
                  />

                  <FormInput
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={
                      formData.confirmPassword
                    }
                    onChange={onChange}
                    autoComplete="new-password"
                    required
                    col="col-md-6"
                  />

                  <div className="col-12">
                    <small className="text-secondary">
                      Password must contain at
                      least 8 characters,
                      including uppercase,
                      lowercase and a number.
                    </small>
                  </div>
                </>
              )}
            </div>
          </FormSection>

          {/* PROFESSIONAL INFO */}
          <FormSection title="Professional Information">
            <div className="row g-3">
              <FormInput
                label="Licence Number"
                name="licenseNumber"
                value={
                  formData.licenseNumber
                }
                onChange={onChange}
                col="col-md-6"
              />

              <FormInput
                label="Specialisation"
                name="specialization"
                value={
                  formData.specialization
                }
                onChange={onChange}
                col="col-md-6"
              />
            </div>
          </FormSection>

          {/* BRANCH ASSIGNMENT */}
          <FormSection title="Branch Access & Assignment">

            {/* ADMIN / SUPER ADMIN */}
            {adminSelected ? (
              <div className="alert alert-success d-flex align-items-start gap-3 mb-0">
                <ShieldCheck
                  size={24}
                  className="flex-shrink-0 mt-1"
                />

                <div>
                  <div className="fw-bold mb-1">
                    All Branch Access
                  </div>

                  <p className="mb-2 small">
                    Administrators and Super
                    Administrators automatically
                    have access to every active
                    branch in their clinic.
                  </p>

                  <small>
                    No manual branch assignment
                    is required. New branches
                    will also be accessible
                    automatically.
                  </small>
                </div>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <label className="form-label fw-semibold mb-1">
                      Assign Branches
                      <span className="text-danger ms-1">
                        *
                      </span>
                    </label>

                    <div className="small text-secondary">
                      Select one or multiple
                      branches where this staff
                      member can work.
                    </div>
                  </div>

                  <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                    {selectedCount} Selected
                  </span>
                </div>

                {/* QUICK ACTIONS */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={
                      onSelectAllBranches
                    }
                    disabled={
                      isSubmitting ||
                      branchesLoading ||
                      activeBranches.length === 0 ||
                      allSelected
                    }
                  >
                    Select All
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onClearBranches}
                    disabled={
                      isSubmitting ||
                      selectedCount === 0
                    }
                  >
                    Clear Selection
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-light border ms-auto"
                    onClick={
                      onRefreshBranches
                    }
                    disabled={
                      branchesLoading ||
                      isSubmitting
                    }
                  >
                    Refresh
                  </button>
                </div>

                {/* LOADING */}
                {branchesLoading ? (
                  <div className="text-center py-4 border rounded-3">
                    <span className="spinner-border spinner-border-sm text-primary" />

                    <div className="small text-secondary mt-2">
                      Loading clinic branches...
                    </div>
                  </div>
                ) : branchesError ? (
                  <div className="alert alert-danger">
                    {branchesError}
                  </div>
                ) : activeBranches.length === 0 ? (
                  <div className="alert alert-warning d-flex align-items-start gap-2">
                    <Building2
                      size={20}
                    />

                    <div>
                      <div className="fw-semibold">
                        No Active Branches
                      </div>

                      <small>
                        Create or activate a
                        clinic branch before
                        assigning staff.
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="row g-2">
                    {activeBranches.map(
                      (branch) => {
                        const checked =
                          formData.branchIds.includes(
                            branch.id
                          );

                        return (
                          <div
                            className="col-md-6"
                            key={branch.id}
                          >
                            <label
                              htmlFor={`staff-branch-${branch.id}`}
                              className={`border rounded-3 p-3 d-flex align-items-center gap-3 h-100 w-100 ${
                                checked
                                  ? "border-primary bg-primary-subtle"
                                  : "bg-white"
                              }`}
                              style={{
                                cursor:
                                  isSubmitting
                                    ? "not-allowed"
                                    : "pointer",
                                transition:
                                  "all 0.2s ease",
                              }}
                            >
                              <input
                                id={`staff-branch-${branch.id}`}
                                type="checkbox"
                                className="form-check-input mt-0"
                                checked={checked}
                                disabled={
                                  isSubmitting
                                }
                                onChange={() =>
                                  onBranchToggle(
                                    branch.id
                                  )
                                }
                              />

                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <Building2
                                    size={16}
                                  />

                                  <span className="fw-semibold">
                                    {branch.name}
                                  </span>
                                </div>

                                {branch.address && (
                                  <small className="text-secondary d-block">
                                    {branch.address}
                                  </small>
                                )}

                                {branch.isMain && (
                                  <span className="badge bg-primary-subtle text-primary mt-2">
                                    Main Branch
                                  </span>
                                )}
                              </div>

                              {checked && (
                                <Check
                                  size={20}
                                  className="text-primary flex-shrink-0"
                                />
                              )}
                            </label>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                <div className="small text-secondary mt-3">
                  A staff member can be
                  assigned to multiple branches.
                  They will only have access to
                  the selected active branches.
                </div>
              </>
            )}
          </FormSection>
        </div>

        {/* FOOTER */}
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
            disabled={
              isSubmitting ||
              (!adminSelected &&
                (branchesLoading ||
                  Boolean(branchesError)))
            }
          >
            {isSubmitting && (
              <span className="spinner-border spinner-border-sm" />
            )}

            {editing
              ? "Update Staff"
              : "Create Staff"}
          </button>
        </div>
      </form>
    </div>
  );
}

// =====================================================
// STAFF DETAILS MODAL
// =====================================================

function StaffDetailsModal({
  member,
  onClose,
  onEdit,
  onResetPassword,
}) {
  const assignedBranches =
    getAssignedBranches(member);

  const adminAccess =
    isAdminRole(member.role);

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-details-title"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
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
        backgroundColor:
          "rgba(0, 0, 0, 0.55)",
      }}
    >
      <div
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: "min(760px, 100%)",
          maxHeight:
            "calc(100vh - 32px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}
        <div className="border-bottom p-3 p-md-4 d-flex justify-content-between align-items-start">
          <div className="d-flex align-items-center gap-3">
            <Avatar
              member={member}
              size={54}
            />

            <div>
              <h5
                id="staff-details-title"
                className="fw-bold mb-1"
              >
                {member.firstName}{" "}
                {member.lastName}
              </h5>

              <small className="text-secondary">
                {formatRole(member.role)}
              </small>
            </div>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          />
        </div>

        {/* BODY */}
        <div
          className="p-3 p-md-4"
          style={{
            overflowY: "auto",
          }}
        >
          <div className="d-flex flex-wrap gap-2 mb-4">
            <StatusBadge
              isActive={member.isActive}
            />

            <span className="badge bg-primary-subtle text-primary rounded-pill">
              <ShieldCheck
                size={13}
                className="me-1"
              />
              {formatRole(member.role)}
            </span>
          </div>

          <div className="row g-4">
            {/* CONTACT */}
            <div className="col-md-6">
              <h6 className="fw-bold">
                Contact Information
              </h6>

              <DetailRow
                label="Email"
                value={member.email}
              />

              <DetailRow
                label="Phone"
                value={
                  member.phone ||
                  "Not provided"
                }
              />
            </div>

            {/* PROFESSIONAL */}
            <div className="col-md-6">
              <h6 className="fw-bold">
                Professional Information
              </h6>

              <DetailRow
                label="Role"
                value={formatRole(
                  member.role
                )}
              />

              <DetailRow
                label="Licence"
                value={
                  member.licenseNumber ||
                  "Not provided"
                }
              />

              <DetailRow
                label="Specialisation"
                value={
                  member.specialization ||
                  "Not provided"
                }
              />
            </div>

            {/* ACCOUNT ACTIVITY */}
            <div className="col-md-6">
              <h6 className="fw-bold">
                Account Activity
              </h6>

              <DetailRow
                label="Last Login"
                value={formatDate(
                  member.lastLoginAt
                )}
              />

              <DetailRow
                label="Created"
                value={formatDate(
                  member.createdAt
                )}
              />

              <DetailRow
                label="Last Updated"
                value={formatDate(
                  member.updatedAt
                )}
              />
            </div>

            {/* CLINIC ACCOUNT */}
            <div className="col-md-6">
              <h6 className="fw-bold">
                Clinic Account
              </h6>

              <DetailRow
                label="User ID"
                value={member.id}
              />

              <DetailRow
                label="Clinic ID"
                value={
                  member.clinicId ||
                  "Not available"
                }
              />
            </div>

            {/* BRANCH ACCESS */}
            <div className="col-12">
              <h6 className="fw-bold d-flex align-items-center gap-2">
                <Building2 size={18} />
                Branch Access
              </h6>

              {adminAccess ? (
                <div className="alert alert-success d-flex align-items-start gap-2 mb-0">
                  <ShieldCheck
                    size={20}
                    className="flex-shrink-0"
                  />

                  <div>
                    <div className="fw-semibold">
                      All Branch Access
                    </div>

                    <small>
                      This administrator can
                      access every active branch
                      in their clinic.
                    </small>
                  </div>
                </div>
              ) : assignedBranches.length >
                0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {assignedBranches.map(
                    (branch) => (
                      <div
                        key={branch.id}
                        className="border rounded-3 px-3 py-2 d-flex align-items-center gap-2"
                      >
                        <Building2
                          size={16}
                          className="text-primary"
                        />

                        <span className="fw-semibold small">
                          {branch.name}
                        </span>

                        {branch.isMain && (
                          <span className="badge bg-primary-subtle text-primary">
                            Main
                          </span>
                        )}

                        {!branch.isActive && (
                          <span className="badge bg-secondary-subtle text-secondary">
                            Inactive
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="alert alert-warning mb-0">
                  No branches assigned to
                  this staff member.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
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

// =====================================================
// FORM SECTION
// =====================================================

function FormSection({
  title,
  children,
}) {
  return (
    <section className="mb-4">
      <h6 className="fw-bold border-bottom pb-2 mb-3">
        {title}
      </h6>

      {children}
    </section>
  );
}

// =====================================================
// FORM INPUT
// =====================================================

function FormInput({
  label,
  col = "col-12",
  ...inputProps
}) {
  return (
    <div className={col}>
      <label className="form-label">
        {label}

        {inputProps.required && (
          <span className="text-danger ms-1">
            *
          </span>
        )}
      </label>

      <input
        className="form-control"
        {...inputProps}
      />
    </div>
  );
}

// =====================================================
// FORM SELECT
// =====================================================

function FormSelect({
  label,
  options,
  col = "col-12",
  ...selectProps
}) {
  return (
    <div className={col}>
      <label className="form-label">
        {label}
      </label>

      <select
        className="form-select"
        {...selectProps}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// =====================================================
// DETAIL ROW
// =====================================================

function DetailRow({
  label,
  value,
}) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <small className="text-secondary">
        {label}
      </small>

      <small className="fw-semibold text-end text-break">
        {value}
      </small>
    </div>
  );
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({
  isActive,
}) {
  return (
    <span
      className={`badge rounded-pill ${
        isActive
          ? "bg-success-subtle text-success"
          : "bg-secondary-subtle text-secondary"
      }`}
    >
      {isActive
        ? "Active"
        : "Inactive"}
    </span>
  );
}
