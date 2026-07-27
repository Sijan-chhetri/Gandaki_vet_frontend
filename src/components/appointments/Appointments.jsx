import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  Eye,
  Filter,
  FileText,
  LoaderCircle,
  PawPrint,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";

import apiRequest from "../../services/api";
import appointmentService from "../../services/appointment.service";
import patientService from "../../services/patient.service";
import serviceService from "../../services/service.service";

const APPOINTMENT_TYPES = [
  { value: "CONSULTATION", label: "Consultation" },
  { value: "VACCINATION", label: "Vaccination" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "SURGERY", label: "Surgery" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "DIAGNOSTIC", label: "Diagnostic" },
  { value: "GROOMING", label: "Grooming" },
  { value: "OTHER", label: "Other" },
];

const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const initialFormData = {
  ownerId: "",
  petId: "",
  veterinarianId: "",
  serviceId: "",
  type: "CONSULTATION",
  scheduledDate: "",
  scheduledTime: "09:00",
  durationMin: "30",
  reason: "",
  symptoms: "",
  notes: "",
};

const initialPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

const initialStats = {
  today: {
    total: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
  },
  upcoming: 0,
  monthlyTotal: 0,
  byStatus: {},
};

function extractArray(result, keys = []) {
  const candidates = [
    result,
    result?.data,
    result?.data?.data,
    ...keys.flatMap((key) => [
      result?.[key],
      result?.data?.[key],
      result?.data?.data?.[key],
    ]),
  ];

  return (
    candidates.find((value) =>
      Array.isArray(value),
    ) || []
  );
}

function getStoredUser() {
  const candidates = [
    localStorage.getItem("user"),
    localStorage.getItem("authUser"),
    localStorage.getItem("currentUser"),
  ];

  for (const value of candidates) {
    if (!value) continue;

    try {
      const parsed = JSON.parse(value);
      return parsed?.user || parsed?.data || parsed;
    } catch {
      // Ignore malformed storage values.
    }
  }

  return null;
}

function normaliseRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase();
}

function Appointments() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser(), []);
  const currentRole = normaliseRole(currentUser?.role);
  const isDoctor = ["DOCTOR", "VETERINARIAN", "VET"].includes(currentRole);

  const [appointments, setAppointments] =
    useState([]);
  const [patients, setPatients] = useState([]);
  const [veterinarians, setVeterinarians] =
    useState([]);
  const [services, setServices] = useState([]);

  const [stats, setStats] = useState(initialStats);
  const [pagination, setPagination] =
    useState(initialPagination);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    type: "",
    date: "",
  });

  const [appliedFilters, setAppliedFilters] =
    useState(filters);

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] =
    useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState(null);

  const [formData, setFormData] =
    useState(initialFormData);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState({});

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] =
    useState(true);
  const [detailsLoading, setDetailsLoading] =
    useState(false);
  const [submitting, setSubmitting] =
    useState(false);
  const [actionLoading, setActionLoading] =
    useState("");
  const [error, setError] = useState("");

  const selectedPatient = useMemo(
    () =>
      patients.find(
        (patient) => patient.id === formData.petId,
      ) || null,
    [patients, formData.petId],
  );

  const loadAppointments = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError("");

        const query = {
          page,
          limit: pagination.limit,
          search: appliedFilters.search,
          status: appliedFilters.status,
          type: appliedFilters.type,
        };

        if (appliedFilters.date) {
          query.dateFrom = `${appliedFilters.date}T00:00:00.000`;
          query.dateTo = `${appliedFilters.date}T23:59:59.999`;
        }

        if (isDoctor && currentUser?.id) {
          query.veterinarianId = currentUser.id;
        }

        const result =
          await appointmentService.getAppointments(
            query,
          );

        const receivedAppointments = extractArray(result, [
          "appointments",
        ]);

        setAppointments(
          isDoctor && currentUser?.id
            ? receivedAppointments.filter(
                (appointment) =>
                  appointment.veterinarianId === currentUser.id ||
                  appointment.veterinarian?.id === currentUser.id,
              )
            : receivedAppointments,
        );

        setPagination({
          ...initialPagination,
          ...(result?.pagination ||
            result?.data?.pagination ||
            {}),
          page,
        });
      } catch (requestError) {
        setError(
          requestError.message ||
            "Unable to retrieve appointments.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      appliedFilters,
      pagination.limit,
      isDoctor,
      currentUser?.id,
    ],
  );

  const loadStats = useCallback(async () => {
    try {
      const result =
        await appointmentService.getAppointmentStats();

      setStats({
        ...initialStats,
        ...(result?.data || {}),
      });
    } catch (requestError) {
      console.error(
        "Unable to load appointment statistics:",
        requestError,
      );
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      setOptionsLoading(true);

      const [
        patientsResult,
        veterinariansResult,
        servicesResult,
      ] = await Promise.all([
        patientService.getPatients({
          page: 1,
          limit: 100,
          status: "ACTIVE",
        }),

        apiRequest(
          "/users?role=VETERINARIAN&isActive=true&limit=100",
        ),

        serviceService.getServices({
          page: 1,
          limit: 100,
          isActive: true,
          sortBy: "name",
          sortOrder: "asc",
        }),
      ]);

      setPatients(
        extractArray(patientsResult, [
          "patients",
          "pets",
        ]),
      );

      setVeterinarians(
        extractArray(veterinariansResult, [
          "users",
          "staff",
          "veterinarians",
        ]),
      );

      setServices(
        extractArray(servicesResult, ["services"]),
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load appointment options.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    loadStats();
  }, [loadOptions, loadStats]);

  useEffect(() => {
    loadAppointments(1);
  }, [loadAppointments]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setAppliedFilters({
      ...filters,
      search: filters.search.trim(),
    });
  }

  function clearFilters() {
    const emptyFilters = {
      search: "",
      status: "",
      type: "",
      date: "",
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => {
      const selectedService =
        name === "serviceId"
          ? services.find(
              (service) => service.id === value,
            )
          : null;

      return {
        ...previous,
        [name]: value,
        ...(name === "petId"
          ? {
              ownerId:
                patients.find(
                  (patient) => patient.id === value,
                )?.ownerId || "",
            }
          : {}),
        ...(selectedService?.durationMin
          ? {
              durationMin: String(
                selectedService.durationMin,
              ),
            }
          : {}),
      };
    });

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setFormError("");
  }

  function openAddForm() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);

    setEditingAppointment(null);
    setFormData({
      ...initialFormData,
      scheduledDate: date,
    });
    setFieldErrors({});
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(appointment) {
    const scheduledAt = new Date(
      appointment.scheduledAt,
    );

    setEditingAppointment(appointment);
    setFormData({
      ownerId: appointment.ownerId || "",
      petId: appointment.petId || "",
      veterinarianId:
        appointment.veterinarianId || "",
      serviceId: appointment.serviceId || "",
      type:
        appointment.type || "CONSULTATION",
      scheduledDate: formatDateInput(
        scheduledAt,
      ),
      scheduledTime: formatTimeInput(
        scheduledAt,
      ),
      durationMin: String(
        appointment.durationMin || 30,
      ),
      reason: appointment.reason || "",
      symptoms: appointment.symptoms || "",
      notes: appointment.notes || "",
    });
    setFieldErrors({});
    setFormError("");
    setShowDetails(false);
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;

    setShowForm(false);
    setEditingAppointment(null);
    setFormData(initialFormData);
    setFieldErrors({});
    setFormError("");
  }

  function validateForm() {
    const errors = {};

    if (!formData.petId) {
      errors.petId = "Please select a patient.";
    }

    if (!formData.ownerId) {
      errors.ownerId =
        "The selected patient has no owner.";
    }

    if (!formData.type) {
      errors.type =
        "Appointment type is required.";
    }

    if (
      !formData.scheduledDate ||
      !formData.scheduledTime
    ) {
      errors.scheduledAt =
        "Appointment date and time are required.";
    }

    const duration = Number(
      formData.durationMin,
    );

    if (
      !Number.isInteger(duration) ||
      duration < 5 ||
      duration > 480
    ) {
      errors.durationMin =
        "Duration must be between 5 and 480 minutes.";
    }

    return errors;
  }

  function createPayload() {
    const scheduledAt = new Date(
      `${formData.scheduledDate}T${formData.scheduledTime}:00`,
    );

    return {
      ownerId: formData.ownerId,
      petId: formData.petId,
      veterinarianId:
        formData.veterinarianId || null,
      serviceId: formData.serviceId || null,
      type: formData.type,
      scheduledAt: scheduledAt.toISOString(),
      durationMin: Number(
        formData.durationMin,
      ),
      reason: formData.reason.trim() || null,
      symptoms:
        formData.symptoms.trim() || null,
      notes: formData.notes.trim() || null,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validateForm();

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setFormError(
        "Please correct the highlighted fields.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      setFieldErrors({});

      const payload = createPayload();

      if (editingAppointment) {
        await appointmentService.updateAppointment(
          editingAppointment.id,
          payload,
        );
      } else {
        await appointmentService.createAppointment(
          payload,
        );
      }

      closeForm();

      await Promise.all([
        loadAppointments(
          editingAppointment
            ? pagination.page
            : 1,
        ),
        loadStats(),
      ]);
    } catch (requestError) {
      setFormError(
        requestError.message ||
          "Unable to save appointment.",
      );

      setFieldErrors(
        requestError.errors || {},
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openAppointmentDetails(
    appointment,
  ) {
    try {
      setDetailsLoading(true);
      setError("");
      setSelectedAppointment(appointment);
      setShowDetails(true);

      const result =
        await appointmentService.getAppointmentById(
          appointment.id,
        );

      setSelectedAppointment(
        result?.data || appointment,
      );
    } catch (requestError) {
      setShowDetails(false);
      setError(
        requestError.message ||
          "Unable to retrieve appointment.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function updateStatus(
    appointment,
    status,
  ) {
    try {
      setActionLoading(
        `${appointment.id}:${status}`,
      );
      setError("");

      const result =
        await appointmentService.updateAppointmentStatus(
          appointment.id,
          status,
        );

      const updated =
        result?.data || {
          ...appointment,
          status,
        };

      setSelectedAppointment(updated);

      await Promise.all([
        loadAppointments(pagination.page),
        loadStats(),
      ]);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to update appointment status.",
      );
    } finally {
      setActionLoading("");
    }
  }

  async function cancelAppointment(
    appointment,
  ) {
    const reason = window.prompt(
      "Enter the cancellation reason:",
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError(
        "Cancellation reason is required.",
      );
      return;
    }

    try {
      setActionLoading(
        `${appointment.id}:CANCELLED`,
      );
      setError("");

      const result =
        await appointmentService.cancelAppointment(
          appointment.id,
          reason.trim(),
        );

      setSelectedAppointment(
        result?.data || {
          ...appointment,
          status: "CANCELLED",
        },
      );

      await Promise.all([
        loadAppointments(pagination.page),
        loadStats(),
      ]);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to cancel appointment.",
      );
    } finally {
      setActionLoading("");
    }
  }

  async function deleteAppointment(
    appointment,
  ) {
    const confirmed = window.confirm(
      `Delete appointment ${appointment.appointmentNo}?`,
    );

    if (!confirmed) return;

    try {
      setActionLoading(
        `${appointment.id}:DELETE`,
      );
      setError("");

      await appointmentService.deleteAppointment(
        appointment.id,
      );

      setShowDetails(false);
      setSelectedAppointment(null);

      await Promise.all([
        loadAppointments(pagination.page),
        loadStats(),
      ]);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to delete appointment.",
      );
    } finally {
      setActionLoading("");
    }
  }

  function openPrescription(appointment) {
    navigate(`/prescriptions/new/${appointment.id}`, {
      state: { appointment },
    });
  }

  function exportVisibleAppointments() {
    const rows = [
      [
        "Appointment No",
        "Date and Time",
        "Patient",
        "Owner",
        "Phone",
        "Type",
        "Service",
        "Veterinarian",
        "Status",
        "Reason",
      ],
      ...appointments.map((appointment) => [
        appointment.appointmentNo,
        appointment.scheduledAt,
        appointment.pet?.name || "",
        getOwnerName(appointment.owner),
        appointment.owner?.phone || "",
        appointment.type,
        appointment.service?.name || "",
        getUserName(
          appointment.veterinarian,
        ),
        appointment.status,
        appointment.reason || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replaceAll(
              '"',
              '""',
            )}"`,
          )
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `appointments-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            {isDoctor ? "My Appointments" : "Appointments"}
          </h3>

          <p className="text-secondary mb-0">
            {isDoctor
              ? "View your assigned patients, manage visits and create prescriptions."
              : "Schedule consultations, assign veterinarians and manage clinic visits."}
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={() =>
              loadAppointments(pagination.page)
            }
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading ? "spin-icon" : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={exportVisibleAppointments}
            disabled={!appointments.length}
          >
            <Download size={17} />
            Export
          </button>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={openAddForm}
            disabled={optionsLoading}
          >
            <Plus size={18} />
            New Appointment
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={19} />
            <span>{error}</span>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
            aria-label="Close"
          />
        </div>
      )}

      <div className="row g-3 mb-4">
        <SummaryCard
          title="Today"
          value={stats.today?.total || 0}
          icon={Clock3}
          iconClass="bg-info-subtle text-info-emphasis"
        />

        <SummaryCard
          title="Upcoming"
          value={stats.upcoming || 0}
          icon={CalendarDays}
          iconClass="bg-primary-subtle text-primary"
        />

        <SummaryCard
          title="Completed Today"
          value={
            stats.today?.completed || 0
          }
          icon={CheckCircle2}
          iconClass="bg-success-subtle text-success"
        />

        <SummaryCard
          title="Monthly Total"
          value={stats.monthlyTotal || 0}
          icon={Stethoscope}
          iconClass="bg-warning-subtle text-warning-emphasis"
        />
      </div>

      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          <form
            className="row g-2 mb-4"
            onSubmit={applyFilters}
          >
            <div className="col-12 col-xl">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={18} />
                </span>

                <input
                  type="search"
                  className="form-control border-start-0"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search appointment, patient, owner or phone"
                />
              </div>
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-2">
              <input
                type="date"
                className="form-control"
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
              />
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-2">
              <select
                className="form-select"
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
              >
                <option value="">
                  All types
                </option>

                {APPOINTMENT_TYPES.map(
                  (type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-2">
              <select
                className="form-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">
                  All statuses
                </option>

                {APPOINTMENT_STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {formatEnum(status)}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="col-sm-6 col-lg-auto">
              <button
                type="submit"
                className="btn btn-primary w-100"
              >
                Search
              </button>
            </div>

            <div className="col-sm-6 col-lg-auto">
              <button
                type="button"
                className="btn btn-light border w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={clearFilters}
              >
                <Filter size={16} />
                Clear
              </button>
            </div>
          </form>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <small className="text-secondary">
              Showing {appointments.length} of{" "}
              {pagination.total} appointments
            </small>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Date & Time</th>
                  <th>Patient</th>
                  <th>Owner</th>
                  <th>Type / Service</th>
                  <th>Veterinarian</th>
                  <th>Status</th>
                  <th className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-5"
                    >
                      <LoaderCircle
                        size={32}
                        className="spin-icon text-primary mb-3"
                      />

                      <div className="text-secondary">
                        Loading appointments...
                      </div>
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-5"
                    >
                      <CalendarDays
                        size={44}
                        className="text-secondary mb-3"
                      />

                      <h6 className="fw-semibold">
                        No appointments found
                      </h6>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={openAddForm}
                      >
                        New Appointment
                      </button>
                    </td>
                  </tr>
                ) : (
                  appointments.map(
                    (appointment) => (
                      <tr key={appointment.id}>
                        <td>
                          <div className="fw-semibold small">
                            {formatDateTime(
                              appointment.scheduledAt,
                            )}
                          </div>

                          <small className="text-secondary">
                            {appointment.durationMin} min
                          </small>
                        </td>

                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{
                                width: 38,
                                height: 38,
                              }}
                            >
                              <PawPrint size={17} />
                            </div>

                            <div>
                              <div className="fw-semibold small">
                                {appointment.pet?.name ||
                                  "—"}
                              </div>

                              <small className="text-secondary">
                                {appointment.pet
                                  ?.species?.name ||
                                  "—"}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="small fw-semibold">
                            {getOwnerName(
                              appointment.owner,
                            )}
                          </div>

                          <small className="text-secondary">
                            {appointment.owner?.phone ||
                              "—"}
                          </small>
                        </td>

                        <td>
                          <div className="small fw-semibold">
                            {formatEnum(
                              appointment.type,
                            )}
                          </div>

                          <small className="text-secondary">
                            {appointment.service
                              ?.name || "No service"}
                          </small>
                        </td>

                        <td>
                          <div className="small d-flex align-items-center gap-2">
                            <UserRound size={15} />
                            {getUserName(
                              appointment.veterinarian,
                            ) ||
                              "Unassigned"}
                          </div>
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              appointment.status
                            }
                          />
                        </td>

                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="View appointment"
                              onClick={() =>
                                openAppointmentDetails(
                                  appointment,
                                )
                              }
                            >
                              <Eye size={16} />
                            </button>

                            {isDoctor && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success d-flex align-items-center gap-1"
                                title="Create prescription"
                                onClick={() =>
                                  openPrescription(appointment)
                                }
                              >
                                <FileText size={16} />
                                <span className="d-none d-xxl-inline">
                                  Prescription
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="Edit appointment"
                              onClick={() =>
                                openEditForm(
                                  appointment,
                                )
                              }
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              title="Delete appointment"
                              disabled={
                                actionLoading ===
                                `${appointment.id}:DELETE`
                              }
                              onClick={() =>
                                deleteAppointment(
                                  appointment,
                                )
                              }
                            >
                              {actionLoading ===
                              `${appointment.id}:DELETE` ? (
                                <LoaderCircle
                                  size={16}
                                  className="spin-icon"
                                />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {!loading &&
            pagination.totalPages > 1 && (
              <Pagination
                pagination={pagination}
                onPageChange={loadAppointments}
              />
            )}
        </div>
      </section>

      {showForm && (
        <AppointmentFormModal
          editing={Boolean(editingAppointment)}
          formData={formData}
          patients={patients}
          veterinarians={veterinarians}
          services={services}
          selectedPatient={selectedPatient}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {showDetails && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          loading={detailsLoading}
          actionLoading={actionLoading}
          onClose={() => {
            setShowDetails(false);
            setSelectedAppointment(null);
          }}
          onEdit={() =>
            openEditForm(selectedAppointment)
          }
          onStatusChange={(status) =>
            updateStatus(
              selectedAppointment,
              status,
            )
          }
          onCancel={() =>
            cancelAppointment(
              selectedAppointment,
            )
          }
          canPrescribe={isDoctor}
          onPrescription={() =>
            openPrescription(selectedAppointment)
          }
        />
      )}

      <style>{`
        .spin-icon {
          animation: appointments-spin 0.9s linear infinite;
        }

        @keyframes appointments-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function AppointmentFormModal({
  editing,
  formData,
  patients,
  veterinarians,
  services,
  selectedPatient,
  fieldErrors,
  formError,
  submitting,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <ModalShell
      title={
        editing
          ? "Edit Appointment"
          : "Schedule Appointment"
      }
      subtitle="Select the patient, appointment type, veterinarian and time."
      onClose={onClose}
      size="modal-xl"
    >
      <form
        onSubmit={onSubmit}
        className="d-flex flex-column flex-grow-1 overflow-hidden"
      >
        <div className="modal-body overflow-auto">
          {formError && (
            <div className="alert alert-danger">
              {formError}
            </div>
          )}

          <FormSection title="Patient and owner">
            <div className="row g-3">
              <FormSelect
                label="Patient"
                name="petId"
                value={formData.petId}
                onChange={onChange}
                error={fieldErrors.petId}
                required
                col="col-md-6"
              >
                <option value="">
                  Select patient
                </option>

                {patients.map((patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.name} —{" "}
                    {patient.species?.name ||
                      "Unknown species"} —{" "}
                    {getOwnerName(patient.owner)}
                  </option>
                ))}
              </FormSelect>

              <FormInput
                label="Owner"
                value={getOwnerName(
                  selectedPatient?.owner,
                )}
                readOnly
                col="col-md-3"
              />

              <FormInput
                label="Phone"
                value={
                  selectedPatient?.owner?.phone || ""
                }
                readOnly
                col="col-md-3"
              />
            </div>
          </FormSection>

          <FormSection title="Appointment schedule">
            <div className="row g-3">
              <FormSelect
                label="Appointment type"
                name="type"
                value={formData.type}
                onChange={onChange}
                error={fieldErrors.type}
                required
                col="col-md-4"
              >
                {APPOINTMENT_TYPES.map(
                  (type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ),
                )}
              </FormSelect>

              <FormInput
                label="Date"
                name="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={onChange}
                error={fieldErrors.scheduledAt}
                required
                col="col-md-3"
              />

              <FormInput
                label="Time"
                name="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={onChange}
                error={fieldErrors.scheduledAt}
                required
                col="col-md-2"
              />

              <FormInput
                label="Duration"
                name="durationMin"
                type="number"
                min="5"
                max="480"
                step="5"
                value={formData.durationMin}
                onChange={onChange}
                error={fieldErrors.durationMin}
                required
                col="col-md-3"
              />

              <FormSelect
                label="Veterinarian"
                name="veterinarianId"
                value={formData.veterinarianId}
                onChange={onChange}
                col="col-md-6"
              >
                <option value="">
                  Unassigned
                </option>

                {veterinarians.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {getUserName(user)}
                    {user.specialization
                      ? ` — ${user.specialization}`
                      : ""}
                  </option>
                ))}
              </FormSelect>

              <FormSelect
                label="Service"
                name="serviceId"
                value={formData.serviceId}
                onChange={onChange}
                col="col-md-6"
              >
                <option value="">
                  No service selected
                </option>

                {services.map((service) => (
                  <option
                    key={service.id}
                    value={service.id}
                  >
                    {service.name}
                    {service.durationMin
                      ? ` — ${service.durationMin} min`
                      : ""}
                  </option>
                ))}
              </FormSelect>
            </div>
          </FormSection>

          <FormSection title="Clinical details">
            <div className="row g-3">
              <FormTextarea
                label="Reason"
                name="reason"
                value={formData.reason}
                onChange={onChange}
                col="col-md-6"
                rows="3"
              />

              <FormTextarea
                label="Symptoms"
                name="symptoms"
                value={formData.symptoms}
                onChange={onChange}
                col="col-md-6"
                rows="3"
              />

              <FormTextarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={onChange}
                col="col-12"
                rows="3"
              />
            </div>
          </FormSection>
        </div>

        <div className="modal-footer bg-white flex-shrink-0">
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary d-flex align-items-center gap-2"
            disabled={submitting}
          >
            {submitting && (
              <LoaderCircle
                size={17}
                className="spin-icon"
              />
            )}

            {editing
              ? "Save Changes"
              : "Schedule Appointment"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function AppointmentDetailsModal({
  appointment,
  loading,
  actionLoading,
  onClose,
  onEdit,
  onStatusChange,
  onCancel,
  canPrescribe,
  onPrescription,
}) {
  const actions = getAvailableActions(
    appointment?.status,
  );

  return (
    <ModalShell
      title="Appointment Details"
      subtitle={
        appointment?.appointmentNo ||
        "Appointment information"
      }
      onClose={onClose}
      size="modal-lg"
    >
      <div className="modal-body overflow-auto">
        {loading || !appointment ? (
          <div className="text-center py-5">
            <LoaderCircle
              size={34}
              className="spin-icon text-primary mb-3"
            />
            <div className="text-secondary">
              Loading appointment...
            </div>
          </div>
        ) : (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
              <StatusBadge
                status={appointment.status}
              />

              <span className="badge rounded-pill bg-light text-dark">
                {formatEnum(appointment.type)}
              </span>
            </div>

            <div className="row g-4">
              <div className="col-md-6">
                <DetailSection title="Schedule">
                  <DetailRow
                    label="Date and time"
                    value={formatDateTime(
                      appointment.scheduledAt,
                    )}
                  />

                  <DetailRow
                    label="Duration"
                    value={`${appointment.durationMin} minutes`}
                  />

                  <DetailRow
                    label="Veterinarian"
                    value={
                      getUserName(
                        appointment.veterinarian,
                      ) || "Unassigned"
                    }
                  />

                  <DetailRow
                    label="Service"
                    value={
                      appointment.service?.name ||
                      "No service"
                    }
                  />
                </DetailSection>
              </div>

              <div className="col-md-6">
                <DetailSection title="Patient and owner">
                  <DetailRow
                    label="Patient"
                    value={
                      appointment.pet?.name || "—"
                    }
                  />

                  <DetailRow
                    label="Species"
                    value={
                      appointment.pet?.species?.name ||
                      "—"
                    }
                  />

                  <DetailRow
                    label="Owner"
                    value={getOwnerName(
                      appointment.owner,
                    )}
                  />

                  <DetailRow
                    label="Phone"
                    value={
                      appointment.owner?.phone || "—"
                    }
                  />
                </DetailSection>
              </div>
            </div>

            <DetailSection title="Clinical details">
              <DetailRow
                label="Reason"
                value={appointment.reason || "—"}
              />

              <DetailRow
                label="Symptoms"
                value={appointment.symptoms || "—"}
              />

              <DetailRow
                label="Notes"
                value={appointment.notes || "—"}
              />

              {appointment.cancellationReason && (
                <DetailRow
                  label="Cancellation reason"
                  value={
                    appointment.cancellationReason
                  }
                />
              )}
            </DetailSection>

            {actions.length > 0 && (
              <DetailSection title="Actions">
                <div className="d-flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      className={action.className}
                      disabled={
                        actionLoading ===
                        `${appointment.id}:${action.status}`
                      }
                      onClick={() =>
                        action.status === "CANCELLED"
                          ? onCancel()
                          : onStatusChange(
                              action.status,
                            )
                      }
                    >
                      {actionLoading ===
                      `${appointment.id}:${action.status}` ? (
                        <LoaderCircle
                          size={15}
                          className="spin-icon"
                        />
                      ) : (
                        action.label
                      )}
                    </button>
                  ))}
                </div>
              </DetailSection>
            )}
          </>
        )}
      </div>

      <div className="modal-footer bg-white flex-shrink-0">
        <button
          type="button"
          className="btn btn-light border"
          onClick={onClose}
        >
          Close
        </button>

        {appointment && canPrescribe && (
          <button
            type="button"
            className="btn btn-success d-flex align-items-center gap-2"
            onClick={onPrescription}
          >
            <FileText size={16} />
            Prescription
          </button>
        )}

        {appointment &&
          ![
            "COMPLETED",
            "CANCELLED",
            "NO_SHOW",
          ].includes(appointment.status) && (
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={onEdit}
            >
              <Edit3 size={16} />
              Edit Appointment
            </button>
          )}
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  subtitle,
  size = "modal-lg",
  onClose,
  children,
}) {
  return (
    <>
      <div
        className="modal show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{
          zIndex: 1060,
          overflowY: "hidden",
        }}
      >
        <div
          className={`modal-dialog modal-dialog-centered ${size}`}
          style={{
            height: "calc(100vh - 32px)",
            marginTop: 16,
            marginBottom: 16,
          }}
        >
          <div
            className="modal-content border-0 shadow-lg rounded-4 overflow-hidden"
            style={{
              maxHeight: "100%",
            }}
          >
            <div className="modal-header bg-white flex-shrink-0">
              <div>
                <h5 className="modal-title fw-bold mb-1">
                  {title}
                </h5>

                {subtitle && (
                  <p className="text-secondary small mb-0">
                    {subtitle}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            {children}
          </div>
        </div>
      </div>

      <div
        className="modal-backdrop show"
        style={{ zIndex: 1055 }}
      />
    </>
  );
}

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

function FormSection({ title, children }) {
  return (
    <section className="mb-4">
      <h6 className="fw-bold border-bottom pb-2 mb-3">
        {title}
      </h6>
      {children}
    </section>
  );
}

function FormInput({
  label,
  error,
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
        className={`form-control ${
          error ? "is-invalid" : ""
        }`}
        {...inputProps}
      />

      {error && (
        <div className="invalid-feedback">
          {Array.isArray(error)
            ? error[0]
            : error}
        </div>
      )}
    </div>
  );
}

function FormSelect({
  label,
  error,
  col = "col-12",
  children,
  ...selectProps
}) {
  return (
    <div className={col}>
      <label className="form-label">
        {label}
        {selectProps.required && (
          <span className="text-danger ms-1">
            *
          </span>
        )}
      </label>

      <select
        className={`form-select ${
          error ? "is-invalid" : ""
        }`}
        {...selectProps}
      >
        {children}
      </select>

      {error && (
        <div className="invalid-feedback">
          {Array.isArray(error)
            ? error[0]
            : error}
        </div>
      )}
    </div>
  );
}

function FormTextarea({
  label,
  col = "col-12",
  ...textareaProps
}) {
  return (
    <div className={col}>
      <label className="form-label">
        {label}
      </label>

      <textarea
        className="form-control"
        {...textareaProps}
      />
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="mb-4">
      <h6 className="fw-bold mb-3">
        {title}
      </h6>
      <div className="border rounded-4 p-3">
        {children}
      </div>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <small className="text-secondary">
        {label}
      </small>

      <small className="fw-semibold text-end">
        {value || "—"}
      </small>
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    SCHEDULED:
      "bg-secondary-subtle text-secondary",
    CONFIRMED:
      "bg-primary-subtle text-primary",
    CHECKED_IN:
      "bg-warning-subtle text-warning-emphasis",
    IN_PROGRESS:
      "bg-info-subtle text-info-emphasis",
    COMPLETED:
      "bg-success-subtle text-success",
    CANCELLED:
      "bg-danger-subtle text-danger",
    NO_SHOW:
      "bg-dark-subtle text-dark",
  };

  return (
    <span
      className={`badge rounded-pill ${
        classes[status] ||
        "bg-light text-secondary"
      }`}
    >
      {formatEnum(status)}
    </span>
  );
}

function Pagination({
  pagination,
  onPageChange,
}) {
  return (
    <div className="d-flex justify-content-between align-items-center mt-4">
      <button
        type="button"
        className="btn btn-sm btn-light border"
        disabled={pagination.page <= 1}
        onClick={() =>
          onPageChange(pagination.page - 1)
        }
      >
        Previous
      </button>

      <small className="text-secondary">
        Page {pagination.page} of{" "}
        {pagination.totalPages}
      </small>

      <button
        type="button"
        className="btn btn-sm btn-light border"
        disabled={
          pagination.page >=
          pagination.totalPages
        }
        onClick={() =>
          onPageChange(pagination.page + 1)
        }
      >
        Next
      </button>
    </div>
  );
}

function getAvailableActions(status) {
  const actions = {
    SCHEDULED: [
      {
        status: "CONFIRMED",
        label: "Confirm",
        className:
          "btn btn-outline-primary btn-sm",
      },
      {
        status: "CHECKED_IN",
        label: "Check in",
        className:
          "btn btn-outline-warning btn-sm",
      },
      {
        status: "NO_SHOW",
        label: "No show",
        className:
          "btn btn-outline-dark btn-sm",
      },
      {
        status: "CANCELLED",
        label: "Cancel",
        className:
          "btn btn-outline-danger btn-sm",
      },
    ],

    CONFIRMED: [
      {
        status: "CHECKED_IN",
        label: "Check in",
        className:
          "btn btn-outline-warning btn-sm",
      },
      {
        status: "NO_SHOW",
        label: "No show",
        className:
          "btn btn-outline-dark btn-sm",
      },
      {
        status: "CANCELLED",
        label: "Cancel",
        className:
          "btn btn-outline-danger btn-sm",
      },
    ],

    CHECKED_IN: [
      {
        status: "IN_PROGRESS",
        label: "Start visit",
        className:
          "btn btn-outline-info btn-sm",
      },
      {
        status: "NO_SHOW",
        label: "No show",
        className:
          "btn btn-outline-dark btn-sm",
      },
      {
        status: "CANCELLED",
        label: "Cancel",
        className:
          "btn btn-outline-danger btn-sm",
      },
    ],

    IN_PROGRESS: [
      {
        status: "COMPLETED",
        label: "Complete",
        className:
          "btn btn-outline-success btn-sm",
      },
      {
        status: "CANCELLED",
        label: "Cancel",
        className:
          "btn btn-outline-danger btn-sm",
      },
    ],
  };

  return actions[status] || [];
}

function getOwnerName(owner) {
  if (!owner) return "";

  return [owner.firstName, owner.lastName]
    .filter(Boolean)
    .join(" ");
}

function getUserName(user) {
  if (!user) return "";

  return [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ");
}

function formatEnum(value) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

function formatDateTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateInput(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(
    date.getTime() - offset * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
}

function formatTimeInput(value) {
  const date = new Date(value);

  return `${String(date.getHours()).padStart(
    2,
    "0",
  )}:${String(date.getMinutes()).padStart(
    2,
    "0",
  )}`;
}

export default Appointments;
