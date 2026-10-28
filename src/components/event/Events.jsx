import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  Edit3,
  Eye,
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

const initialEvents = [
  {
    id: 1,
    eventId: "EVT-0001",
    title: "Free Rabies Vaccination Camp",
    type: "Vaccination Camp",
    date: "2026-07-25",
    startTime: "09:00",
    endTime: "16:00",
    registrationDeadline: "2026-07-24",
    venueName: "Gandaki vet and pet",
    address: "Lakeside, Pokhara",
    city: "Pokhara",
    organizerName: "Gandaki vet and pet",
    contactPerson: "Dr. Suman Adhikari",
    phone: "9800000001",
    email: "events@pokharapethouse.com",
    maxParticipants: 80,
    registeredCount: 48,
    registrationRequired: "Yes",
    registrationFee: 0,
    status: "Upcoming",
    description:
      "A free rabies vaccination camp for dogs and cats with basic health screening and owner counselling.",
    notes:
      "Owners should bring previous vaccination records when available.",
  },
  {
    id: 2,
    eventId: "EVT-0002",
    title: "Pet Nutrition Seminar",
    type: "Seminar",
    date: "2026-07-21",
    startTime: "13:00",
    endTime: "15:30",
    registrationDeadline: "2026-07-20",
    venueName: "Conference Hall",
    address: "New Road, Pokhara",
    city: "Pokhara",
    organizerName: "Vet Nutrition Nepal",
    contactPerson: "Mina Gurung",
    phone: "9811112233",
    email: "info@vetnutritionnepal.com",
    maxParticipants: 60,
    registeredCount: 54,
    registrationRequired: "Yes",
    registrationFee: 300,
    status: "Ongoing",
    description:
      "A seminar on balanced pet nutrition, feeding routines and prevention of diet-related disease.",
    notes:
      "Certificates will be provided to registered participants.",
  },
  {
    id: 3,
    eventId: "EVT-0003",
    title: "Veterinary Staff Training",
    type: "Training",
    date: "2026-07-12",
    startTime: "10:00",
    endTime: "17:00",
    registrationDeadline: "2026-07-10",
    venueName: "Training Room",
    address: "Gandaki vet and pet",
    city: "Pokhara",
    organizerName: "Gandaki vet and pet",
    contactPerson: "Dr. Nisha Karki",
    phone: "9845001122",
    email: "training@pokharapethouse.com",
    maxParticipants: 25,
    registeredCount: 25,
    registrationRequired: "Yes",
    registrationFee: 0,
    status: "Completed",
    description:
      "Internal training on emergency handling, triage and patient safety.",
    notes: "Attendance was mandatory for clinical staff.",
  },
  {
    id: 4,
    eventId: "EVT-0004",
    title: "Pet Adoption Day",
    type: "Pet Adoption",
    date: "2026-08-02",
    startTime: "11:00",
    endTime: "16:00",
    registrationDeadline: "2026-08-01",
    venueName: "Community Ground",
    address: "Bagar, Pokhara",
    city: "Pokhara",
    organizerName: "Animal Welfare Pokhara",
    contactPerson: "Rabin Thapa",
    phone: "9867008899",
    email: "adoption@awp.org.np",
    maxParticipants: 120,
    registeredCount: 37,
    registrationRequired: "No",
    registrationFee: 0,
    status: "Upcoming",
    description:
      "Adoption event for rescued dogs and cats with counselling for new pet owners.",
    notes: "Adopters should carry valid identification.",
  },
  {
    id: 5,
    eventId: "EVT-0005",
    title: "Animal Welfare Awareness Program",
    type: "Awareness Program",
    date: "2026-08-08",
    startTime: "10:30",
    endTime: "13:30",
    registrationDeadline: "2026-08-07",
    venueName: "City Community Hall",
    address: "Mahendrapul, Pokhara",
    city: "Pokhara",
    organizerName: "VetNear Community Team",
    contactPerson: "Saraswati KC",
    phone: "9856043210",
    email: "community@vetnear.com",
    maxParticipants: 100,
    registeredCount: 63,
    registrationRequired: "Yes",
    registrationFee: 0,
    status: "Upcoming",
    description:
      "Community outreach session on responsible pet ownership and animal welfare.",
    notes: "Open to students, pet owners and community volunteers.",
  },
];

const eventTypes = [
  "Vaccination Camp",
  "Health Camp",
  "Pet Adoption",
  "Awareness Program",
  "Staff Meeting",
  "Training",
  "Seminar",
  "Workshop",
  "Festival",
  "Other",
];

const eventStatuses = [
  "Upcoming",
  "Ongoing",
  "Completed",
  "Cancelled",
];

const createEmptyForm = () => ({
  title: "",
  type: "Vaccination Camp",
  date: "",
  startTime: "",
  endTime: "",
  registrationDeadline: "",
  venueName: "",
  address: "",
  city: "",
  organizerName: "",
  contactPerson: "",
  phone: "",
  email: "",
  maxParticipants: "",
  registeredCount: 0,
  registrationRequired: "Yes",
  registrationFee: 0,
  status: "Upcoming",
  description: "",
  notes: "",
});

function Events() {
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem("clinicEvents");
    return saved ? JSON.parse(saved) : initialEvents;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    localStorage.setItem("clinicEvents", JSON.stringify(events));
  }, [events]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return events
      .filter((event) => {
        const matchesSearch =
          event.title.toLowerCase().includes(term) ||
          event.eventId.toLowerCase().includes(term) ||
          event.organizerName.toLowerCase().includes(term) ||
          event.venueName.toLowerCase().includes(term);

        const matchesType =
          typeFilter === "All" || event.type === typeFilter;

        const matchesStatus =
          statusFilter === "All" || event.status === statusFilter;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events, searchTerm, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return {
      total: events.length,
      upcoming: events.filter((event) => event.status === "Upcoming")
        .length,
      today: events.filter((event) => event.date === today).length,
      completed: events.filter((event) => event.status === "Completed")
        .length,
    };
  }, [events]);

  const featuredEvent =
    filteredEvents.find((event) => event.status === "Ongoing") ||
    filteredEvents.find((event) => event.status === "Upcoming") ||
    filteredEvents[0];

  const upcomingEvents = filteredEvents
    .filter((event) => event.status !== "Completed")
    .slice(0, 4);

  function generateEventId() {
    const highest = events.reduce((max, event) => {
      const number = Number(event.eventId.replace("EVT-", ""));
      return number > max ? number : max;
    }, 0);

    return `EVT-${String(highest + 1).padStart(4, "0")}`;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setFormError("");
  }

  function openAddForm() {
    setEditingId(null);
    setFormData(createEmptyForm());
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(event) {
    setEditingId(event.id);
    setFormData({
      title: event.title,
      type: event.type,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      registrationDeadline: event.registrationDeadline,
      venueName: event.venueName,
      address: event.address,
      city: event.city,
      organizerName: event.organizerName,
      contactPerson: event.contactPerson,
      phone: event.phone,
      email: event.email,
      maxParticipants: event.maxParticipants,
      registeredCount: event.registeredCount,
      registrationRequired: event.registrationRequired,
      registrationFee: event.registrationFee,
      status: event.status,
      description: event.description,
      notes: event.notes,
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

  function validateForm() {
    if (!formData.title.trim()) return "Event title is required.";
    if (!formData.date) return "Event date is required.";
    if (!formData.startTime || !formData.endTime) {
      return "Start and end time are required.";
    }
    if (formData.startTime >= formData.endTime) {
      return "End time must be later than start time.";
    }
    if (!formData.venueName.trim()) return "Venue name is required.";
    if (!formData.organizerName.trim()) {
      return "Organizer name is required.";
    }
    if (
      Number(formData.registeredCount) >
      Number(formData.maxParticipants || 0)
    ) {
      return "Registered participants cannot exceed maximum capacity.";
    }
    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      return "Please enter a valid email address.";
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

    const eventData = {
      title: formData.title.trim(),
      type: formData.type,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      registrationDeadline: formData.registrationDeadline,
      venueName: formData.venueName.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      organizerName: formData.organizerName.trim(),
      contactPerson: formData.contactPerson.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      maxParticipants: Number(formData.maxParticipants) || 0,
      registeredCount: Number(formData.registeredCount) || 0,
      registrationRequired: formData.registrationRequired,
      registrationFee: Number(formData.registrationFee) || 0,
      status: formData.status,
      description:
        formData.description.trim() || "No description provided.",
      notes: formData.notes.trim() || "No additional notes.",
    };

    if (editingId) {
      setEvents((previous) =>
        previous.map((item) =>
          item.id === editingId ? { ...item, ...eventData } : item
        )
      );
    } else {
      setEvents((previous) => [
        {
          id: Date.now(),
          eventId: generateEventId(),
          ...eventData,
        },
        ...previous,
      ]);
    }

    closeForm();
  }

  function handleDelete(id) {
    const event = events.find((item) => item.id === id);
    if (!window.confirm(`Delete ${event?.title || "this event"}?`)) {
      return;
    }

    setEvents((previous) =>
      previous.filter((item) => item.id !== id)
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
        "Event ID",
        "Title",
        "Type",
        "Date",
        "Start Time",
        "End Time",
        "Venue",
        "Organizer",
        "Registered",
        "Capacity",
        "Status",
      ],
      ...filteredEvents.map((event) => [
        event.eventId,
        event.title,
        event.type,
        event.date,
        event.startTime,
        event.endTime,
        event.venueName,
        event.organizerName,
        event.registeredCount,
        event.maxParticipants,
        event.status,
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
    link.download = "veterinary-events.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="event-page">
      <section className="event-hero rounded-4 p-4 p-lg-5 mb-4 overflow-hidden position-relative">
        <div className="event-hero-orb event-hero-orb-one" />
        <div className="event-hero-orb event-hero-orb-two" />

        <div className="row align-items-center g-4 position-relative">
          <div className="col-lg-7">
            <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-75 px-3 py-2 rounded-pill small fw-semibold text-primary mb-3">
              <Sparkles size={16} />
              Community and clinic activities
            </div>

            <h2 className="fw-bold mb-3">
              Events that bring pets, people and care together.
            </h2>

            <p className="text-secondary mb-4" style={{ maxWidth: "650px" }}>
              Plan vaccination camps, seminars, adoption programs, staff
              training and community activities from one organised workspace.
            </p>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-2 px-4"
                onClick={openAddForm}
              >
                <Plus size={18} />
                Create Event
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
            <div className="hero-stat-panel bg-white rounded-4 p-3 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <small className="text-secondary">Event overview</small>
                  <h6 className="fw-bold mb-0">Current activity</h6>
                </div>
                <div className="hero-stat-icon">
                  <CalendarDays size={22} />
                </div>
              </div>

              <div className="row g-2">
                <MiniStat label="Total" value={summary.total} />
                <MiniStat label="Upcoming" value={summary.upcoming} />
                <MiniStat label="Today" value={summary.today} />
                <MiniStat label="Completed" value={summary.completed} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="row g-4">
        <aside className="col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 sticky-xl-top">
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
                <label className="form-label small fw-semibold">Search</label>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">
                    <Search size={17} />
                  </span>
                  <input
                    type="search"
                    className="form-control border-start-0"
                    placeholder="Event or organizer"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">
                  Event type
                </label>
                <select
                  className="form-select"
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value)
                  }
                >
                  <option value="All">All event types</option>
                  {eventTypes.map((type) => (
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
                  {eventStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-top pt-4">
                <p className="small text-secondary mb-2">
                  Showing results
                </p>
                <div className="d-flex align-items-end justify-content-between">
                  <h3 className="fw-bold mb-0">{filteredEvents.length}</h3>
                  <span className="small text-secondary">
                    of {events.length} events
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4 mt-4">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Upcoming timeline</h6>

              <div className="event-timeline">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <button
                      type="button"
                      key={event.id}
                      className="timeline-item border-0 bg-transparent text-start p-0 w-100"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <span className="timeline-dot" />
                      <div>
                        <small className="text-primary fw-semibold">
                          {formatDate(event.date)}
                        </small>
                        <div className="fw-semibold small mt-1">
                          {event.title}
                        </div>
                        <small className="text-secondary">
                          {formatTime(event.startTime)}
                        </small>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="small text-secondary mb-0">
                    No upcoming events.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="col-xl-9">
          {featuredEvent && (
            <section className="featured-event card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
              <div className="row g-0 align-items-stretch">
                <div className="col-lg-7">
                  <div className="p-4 p-lg-5 h-100">
                    <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                      <EventStatusBadge status={featuredEvent.status} />
                      <span className="badge rounded-pill bg-light text-dark border">
                        {featuredEvent.type}
                      </span>
                    </div>

                    <small className="text-primary fw-semibold">
                      Featured Event
                    </small>

                    <h3 className="fw-bold mt-2 mb-3">
                      {featuredEvent.title}
                    </h3>

                    <p className="text-secondary mb-4">
                      {featuredEvent.description}
                    </p>

                    <div className="row g-3 mb-4">
                      <InfoPill
                        icon={CalendarDays}
                        label={formatDate(featuredEvent.date)}
                      />
                      <InfoPill
                        icon={Clock3}
                        label={`${formatTime(
                          featuredEvent.startTime
                        )} – ${formatTime(featuredEvent.endTime)}`}
                      />
                      <InfoPill
                        icon={MapPin}
                        label={featuredEvent.venueName}
                      />
                      <InfoPill
                        icon={Users}
                        label={`${featuredEvent.registeredCount}/${
                          featuredEvent.maxParticipants || "∞"
                        } registered`}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary d-inline-flex align-items-center gap-2"
                      onClick={() => setSelectedEvent(featuredEvent)}
                    >
                      View Event
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>

                <div className="col-lg-5">
                  <div className="featured-visual h-100 d-flex flex-column justify-content-between p-4">
                    <div className="d-flex justify-content-end">
                      <div className="featured-symbol">
                        <CalendarDays size={34} />
                      </div>
                    </div>

                    <div>
                      <small className="text-white-50">
                        Organised by
                      </small>
                      <h5 className="text-white fw-bold mt-1 mb-1">
                        {featuredEvent.organizerName}
                      </h5>
                      <p className="text-white-50 small mb-0">
                        {featuredEvent.contactPerson}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
            <div>
              <h5 className="fw-bold mb-1">All Events</h5>
              <p className="text-secondary small mb-0">
                Browse and manage your current event schedule.
              </p>
            </div>

            <span className="small text-secondary">
              {filteredEvents.length} result
              {filteredEvents.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="row g-4">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <div className="col-md-6" key={event.id}>
                  <EventCard
                    event={event}
                    onView={() => setSelectedEvent(event)}
                    onEdit={() => openEditForm(event)}
                    onDelete={() => handleDelete(event.id)}
                  />
                </div>
              ))
            ) : (
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body py-5 text-center">
                    <CalendarDays
                      size={48}
                      className="text-secondary mb-3"
                    />
                    <h5 className="fw-bold">No events found</h5>
                    <p className="text-secondary">
                      Change your filters or create a new event.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openAddForm}
                    >
                      Add Event
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
        className="floating-add-event btn btn-primary rounded-circle shadow"
        onClick={openAddForm}
        aria-label="Add Event"
      >
        <Plus size={24} />
      </button>

      {showForm && (
        <EventFormModal
          formData={formData}
          formError={formError}
          editing={Boolean(editingId)}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            openEditForm(selectedEvent);
            setSelectedEvent(null);
          }}
        />
      )}

      <style>{`
        .event-page {
          --event-primary: var(--bs-primary);
        }

        .event-hero {
          background:
            linear-gradient(135deg, rgba(var(--bs-primary-rgb), .12), rgba(var(--bs-primary-rgb), .04)),
            #fff;
          border: 1px solid rgba(var(--bs-primary-rgb), .12);
        }

        .event-hero-orb {
          position: absolute;
          border-radius: 50%;
          background: rgba(var(--bs-primary-rgb), .08);
          pointer-events: none;
        }

        .event-hero-orb-one {
          width: 210px;
          height: 210px;
          right: -55px;
          top: -75px;
        }

        .event-hero-orb-two {
          width: 120px;
          height: 120px;
          right: 28%;
          bottom: -70px;
        }

        .hero-stat-panel {
          border: 1px solid rgba(var(--bs-primary-rgb), .1);
        }

        .hero-stat-icon,
        .featured-symbol {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .1);
        }

        .mini-stat {
          background: var(--bs-light);
          border-radius: 14px;
          padding: 14px;
        }

        .event-timeline {
          position: relative;
        }

        .event-timeline::before {
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
          background: var(--bs-primary);
          margin-top: 4px;
          z-index: 1;
          box-shadow: 0 0 0 4px rgba(var(--bs-primary-rgb), .12);
        }

        .featured-event {
          border: 1px solid rgba(var(--bs-primary-rgb), .08) !important;
        }

        .featured-visual {
          min-height: 310px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,.18), transparent 34%),
            linear-gradient(145deg, var(--bs-primary), rgba(var(--bs-primary-rgb), .78));
        }

        .featured-visual .featured-symbol {
          color: #fff;
          background: rgba(255,255,255,.16);
          backdrop-filter: blur(8px);
        }

        .info-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--bs-secondary-color);
          font-size: .9rem;
        }

        .info-pill-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .09);
        }

        .event-card {
          border: 1px solid rgba(var(--bs-primary-rgb), .08) !important;
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .event-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 .75rem 1.75rem rgba(0,0,0,.08) !important;
        }

        .event-date-box {
          width: 62px;
          min-width: 62px;
          border-radius: 16px;
          text-align: center;
          overflow: hidden;
          border: 1px solid rgba(var(--bs-primary-rgb), .12);
        }

        .event-date-month {
          background: var(--bs-primary);
          color: white;
          font-size: .72rem;
          padding: 5px;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .event-date-day {
          font-size: 1.35rem;
          font-weight: 700;
          padding: 9px 5px;
          background: rgba(var(--bs-primary-rgb), .05);
          color: var(--bs-primary);
        }

        .event-progress {
          height: 7px;
          border-radius: 999px;
        }

        .floating-add-event {
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

        @media (max-width: 1199.98px) {
          .sticky-xl-top {
            position: static !important;
          }
        }

        @media (max-width: 767.98px) {
          .event-hero {
            padding: 24px !important;
          }

          .floating-add-event {
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

function EventCard({ event, onView, onEdit, onDelete }) {
  const date = new Date(`${event.date}T00:00:00`);
  const month = date.toLocaleDateString([], { month: "short" });
  const day = date.getDate();

  const capacity = Number(event.maxParticipants) || 0;
  const registered = Number(event.registeredCount) || 0;
  const progress = capacity
    ? Math.min((registered / capacity) * 100, 100)
    : 0;

  return (
    <article className="event-card card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between gap-3 mb-4">
          <div className="d-flex gap-3">
            <div className="event-date-box">
              <div className="event-date-month">{month}</div>
              <div className="event-date-day">{day}</div>
            </div>

            <div>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <EventStatusBadge status={event.status} />
                <span className="badge rounded-pill bg-light text-dark border">
                  {event.type}
                </span>
              </div>

              <h5 className="fw-bold mb-1">{event.title}</h5>
              <small className="text-secondary">{event.eventId}</small>
            </div>
          </div>

          <div className="dropdown">
            <button
              type="button"
              className="btn btn-sm btn-light border rounded-circle"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <MoreVertical size={17} />
            </button>

            <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
              <li>
                <button className="dropdown-item" onClick={onView}>
                  <Eye size={15} className="me-2" />
                  View details
                </button>
              </li>
              <li>
                <button className="dropdown-item" onClick={onEdit}>
                  <Edit3 size={15} className="me-2" />
                  Edit event
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item text-danger"
                  onClick={onDelete}
                >
                  <Trash2 size={15} className="me-2" />
                  Delete event
                </button>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-secondary small mb-4">
          {event.description.length > 120
            ? `${event.description.slice(0, 120)}...`
            : event.description}
        </p>

        <div className="d-grid gap-3 mb-4">
          <InfoPill
            icon={Clock3}
            label={`${formatTime(event.startTime)} – ${formatTime(
              event.endTime
            )}`}
          />
          <InfoPill
            icon={MapPin}
            label={`${event.venueName}, ${event.city}`}
          />
          <InfoPill
            icon={Users}
            label={`${event.registeredCount}/${
              event.maxParticipants || "∞"
            } participants`}
          />
        </div>

        <div className="mb-2 d-flex justify-content-between">
          <small className="text-secondary">Registration</small>
          <small className="fw-semibold">{Math.round(progress)}%</small>
        </div>

        <div className="progress event-progress mb-4">
          <div
            className="progress-bar"
            role="progressbar"
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>

        <div className="d-flex justify-content-between align-items-center pt-3 border-top">
          <div>
            <small className="text-secondary d-block">Organiser</small>
            <span className="small fw-semibold">{event.organizerName}</span>
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

function EventFormModal({
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
          className="border-bottom p-3 p-md-4 d-flex justify-content-between"
          style={{ flexShrink: 0 }}
        >
          <div>
            <h5 className="fw-bold mb-1">
              {editing ? "Edit Event" : "Create New Event"}
            </h5>
            <small className="text-secondary">
              Add schedule, venue, organiser and registration information.
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
          }}
        >
          {formError && (
            <div className="alert alert-danger">{formError}</div>
          )}

          <FormSection title="Basic information">
            <div className="row g-3">
              <FormInput
                label="Event Title"
                name="title"
                value={formData.title}
                onChange={onChange}
                required
                col="col-md-8"
              />
              <FormSelect
                label="Event Type"
                name="type"
                value={formData.type}
                onChange={onChange}
                options={eventTypes}
                col="col-md-4"
              />
            </div>
          </FormSection>

          <FormSection title="Schedule">
            <div className="row g-3">
              <FormInput
                label="Event Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={onChange}
                required
                col="col-md-3"
              />
              <FormInput
                label="Start Time"
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={onChange}
                required
                col="col-md-3"
              />
              <FormInput
                label="End Time"
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={onChange}
                required
                col="col-md-3"
              />
              <FormInput
                label="Registration Deadline"
                name="registrationDeadline"
                type="date"
                value={formData.registrationDeadline}
                onChange={onChange}
                col="col-md-3"
              />
            </div>
          </FormSection>

          <FormSection title="Venue">
            <div className="row g-3">
              <FormInput
                label="Venue Name"
                name="venueName"
                value={formData.venueName}
                onChange={onChange}
                required
                col="col-md-4"
              />
              <FormInput
                label="Address"
                name="address"
                value={formData.address}
                onChange={onChange}
                col="col-md-5"
              />
              <FormInput
                label="City"
                name="city"
                value={formData.city}
                onChange={onChange}
                col="col-md-3"
              />
            </div>
          </FormSection>

          <FormSection title="Organiser">
            <div className="row g-3">
              <FormInput
                label="Organiser Name"
                name="organizerName"
                value={formData.organizerName}
                onChange={onChange}
                required
                col="col-md-4"
              />
              <FormInput
                label="Contact Person"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={onChange}
                col="col-md-3"
              />
              <FormInput
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={onChange}
                col="col-md-2"
              />
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={onChange}
                col="col-md-3"
              />
            </div>
          </FormSection>

          <FormSection title="Registration and status">
            <div className="row g-3">
              <FormInput
                label="Maximum Participants"
                name="maxParticipants"
                type="number"
                min="0"
                value={formData.maxParticipants}
                onChange={onChange}
                col="col-md-3"
              />
              <FormInput
                label="Registered Count"
                name="registeredCount"
                type="number"
                min="0"
                value={formData.registeredCount}
                onChange={onChange}
                col="col-md-3"
              />
              <FormSelect
                label="Registration Required"
                name="registrationRequired"
                value={formData.registrationRequired}
                onChange={onChange}
                options={["Yes", "No"]}
                col="col-md-2"
              />
              <FormInput
                label="Registration Fee"
                name="registrationFee"
                type="number"
                min="0"
                value={formData.registrationFee}
                onChange={onChange}
                col="col-md-2"
              />
              <FormSelect
                label="Status"
                name="status"
                value={formData.status}
                onChange={onChange}
                options={eventStatuses}
                col="col-md-2"
              />
            </div>
          </FormSection>

          <FormSection title="Description and notes">
            <div className="row g-3">
              <div className="col-md-7">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  name="description"
                  rows="5"
                  value={formData.description}
                  onChange={onChange}
                />
              </div>

              <div className="col-md-5">
                <label className="form-label">Important Notes</label>
                <textarea
                  className="form-control"
                  name="notes"
                  rows="5"
                  value={formData.notes}
                  onChange={onChange}
                />
              </div>
            </div>
          </FormSection>
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
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {editing ? "Update Event" : "Save Event"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EventDetailsModal({ event, onClose, onEdit }) {
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
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose();
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
                <EventStatusBadge status={event.status} />
                <span className="badge rounded-pill bg-white text-primary">
                  {event.type}
                </span>
              </div>
              <h3 className="fw-bold mb-2">{event.title}</h3>
              <small className="text-white-50">{event.eventId}</small>
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
              <DetailPanel title="Schedule and venue">
                <DetailRow label="Date" value={formatDate(event.date)} />
                <DetailRow
                  label="Time"
                  value={`${formatTime(event.startTime)} – ${formatTime(
                    event.endTime
                  )}`}
                />
                <DetailRow label="Venue" value={event.venueName} />
                <DetailRow
                  label="Address"
                  value={[event.address, event.city]
                    .filter(Boolean)
                    .join(", ")}
                />
              </DetailPanel>
            </div>

            <div className="col-md-6">
              <DetailPanel title="Organiser">
                <DetailRow
                  label="Organisation"
                  value={event.organizerName}
                />
                <DetailRow
                  label="Contact"
                  value={event.contactPerson || "Not provided"}
                />
                <DetailRow
                  label="Phone"
                  value={event.phone || "Not provided"}
                />
                <DetailRow
                  label="Email"
                  value={event.email || "Not provided"}
                />
              </DetailPanel>
            </div>

            <div className="col-md-6">
              <DetailPanel title="Registration">
                <DetailRow
                  label="Required"
                  value={event.registrationRequired}
                />
                <DetailRow
                  label="Capacity"
                  value={event.maxParticipants || "Unlimited"}
                />
                <DetailRow
                  label="Registered"
                  value={event.registeredCount}
                />
                <DetailRow
                  label="Fee"
                  value={
                    Number(event.registrationFee) > 0
                      ? `NPR ${Number(
                          event.registrationFee
                        ).toLocaleString()}`
                      : "Free"
                  }
                />
              </DetailPanel>
            </div>

            <div className="col-md-6">
              <DetailPanel title="Description">
                <p className="text-secondary small mb-0">
                  {event.description}
                </p>
              </DetailPanel>
            </div>

            <div className="col-12">
              <DetailPanel title="Important notes">
                <p className="text-secondary small mb-0">
                  {event.notes}
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
            Edit Event
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

function InfoPill({ icon: Icon, label }) {
  return (
    <div className="info-pill">
      <span className="info-pill-icon">
        <Icon size={17} />
      </span>
      <span>{label}</span>
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

function EventStatusBadge({ status }) {
  const classes = {
    Upcoming: "bg-warning-subtle text-warning-emphasis",
    Ongoing: "bg-info-subtle text-info-emphasis",
    Completed: "bg-success-subtle text-success",
    Cancelled: "bg-danger-subtle text-danger",
  };

  const icons = {
    Upcoming: Clock3,
    Ongoing: CalendarDays,
    Completed: CheckCircle2,
    Cancelled: XCircle,
  };

  const Icon = icons[status] || CalendarDays;

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

function formatTime(time) {
  if (!time) return "Not set";
  const [hour, minute] = time.split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute));
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default Events;
