import { useEffect, useMemo, useState } from "react";
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
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  Syringe,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";

const initialVaccinations = [
  {
    id: 1,
    vaccinationId: "VAC-0001",
    patientName: "Bruno",
    ownerName: "Sarthak Bhattarai",
    species: "Dog",
    breed: "Golden Retriever",
    gender: "Male",
    age: "3 years",
    vaccineName: "Rabies Vaccine",
    vaccineType: "Rabies",
    doseNumber: "Annual Booster",
    dateAdministered: "2026-07-10",
    nextDueDate: "2027-07-10",
    batchNumber: "RB-260710-A",
    manufacturer: "Zoetis",
    administeredBy: "Dr. Nisha Karki",
    clinicName: "VetNear Animal Clinic",
    route: "Subcutaneous",
    site: "Right shoulder",
    status: "Completed",
    paymentStatus: "Paid",
    amount: 650,
    notes: "No adverse reaction observed.",
  },
  {
    id: 2,
    vaccinationId: "VAC-0002",
    patientName: "Milo",
    ownerName: "Riya Gurung",
    species: "Cat",
    breed: "Persian",
    gender: "Male",
    age: "2 years",
    vaccineName: "FVRCP Vaccine",
    vaccineType: "FVRCP",
    doseNumber: "Dose 2",
    dateAdministered: "2026-06-25",
    nextDueDate: "2026-07-25",
    batchNumber: "FC-0625-B",
    manufacturer: "Boehringer Ingelheim",
    administeredBy: "Dr. Suman Adhikari",
    clinicName: "VetNear Animal Clinic",
    route: "Subcutaneous",
    site: "Left shoulder",
    status: "Due Soon",
    paymentStatus: "Paid",
    amount: 900,
    notes: "Owner informed about next dose.",
  },
  {
    id: 3,
    vaccinationId: "VAC-0003",
    patientName: "Luna",
    ownerName: "Aarav Shrestha",
    species: "Dog",
    breed: "Labrador",
    gender: "Female",
    age: "5 months",
    vaccineName: "DHPP Vaccine",
    vaccineType: "DHPP",
    doseNumber: "Dose 3",
    dateAdministered: "2026-06-05",
    nextDueDate: "2026-07-05",
    batchNumber: "DH-0605-C",
    manufacturer: "MSD Animal Health",
    administeredBy: "Dr. Nisha Karki",
    clinicName: "VetNear Animal Clinic",
    route: "Subcutaneous",
    site: "Right shoulder",
    status: "Overdue",
    paymentStatus: "Pending",
    amount: 850,
    notes: "Follow-up reminder required.",
  },
  {
    id: 4,
    vaccinationId: "VAC-0004",
    patientName: "Coco",
    ownerName: "Mina Thapa",
    species: "Rabbit",
    breed: "Holland Lop",
    gender: "Female",
    age: "1 year",
    vaccineName: "RHDV Vaccine",
    vaccineType: "RHDV",
    doseNumber: "Primary",
    dateAdministered: "2026-07-18",
    nextDueDate: "2027-07-18",
    batchNumber: "RH-0718-A",
    manufacturer: "Filavie",
    administeredBy: "Dr. Suman Adhikari",
    clinicName: "VetNear Animal Clinic",
    route: "Subcutaneous",
    site: "Scruff",
    status: "Completed",
    paymentStatus: "Paid",
    amount: 1100,
    notes: "Vaccination card issued.",
  },
];

const vaccineTypes = [
  "Rabies",
  "DHPP",
  "FVRCP",
  "Bordetella",
  "Leptospirosis",
  "Canine Influenza",
  "RHDV",
  "Other",
];

const vaccinationStatuses = [
  "Completed",
  "Due Soon",
  "Overdue",
  "Cancelled",
];

const paymentStatuses = ["Paid", "Pending", "Waived"];

const createEmptyForm = () => ({
  patientName: "",
  ownerName: "",
  species: "Dog",
  breed: "",
  gender: "Male",
  age: "",
  vaccineName: "",
  vaccineType: "Rabies",
  doseNumber: "",
  dateAdministered: "",
  nextDueDate: "",
  batchNumber: "",
  manufacturer: "",
  administeredBy: "",
  clinicName: "VetNear Animal Clinic",
  route: "Subcutaneous",
  site: "",
  status: "Completed",
  paymentStatus: "Paid",
  amount: "",
  notes: "",
});

function Vaccination() {
  const [vaccinations, setVaccinations] = useState(() => {
    const saved = localStorage.getItem("clinicVaccinations");
    return saved ? JSON.parse(saved) : initialVaccinations;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedVaccination, setSelectedVaccination] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [formError, setFormError] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(
      "clinicVaccinations",
      JSON.stringify(vaccinations)
    );
  }, [vaccinations]);

  useEffect(() => {
    if (location.state?.action === "add") {
      openAddForm();

      navigate(location.pathname, {
        replace: true,
        state: null,
      });
    }
  }, [location.state]);

  const filteredVaccinations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return vaccinations.filter((item) => {
      const matchesSearch =
        item.patientName.toLowerCase().includes(term) ||
        item.ownerName.toLowerCase().includes(term) ||
        item.vaccinationId.toLowerCase().includes(term) ||
        item.vaccineName.toLowerCase().includes(term) ||
        item.batchNumber.toLowerCase().includes(term);

      const matchesType =
        typeFilter === "All" || item.vaccineType === typeFilter;

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vaccinations, searchTerm, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: vaccinations.length,
      completed: vaccinations.filter(
        (item) => item.status === "Completed"
      ).length,
      dueSoon: vaccinations.filter(
        (item) => item.status === "Due Soon"
      ).length,
      overdue: vaccinations.filter(
        (item) => item.status === "Overdue"
      ).length,
    };
  }, [vaccinations]);

  const urgentVaccinations = useMemo(
    () =>
      vaccinations
        .filter(
          (item) =>
            item.status === "Overdue" || item.status === "Due Soon"
        )
        .sort(
          (a, b) =>
            new Date(a.nextDueDate) - new Date(b.nextDueDate)
        )
        .slice(0, 5),
    [vaccinations]
  );

  function generateVaccinationId() {
    const highest = vaccinations.reduce((max, item) => {
      const number = Number(
        item.vaccinationId.replace("VAC-", "")
      );
      return number > max ? number : max;
    }, 0);

    return `VAC-${String(highest + 1).padStart(4, "0")}`;
  }

  function openAddForm() {
    setEditingId(null);
    setFormData(createEmptyForm());
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setFormData({
      patientName: item.patientName,
      ownerName: item.ownerName,
      species: item.species,
      breed: item.breed,
      gender: item.gender,
      age: item.age,
      vaccineName: item.vaccineName,
      vaccineType: item.vaccineType,
      doseNumber: item.doseNumber,
      dateAdministered: item.dateAdministered,
      nextDueDate: item.nextDueDate,
      batchNumber: item.batchNumber,
      manufacturer: item.manufacturer,
      administeredBy: item.administeredBy,
      clinicName: item.clinicName,
      route: item.route,
      site: item.site,
      status: item.status,
      paymentStatus: item.paymentStatus,
      amount: item.amount,
      notes: item.notes,
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
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setFormError("");
  }

  function validateForm() {
    if (!formData.patientName.trim()) {
      return "Patient name is required.";
    }
    if (!formData.ownerName.trim()) {
      return "Owner name is required.";
    }
    if (!formData.vaccineName.trim()) {
      return "Vaccine name is required.";
    }
    if (!formData.dateAdministered) {
      return "Vaccination date is required.";
    }
    if (!formData.nextDueDate) {
      return "Next due date is required.";
    }
    if (
      formData.nextDueDate &&
      formData.dateAdministered &&
      formData.nextDueDate < formData.dateAdministered
    ) {
      return "Next due date cannot be earlier than vaccination date.";
    }
    if (!formData.administeredBy.trim()) {
      return "Administered by is required.";
    }
    return "";
  }

  function handleSubmit(event) {
    event.preventDefault();

    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    const vaccinationData = {
      patientName: formData.patientName.trim(),
      ownerName: formData.ownerName.trim(),
      species: formData.species,
      breed: formData.breed.trim(),
      gender: formData.gender,
      age: formData.age.trim(),
      vaccineName: formData.vaccineName.trim(),
      vaccineType: formData.vaccineType,
      doseNumber: formData.doseNumber.trim(),
      dateAdministered: formData.dateAdministered,
      nextDueDate: formData.nextDueDate,
      batchNumber: formData.batchNumber.trim(),
      manufacturer: formData.manufacturer.trim(),
      administeredBy: formData.administeredBy.trim(),
      clinicName: formData.clinicName.trim(),
      route: formData.route,
      site: formData.site.trim(),
      status: formData.status,
      paymentStatus: formData.paymentStatus,
      amount: Number(formData.amount) || 0,
      notes: formData.notes.trim() || "No additional notes.",
    };

    if (editingId) {
      setVaccinations((previous) =>
        previous.map((item) =>
          item.id === editingId
            ? { ...item, ...vaccinationData }
            : item
        )
      );
    } else {
      setVaccinations((previous) => [
        {
          id: Date.now(),
          vaccinationId: generateVaccinationId(),
          ...vaccinationData,
        },
        ...previous,
      ]);
    }

    closeForm();
  }

  function handleDelete(id) {
    const item = vaccinations.find((record) => record.id === id);

    if (
      !window.confirm(
        `Delete vaccination record for ${
          item?.patientName || "this patient"
        }?`
      )
    ) {
      return;
    }

    setVaccinations((previous) =>
      previous.filter((record) => record.id !== id)
    );
  }

  function resetFilters() {
    setSearchTerm("");
    setTypeFilter("All");
    setStatusFilter("All");
  }

  function exportCsv() {
    const rows = [
      [
        "Vaccination ID",
        "Patient",
        "Owner",
        "Species",
        "Vaccine",
        "Type",
        "Dose",
        "Date Administered",
        "Next Due Date",
        "Batch Number",
        "Manufacturer",
        "Administered By",
        "Status",
        "Payment Status",
        "Amount",
      ],
      ...filteredVaccinations.map((item) => [
        item.vaccinationId,
        item.patientName,
        item.ownerName,
        item.species,
        item.vaccineName,
        item.vaccineType,
        item.doseNumber,
        item.dateAdministered,
        item.nextDueDate,
        item.batchNumber,
        item.manufacturer,
        item.administeredBy,
        item.status,
        item.paymentStatus,
        item.amount,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vaccination-records.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="vaccination-page">
      <section className="vaccination-hero rounded-4 p-4 p-lg-5 mb-4 position-relative overflow-hidden">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />

        <div className="row align-items-center g-4 position-relative">
          <div className="col-lg-7">
            <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-75 px-3 py-2 rounded-pill text-primary small fw-semibold mb-3">
              <ShieldCheck size={16} />
              Preventive healthcare management
            </div>

            <h2 className="fw-bold mb-3">
              Keep every pet protected and every vaccine on schedule.
            </h2>

            <p className="text-secondary mb-4" style={{ maxWidth: 650 }}>
              Manage vaccination records, due dates, vaccine batches,
              clinical details and follow-up reminders from one organised
              workspace.
            </p>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-2 px-4"
                onClick={openAddForm}
              >
                <Plus size={18} />
                Add Vaccination
              </button>

              <button
                type="button"
                className="btn btn-light border d-flex align-items-center gap-2 px-4"
                onClick={exportCsv}
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="hero-summary bg-white rounded-4 p-4 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <small className="text-secondary">
                    Vaccination overview
                  </small>
                  <h6 className="fw-bold mb-0">
                    Current protection status
                  </h6>
                </div>

                <div className="hero-icon">
                  <Syringe size={24} />
                </div>
              </div>

              <div className="row g-2">
                <MiniStat label="Total Records" value={summary.total} />
                <MiniStat label="Completed" value={summary.completed} />
                <MiniStat label="Due Soon" value={summary.dueSoon} />
                <MiniStat label="Overdue" value={summary.overdue} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="row g-4">
        <aside className="col-xl-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-2">
                  <Filter size={18} className="text-primary" />
                  <h6 className="fw-bold mb-0">Filters</h6>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none"
                  onClick={resetFilters}
                >
                  Reset
                </button>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  Search
                </label>

                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">
                    <Search size={17} />
                  </span>
                  <input
                    type="search"
                    className="form-control border-start-0"
                    placeholder="Patient, owner or vaccine"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  Vaccine type
                </label>

                <select
                  className="form-select"
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value)
                  }
                >
                  <option value="All">All vaccine types</option>
                  {vaccineTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold">
                  Status
                </label>

                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="All">All statuses</option>
                  {vaccinationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-top pt-4">
                <small className="text-secondary">
                  Showing results
                </small>
                <div className="d-flex justify-content-between align-items-end mt-1">
                  <h3 className="fw-bold mb-0">
                    {filteredVaccinations.length}
                  </h3>
                  <span className="small text-secondary">
                    of {vaccinations.length} records
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mt-4">
            <div className="card-body p-4">
              <div className="d-flex align-items-center gap-2 mb-4">
                <AlertTriangle
                  size={18}
                  className="text-warning-emphasis"
                />
                <h6 className="fw-bold mb-0">Attention Required</h6>
              </div>

              <div className="vaccination-timeline">
                {urgentVaccinations.length > 0 ? (
                  urgentVaccinations.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="timeline-item border-0 bg-transparent text-start p-0 w-100"
                      onClick={() => setSelectedVaccination(item)}
                    >
                      <span
                        className={`timeline-dot ${
                          item.status === "Overdue"
                            ? "timeline-dot-danger"
                            : ""
                        }`}
                      />

                      <div>
                        <small
                          className={
                            item.status === "Overdue"
                              ? "text-danger fw-semibold"
                              : "text-primary fw-semibold"
                          }
                        >
                          {item.status}
                        </small>
                        <div className="fw-semibold small mt-1">
                          {item.patientName}
                        </div>
                        <small className="text-secondary">
                          {item.vaccineName}
                        </small>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="small text-secondary mb-0">
                    No urgent vaccination records.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="col-xl-9">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
            <div>
              <h5 className="fw-bold mb-1">Vaccination Records</h5>
              <p className="text-secondary small mb-0">
                Review vaccine history, due dates and clinical details.
              </p>
            </div>

            <span className="small text-secondary">
              {filteredVaccinations.length} result
              {filteredVaccinations.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="row g-4">
            {filteredVaccinations.length > 0 ? (
              filteredVaccinations.map((item) => (
                <div className="col-md-6" key={item.id}>
                  <VaccinationCard
                    item={item}
                    onView={() => setSelectedVaccination(item)}
                    onEdit={() => openEditForm(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                </div>
              ))
            ) : (
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body text-center py-5">
                    <Syringe
                      size={48}
                      className="text-secondary mb-3"
                    />
                    <h5 className="fw-bold">
                      No vaccination records found
                    </h5>
                    <p className="text-secondary">
                      Change your filters or add a new vaccination record.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openAddForm}
                    >
                      Add Vaccination
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <button
        type="button"
        className="floating-add-vaccination btn btn-primary rounded-circle shadow"
        onClick={openAddForm}
        aria-label="Add vaccination"
      >
        <Plus size={24} />
      </button>

      {showForm && (
        <VaccinationFormModal
          formData={formData}
          formError={formError}
          editing={Boolean(editingId)}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {selectedVaccination && (
        <VaccinationDetailsModal
          item={selectedVaccination}
          onClose={() => setSelectedVaccination(null)}
          onEdit={() => {
            openEditForm(selectedVaccination);
            setSelectedVaccination(null);
          }}
        />
      )}

      <style>{`
        .vaccination-hero {
          background:
            linear-gradient(
              135deg,
              rgba(var(--bs-primary-rgb), .12),
              rgba(var(--bs-primary-rgb), .035)
            ),
            #fff;
          border: 1px solid rgba(var(--bs-primary-rgb), .12);
        }

        .hero-orb {
          position: absolute;
          border-radius: 50%;
          background: rgba(var(--bs-primary-rgb), .08);
          pointer-events: none;
        }

        .hero-orb-one {
          width: 220px;
          height: 220px;
          top: -90px;
          right: -60px;
        }

        .hero-orb-two {
          width: 125px;
          height: 125px;
          bottom: -70px;
          right: 30%;
        }

        .hero-summary {
          border: 1px solid rgba(var(--bs-primary-rgb), .1);
        }

        .hero-icon {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .1);
        }

        .mini-stat {
          border-radius: 14px;
          background: var(--bs-light);
          padding: 14px;
        }

        .vaccination-card {
          border: 1px solid rgba(var(--bs-primary-rgb), .08) !important;
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .vaccination-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 .75rem 1.75rem rgba(0,0,0,.08) !important;
        }

        .patient-avatar {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .1);
        }

        .record-info {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: .9rem;
          color: var(--bs-secondary-color);
        }

        .record-info-icon {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .08);
        }

        .vaccination-timeline {
          position: relative;
        }

        .vaccination-timeline::before {
          content: "";
          position: absolute;
          left: 5px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: rgba(var(--bs-primary-rgb), .16);
        }

        .timeline-item {
          position: relative;
          display: grid;
          grid-template-columns: 18px 1fr;
          gap: 12px;
          padding-bottom: 22px !important;
        }

        .timeline-item:last-child {
          padding-bottom: 0 !important;
        }

        .timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-top: 4px;
          z-index: 1;
          background: var(--bs-primary);
          box-shadow: 0 0 0 4px rgba(var(--bs-primary-rgb), .12);
        }

        .timeline-dot-danger {
          background: var(--bs-danger);
          box-shadow: 0 0 0 4px rgba(var(--bs-danger-rgb), .12);
        }

        .floating-add-vaccination {
          position: fixed;
          right: 28px;
          bottom: 28px;
          width: 58px;
          height: 58px;
          z-index: 1030;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 767.98px) {
          .vaccination-hero {
            padding: 24px !important;
          }

          .floating-add-vaccination {
            right: 18px;
            bottom: 18px;
            width: 52px;
            height: 52px;
          }
        }
      `}</style>
    </div>
  );
}

function VaccinationCard({ item, onView, onEdit, onDelete }) {
  return (
    <article className="vaccination-card card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between gap-3 mb-4">
          <div className="d-flex gap-3">
            <div className="patient-avatar">
              <PawPrint size={24} />
            </div>

            <div>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <VaccinationStatusBadge status={item.status} />
                <span className="badge rounded-pill bg-light text-dark border">
                  {item.vaccineType}
                </span>
              </div>

              <h5 className="fw-bold mb-1">{item.patientName}</h5>
              <small className="text-secondary">
                {item.species} · {item.breed || "Breed not specified"}
              </small>
            </div>
          </div>

          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-sm btn-light border"
              onClick={onEdit}
              title="Edit"
            >
              <Edit3 size={16} />
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="border rounded-4 p-3 mb-4">
          <small className="text-secondary d-block mb-1">
            Vaccine
          </small>
          <div className="fw-bold">{item.vaccineName}</div>
          <small className="text-secondary">
            {item.doseNumber || "Dose not specified"} · Batch{" "}
            {item.batchNumber || "N/A"}
          </small>
        </div>

        <div className="d-grid gap-3 mb-4">
          <RecordInfo
            icon={UserRound}
            text={`Owner: ${item.ownerName}`}
          />
          <RecordInfo
            icon={CalendarDays}
            text={`Administered: ${formatDate(
              item.dateAdministered
            )}`}
          />
          <RecordInfo
            icon={Clock3}
            text={`Next due: ${formatDate(item.nextDueDate)}`}
          />
          <RecordInfo
            icon={ShieldCheck}
            text={`By: ${item.administeredBy}`}
          />
        </div>

        <div className="d-flex justify-content-between align-items-center pt-3 border-top">
          <div>
            <small className="text-secondary d-block">
              Payment
            </small>
            <span className="small fw-semibold">
              {item.paymentStatus} · NPR{" "}
              {Number(item.amount).toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
            onClick={onView}
          >
            Details
            <ChevronRight size={15} />
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
  onChange,
  onSubmit,
  onClose,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
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
        padding: "16px",
        backgroundColor: "rgba(0,0,0,.55)",
      }}
    >
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: "min(1100px, 100%)",
          height: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          className="border-bottom p-3 p-md-4 d-flex justify-content-between gap-3"
          style={{ flexShrink: 0 }}
        >
          <div>
            <h5 className="fw-bold mb-1">
              {editing
                ? "Edit Vaccination Record"
                : "Add Vaccination Record"}
            </h5>
            <small className="text-secondary">
              Enter patient, vaccine and administration information.
            </small>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          />
        </div>

        <div
          className="p-3 p-md-4"
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {formError && (
            <div className="alert alert-danger">{formError}</div>
          )}

          <FormSection title="Patient and owner information">
            <div className="row g-3">
              <FormInput
                label="Patient Name"
                name="patientName"
                value={formData.patientName}
                onChange={onChange}
                required
                col="col-md-4"
              />

              <FormInput
                label="Owner Name"
                name="ownerName"
                value={formData.ownerName}
                onChange={onChange}
                required
                col="col-md-4"
              />

              <FormSelect
                label="Species"
                name="species"
                value={formData.species}
                onChange={onChange}
                options={["Dog", "Cat", "Rabbit", "Bird", "Other"]}
                col="col-md-2"
              />

              <FormSelect
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={onChange}
                options={["Male", "Female", "Unknown"]}
                col="col-md-2"
              />

              <FormInput
                label="Breed"
                name="breed"
                value={formData.breed}
                onChange={onChange}
                col="col-md-6"
              />

              <FormInput
                label="Age"
                name="age"
                value={formData.age}
                onChange={onChange}
                placeholder="e.g. 2 years"
                col="col-md-6"
              />
            </div>
          </FormSection>

          <FormSection title="Vaccine information">
            <div className="row g-3">
              <FormInput
                label="Vaccine Name"
                name="vaccineName"
                value={formData.vaccineName}
                onChange={onChange}
                required
                col="col-md-4"
              />

              <FormSelect
                label="Vaccine Type"
                name="vaccineType"
                value={formData.vaccineType}
                onChange={onChange}
                options={vaccineTypes}
                col="col-md-3"
              />

              <FormInput
                label="Dose Number"
                name="doseNumber"
                value={formData.doseNumber}
                onChange={onChange}
                placeholder="Dose 1 / Booster"
                col="col-md-2"
              />

              <FormInput
                label="Batch Number"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={onChange}
                col="col-md-3"
              />

              <FormInput
                label="Manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={onChange}
                col="col-md-6"
              />

              <FormSelect
                label="Route"
                name="route"
                value={formData.route}
                onChange={onChange}
                options={[
                  "Subcutaneous",
                  "Intramuscular",
                  "Oral",
                  "Intranasal",
                  "Other",
                ]}
                col="col-md-3"
              />

              <FormInput
                label="Injection Site"
                name="site"
                value={formData.site}
                onChange={onChange}
                col="col-md-3"
              />
            </div>
          </FormSection>

          <FormSection title="Administration details">
            <div className="row g-3">
              <FormInput
                label="Date Administered"
                name="dateAdministered"
                type="date"
                value={formData.dateAdministered}
                onChange={onChange}
                required
                col="col-md-3"
              />

              <FormInput
                label="Next Due Date"
                name="nextDueDate"
                type="date"
                value={formData.nextDueDate}
                onChange={onChange}
                required
                col="col-md-3"
              />

              <FormInput
                label="Administered By"
                name="administeredBy"
                value={formData.administeredBy}
                onChange={onChange}
                required
                col="col-md-3"
              />

              <FormInput
                label="Clinic"
                name="clinicName"
                value={formData.clinicName}
                onChange={onChange}
                col="col-md-3"
              />
            </div>
          </FormSection>

          <FormSection title="Status and payment">
            <div className="row g-3">
              <FormSelect
                label="Vaccination Status"
                name="status"
                value={formData.status}
                onChange={onChange}
                options={vaccinationStatuses}
                col="col-md-4"
              />

              <FormSelect
                label="Payment Status"
                name="paymentStatus"
                value={formData.paymentStatus}
                onChange={onChange}
                options={paymentStatuses}
                col="col-md-4"
              />

              <FormInput
                label="Amount"
                name="amount"
                type="number"
                min="0"
                value={formData.amount}
                onChange={onChange}
                col="col-md-4"
              />
            </div>
          </FormSection>

          <FormSection title="Clinical notes">
            <textarea
              className="form-control"
              name="notes"
              rows="5"
              value={formData.notes}
              onChange={onChange}
              placeholder="Adverse reactions, follow-up advice or other clinical notes"
            />
          </FormSection>
        </div>

        <div
          className="border-top p-3 d-flex justify-content-end gap-2"
          style={{ flexShrink: 0, backgroundColor: "#fff" }}
        >
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Cancel
          </button>

          <button type="submit" className="btn btn-primary">
            {editing ? "Update Record" : "Save Record"}
          </button>
        </div>
      </form>
    </div>
  );
}

function VaccinationDetailsModal({ item, onClose, onEdit }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
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
        padding: "16px",
        backgroundColor: "rgba(0,0,0,.55)",
      }}
    >
      <div
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: "min(920px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          className="p-4 text-white"
          style={{
            flexShrink: 0,
            background:
              "linear-gradient(135deg, var(--bs-primary), rgba(var(--bs-primary-rgb), .78))",
          }}
        >
          <div className="d-flex justify-content-between gap-3">
            <div>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <VaccinationStatusBadge status={item.status} />
                <span className="badge bg-white text-primary rounded-pill">
                  {item.vaccineType}
                </span>
              </div>

              <h3 className="fw-bold mb-1">{item.patientName}</h3>
              <p className="text-white-50 mb-0">
                {item.vaccinationId} · {item.vaccineName}
              </p>
            </div>

            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            />
          </div>
        </div>

        <div
          className="p-3 p-md-4"
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          <div className="row g-4">
            <div className="col-md-6">
              <DetailPanel title="Patient and owner">
                <DetailRow label="Patient" value={item.patientName} />
                <DetailRow label="Owner" value={item.ownerName} />
                <DetailRow
                  label="Species"
                  value={`${item.species} · ${item.breed || "N/A"}`}
                />
                <DetailRow label="Gender" value={item.gender} />
                <DetailRow label="Age" value={item.age || "Not set"} />
              </DetailPanel>
            </div>

            <div className="col-md-6">
              <DetailPanel title="Vaccine">
                <DetailRow
                  label="Vaccine Name"
                  value={item.vaccineName}
                />
                <DetailRow label="Type" value={item.vaccineType} />
                <DetailRow
                  label="Dose"
                  value={item.doseNumber || "Not set"}
                />
                <DetailRow
                  label="Batch"
                  value={item.batchNumber || "Not set"}
                />
                <DetailRow
                  label="Manufacturer"
                  value={item.manufacturer || "Not set"}
                />
              </DetailPanel>
            </div>

            <div className="col-md-6">
              <DetailPanel title="Administration">
                <DetailRow
                  label="Administered"
                  value={formatDate(item.dateAdministered)}
                />
                <DetailRow
                  label="Next Due"
                  value={formatDate(item.nextDueDate)}
                />
                <DetailRow
                  label="Administered By"
                  value={item.administeredBy}
                />
                <DetailRow label="Route" value={item.route} />
                <DetailRow
                  label="Site"
                  value={item.site || "Not set"}
                />
              </DetailPanel>
            </div>

            <div className="col-md-6">
              <DetailPanel title="Billing">
                <DetailRow
                  label="Payment"
                  value={item.paymentStatus}
                />
                <DetailRow
                  label="Amount"
                  value={`NPR ${Number(item.amount).toLocaleString()}`}
                />
                <DetailRow label="Clinic" value={item.clinicName} />
              </DetailPanel>
            </div>

            <div className="col-12">
              <DetailPanel title="Clinical notes">
                <p className="small text-secondary mb-0">
                  {item.notes}
                </p>
              </DetailPanel>
            </div>
          </div>
        </div>

        <div
          className="border-top p-3 d-flex justify-content-end gap-2"
          style={{ flexShrink: 0 }}
        >
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
            Edit Record
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="col-6">
      <div className="mini-stat">
        <small className="text-secondary">{label}</small>
        <h4 className="fw-bold mb-0 mt-1">{value}</h4>
      </div>
    </div>
  );
}

function RecordInfo({ icon: Icon, text }) {
  return (
    <div className="record-info">
      <span className="record-info-icon">
        <Icon size={16} />
      </span>
      <span>{text}</span>
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
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function DetailPanel({ title, children }) {
  return (
    <div className="border rounded-4 p-3 h-100">
      <h6 className="fw-bold mb-3">{title}</h6>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <small className="text-secondary">{label}</small>
      <small className="fw-semibold text-end">{value}</small>
    </div>
  );
}

function VaccinationStatusBadge({ status }) {
  const classes = {
    Completed: "bg-success-subtle text-success",
    "Due Soon": "bg-warning-subtle text-warning-emphasis",
    Overdue: "bg-danger-subtle text-danger",
    Cancelled: "bg-secondary-subtle text-secondary",
  };

  const icons = {
    Completed: CheckCircle2,
    "Due Soon": Clock3,
    Overdue: AlertTriangle,
    Cancelled: XCircle,
  };

  const Icon = icons[status] || Syringe;

  return (
    <span
      className={`badge rounded-pill d-inline-flex align-items-center gap-1 ${
        classes[status] || "bg-light text-secondary"
      }`}
    >
      <Icon size={12} />
      {status}
    </span>
  );
}

function formatDate(date) {
  if (!date) return "Not set";

  return new Date(`${date}T00:00:00`).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default Vaccination;
