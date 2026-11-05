import React, { useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock3,
  Copy,
  Gift,
  Plus,
  Search,
  Share2,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";

// ============================================================
// STATIC DEMO DATA
// ============================================================

const initialReferrers = [
  {
    id: "REF-C001",
    name: "Ram Sharma",
    phone: "9841234567",
    code: "RAMVET01",
    referrals: 8,
  },
  {
    id: "REF-C002",
    name: "Sita Gurung",
    phone: "9801234567",
    code: "SITAVET02",
    referrals: 5,
  },
  {
    id: "REF-C003",
    name: "Bikash Thapa",
    phone: "9856023456",
    code: "BIKASH03",
    referrals: 3,
  },
  {
    id: "REF-C004",
    name: "Anita Karki",
    phone: "9812345678",
    code: "ANITAVET04",
    referrals: 11,
  },
];

const initialReferrals = [
  {
    id: "REF-001",
    referrerId: "REF-C001",
    referrer: "Ram Sharma",
    referredName: "Hari Thapa",
    phone: "9845671234",
    pet: "Rocky",
    date: "2026-11-01",
    status: "Converted",
    reward: "100 Loyalty Points",
  },
  {
    id: "REF-002",
    referrerId: "REF-C002",
    referrer: "Sita Gurung",
    referredName: "Maya Gurung",
    phone: "9804567890",
    pet: "Luna",
    date: "2026-11-02",
    status: "Pending",
    reward: "",
  },
  {
    id: "REF-003",
    referrerId: "REF-C004",
    referrer: "Anita Karki",
    referredName: "Ramesh Adhikari",
    phone: "9856078901",
    pet: "Max",
    date: "2026-10-25",
    status: "Converted",
    reward: "100 Loyalty Points",
  },
  {
    id: "REF-004",
    referrerId: "REF-C003",
    referrer: "Bikash Thapa",
    referredName: "Puja Sharma",
    phone: "9815671234",
    pet: "Bella",
    date: "2026-11-03",
    status: "Pending",
    reward: "",
  },
  {
    id: "REF-005",
    referrerId: "REF-C001",
    referrer: "Ram Sharma",
    referredName: "Nabin Karki",
    phone: "9860123456",
    pet: "Charlie",
    date: "2026-10-19",
    status: "Cancelled",
    reward: "",
  },
];

// ============================================================
// COMPONENTS
// ============================================================

function StatCard({ title, value, icon: Icon, subtitle }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between">
            <span className="text-secondary small">{title}</span>
            <div className="bg-primary-subtle text-primary p-2 rounded-3">
              <Icon size={20} />
            </div>
          </div>
          <h3 className="fw-bold mt-3 mb-1">{value}</h3>
          <small className="text-muted">{subtitle}</small>
        </div>
      </div>
    </div>
  );
}

function getStatusClass(status) {
  switch (status) {
    case "Converted":
      return "bg-success-subtle text-success";
    case "Pending":
      return "bg-warning-subtle text-warning-emphasis";
    case "Cancelled":
      return "bg-danger-subtle text-danger";
    default:
      return "bg-light text-dark";
  }
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function Referral() {
  const [referrers, setReferrers] = useState(initialReferrers);
  const [referrals, setReferrals] = useState(initialReferrals);

  const [activeTab, setActiveTab] = useState("referrals");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    referrerId: "",
    referredName: "",
    phone: "",
    pet: "",
  });

  const totalReferrals = referrals.length;

  const convertedReferrals = referrals.filter(
    (item) => item.status === "Converted"
  ).length;

  const pendingReferrals = referrals.filter(
    (item) => item.status === "Pending"
  ).length;

  const conversionRate = totalReferrals
    ? ((convertedReferrals / totalReferrals) * 100).toFixed(1)
    : "0.0";

  const filteredReferrals = useMemo(() => {
    return referrals.filter((item) => {
      const query = search.toLowerCase();

      const matchesSearch =
        item.referrer.toLowerCase().includes(query) ||
        item.referredName.toLowerCase().includes(query) ||
        item.phone.includes(search) ||
        item.pet.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [referrals, search, statusFilter]);

  const leaderboard = useMemo(() => {
    return referrers
      .map((referrer) => ({
        ...referrer,
        recorded: referrals.filter(
          (item) => item.referrerId === referrer.id
        ).length,
        converted: referrals.filter(
          (item) =>
            item.referrerId === referrer.id &&
            item.status === "Converted"
        ).length,
      }))
      .sort(
        (a, b) =>
          b.converted - a.converted ||
          b.recorded - a.recorded
      );
  }, [referrers, referrals]);

  function notify(text) {
    setMessage(text);
  }

  function handleAddReferral(e) {
    e.preventDefault();

    const referrer = referrers.find(
      (item) => item.id === form.referrerId
    );

    if (!referrer || !form.referredName.trim() || !form.phone.trim()) {
      notify("Please complete all required fields.");
      return;
    }

    if (!/^[0-9+ -]{7,20}$/.test(form.phone.trim())) {
      notify("Enter a valid contact number.");
      return;
    }

    setReferrals((previous) => [
      {
        id: `REF-${Date.now()}`,
        referrerId: referrer.id,
        referrer: referrer.name,
        referredName: form.referredName.trim(),
        phone: form.phone.trim(),
        pet: form.pet.trim() || "Not specified",
        date: new Date().toISOString().slice(0, 10),
        status: "Pending",
        reward: "",
      },
      ...previous,
    ]);

    setReferrers((previous) =>
      previous.map((item) =>
        item.id === referrer.id
          ? { ...item, referrals: item.referrals + 1 }
          : item
      )
    );

    setShowAddModal(false);
    setForm({
      referrerId: "",
      referredName: "",
      phone: "",
      pet: "",
    });

    notify("New referral added to the demo.");
  }

  function updateStatus(id, status) {
    setReferrals((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item;

        return {
          ...item,
          status,
          reward:
            status === "Converted"
              ? "100 Loyalty Points"
              : "",
        };
      })
    );

    notify(`Referral status updated to ${status}.`);
  }

  async function copyReferralCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      notify(`Referral code ${code} copied.`);
    } catch {
      notify(`Referral code: ${code}`);
    }
  }

  const tabs = [
    { id: "referrals", label: "All Referrals", icon: Share2 },
    { id: "customers", label: "Referral Codes", icon: Users },
    { id: "leaderboard", label: "Leaderboard", icon: Award },
  ];

  return (
    <div className="container-fluid py-4 px-3 px-lg-4">
      {/* HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Share2 size={26} className="text-primary" />
            Referral Management
          </h4>
          <p className="text-secondary mb-0">
            Grow your clinic through trusted pet owner recommendations.
          </p>
        </div>

        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} />
          Add Referral
        </button>
      </div>

      <div className="alert alert-info rounded-3">
        Static Demo — All customers and referrals shown here
        are sample data. Updates are temporary and are not
        saved to the clinic database.
      </div>

      {message && (
        <div
          className="alert alert-secondary d-flex align-items-center justify-content-between"
          role="status"
        >
          <span>{message}</span>
          <button
            className="btn btn-sm"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* STATS */}
      <div className="row g-3 mb-4">
        <StatCard
          title="Total Referrals"
          value={totalReferrals}
          icon={Share2}
          subtitle="Recorded demo referrals"
        />

        <StatCard
          title="Converted"
          value={convertedReferrals}
          icon={UserCheck}
          subtitle="Successful referrals"
        />

        <StatCard
          title="Pending"
          value={pendingReferrals}
          icon={Clock3}
          subtitle="Awaiting conversion"
        />

        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          subtitle="Converted / total referrals"
        />
      </div>

      {/* CONTENT */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-lg-4">
          {/* TABS */}
          <div className="d-flex flex-wrap gap-2 mb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  className={`btn d-flex align-items-center gap-2 ${
                    activeTab === tab.id
                      ? "btn-primary"
                      : "btn-light"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* REFERRALS */}
          {activeTab === "referrals" && (
            <>
              <div className="d-flex flex-wrap gap-3 mb-3">
                <div
                  className="input-group"
                  style={{ maxWidth: 350 }}
                >
                  <span className="input-group-text bg-white">
                    <Search size={17} />
                  </span>
                  <input
                    className="form-control"
                    placeholder="Search referral, owner, pet..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  className="form-select"
                  style={{ maxWidth: 180 }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Converted">Converted</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Referral ID</th>
                      <th>Referred By</th>
                      <th>New Customer</th>
                      <th>Pet</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Reward</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferrals.map((referral) => (
                      <tr key={referral.id}>
                        <td>
                          <small className="fw-semibold">
                            {referral.id}
                          </small>
                        </td>
                        <td>{referral.referrer}</td>
                        <td>
                          <div className="fw-semibold">
                            {referral.referredName}
                          </div>
                          <small className="text-muted">
                            {referral.phone}
                          </small>
                        </td>
                        <td>{referral.pet}</td>
                        <td>{referral.date}</td>
                        <td>
                          <span
                            className={`badge ${getStatusClass(
                              referral.status
                            )}`}
                          >
                            {referral.status}
                          </span>
                        </td>
                        <td>
                          {referral.reward ? (
                            <span className="text-success small">
                              <Gift size={14} className="me-1" />
                              {referral.reward}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-end">
                          <select
                            className="form-select form-select-sm"
                            style={{ minWidth: 125 }}
                            aria-label={`Status for ${referral.referredName}`}
                            value={referral.status}
                            onChange={(e) =>
                              updateStatus(
                                referral.id,
                                e.target.value
                              )
                            }
                          >
                            <option value="Pending">Pending</option>
                            <option value="Converted">Converted</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}

                    {filteredReferrals.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-4 text-muted"
                        >
                          No referrals found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* REFERRAL CODES */}
          {activeTab === "customers" && (
            <div className="row g-3">
              {referrers.map((referrer) => (
                <div
                  className="col-md-6 col-xl-4"
                  key={referrer.id}
                >
                  <div className="card border rounded-4 h-100">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div
                          className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center"
                          style={{
                            width: 44,
                            height: 44,
                            minWidth: 44,
                          }}
                        >
                          {referrer.name.charAt(0)}
                        </div>

                        <div>
                          <h6 className="fw-bold mb-0">
                            {referrer.name}
                          </h6>
                          <small className="text-muted">
                            {referrer.phone}
                          </small>
                        </div>
                      </div>

                      <small className="text-secondary">
                        Personal Referral Code
                      </small>

                      <div className="d-flex align-items-center justify-content-between bg-light rounded-3 p-3 mt-2 mb-3">
                        <strong className="text-primary">
                          {referrer.code}
                        </strong>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() =>
                            copyReferralCode(referrer.code)
                          }
                          title="Copy code"
                        >
                          <Copy size={16} />
                        </button>
                      </div>

                      <div className="d-flex justify-content-between">
                        <span className="text-secondary small">
                          Sample Total Referrals
                        </span>
                        <strong>{referrer.referrals}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LEADERBOARD */}
          {activeTab === "leaderboard" && (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Rank</th>
                    <th>Customer</th>
                    <th>Referral Code</th>
                    <th>Recorded Referrals</th>
                    <th>Converted</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>

                <tbody>
                  {leaderboard.map((customer, index) => {
                    const rate = customer.recorded
                      ? (
                          (customer.converted / customer.recorded) *
                          100
                        ).toFixed(1)
                      : "0.0";

                    return (
                      <tr key={customer.id}>
                        <td>
                          <span className="fw-bold">
                            #{index + 1}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold">
                            {customer.name}
                          </div>
                          <small className="text-muted">
                            {customer.phone}
                          </small>
                        </td>
                        <td>
                          <code>{customer.code}</code>
                        </td>
                        <td>{customer.recorded}</td>
                        <td>
                          <span className="text-success fw-semibold">
                            {customer.converted}
                          </span>
                        </td>
                        <td>
                          <span className="fw-semibold">
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ADD REFERRAL MODAL */}
      {showAddModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4">
              <div className="modal-header">
                <h5 className="modal-title">
                  Add New Referral
                </h5>

                <button
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowAddModal(false)}
                />
              </div>

              <form onSubmit={handleAddReferral}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      Referred By *
                    </label>
                    <select
                      className="form-select"
                      required
                      value={form.referrerId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          referrerId: e.target.value,
                        })
                      }
                    >
                      <option value="">Select existing customer</option>
                      {referrers.map((referrer) => (
                        <option
                          key={referrer.id}
                          value={referrer.id}
                        >
                          {referrer.name} ({referrer.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      New Customer Name *
                    </label>
                    <input
                      className="form-control"
                      required
                      value={form.referredName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          referredName: e.target.value,
                        })
                      }
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Contact Number *
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      required
                      value={form.phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: e.target.value,
                        })
                      }
                      placeholder="98XXXXXXXX"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Pet Name
                    </label>
                    <input
                      className="form-control"
                      value={form.pet}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          pet: e.target.value,
                        })
                      }
                      placeholder="Enter pet name"
                    />
                  </div>

                  <div className="alert alert-light border small mb-0">
                    The new referral will be created with
                    Pending status. Mark it Converted after
                    verifying that the customer has completed
                    the required clinic visit.
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    <Plus size={16} className="me-1" />
                    Add Referral
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
