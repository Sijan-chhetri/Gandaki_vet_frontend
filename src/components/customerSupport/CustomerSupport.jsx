import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileQuestion,
  Headphones,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserRound,
  X,
} from "lucide-react";

const INITIAL_TICKETS = [
  {
    id: 1,
    ticketNumber: "SUP-1048",
    subject: "Vaccination reminder is not sending",
    category: "Notifications",
    priority: "High",
    status: "Open",
    createdAt: "2026-07-21",
    updatedAt: "2026-07-21",
    message:
      "Vaccination reminders are visible in the dashboard, but email notifications are not being sent to clients.",
  },
  {
    id: 2,
    ticketNumber: "SUP-1042",
    subject: "Need help exporting inventory records",
    category: "Inventory",
    priority: "Medium",
    status: "In Progress",
    createdAt: "2026-07-19",
    updatedAt: "2026-07-20",
    message:
      "I need help understanding the CSV export and how to filter expired stock before downloading.",
  },
  {
    id: 3,
    ticketNumber: "SUP-1033",
    subject: "Clinic logo does not appear on invoice",
    category: "Billing",
    priority: "Low",
    status: "Resolved",
    createdAt: "2026-07-16",
    updatedAt: "2026-07-18",
    message:
      "The clinic logo was uploaded in settings but was missing from generated invoices.",
  },
];

const FAQS = [
  {
    question: "How do I add a new veterinary patient?",
    answer:
      "Open the Patients page, select Add Patient, enter the pet and owner information, then save the record.",
  },
  {
    question: "How do vaccination reminders work?",
    answer:
      "Vaccination reminders are generated from the next due date. You can control email, SMS and desktop alerts from Settings.",
  },
  {
    question: "How do I manage low-stock inventory alerts?",
    answer:
      "Set a reorder level for each inventory item. The system marks the item as Low Stock when its quantity reaches that level.",
  },
  {
    question: "Can I export clinic data?",
    answer:
      "Yes. Inventory and other supported modules include CSV export. Settings also provides a JSON settings backup.",
  },
  {
    question: "How can I change the clinic information?",
    answer:
      "Open Settings, choose Clinic Profile, update the clinic details and save the changes.",
  },
];

const CATEGORIES = [
  "General",
  "Appointments",
  "Patients",
  "Vaccination",
  "Inventory",
  "Billing",
  "Notifications",
  "Account & Security",
  "Technical Issue",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const emptyTicketForm = () => ({
  subject: "",
  category: "General",
  priority: "Medium",
  message: "",
});

export default function CustomerSupport() {
  const [tickets, setTickets] = useState(() => {
    try {
      const saved = localStorage.getItem("vetnearySupportTickets");
      return saved ? JSON.parse(saved) : INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedFaq, setExpandedFaq] = useState(0);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formData, setFormData] = useState(emptyTicketForm);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "vetnearySupportTickets",
      JSON.stringify(tickets)
    );
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(term) ||
        ticket.ticketNumber.toLowerCase().includes(term) ||
        ticket.category.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" || ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, search, statusFilter]);

  const summary = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "Open").length,
      inProgress: tickets.filter(
        (ticket) => ticket.status === "In Progress"
      ).length,
      resolved: tickets.filter(
        (ticket) => ticket.status === "Resolved"
      ).length,
    }),
    [tickets]
  );

  function openTicketModal() {
    setFormData(emptyTicketForm());
    setFormError("");
    setShowTicketModal(true);
  }

  function closeTicketModal() {
    setShowTicketModal(false);
    setFormData(emptyTicketForm());
    setFormError("");
  }

  function handleTicketChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setFormError("");
  }

  function createTicket(event) {
    event.preventDefault();

    if (!formData.subject.trim() || !formData.message.trim()) {
      setFormError("Please enter both a subject and a detailed message.");
      return;
    }

    const nextNumber =
      tickets.reduce((highest, ticket) => {
        const number = Number(ticket.ticketNumber.replace("SUP-", ""));
        return number > highest ? number : highest;
      }, 1000) + 1;

    const today = new Date().toISOString().slice(0, 10);

    const newTicket = {
      id: Date.now(),
      ticketNumber: `SUP-${nextNumber}`,
      subject: formData.subject.trim(),
      category: formData.category,
      priority: formData.priority,
      status: "Open",
      createdAt: today,
      updatedAt: today,
      message: formData.message.trim(),
    };

    setTickets((previous) => [newTicket, ...previous]);
    closeTicketModal();
    setSuccessMessage(
      `Ticket ${newTicket.ticketNumber} was created successfully.`
    );
    window.setTimeout(() => setSuccessMessage(""), 3000);
  }

  return (
    <div className="support-page">
      <section className="support-hero rounded-4 p-4 p-lg-5 mb-4 position-relative overflow-hidden">
        <div className="support-orb support-orb-one" />
        <div className="support-orb support-orb-two" />

        <div className="row align-items-center g-4 position-relative">
          <div className="col-lg-7">
            <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-75 px-3 py-2 rounded-pill text-primary small fw-semibold mb-3">
              <LifeBuoy size={16} />
              Customer support
            </div>

            <h2 className="fw-bold mb-3">
              How can we help your clinic today?
            </h2>

            <p className="text-secondary mb-4" style={{ maxWidth: 680 }}>
              Search help articles, contact the support team or submit a
              ticket for technical and account-related assistance.
            </p>

            <div className="support-search bg-white rounded-4 shadow-sm p-2 d-flex align-items-center gap-2">
              <Search size={20} className="text-secondary ms-2" />
              <input
                type="search"
                className="form-control border-0 shadow-none"
                placeholder="Search support topics, tickets or help articles"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary px-4"
                onClick={() => setActiveTab("tickets")}
              >
                Search
              </button>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="support-agent-card bg-white rounded-4 p-4 shadow-sm">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="support-agent-icon">
                  <Headphones size={25} />
                </div>
                <div>
                  <small className="text-secondary">Support team</small>
                  <h6 className="fw-bold mb-0">We are here to help</h6>
                </div>
              </div>

              <div className="d-grid gap-3">
                <SupportInfo
                  icon={Clock3}
                  title="Support hours"
                  value="Sunday–Friday, 9:00 AM–6:00 PM"
                />
                <SupportInfo
                  icon={Mail}
                  title="Email"
                  value="support@vetneary.com"
                />
                <SupportInfo
                  icon={Phone}
                  title="Phone"
                  value="+977 9800000000"
                />
              </div>

              <button
                type="button"
                className="btn btn-primary w-100 mt-4 d-flex align-items-center justify-content-center gap-2"
                onClick={openTicketModal}
              >
                <Plus size={17} />
                Create Support Ticket
              </button>
            </div>
          </div>
        </div>
      </section>

      {successMessage && (
        <div className="alert alert-success rounded-4 d-flex align-items-center gap-2">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      <div className="support-tabs card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-2 d-flex flex-wrap gap-2">
          <TabButton
            active={activeTab === "overview"}
            icon={Sparkles}
            label="Support Overview"
            onClick={() => setActiveTab("overview")}
          />
          <TabButton
            active={activeTab === "tickets"}
            icon={TicketCheck}
            label="My Tickets"
            onClick={() => setActiveTab("tickets")}
          />
          <TabButton
            active={activeTab === "faq"}
            icon={FileQuestion}
            label="Frequently Asked Questions"
            onClick={() => setActiveTab("faq")}
          />
        </div>
      </div>

      {activeTab === "overview" && (
        <SupportOverview
          summary={summary}
          onCreateTicket={openTicketModal}
          onOpenFaq={() => setActiveTab("faq")}
          onOpenTickets={() => setActiveTab("tickets")}
        />
      )}

      {activeTab === "tickets" && (
        <TicketsSection
          tickets={filteredTickets}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onCreateTicket={openTicketModal}
          onSelectTicket={setSelectedTicket}
        />
      )}

      {activeTab === "faq" && (
        <FaqSection
          expandedFaq={expandedFaq}
          setExpandedFaq={setExpandedFaq}
          onCreateTicket={openTicketModal}
        />
      )}

      {showTicketModal && (
        <TicketModal
          formData={formData}
          error={formError}
          onChange={handleTicketChange}
          onSubmit={createTicket}
          onClose={closeTicketModal}
        />
      )}

      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}

      <style>{`
        .support-page {
          min-height: 100%;
        }

        .support-hero {
          background:
            linear-gradient(
              135deg,
              rgba(var(--bs-primary-rgb), .12),
              rgba(var(--bs-primary-rgb), .035)
            ),
            #fff;
          border: 1px solid rgba(var(--bs-primary-rgb), .12);
        }

        .support-orb {
          position: absolute;
          border-radius: 50%;
          background: rgba(var(--bs-primary-rgb), .08);
          pointer-events: none;
        }

        .support-orb-one {
          width: 220px;
          height: 220px;
          top: -100px;
          right: -60px;
        }

        .support-orb-two {
          width: 130px;
          height: 130px;
          right: 30%;
          bottom: -80px;
        }

        .support-search {
          max-width: 720px;
          border: 1px solid rgba(var(--bs-primary-rgb), .12);
        }

        .support-agent-card {
          border: 1px solid rgba(var(--bs-primary-rgb), .1);
        }

        .support-agent-icon,
        .support-card-icon,
        .support-info-icon,
        .ticket-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .1);
        }

        .support-agent-icon {
          width: 54px;
          height: 54px;
          border-radius: 17px;
          flex-shrink: 0;
        }

        .support-info-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .support-card-icon {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          flex-shrink: 0;
        }

        .ticket-icon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          flex-shrink: 0;
        }

        .support-tabs {
          border: 1px solid rgba(var(--bs-primary-rgb), .08) !important;
        }

        .support-tab-button {
          border: 0;
          border-radius: 12px;
          padding: 10px 16px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: var(--bs-secondary-color);
          font-weight: 600;
        }

        .support-tab-button:hover {
          background: var(--bs-light);
          color: var(--bs-body-color);
        }

        .support-tab-button.active {
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .1);
        }

        .support-stat-card,
        .support-action-card,
        .ticket-card,
        .faq-card {
          border: 1px solid rgba(var(--bs-primary-rgb), .08) !important;
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .support-action-card:hover,
        .ticket-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 .75rem 1.75rem rgba(0,0,0,.07) !important;
        }

        .support-action-card {
          cursor: pointer;
          color: inherit;
          background: #fff;
          text-align: left;
        }

        .ticket-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--bs-secondary-color);
          font-size: .84rem;
        }

        .faq-button {
          width: 100%;
          border: 0;
          background: transparent;
          padding: 0;
          text-align: left;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .faq-answer {
          color: var(--bs-secondary-color);
          padding-top: 14px;
          line-height: 1.7;
        }

        .faq-chevron {
          transition: transform .2s ease;
        }

        .faq-chevron.open {
          transform: rotate(180deg);
        }

        .contact-card {
          background: rgba(var(--bs-primary-rgb), .055);
          border: 1px solid rgba(var(--bs-primary-rgb), .1);
        }

        @media (max-width: 767.98px) {
          .support-hero {
            padding: 24px !important;
          }

          .support-search {
            flex-wrap: wrap;
          }

          .support-search .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function SupportOverview({
  summary,
  onCreateTicket,
  onOpenFaq,
  onOpenTickets,
}) {
  return (
    <>
      <div className="row g-4 mb-4">
        <SummaryCard
          label="Total Tickets"
          value={summary.total}
          icon={TicketCheck}
        />
        <SummaryCard
          label="Open"
          value={summary.open}
          icon={AlertCircle}
        />
        <SummaryCard
          label="In Progress"
          value={summary.inProgress}
          icon={Clock3}
        />
        <SummaryCard
          label="Resolved"
          value={summary.resolved}
          icon={CheckCircle2}
        />
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="mb-4">
                <h5 className="fw-bold mb-1">Popular Support Options</h5>
                <p className="text-secondary small mb-0">
                  Choose the quickest way to find help.
                </p>
              </div>

              <div className="row g-3">
                <SupportAction
                  icon={MessageCircle}
                  title="Create a support ticket"
                  description="Send a detailed request to the support team."
                  action="Create Ticket"
                  onClick={onCreateTicket}
                />
                <SupportAction
                  icon={FileQuestion}
                  title="Browse frequently asked questions"
                  description="Find quick answers to common clinic workflow questions."
                  action="Browse FAQ"
                  onClick={onOpenFaq}
                />
                <SupportAction
                  icon={TicketCheck}
                  title="Track existing requests"
                  description="Review the status and details of submitted tickets."
                  action="View Tickets"
                  onClick={onOpenTickets}
                />
                <SupportAction
                  icon={BookOpen}
                  title="Help documentation"
                  description="Read guides for inventory, vaccination and settings."
                  action="Open Guides"
                  onClick={onOpenFaq}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="contact-card rounded-4 p-4 h-100">
            <div className="support-card-icon mb-4">
              <Headphones size={23} />
            </div>

            <h5 className="fw-bold">Contact Support</h5>
            <p className="text-secondary small">
              For urgent clinic issues, contact our customer support team
              during business hours.
            </p>

            <div className="d-grid gap-3 my-4">
              <SupportInfo
                icon={Mail}
                title="Email support"
                value="support@vetneary.com"
              />
              <SupportInfo
                icon={Phone}
                title="Phone support"
                value="+977 9800000000"
              />
              <SupportInfo
                icon={Clock3}
                title="Average response"
                value="Within 2 business hours"
              />
            </div>

            <button
              type="button"
              className="btn btn-primary w-100"
              onClick={onCreateTicket}
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function TicketsSection({
  tickets,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  onCreateTicket,
  onSelectTicket,
}) {
  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div className="card-body p-3 p-md-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
          <div>
            <h5 className="fw-bold mb-1">My Support Tickets</h5>
            <p className="text-secondary small mb-0">
              Review and track all support requests.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={onCreateTicket}
          >
            <Plus size={17} />
            New Ticket
          </button>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-lg-8">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <Search size={17} />
              </span>
              <input
                className="form-control border-start-0"
                placeholder="Search tickets"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="col-lg-4">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="d-grid gap-3">
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <button
                type="button"
                key={ticket.id}
                className="ticket-card card border-0 shadow-sm rounded-4 text-start"
                onClick={() => onSelectTicket(ticket)}
              >
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between gap-3">
                    <div className="d-flex gap-3">
                      <div className="ticket-icon">
                        <TicketCheck size={20} />
                      </div>

                      <div>
                        <div className="d-flex flex-wrap gap-2 mb-2">
                          <StatusBadge status={ticket.status} />
                          <PriorityBadge priority={ticket.priority} />
                          <span className="badge rounded-pill bg-light text-dark border">
                            {ticket.category}
                          </span>
                        </div>

                        <h6 className="fw-bold mb-1">
                          {ticket.subject}
                        </h6>

                        <div className="ticket-meta flex-wrap">
                          <span>{ticket.ticketNumber}</span>
                          <span>•</span>
                          <span>Created {formatDate(ticket.createdAt)}</span>
                          <span>•</span>
                          <span>Updated {formatDate(ticket.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      size={19}
                      className="text-secondary flex-shrink-0"
                    />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-5">
              <TicketCheck
                size={48}
                className="text-secondary mb-3"
              />
              <h5 className="fw-bold">No tickets found</h5>
              <p className="text-secondary">
                Change the filters or create a new support ticket.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onCreateTicket}
              >
                Create Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FaqSection({
  expandedFaq,
  setExpandedFaq,
  onCreateTicket,
}) {
  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-3 p-md-4">
            <div className="mb-4">
              <h5 className="fw-bold mb-1">
                Frequently Asked Questions
              </h5>
              <p className="text-secondary small mb-0">
                Quick answers for common VetNeary workflows.
              </p>
            </div>

            <div className="d-grid gap-3">
              {FAQS.map((faq, index) => {
                const open = expandedFaq === index;

                return (
                  <div
                    className="faq-card card border-0 rounded-4 shadow-sm"
                    key={faq.question}
                  >
                    <div className="card-body p-4">
                      <button
                        type="button"
                        className="faq-button"
                        onClick={() =>
                          setExpandedFaq(open ? -1 : index)
                        }
                      >
                        <span className="fw-semibold">
                          {faq.question}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`faq-chevron ${
                            open ? "open" : ""
                          }`}
                        />
                      </button>

                      {open && (
                        <div className="faq-answer">{faq.answer}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="contact-card rounded-4 p-4">
          <div className="support-card-icon mb-4">
            <CircleHelp size={23} />
          </div>

          <h5 className="fw-bold">Still need help?</h5>
          <p className="text-secondary small">
            Submit a support ticket with screenshots and detailed steps.
            Our team will review your request.
          </p>

          <button
            type="button"
            className="btn btn-primary w-100 mt-2"
            onClick={onCreateTicket}
          >
            Submit a Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketModal({
  formData,
  error,
  onChange,
  onSubmit,
  onClose,
}) {
  useModalLock(onClose);

  return (
    <ModalShell onClose={onClose}>
      <form
        className="bg-white rounded-4 shadow-lg d-flex flex-column overflow-hidden"
        style={{
          width: "min(720px, 100%)",
          maxHeight: "calc(100vh - 32px)",
        }}
        onSubmit={onSubmit}
      >
        <div className="p-4 border-bottom d-flex justify-content-between gap-3">
          <div>
            <h5 className="fw-bold mb-1">Create Support Ticket</h5>
            <small className="text-secondary">
              Describe the issue clearly so our team can assist faster.
            </small>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          />
        </div>

        <div className="p-4 overflow-auto">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="mb-3">
            <label className="form-label fw-semibold">
              Subject <span className="text-danger">*</span>
            </label>
            <input
              className="form-control"
              name="subject"
              value={formData.subject}
              onChange={onChange}
              placeholder="Briefly describe the issue"
            />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Category</label>
              <select
                className="form-select"
                name="category"
                value={formData.category}
                onChange={onChange}
              >
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">Priority</label>
              <select
                className="form-select"
                name="priority"
                value={formData.priority}
                onChange={onChange}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">
              Message <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-control"
              rows="7"
              name="message"
              value={formData.message}
              onChange={onChange}
              placeholder="Explain what happened, what you expected and any steps already tried"
            />
          </div>

          <div className="rounded-4 bg-light border p-3">
            <div className="d-flex gap-3">
              <ShieldCheck
                size={20}
                className="text-primary flex-shrink-0"
              />
              <small className="text-secondary">
                Do not include passwords, payment card details or other
                sensitive credentials in your support message.
              </small>
            </div>
          </div>
        </div>

        <div className="border-top p-3 d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <Send size={16} />
            Submit Ticket
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function TicketDetailsModal({ ticket, onClose }) {
  useModalLock(onClose);

  return (
    <ModalShell onClose={onClose}>
      <div
        className="bg-white rounded-4 shadow-lg d-flex flex-column overflow-hidden"
        style={{
          width: "min(760px, 100%)",
          maxHeight: "calc(100vh - 32px)",
        }}
      >
        <div
          className="p-4 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--bs-primary), rgba(var(--bs-primary-rgb), .78))",
          }}
        >
          <div className="d-flex justify-content-between gap-3">
            <div>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>

              <h4 className="fw-bold mb-1">{ticket.subject}</h4>
              <p className="text-white-50 mb-0">
                {ticket.ticketNumber} · {ticket.category}
              </p>
            </div>

            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            />
          </div>
        </div>

        <div className="p-4 overflow-auto">
          <div className="row g-3 mb-4">
            <DetailBox
              label="Created"
              value={formatDate(ticket.createdAt)}
            />
            <DetailBox
              label="Last Updated"
              value={formatDate(ticket.updatedAt)}
            />
            <DetailBox
              label="Priority"
              value={ticket.priority}
            />
            <DetailBox
              label="Status"
              value={ticket.status}
            />
          </div>

          <div className="border rounded-4 p-4 mb-4">
            <h6 className="fw-bold mb-3">Your message</h6>
            <p className="text-secondary mb-0">{ticket.message}</p>
          </div>

          <div className="border rounded-4 p-4">
            <div className="d-flex gap-3">
              <div className="ticket-icon">
                <UserRound size={20} />
              </div>

              <div>
                <h6 className="fw-bold mb-1">Support Team</h6>
                <p className="text-secondary small mb-0">
                  Your request is being reviewed. Updates will appear here
                  and may also be sent through your selected notification
                  channels.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-top p-3 d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="support-stat-card card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4 d-flex justify-content-between align-items-center">
          <div>
            <small className="text-secondary">{label}</small>
            <h3 className="fw-bold mb-0 mt-1">{value}</h3>
          </div>

          <div className="support-card-icon">
            <Icon size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportAction({
  icon: Icon,
  title,
  description,
  action,
  onClick,
}) {
  return (
    <div className="col-md-6">
      <button
        type="button"
        className="support-action-card card border-0 shadow-sm rounded-4 h-100 w-100"
        onClick={onClick}
      >
        <div className="card-body p-4">
          <div className="support-card-icon mb-3">
            <Icon size={22} />
          </div>

          <h6 className="fw-bold">{title}</h6>
          <p className="text-secondary small">{description}</p>

          <span className="text-primary small fw-semibold d-inline-flex align-items-center gap-1">
            {action}
            <ChevronRight size={15} />
          </span>
        </div>
      </button>
    </div>
  );
}

function SupportInfo({ icon: Icon, title, value }) {
  return (
    <div className="d-flex align-items-center gap-3">
      <span className="support-info-icon">
        <Icon size={17} />
      </span>

      <div>
        <small className="text-secondary d-block">{title}</small>
        <span className="small fw-semibold">{value}</span>
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`support-tab-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const classes = {
    Open: "bg-danger-subtle text-danger",
    "In Progress": "bg-warning-subtle text-warning-emphasis",
    Resolved: "bg-success-subtle text-success",
    Closed: "bg-secondary-subtle text-secondary",
  };

  return (
    <span
      className={`badge rounded-pill ${
        classes[status] || "bg-light text-dark"
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const classes = {
    Low: "bg-light text-secondary border",
    Medium: "bg-primary-subtle text-primary",
    High: "bg-warning-subtle text-warning-emphasis",
    Urgent: "bg-danger-subtle text-danger",
  };

  return (
    <span
      className={`badge rounded-pill ${
        classes[priority] || "bg-light text-dark"
      }`}
    >
      {priority}
    </span>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="col-6">
      <div className="rounded-4 bg-light border p-3">
        <small className="text-secondary d-block">{label}</small>
        <span className="fw-semibold small">{value}</span>
      </div>
    </div>
  );
}

function ModalShell({ children, onClose }) {
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
        padding: 16,
        background: "rgba(0, 0, 0, .55)",
      }}
    >
      {children}
    </div>
  );
}

function useModalLock(onClose) {
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
}

function formatDate(date) {
  if (!date) return "Not set";

  return new Date(`${date}T00:00:00`).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
