import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Package,
  PawPrint,
  RefreshCw,
  Stethoscope,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import dashboardService from "../../services/dashboard.service";
import "./Dashboard.css";

const EMPTY_DASHBOARD = {
  filter: {
    period: "monthly",
    startDate: null,
    endDate: null,
  },

  overview: {
    owners: {
      total: 0,
      active: 0,
    },

    pets: {
      total: 0,
      active: 0,
    },

    staff: {
      total: 0,
      activeVeterinarians: 0,
    },

    appointments: {
      today: 0,
      upcoming: 0,
      periodTotal: 0,
      completedInPeriod: 0,
      hospitalized: 0,
      followUp: 0,
    },

    finance: {
      invoices: {
        total: 0,
        paid: 0,
        unpaid: 0,
      },

      payments: {
        totalTransactions: 0,
        revenue: 0,
      },
    },

    inventory: {
      lowStockItems: 0,
      expiringBatches: 0,
    },
  },

  appointmentStatus: {},
  recentAppointments: [],
  recentPayments: [],
};

const APPOINTMENT_STATUS_LABELS = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
  HOSPITALIZED: "Hospitalized",
  DISCHARGED: "Discharged",
};

const APPOINTMENT_STATUS_CLASSES = {
  SCHEDULED: "bg-primary-subtle text-primary",
  CONFIRMED: "bg-info-subtle text-info-emphasis",
  CHECKED_IN: "bg-warning-subtle text-warning-emphasis",
  IN_PROGRESS: "bg-secondary-subtle text-secondary-emphasis",
  COMPLETED: "bg-success-subtle text-success",
  CANCELLED: "bg-danger-subtle text-danger",
  NO_SHOW: "bg-dark-subtle text-dark",
  HOSPITALIZED: "bg-danger-subtle text-danger",
  DISCHARGED: "bg-success-subtle text-success",
};

const PAYMENT_STATUS_CLASSES = {
  PAID: "bg-success-subtle text-success",
  PARTIALLY_PAID:
    "bg-warning-subtle text-warning-emphasis",
  ISSUED: "bg-primary-subtle text-primary",
  OVERDUE: "bg-danger-subtle text-danger",
  DRAFT: "bg-secondary-subtle text-secondary",
  VOID: "bg-dark-subtle text-dark",
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 17) {
    return "Good Afternoon";
  }

  return "Good Evening";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-GB").format(
    Number(value || 0),
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value, options = {}) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDuration(minutes) {
  const duration = Number(minutes || 0);

  if (!duration) {
    return "Duration unavailable";
  }

  if (duration < 60) {
    return `${duration} min`;
  }

  const hours = Math.floor(duration / 60);
  const remainingMinutes = duration % 60;

  if (!remainingMinutes) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function formatFullName(person) {
  if (!person) {
    return "Unknown";
  }

  const name = [
    person.firstName,
    person.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unknown";
}

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return (
    APPOINTMENT_STATUS_LABELS[status] ||
    status
      .toLowerCase()
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1),
      )
      .join(" ")
  );
}

function getMonthApiDate(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getYearApiDate(date) {
  return `${date.getFullYear()}-01-01`;
}

function getApiDate(date, period) {
  return period === "yearly"
    ? getYearApiDate(date)
    : getMonthApiDate(date);
}

function formatSelectedPeriod(date, period) {
  if (period === "yearly") {
    return String(date.getFullYear());
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getDateInputValue(date, period) {
  const year = date.getFullYear();

  if (period === "yearly") {
    return String(year);
  }

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  return `${year}-${month}`;
}

function calculatePercentage(part, total) {
  const safeTotal = Number(total || 0);
  const safePart = Number(part || 0);

  if (safeTotal <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((safePart / safeTotal) * 100),
  );
}

function escapeCsvValue(value) {
  const text = String(value ?? "");

  return `"${text.replaceAll('"', '""')}"`;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "primary",
  trend,
}) {
  return (
    <div className="col-sm-6 col-xl-3">
      <article
        className={`dashboard-metric-card dashboard-metric-${tone}`}
      >
        <div className="dashboard-metric-decoration" />

        <div className="dashboard-metric-content">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <p className="dashboard-metric-title">
                {title}
              </p>

              <h2 className="dashboard-metric-value">
                {value}
              </h2>
            </div>

            <div className="dashboard-metric-icon">
              <Icon size={22} />
            </div>
          </div>

          <div className="dashboard-metric-footer">
            <span>{subtitle}</span>

            {trend && (
              <span className="dashboard-metric-trend">
                {trend}
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function ProgressItem({
  label,
  value,
  total,
  className = "bg-primary",
}) {
  const percentage = calculatePercentage(
    value,
    total,
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <span className="fw-semibold">
            {label}
          </span>

          <small className="text-secondary ms-2">
            {formatNumber(value)}
          </small>
        </div>

        <small className="fw-semibold">
          {percentage}%
        </small>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin="0"
        aria-valuemax="100"
        style={{ height: "8px" }}
      >
        <div
          className={`progress-bar ${className}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function DashboardSectionHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  tone = "primary",
}) {
  return (
    <div className="dashboard-section-header">
      <div className="d-flex align-items-center gap-3">
        <div
          className={`dashboard-section-icon dashboard-section-icon-${tone}`}
        >
          <Icon size={19} />
        </div>

        <div>
          <h5 className="fw-bold mb-1">
            {title}
          </h5>

          <small className="text-secondary">
            {subtitle}
          </small>
        </div>
      </div>

      {badge !== undefined && (
        <span className="dashboard-section-badge">
          {badge}
        </span>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center py-5"
      style={{ minHeight: "420px" }}
    >
      <div
        className="spinner-border text-primary"
        role="status"
      >
        <span className="visually-hidden">
          Loading dashboard
        </span>
      </div>

      <p className="text-secondary mt-3 mb-0">
        Loading dashboard information...
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon = FileText,
  title,
  message,
}) {
  return (
    <div className="text-center py-5">
      <div
        className="bg-light border rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
        style={{
          width: "58px",
          height: "58px",
        }}
      >
        <Icon
          size={24}
          className="text-secondary"
        />
      </div>

      <h6 className="fw-bold">{title}</h6>

      <p className="text-secondary small mb-0">
        {message}
      </p>
    </div>
  );
}

function Dashboard() {
  const [filterType, setFilterType] =
    useState("monthly");

  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const [dashboard, setDashboard] =
    useState(EMPTY_DASHBOARD);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [openAppointment, setOpenAppointment] =
    useState(null);

  const periodLabel =
    filterType === "monthly"
      ? "month"
      : "year";

  const selectedPeriodLabel = useMemo(
    () =>
      formatSelectedPeriod(
        selectedDate,
        filterType,
      ),
    [selectedDate, filterType],
  );

  const overview =
    dashboard?.overview ||
    EMPTY_DASHBOARD.overview;

  const appointments =
    overview.appointments ||
    EMPTY_DASHBOARD.overview.appointments;

  const owners =
    overview.owners ||
    EMPTY_DASHBOARD.overview.owners;

  const pets =
    overview.pets ||
    EMPTY_DASHBOARD.overview.pets;

  const staff =
    overview.staff ||
    EMPTY_DASHBOARD.overview.staff;

  const finance =
    overview.finance ||
    EMPTY_DASHBOARD.overview.finance;

  const inventory =
    overview.inventory ||
    EMPTY_DASHBOARD.overview.inventory;

  const recentAppointments =
    Array.isArray(
      dashboard?.recentAppointments,
    )
      ? dashboard.recentAppointments
      : [];

  const recentPayments =
    Array.isArray(
      dashboard?.recentPayments,
    )
      ? dashboard.recentPayments
      : [];

  const appointmentStatuses =
    dashboard?.appointmentStatus &&
    typeof dashboard.appointmentStatus ===
      "object"
      ? dashboard.appointmentStatus
      : {};

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response =
          await dashboardService.getDashboard({
            period: filterType,
            date: getApiDate(
              selectedDate,
              filterType,
            ),
          });

        const responseData =
          response?.data &&
          typeof response.data === "object"
            ? response.data
            : response;

        setDashboard({
          ...EMPTY_DASHBOARD,
          ...(responseData || {}),
          overview: {
            ...EMPTY_DASHBOARD.overview,
            ...(responseData?.overview || {}),
            owners: {
              ...EMPTY_DASHBOARD.overview
                .owners,
              ...(responseData?.overview
                ?.owners || {}),
            },
            pets: {
              ...EMPTY_DASHBOARD.overview.pets,
              ...(responseData?.overview
                ?.pets || {}),
            },
            staff: {
              ...EMPTY_DASHBOARD.overview
                .staff,
              ...(responseData?.overview
                ?.staff || {}),
            },
            appointments: {
              ...EMPTY_DASHBOARD.overview
                .appointments,
              ...(responseData?.overview
                ?.appointments || {}),
            },
            finance: {
              ...EMPTY_DASHBOARD.overview
                .finance,
              ...(responseData?.overview
                ?.finance || {}),
              invoices: {
                ...EMPTY_DASHBOARD.overview
                  .finance.invoices,
                ...(responseData?.overview
                  ?.finance?.invoices || {}),
              },
              payments: {
                ...EMPTY_DASHBOARD.overview
                  .finance.payments,
                ...(responseData?.overview
                  ?.finance?.payments || {}),
              },
            },
            inventory: {
              ...EMPTY_DASHBOARD.overview
                .inventory,
              ...(responseData?.overview
                ?.inventory || {}),
            },
          },
          appointmentStatus:
            responseData?.appointmentStatus ||
            {},
          recentAppointments:
            Array.isArray(
              responseData?.recentAppointments,
            )
              ? responseData.recentAppointments
              : [],
          recentPayments:
            Array.isArray(
              responseData?.recentPayments,
            )
              ? responseData.recentPayments
              : [],
        });
      } catch (requestError) {
        console.error(
          "Unable to load dashboard:",
          requestError,
        );

        setError(
          requestError.message ||
            "Unable to load dashboard information.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterType, selectedDate],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function changePeriod(direction) {
    setSelectedDate((previousDate) => {
      const nextDate = new Date(
        previousDate,
      );

      if (filterType === "monthly") {
        nextDate.setMonth(
          nextDate.getMonth() + direction,
        );
      } else {
        nextDate.setFullYear(
          nextDate.getFullYear() + direction,
        );
      }

      return nextDate;
    });
  }

  function handleFilterChange(event) {
    const nextFilter = event.target.value;

    setFilterType(nextFilter);

    setSelectedDate((currentDate) => {
      const nextDate = new Date(currentDate);

      if (nextFilter === "yearly") {
        nextDate.setMonth(0, 1);
      }

      return nextDate;
    });
  }

  function handleDateChange(event) {
    const value = event.target.value;

    if (!value) {
      return;
    }

    if (filterType === "monthly") {
      const [year, month] = value.split("-");

      setSelectedDate(
        new Date(
          Number(year),
          Number(month) - 1,
          1,
        ),
      );

      return;
    }

    const year = Number(value);

    if (
      Number.isNaN(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return;
    }

    setSelectedDate(
      new Date(year, 0, 1),
    );
  }

  function handleExport() {
    const rows = [
      ["Pokhara Pet Hospital Dashboard"],
      ["Period", selectedPeriodLabel],
      [],
      ["Overview"],
      ["Metric", "Value"],
      ["Total owners", owners.total],
      ["Active owners", owners.active],
      ["Total pets", pets.total],
      ["Active pets", pets.active],
      ["Total staff", staff.total],
      [
        "Active veterinarians",
        staff.activeVeterinarians,
      ],
      [
        "Today's appointments",
        appointments.today,
      ],
      [
        "Upcoming appointments",
        appointments.upcoming,
      ],
      [
        "Period appointments",
        appointments.periodTotal,
      ],
      [
        "Completed appointments",
        appointments.completedInPeriod,
      ],
      [
        "Hospitalized patients",
        appointments.hospitalized,
      ],
      [
        "Follow-up patients",
        appointments.followUp,
      ],
      [
        "Total invoices",
        finance.invoices.total,
      ],
      [
        "Paid invoices",
        finance.invoices.paid,
      ],
      [
        "Hospitalized patients",
        appointments.hospitalized,
      ],
      [
        "Payment transactions",
        finance.payments.totalTransactions,
      ],
      [
        "Revenue",
        finance.payments.revenue,
      ],
      [
        "Follow-up patients",
        appointments.followUp,
      ],
      [
        "Expiring batches",
        inventory.expiringBatches,
      ],
      [],
      ["Appointment Status"],
      ["Status", "Count"],
      ...Object.entries(
        appointmentStatuses,
      ).map(([status, count]) => [
        formatStatus(status),
        count,
      ]),
      [],
      ["Recent Appointments"],
      [
        "Appointment number",
        "Date",
        "Owner",
        "Pet",
        "Veterinarian",
        "Status",
      ],
      ...recentAppointments.map(
        (appointment) => [
          appointment.appointmentNo || "",
          formatDate(
            appointment.scheduledAt,
          ),
          formatFullName(
            appointment.owner,
          ),
          appointment.pet?.name || "",
          formatFullName(
            appointment.veterinarian,
          ),
          formatStatus(
            appointment.status,
          ),
        ],
      ),
      [],
      ["Recent Payments"],
      [
        "Payment number",
        "Invoice number",
        "Owner",
        "Method",
        "Amount",
        "Paid at",
      ],
      ...recentPayments.map(
        (payment) => [
          payment.paymentNumber || "",
          payment.invoice?.invoiceNumber ||
            "",
          formatFullName(payment.owner),
          payment.paymentMethod?.name || "",
          Number(payment.amount || 0),
          formatDate(payment.paidAt),
        ],
      ),
    ];

    const csvContent = rows
      .map((row) =>
        row.map(escapeCsvValue).join(","),
      )
      .join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      },
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      `dashboard-${filterType}-${getApiDate(
        selectedDate,
        filterType,
      )}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="container-fluid py-3 py-md-4 dashboard-page">
      <div className="dashboard-hero mb-4">
        <div className="dashboard-hero-content">
          <div className="dashboard-welcome">
            <div className="dashboard-welcome-icon">
              <Stethoscope size={24} />
            </div>

            <div>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h3 className="fw-bold mb-0">
                  {getGreeting()}
                </h3>

                <span className="dashboard-live-badge">
                  <span className="dashboard-live-dot" />
                  Live dashboard
                </span>
              </div>

              <p className="dashboard-subtitle mb-0">
                Welcome back to Pokhara Pet House.
                Here is the clinic overview for{" "}
                <strong>{selectedPeriodLabel}</strong>.
              </p>
            </div>
          </div>

          <div className="dashboard-toolbar">
            <div className="dashboard-period-navigation">
              <button
                type="button"
                className="dashboard-icon-button"
                onClick={() => changePeriod(-1)}
                aria-label={`Previous ${periodLabel}`}
              >
                <ArrowLeft size={17} />
              </button>

              <div className="dashboard-current-period">
                <CalendarDays size={17} />
                <span>{selectedPeriodLabel}</span>
              </div>

              <button
                type="button"
                className="dashboard-icon-button"
                onClick={() => changePeriod(1)}
                aria-label={`Next ${periodLabel}`}
              >
                <ArrowRight size={17} />
              </button>
            </div>

            {filterType === "monthly" ? (
              <input
                type="month"
                className="form-control dashboard-date-input"
                value={getDateInputValue(
                  selectedDate,
                  filterType,
                )}
                onChange={handleDateChange}
                aria-label="Select dashboard month"
              />
            ) : (
              <input
                type="number"
                className="form-control dashboard-year-input"
                value={getDateInputValue(
                  selectedDate,
                  filterType,
                )}
                min="2000"
                max="2100"
                onChange={handleDateChange}
                aria-label="Select dashboard year"
              />
            )}

            <select
              className="form-select dashboard-period-select"
              value={filterType}
              onChange={handleFilterChange}
              aria-label="Dashboard period"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>

            <button
              type="button"
              className="dashboard-action-button"
              onClick={() =>
                loadDashboard({
                  silent: true,
                })
              }
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "dashboard-spin"
                    : ""
                }
              />
              {/* <span>Refresh</span> */}
            </button>

            <button
              type="button"
              className="dashboard-action-button dashboard-export-button"
              onClick={handleExport}
            >
              <Download size={17} />
              {/* <span>Export</span> */}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center gap-3"
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            <AlertTriangle size={18} />

            <span>{error}</span>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() =>
              loadDashboard()
            }
          >
            Retry
          </button>
        </div>
      )}

      <div className="row g-3 mb-4">
        <MetricCard
          title="Total Patients"
          value={formatNumber(pets.total)}
          subtitle={`${formatNumber(
            pets.active,
          )} active patients`}
          icon={PawPrint}
          tone="primary"
        />

        <MetricCard
          title={`Appointments This ${periodLabel}`}
          value={formatNumber(
            appointments.periodTotal,
          )}
          subtitle={`${formatNumber(
            appointments.completedInPeriod,
          )} completed`}
          icon={CalendarDays}
          tone="success"
        />

        <MetricCard
          title="Total Revenue"
          value={formatCurrency(
            finance.payments.revenue,
          )}
          subtitle={`${formatNumber(
            finance.payments
              .totalTransactions,
          )} completed payments`}
          icon={WalletCards}
          tone="info"
        />

        <MetricCard
          title="Hospitalized Patients"
          value={formatNumber(
            appointmentStatuses.HOSPITALIZED,
          )}
          subtitle="Currently hospitalized"
          icon={Stethoscope}
          tone={appointments.HOSPITALIZED > 0 ? "warning" : "success"}
        />
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6 col-xl-3">
          <div className="card dashboard-content-card h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-secondary">
                    Pet Owners
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {formatNumber(
                      owners.total,
                    )}
                  </h3>
                </div>

                <div className="dashboard-round-icon bg-primary-subtle text-primary">
                  <Users size={21} />
                </div>
              </div>

              <div className="mt-4">
                <ProgressItem
                  label="Active owners"
                  value={owners.active}
                  total={owners.total}
                  className="bg-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6 col-xl-3">
          <div className="card dashboard-content-card h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-secondary">
                    Clinic Staff
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {formatNumber(
                      staff.total,
                    )}
                  </h3>
                </div>

                <div className="dashboard-round-icon bg-success-subtle text-success">
                  <UserRound size={21} />
                </div>
              </div>

              <div className="mt-4">
                <ProgressItem
                  label="Active veterinarians"
                  value={
                    staff.activeVeterinarians
                  }
                  total={staff.total}
                  className="bg-success"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6 col-xl-3">
          <div className="card dashboard-content-card h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-secondary">
                    Today's Appointments
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {formatNumber(
                      appointments.today,
                    )}
                  </h3>
                </div>

                <div className="dashboard-round-icon bg-info-subtle text-info">
                  <Clock3 size={21} />
                </div>
              </div>

              <p className="text-secondary small mt-4 mb-0">
                {formatNumber(
                  appointments.upcoming,
                )}{" "}
                upcoming appointments
              </p>
            </div>
          </div>
        </div>

        <div className="col-lg-6 col-xl-3">
          <div className="card dashboard-content-card h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-secondary">
                    Follow-up Patients
                  </small>

                  <h3 className="fw-bold mt-2 mb-0">
                    {formatNumber(
                      appointments.followUp,
                    )}
                  </h3>
                </div>

                <div className="dashboard-round-icon bg-warning-subtle text-warning-emphasis">
                  <Package size={21} />
                </div>
              </div>

              <div className="d-flex flex-column gap-1 mt-4">
                <small className="text-secondary">
                  Patients marked for follow-up
                </small>
                <small className="text-secondary">
                  Includes active FOLLOW_UP appointments
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-7">
          <section className="card dashboard-content-card h-100">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <h5 className="fw-bold mb-1">
                    Upcoming Appointments
                  </h5>

                  <small className="text-secondary">
                    The next clinic appointments
                  </small>
                </div>

                <span className="badge rounded-pill bg-primary-subtle text-primary">
                  {recentAppointments.length}{" "}
                  displayed
                </span>
              </div>

              {recentAppointments.length ===
              0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming appointments"
                  message="Upcoming appointments will appear here."
                />
              ) : (
                <div className="d-flex flex-column gap-3">
                  {recentAppointments.map(
                    (appointment) => {
                      const isOpen =
                        openAppointment ===
                        appointment.id;

                      return (
                        <article
                          key={appointment.id}
                          className={`dashboard-appointment-card ${
                            isOpen
                              ? "dashboard-appointment-card-open"
                              : ""
                          }`}
                        >
                          <div className="d-flex justify-content-between align-items-start gap-3">
                            <div className="d-flex gap-3">
                              <div className="dashboard-pet-avatar">
                                {appointment.pet
                                  ?.photoUrl ? (
                                  <img
                                    src={
                                      appointment
                                        .pet
                                        .photoUrl
                                    }
                                    alt={
                                      appointment
                                        .pet
                                        .name ||
                                      "Pet"
                                    }
                                  />
                                ) : (
                                  <PawPrint
                                    size={20}
                                  />
                                )}
                              </div>

                              <div>
                                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                  <h6 className="fw-bold mb-0">
                                    {appointment
                                      .service
                                      ?.name ||
                                      appointment.type ||
                                      "Veterinary appointment"}
                                  </h6>

                                  <span
                                    className={`
                                      badge rounded-pill
                                      ${
                                        APPOINTMENT_STATUS_CLASSES[
                                          appointment
                                            .status
                                        ] ||
                                        "bg-secondary-subtle text-secondary"
                                      }
                                    `}
                                  >
                                    {formatStatus(
                                      appointment.status,
                                    )}
                                  </span>
                                </div>

                                <small className="text-secondary">
                                  {appointment
                                    .appointmentNo ||
                                    "No appointment number"}
                                </small>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="dashboard-expand-button"
                              onClick={() =>
                                setOpenAppointment(
                                  isOpen
                                    ? null
                                    : appointment.id,
                                )
                              }
                              aria-expanded={
                                isOpen
                              }
                            >
                              <ChevronDown
                                size={17}
                                style={{
                                  transform:
                                    isOpen
                                      ? "rotate(180deg)"
                                      : "rotate(0deg)",
                                  transition:
                                    "transform 0.2s ease",
                                }}
                              />
                            </button>
                          </div>

                          <div className="row g-2 mt-2">
                            <div className="col-sm-6">
                              <small className="text-secondary d-flex align-items-center gap-2">
                                <CalendarDays
                                  size={15}
                                />

                                {formatDate(
                                  appointment.scheduledAt,
                                )}{" "}
                                at{" "}
                                {formatTime(
                                  appointment.scheduledAt,
                                )}
                              </small>
                            </div>

                            <div className="col-sm-6">
                              <small className="text-secondary d-flex align-items-center gap-2">
                                <Clock3
                                  size={15}
                                />

                                {formatDuration(
                                  appointment.durationMin ||
                                    appointment
                                      .service
                                      ?.durationMin,
                                )}
                              </small>
                            </div>

                            <div className="col-sm-6">
                              <small className="text-secondary d-flex align-items-center gap-2">
                                <UserRound
                                  size={15}
                                />

                                Owner:{" "}
                                {formatFullName(
                                  appointment.owner,
                                )}
                              </small>
                            </div>

                            <div className="col-sm-6">
                              <small className="text-secondary d-flex align-items-center gap-2">
                                <Stethoscope
                                  size={15}
                                />

                                Vet:{" "}
                                {formatFullName(
                                  appointment.veterinarian,
                                )}
                              </small>
                            </div>
                          </div>

                          {isOpen && (
                            <div className="dashboard-appointment-details">
                              <div className="row g-3">
                                <div className="col-md-6">
                                  <small className="text-secondary d-block">
                                    Pet
                                  </small>

                                  <span className="fw-semibold">
                                    {appointment
                                      .pet
                                      ?.name ||
                                      "Unknown pet"}
                                  </span>

                                  <small className="text-secondary d-block">
                                    {appointment
                                      .pet
                                      ?.species
                                      ?.name ||
                                      "Species not recorded"}
                                    {appointment
                                      .pet
                                      ?.breed
                                      ?.name
                                      ? ` · ${appointment.pet.breed.name}`
                                      : ""}
                                  </small>
                                </div>

                                <div className="col-md-6">
                                  <small className="text-secondary d-block">
                                    Reason
                                  </small>

                                  <span className="fw-semibold">
                                    {appointment.reason ||
                                      "No reason recorded"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="col-xl-5">
          <section className="card dashboard-content-card h-100">
            <div className="card-body p-4">
              <div className="mb-4">
                <h5 className="fw-bold mb-1">
                  Appointment Status
                </h5>

                <small className="text-secondary">
                  Status distribution for this{" "}
                  {periodLabel}
                </small>
              </div>

              {Object.keys(
                appointmentStatuses,
              ).length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No appointment statistics"
                  message="Appointment status counts will appear here."
                />
              ) : (
                <div className="d-flex flex-column gap-4">
                  {Object.entries(
                    appointmentStatuses,
                  ).map(
                    ([status, count]) => (
                      <ProgressItem
                        key={status}
                        label={formatStatus(
                          status,
                        )}
                        value={count}
                        total={
                          appointments.periodTotal
                        }
                        className={
                          status ===
                          "COMPLETED"
                            ? "bg-success"
                            : status ===
                                "CANCELLED"
                              ? "bg-danger"
                              : status ===
                                  "IN_PROGRESS"
                                ? "bg-warning"
                                : "bg-primary"
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-7">
          <section className="card dashboard-content-card h-100">
            <div className="card-body p-0">
              <div className="p-4 border-bottom">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="fw-bold mb-1">
                      Recent Payments
                    </h5>

                    <small className="text-secondary">
                      Latest successful clinic
                      payments
                    </small>
                  </div>

                  <CreditCard
                    size={22}
                    className="text-success"
                  />
                </div>
              </div>

              {recentPayments.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No recent payments"
                  message="Completed payments will appear here."
                />
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">
                          Payment
                        </th>

                        <th>Owner</th>

                        <th>Method</th>

                        <th>Status</th>

                        <th className="text-end pe-4">
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentPayments.map(
                        (payment) => (
                          <tr key={payment.id}>
                            <td className="ps-4">
                              <div className="fw-semibold">
                                {payment.paymentNumber ||
                                  "Payment"}
                              </div>

                              <small className="text-secondary">
                                {payment.invoice
                                  ?.invoiceNumber ||
                                  "No invoice"}{" "}
                                ·{" "}
                                {formatDate(
                                  payment.paidAt,
                                )}
                              </small>
                            </td>

                            <td>
                              <div className="fw-semibold">
                                {formatFullName(
                                  payment.owner,
                                )}
                              </div>

                              <small className="text-secondary">
                                {payment.owner
                                  ?.ownerCode ||
                                  "—"}
                              </small>
                            </td>

                            <td>
                              {payment
                                .paymentMethod
                                ?.name ||
                                "Unknown"}
                            </td>

                            <td>
                              <span
                                className={`
                                  badge rounded-pill
                                  ${
                                    PAYMENT_STATUS_CLASSES[
                                      payment
                                        .invoice
                                        ?.status
                                    ] ||
                                    "bg-secondary-subtle text-secondary"
                                  }
                                `}
                              >
                                {formatStatus(
                                  payment
                                    .invoice
                                    ?.status,
                                )}
                              </span>
                            </td>

                            <td className="text-end pe-4 fw-bold text-success">
                              {formatCurrency(
                                payment.amount,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="col-xl-5">
          <section className="card dashboard-content-card h-100">
            <div className="card-body p-4">
              <div className="mb-4">
                <h5 className="fw-bold mb-1">
                  Invoice Summary
                </h5>

                <small className="text-secondary">
                  Invoice performance for this{" "}
                  {periodLabel}
                </small>
              </div>

              <div className="d-flex flex-column gap-4">
                <ProgressItem
                  label="Paid invoices"
                  value={
                    finance.invoices.paid
                  }
                  total={
                    finance.invoices.total
                  }
                  className="bg-success"
                />

                <ProgressItem
                  label="Hospitalized patients"
                  value={appointments.hospitalized}
                  total={appointments.periodTotal || 1}
                  className="bg-warning"
                />
              </div>

              <hr className="my-4" />

              <div className="row g-3">
                <div className="col-6">
                  <div className="bg-light border rounded-4 p-3 h-100">
                    <small className="text-secondary">
                      Total invoices
                    </small>

                    <h4 className="fw-bold mb-0 mt-2">
                      {formatNumber(
                        finance.invoices
                          .total,
                      )}
                    </h4>
                  </div>
                </div>

                <div className="col-6">
                  <div className="bg-light border rounded-4 p-3 h-100">
                    <small className="text-secondary">
                      Transactions
                    </small>

                    <h4 className="fw-bold mb-0 mt-2">
                      {formatNumber(
                        finance.payments
                          .totalTransactions,
                      )}
                    </h4>
                  </div>
                </div>
              </div>

              <div className="alert alert-success border-0 mt-4 mb-0">
                <div className="d-flex gap-2">
                  <CheckCircle2
                    size={19}
                    className="flex-shrink-0 mt-1"
                  />

                  <div>
                    <div className="fw-semibold">
                      Revenue collected
                    </div>

                    <div className="fs-5 fw-bold">
                      {formatCurrency(
                        finance.payments
                          .revenue,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;