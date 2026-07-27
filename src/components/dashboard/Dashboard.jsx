import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Download,
  MapPin,
  PawPrint,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";

const dashboardData = {
  monthly: {
    stats: [
      {
        title: "Total Patients",
        value: 3590,
        percentage: "4.2%",
        positive: true,
        color: "success",
      },
      {
        title: "New Appointments",
        value: 298,
        percentage: "3.6%",
        positive: true,
        color: "success",
      },
      {
        title: "Surgical Procedures",
        value: 427,
        percentage: "1.5%",
        positive: false,
        color: "warning",
      },
      {
        title: "Overall Visitors",
        value: 1860,
        percentage: "2.9%",
        positive: false,
        color: "warning",
      },
    ],

    treatments: [
      {
        name: "Vaccinations",
        patients: 378,
        percentage: "3.1%",
        positive: true,
      },
      {
        name: "General Check-Up",
        patients: 255,
        percentage: "2.2%",
        positive: true,
      },
      {
        name: "Spay & Neuter Surgery",
        patients: 164,
        percentage: "1.6%",
        positive: true,
      },
      {
        name: "Diagnostics & Lab Tests",
        patients: 98,
        percentage: "2.1%",
        positive: false,
      },
    ],

    patientTypes: [
      {
        type: "Dogs",
        total: 365,
        average: 12,
        progress: 72,
        color: "#6f42c1",
      },
      {
        type: "Cats",
        total: 287,
        average: 9,
        progress: 58,
        color: "#0dcaf0",
      },
    ],

    chartData: [
      { label: "Week 1", value: 68, color: "#20c997" },
      { label: "Week 2", value: 74, color: "#40e0d0" },
      { label: "Week 3", value: 52, color: "#5edbe5" },
      { label: "Week 4", value: 80, color: "#0dcaf0" },
      { label: "Week 5", value: 92, color: "#6f42c1" },
    ],
  },

  yearly: {
    stats: [
      {
        title: "Total Patients",
        value: 42880,
        percentage: "8.4%",
        positive: true,
        color: "success",
      },
      {
        title: "New Appointments",
        value: 3580,
        percentage: "6.3%",
        positive: true,
        color: "success",
      },
      {
        title: "Surgical Procedures",
        value: 5124,
        percentage: "2.4%",
        positive: true,
        color: "success",
      },
      {
        title: "Overall Visitors",
        value: 22320,
        percentage: "3.1%",
        positive: false,
        color: "warning",
      },
    ],

    treatments: [
      {
        name: "Vaccinations",
        patients: 4536,
        percentage: "7.4%",
        positive: true,
      },
      {
        name: "General Check-Up",
        patients: 3060,
        percentage: "5.8%",
        positive: true,
      },
      {
        name: "Spay & Neuter Surgery",
        patients: 1968,
        percentage: "4.2%",
        positive: true,
      },
      {
        name: "Diagnostics & Lab Tests",
        patients: 1176,
        percentage: "1.8%",
        positive: false,
      },
    ],

    patientTypes: [
      {
        type: "Dogs",
        total: 4380,
        average: 12,
        progress: 76,
        color: "#6f42c1",
      },
      {
        type: "Cats",
        total: 3444,
        average: 9,
        progress: 61,
        color: "#0dcaf0",
      },
    ],

    chartData: [
      { label: "Jan", value: 50, color: "#20c997" },
      { label: "Mar", value: 62, color: "#40e0d0" },
      { label: "May", value: 72, color: "#5edbe5" },
      { label: "Jul", value: 85, color: "#0dcaf0" },
      { label: "Sep", value: 68, color: "#6f42c1" },
      { label: "Nov", value: 92, color: "#fd7e14" },
    ],
  },
};

const schedules = [
  {
    title: "Spay & Neuter Surgery",
    time: "09:00 AM - 10:30 AM",
    room: "Surgical Room",
    duration: "1 hr 30 min",
    staff: 3,
    color: "#20c997",
  },
  {
    title: "Dental Treatment",
    time: "10:00 AM - 11:30 AM",
    room: "Dental Room",
    duration: "1 hr 30 min",
    staff: 2,
    color: "#6f42c1",
  },
];

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDateRange(date, filterType) {
  if (filterType === "yearly") {
    return date.getFullYear().toString();
  }

  const firstDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  );

  const format = {
    month: "short",
    day: "2-digit",
    year: "numeric",
  };

  return `${firstDay.toLocaleDateString(
    "en-US",
    format
  )} - ${lastDay.toLocaleDateString("en-US", format)}`;
}

function SectionHeader({
  title,
  subtitle,
  buttonText = "View all",
  onClick,
}) {
  return (
    <div className="d-flex justify-content-between align-items-start mb-3">
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
        className="btn btn-sm btn-light border rounded-pill px-3"
        onClick={onClick}
      >
        {buttonText}
      </button>
    </div>
  );
}

function StatCard({
  title,
  value,
  percentage,
  positive,
  color,
  periodLabel,
}) {
  const TrendIcon = positive
    ? TrendingUp
    : TrendingDown;

  return (
    <div className="col-sm-6 col-xl-3">
      <div className="h-100 px-2 py-2">
        <small className="text-secondary">
          {title}
        </small>

        <h2 className="fw-bold my-2">
          {formatNumber(value)}
        </h2>

        <div
          className={`
            d-inline-flex align-items-center gap-1
            rounded-pill px-2 py-1
            bg-${color}-subtle text-${color}
          `}
          style={{ fontSize: "0.75rem" }}
        >
          <TrendIcon size={14} />

          <span>
            {percentage} from previous {periodLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function PatientCircle({ value, color }) {
  return (
    <div
      className="rounded-circle d-flex align-items-center justify-content-center"
      style={{
        width: "60px",
        height: "60px",
        background: `conic-gradient(
          ${color} ${value * 3.6}deg,
          #e9ecef 0deg
        )`,
      }}
    >
      <div
        className="bg-white rounded-circle d-flex align-items-center justify-content-center fw-semibold"
        style={{
          width: "46px",
          height: "46px",
          fontSize: "0.75rem",
        }}
      >
        {value}%
      </div>
    </div>
  );
}

function Dashboard() {
  const [filterType, setFilterType] =
    useState("monthly");

  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const [openSchedule, setOpenSchedule] =
    useState(null);

  const currentData = useMemo(
    () => dashboardData[filterType],
    [filterType]
  );

  const dateRange = useMemo(
    () => formatDateRange(selectedDate, filterType),
    [selectedDate, filterType]
  );

  const periodLabel =
    filterType === "monthly" ? "month" : "year";

  function changePeriod(direction) {
    setSelectedDate((previousDate) => {
      const updatedDate = new Date(previousDate);

      if (filterType === "monthly") {
        updatedDate.setMonth(
          updatedDate.getMonth() + direction
        );
      } else {
        updatedDate.setFullYear(
          updatedDate.getFullYear() + direction
        );
      }

      return updatedDate;
    });
  }

  function handleFilterChange(event) {
    setFilterType(event.target.value);
  }

  function handleDateChange(event) {
    const value = event.target.value;

    if (!value) return;

    if (filterType === "monthly") {
      const [year, month] = value.split("-");

      setSelectedDate(
        new Date(Number(year), Number(month) - 1, 1)
      );
    } else {
      setSelectedDate(
        new Date(Number(value), 0, 1)
      );
    }
  }

  function handleExport() {
    const rows = [
      ["Pokhara Pet House Dashboard"],
      ["Filter", filterType],
      ["Period", dateRange],
      [],
      ["Statistics"],
      ["Title", "Value", "Percentage", "Trend"],
      ...currentData.stats.map((stat) => [
        stat.title,
        stat.value,
        stat.percentage,
        stat.positive ? "Increase" : "Decrease",
      ]),
      [],
      ["Top Treatments"],
      ["Treatment", "Patients", "Percentage"],
      ...currentData.treatments.map((treatment) => [
        treatment.name,
        treatment.patients,
        treatment.percentage,
      ]),
      [],
      ["Patients by Type"],
      ["Type", "Total", "Average per day"],
      ...currentData.patientTypes.map((patient) => [
        patient.type,
        patient.total,
        patient.average,
      ]),
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pokhara-pet-house-${filterType}-${Date.now()}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function getDateInputValue() {
    const year = selectedDate.getFullYear();

    if (filterType === "yearly") {
      return year;
    }

    const month = String(
      selectedDate.getMonth() + 1
    ).padStart(2, "0");

    return `${year}-${month}`;
  }

  return (
    <>
      <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            {getGreeting()}
          </h3>

          <p className="text-secondary mb-0">
            Welcome back to Pokhara Pet House. Here is
            your clinic overview for {dateRange}.
          </p>
        </div>

        <div className="d-flex flex-nowrap align-items-center gap-2">
          <div className="btn-group flex-shrink-0">
  <button
    type="button"
    className="btn btn-white bg-white border px-2 py-1"
    onClick={() => changePeriod(-1)}
  >
    <ArrowLeft size={15} />
  </button>

  <button
    type="button"
    className="btn btn-white bg-white border d-flex align-items-center gap-1 px-2 py-1 small"
    disabled
    style={{ minWidth: "170px" }}
  >
    <CalendarDays size={15} />
    <span className="text-truncate">{dateRange}</span>
  </button>

  <button
    type="button"
    className="btn btn-white bg-white border px-2 py-1"
    onClick={() => changePeriod(1)}
  >
    <ArrowRight size={15} />
  </button>
</div>

          {filterType === "monthly" ? (
            <input
              type="month"
              className="form-control"
              value={getDateInputValue()}
              onChange={handleDateChange}
              style={{ width: "165px" }}
            />
          ) : (
            <input
              type="number"
              className="form-control"
              value={getDateInputValue()}
              min="2020"
              max="2100"
              onChange={handleDateChange}
              style={{ width: "110px" }}
              aria-label="Select year"
            />
          )}

          <div className="position-relative">
            <select
              className="form-select"
              value={filterType}
              onChange={handleFilterChange}
              style={{ minWidth: "140px" }}
            >
              <option value="monthly">
                Monthly
              </option>

              <option value="yearly">
                Yearly
              </option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={handleExport}
          >
            <Download size={17} />
             
          </button>
        </div>
      </div>

      <section className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="row g-3">
            {currentData.stats.map((stat) => (
              <StatCard
                key={stat.title}
                {...stat}
                periodLabel={periodLabel}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="row g-4 mb-4">
        <div className="col-xl-8">
          <section className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <SectionHeader
                title="Top Treatments"
                subtitle={`Most requested services for this ${periodLabel}`}
                onClick={() =>
                  console.log("Open treatments page")
                }
              />

              <div className="list-group list-group-flush">
                {currentData.treatments.map(
                  (treatment) => (
                    <div
                      key={treatment.name}
                      className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-3 bg-success-subtle text-success d-flex align-items-center justify-content-center"
                          style={{
                            width: "42px",
                            height: "42px",
                          }}
                        >
                          <PawPrint size={18} />
                        </div>

                        <div>
                          <div className="fw-semibold">
                            {treatment.name}
                          </div>

                          <small className="text-secondary">
                            {formatNumber(
                              treatment.patients
                            )}{" "}
                            patients
                          </small>
                        </div>
                      </div>

                      <span
                        className={`
                          badge rounded-pill
                          d-flex align-items-center gap-1
                          ${
                            treatment.positive
                              ? "bg-success-subtle text-success"
                              : "bg-warning-subtle text-warning-emphasis"
                          }
                        `}
                      >
                        {treatment.positive ? (
                          <TrendingUp size={13} />
                        ) : (
                          <TrendingDown size={13} />
                        )}

                        {treatment.percentage}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="col-xl-4">
          <section className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <SectionHeader
                title="Patients by Type"
                subtitle={`${filterType === "monthly" ? "Monthly" : "Yearly"} distribution`}
              />

              <div className="d-flex flex-column gap-3">
                {currentData.patientTypes.map(
                  (patient) => (
                    <div
                      key={patient.type}
                      className="border rounded-4 p-3 d-flex align-items-center justify-content-between"
                    >
                      <div>
                        <small className="text-secondary">
                          This {periodLabel}
                        </small>

                        <h6 className="fw-bold mt-1 mb-1">
                          {formatNumber(patient.total)}{" "}
                          {patient.type}
                        </h6>

                        <small className="text-secondary">
                          Average: {patient.average} per day
                        </small>
                      </div>

                      <PatientCircle
                        value={patient.progress}
                        color={patient.color}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-6">
          <section className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4">
              <SectionHeader
                title="Staff Schedule"
                subtitle="Today's upcoming procedures"
              />

              <div className="d-flex flex-column gap-3">
                {schedules.map((schedule, index) => {
                  const isOpen =
                    openSchedule === index;

                  return (
                    <article
                      key={schedule.title}
                      className="border rounded-4 p-3"
                      style={{
                        borderLeft: `4px solid ${schedule.color}`,
                      }}
                    >
                      <div className="d-flex justify-content-between">
                        <div>
                          <h6 className="fw-bold mb-1">
                            {schedule.title}
                          </h6>

                          <small className="text-secondary">
                            {schedule.time}
                          </small>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          onClick={() =>
                            setOpenSchedule(
                              isOpen ? null : index
                            )
                          }
                          aria-expanded={isOpen}
                        >
                          <ChevronDown
                            size={17}
                            style={{
                              transform: isOpen
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition:
                                "transform 0.2s ease",
                            }}
                          />
                        </button>
                      </div>

                      <div className="d-flex align-items-center gap-2 my-3">
                        <span className="badge rounded-circle bg-dark">
                          A
                        </span>

                        <span className="badge rounded-circle bg-secondary">
                          S
                        </span>

                        <span className="badge rounded-circle bg-primary">
                          R
                        </span>

                        <small className="text-secondary d-flex align-items-center gap-1 ms-1">
                          <UserRound size={14} />
                          {schedule.staff} staff
                        </small>
                      </div>

                      <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
                        <small className="text-secondary d-flex align-items-center gap-1">
                          <MapPin size={14} />
                          {schedule.room}
                        </small>

                        <small className="text-secondary d-flex align-items-center gap-1">
                          <Clock3 size={14} />
                          {schedule.duration}
                        </small>
                      </div>

                      {isOpen && (
                        <div className="alert alert-light border mt-3 mb-0">
                          <strong>
                            Procedure details
                          </strong>

                          <p className="small text-secondary mb-0 mt-1">
                            Assigned room:{" "}
                            {schedule.room}. Expected
                            duration:{" "}
                            {schedule.duration}.
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <div className="col-xl-6">
          <div className="d-flex flex-column gap-4 h-100">
            <section className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <SectionHeader
                  title="Patient Statistics"
                  subtitle={`${filterType === "monthly" ? "Monthly" : "Yearly"} patient growth`}
                />

                <div
                  className="d-flex align-items-end justify-content-around gap-2 border-bottom"
                  style={{ height: "210px" }}
                >
                  {currentData.chartData.map(
                    (item) => (
                      <div
                        key={item.label}
                        className="d-flex flex-column align-items-center justify-content-end h-100 flex-grow-1"
                      >
                        <strong
                          className="small mb-1"
                          style={{
                            fontSize: "0.7rem",
                          }}
                        >
                          {item.value}%
                        </strong>

                        <div
                          className="rounded-top-3 w-75"
                          style={{
                            height: `${item.value}%`,
                            backgroundColor:
                              item.color,
                            minWidth: "28px",
                            maxWidth: "58px",
                            transition:
                              "height 0.3s ease",
                          }}
                        />

                        <small className="text-secondary mt-2 mb-2">
                          {item.label}
                        </small>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>

            <section
              className="card border-0 shadow-sm rounded-4 overflow-hidden text-white"
              style={{
                background:
                  "linear-gradient(120deg, #198754, #0dcaf0, #6f42c1)",
              }}
            >
              <div className="card-body p-4">
                <div className="row align-items-center">
                  <div className="col-sm-8">
                    <small className="text-white-50">
                      Pokhara Pet House
                    </small>

                    <h4 className="fw-bold mt-2">
                      Plan, treat, and achieve your
                      veterinary goals.
                    </h4>

                    <p className="text-white-50 mb-0">
                      Manage patients, staff,
                      appointments, and clinic
                      performance from one dashboard.
                    </p>
                  </div>

                  <div className="col-sm-4 text-sm-end mt-3 mt-sm-0">
                    <button
                      type="button"
                      className="btn btn-light text-primary rounded-pill d-inline-flex align-items-center gap-2"
                      onClick={() =>
                        console.log(
                          "Open goals page"
                        )
                      }
                    >
                      View Goals
                      <ArrowUpRight size={17} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;