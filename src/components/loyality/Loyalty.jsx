
import React, { useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coins,
  Gift,
  Plus,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

// ============================================================
// STATIC DEMO DATA
// ============================================================

const initialMembers = [
  {
    id: "LOY-001",
    name: "Ram Sharma",
    phone: "9841234567",
    pet: "Bruno",
    points: 1250,
    lifetimePoints: 1750,
    visits: 18,
    joined: "2026-07-10",
  },
  {
    id: "LOY-002",
    name: "Sita Gurung",
    phone: "9801234567",
    pet: "Lucy",
    points: 850,
    lifetimePoints: 1050,
    visits: 12,
    joined: "2026-08-15",
  },
  {
    id: "LOY-003",
    name: "Bikash Thapa",
    phone: "9856023456",
    pet: "Max",
    points: 420,
    lifetimePoints: 520,
    visits: 7,
    joined: "2026-09-02",
  },
  {
    id: "LOY-004",
    name: "Anita Karki",
    phone: "9812345678",
    pet: "Bella",
    points: 1750,
    lifetimePoints: 2050,
    visits: 23,
    joined: "2026-06-20",
  },
  {
    id: "LOY-005",
    name: "Prakash Adhikari",
    phone: "9860234567",
    pet: "Rocky",
    points: 190,
    lifetimePoints: 240,
    visits: 4,
    joined: "2026-10-01",
  },
];

const initialTransactions = [
  {
    id: "TXN-001",
    memberId: "LOY-001",
    name: "Ram Sharma",
    type: "Earned",
    points: 150,
    description: "Veterinary consultation",
    date: "2026-11-04",
  },
  {
    id: "TXN-002",
    memberId: "LOY-002",
    name: "Sita Gurung",
    type: "Redeemed",
    points: -200,
    description: "Pet grooming discount",
    date: "2026-11-03",
  },
  {
    id: "TXN-003",
    memberId: "LOY-004",
    name: "Anita Karki",
    type: "Earned",
    points: 250,
    description: "Vaccination package",
    date: "2026-11-02",
  },
];

const initialRewards = [
  {
    id: "RWD-001",
    name: "Free Pet Consultation",
    points: 500,
    description: "One complimentary standard consultation",
    icon: "🩺",
    redeemed: 12,
  },
  {
    id: "RWD-002",
    name: "10% Grooming Discount",
    points: 200,
    description: "Discount on a grooming service",
    icon: "🐾",
    redeemed: 24,
  },
  {
    id: "RWD-003",
    name: "Vaccination Discount",
    points: 800,
    description: "NPR 300 discount on vaccination",
    icon: "💉",
    redeemed: 8,
  },
  {
    id: "RWD-004",
    name: "Pet Care Gift",
    points: 1000,
    description: "Complimentary pet care gift",
    icon: "🎁",
    redeemed: 4,
  },
];

// ============================================================
// HELPERS
// ============================================================

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-US");

function getTier(points) {
  if (points >= 1500) return "Platinum";
  if (points >= 750) return "Gold";
  if (points >= 300) return "Silver";
  return "Bronze";
}

function tierBadge(tier) {
  const classes = {
    Platinum: "bg-primary-subtle text-primary",
    Gold: "bg-warning-subtle text-warning-emphasis",
    Silver: "bg-secondary-subtle text-secondary",
    Bronze: "bg-success-subtle text-success",
  };

  return classes[tier] || "bg-light text-dark";
}

function StatCard({ title, value, icon: Icon, subtitle }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start">
            <span className="text-secondary small">{title}</span>
            <div className="bg-primary-subtle text-primary rounded-3 p-2">
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

// ============================================================
// MAIN PAGE
// ============================================================

export default function Loyalty() {
  const [members, setMembers] = useState(initialMembers);
  const [transactions, setTransactions] = useState(
    initialTransactions
  );
  const [rewards, setRewards] = useState(initialRewards);

  const [activeTab, setActiveTab] = useState("members");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");

  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedReward, setSelectedReward] = useState(null);

  const [pointsForm, setPointsForm] = useState({
    type: "Earned",
    points: "",
    description: "",
  });

  const [rewardForm, setRewardForm] = useState({
    name: "",
    points: "",
    description: "",
  });

  const [message, setMessage] = useState("");

  const totalMembers = members.length;

  const totalAvailablePoints = members.reduce(
    (sum, member) => sum + member.points,
    0
  );

  const lifetimePoints = members.reduce(
    (sum, member) => sum + member.lifetimePoints,
    0
  );

  const totalRedemptions = rewards.reduce(
    (sum, reward) => sum + reward.redeemed,
    0
  );

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.phone.includes(search) ||
        member.pet.toLowerCase().includes(search.toLowerCase());

      const matchesTier =
        tierFilter === "All" ||
        getTier(member.points) === tierFilter;

      return matchesSearch && matchesTier;
    });
  }, [members, search, tierFilter]);

  const leaderboard = [...members].sort(
    (a, b) => b.lifetimePoints - a.lifetimePoints
  );

  function notify(text) {
    setMessage(text);
  }

  function openPoints(member) {
    setSelectedMember(member);
    setPointsForm({
      type: "Earned",
      points: "",
      description: "",
    });
    setShowPointsModal(true);
  }

  function handlePointsSubmit(e) {
    e.preventDefault();

    const points = Number(pointsForm.points);

    if (!selectedMember || !Number.isSafeInteger(points) || points <= 0) {
      notify("Enter a valid positive whole number of points.");
      return;
    }

    const member = members.find(
      (item) => item.id === selectedMember.id
    );

    if (!member) return;

    if (pointsForm.type === "Redeemed" && member.points < points) {
      notify("This member does not have enough points.");
      return;
    }

    const signedPoints =
      pointsForm.type === "Earned" ? points : -points;

    setMembers((previous) =>
      previous.map((item) =>
        item.id === member.id
          ? {
              ...item,
              points: item.points + signedPoints,
              lifetimePoints:
                item.lifetimePoints +
                (pointsForm.type === "Earned" ? points : 0),
            }
          : item
      )
    );

    setTransactions((previous) => [
      {
        id: `TXN-${Date.now()}`,
        memberId: member.id,
        name: member.name,
        type: pointsForm.type,
        points: signedPoints,
        description: pointsForm.description || "Manual adjustment",
        date: new Date().toISOString().slice(0, 10),
      },
      ...previous,
    ]);

    setShowPointsModal(false);
    setSelectedMember(null);
    notify("Loyalty points updated in the demo.");
  }

  function handleAddReward(e) {
    e.preventDefault();

    const points = Number(rewardForm.points);

    if (
      !rewardForm.name.trim() ||
      !Number.isSafeInteger(points) ||
      points <= 0
    ) {
      notify("Enter a reward name and valid point requirement.");
      return;
    }

    setRewards((previous) => [
      ...previous,
      {
        id: `RWD-${Date.now()}`,
        name: rewardForm.name.trim(),
        points,
        description: rewardForm.description.trim(),
        icon: "🎁",
        redeemed: 0,
      },
    ]);

    setRewardForm({
      name: "",
      points: "",
      description: "",
    });

    setShowRewardModal(false);
    notify("Reward added to the demo.");
  }

  function openRedeem(reward) {
    setSelectedReward(reward);
    setSelectedMember(null);
    setShowRedeemModal(true);
  }

  function handleRedeem() {
    if (!selectedMember || !selectedReward) {
      notify("Select a customer before redeeming.");
      return;
    }

    const member = members.find(
      (item) => item.id === selectedMember.id
    );

    if (!member || member.points < selectedReward.points) {
      notify("Insufficient loyalty points.");
      return;
    }

    setMembers((previous) =>
      previous.map((item) =>
        item.id === member.id
          ? {
              ...item,
              points: item.points - selectedReward.points,
            }
          : item
      )
    );

    setRewards((previous) =>
      previous.map((reward) =>
        reward.id === selectedReward.id
          ? { ...reward, redeemed: reward.redeemed + 1 }
          : reward
      )
    );

    setTransactions((previous) => [
      {
        id: `TXN-${Date.now()}`,
        memberId: member.id,
        name: member.name,
        type: "Redeemed",
        points: -selectedReward.points,
        description: selectedReward.name,
        date: new Date().toISOString().slice(0, 10),
      },
      ...previous,
    ]);

    setShowRedeemModal(false);
    setSelectedMember(null);
    setSelectedReward(null);
    notify("Reward redeemed successfully in the demo.");
  }

  const tabs = [
    { id: "members", label: "Members", icon: Users },
    { id: "rewards", label: "Rewards", icon: Gift },
    { id: "transactions", label: "Point History", icon: Clock3 },
    { id: "leaderboard", label: "Leaderboard", icon: Award },
  ];

  return (
    <div className="container-fluid py-4 px-3 px-lg-4">
      {/* HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Gift size={26} className="text-primary" />
            Loyalty Management
          </h4>
          <p className="text-secondary mb-0">
            Reward pet owners and encourage repeat visits.
          </p>
        </div>
        <span className="badge bg-info-subtle text-info-emphasis px-3 py-2">
          Static Demo
        </span>
      </div>

      <div className="alert alert-info rounded-3">
        This is a demonstration module using sample customers.
        Changes are temporary and are not saved to the clinic database.
      </div>

      {message && (
        <div
          className="alert alert-secondary d-flex justify-content-between align-items-center"
          role="status"
        >
          <span>{message}</span>
          <button
            className="btn btn-sm"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* STATS */}
      <div className="row g-3 mb-4">
        <StatCard
          title="Loyalty Members"
          value={formatNumber(totalMembers)}
          icon={Users}
          subtitle="Registered demo customers"
        />
        <StatCard
          title="Available Points"
          value={formatNumber(totalAvailablePoints)}
          icon={Coins}
          subtitle="Current member balances"
        />
        <StatCard
          title="Lifetime Points"
          value={formatNumber(lifetimePoints)}
          icon={TrendingUp}
          subtitle="Total points earned"
        />
        <StatCard
          title="Rewards Redeemed"
          value={formatNumber(totalRedemptions)}
          icon={Gift}
          subtitle="Sample and new redemptions"
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-lg-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div className="d-flex flex-wrap gap-2">
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

            {activeTab === "rewards" && (
              <button
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={() => setShowRewardModal(true)}
              >
                <Plus size={18} />
                Add Reward
              </button>
            )}
          </div>

          {/* MEMBERS TAB */}
          {activeTab === "members" && (
            <>
              <div className="d-flex flex-wrap gap-3 mb-3">
                <div className="input-group" style={{ maxWidth: 340 }}>
                  <span className="input-group-text bg-white">
                    <Search size={17} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search member, pet or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  className="form-select"
                  style={{ maxWidth: 170 }}
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                >
                  <option value="All">All Tiers</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Customer</th>
                      <th>Pet</th>
                      <th>Membership Tier</th>
                      <th>Points</th>
                      <th>Visits</th>
                      <th>Joined</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <div className="fw-semibold">{member.name}</div>
                          <small className="text-muted">{member.phone}</small>
                        </td>
                        <td>{member.pet}</td>
                        <td>
                          <span
                            className={`badge rounded-pill ${tierBadge(
                              getTier(member.points)
                            )}`}
                          >
                            {getTier(member.points)}
                          </span>
                        </td>
                        <td className="fw-semibold">
                          <Coins size={15} className="text-warning me-1" />
                          {formatNumber(member.points)}
                        </td>
                        <td>{member.visits}</td>
                        <td>{member.joined}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openPoints(member)}
                          >
                            Manage Points
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          No matching members found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* REWARDS TAB */}
          {activeTab === "rewards" && (
            <div className="row g-3">
              {rewards.map((reward) => (
                <div className="col-md-6 col-xl-3" key={reward.id}>
                  <div className="card rounded-4 border h-100">
                    <div className="card-body p-4 d-flex flex-column">
                      <div
                        className="bg-light rounded-3 d-flex align-items-center justify-content-center mb-3"
                        style={{ width: 60, height: 60, fontSize: 30 }}
                      >
                        {reward.icon}
                      </div>
                      <h6 className="fw-bold">{reward.name}</h6>
                      <p className="small text-secondary flex-grow-1">
                        {reward.description}
                      </p>
                      <div className="d-flex justify-content-between mb-3">
                        <span className="fw-bold text-primary">
                          {formatNumber(reward.points)} pts
                        </span>
                        <small className="text-muted">
                          {reward.redeemed} redeemed
                        </small>
                      </div>
                      <button
                        className="btn btn-outline-primary w-100"
                        onClick={() => openRedeem(reward)}
                      >
                        Redeem Reward
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === "transactions" && (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.date}</td>
                      <td>{transaction.name}</td>
                      <td>{transaction.description}</td>
                      <td>
                        <span
                          className={`badge ${
                            transaction.type === "Earned"
                              ? "bg-success-subtle text-success"
                              : "bg-warning-subtle text-warning-emphasis"
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td
                        className={`fw-semibold ${
                          transaction.points > 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {transaction.points > 0 ? "+" : ""}
                        {transaction.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === "leaderboard" && (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Rank</th>
                    <th>Customer</th>
                    <th>Pet</th>
                    <th>Lifetime Points</th>
                    <th>Visits</th>
                    <th>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((member, index) => (
                    <tr key={member.id}>
                      <td className="fw-bold">#{index + 1}</td>
                      <td>{member.name}</td>
                      <td>{member.pet}</td>
                      <td className="fw-semibold">
                        {formatNumber(member.lifetimePoints)}
                      </td>
                      <td>{member.visits}</td>
                      <td>
                        <span
                          className={`badge ${tierBadge(
                            getTier(member.points)
                          )}`}
                        >
                          {getTier(member.points)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* POINTS MODAL */}
      {showPointsModal && (
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
                <h5 className="modal-title">Manage Loyalty Points</h5>
                <button
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowPointsModal(false)}
                />
              </div>
              <form onSubmit={handlePointsSubmit}>
                <div className="modal-body">
                  <p className="text-secondary">
                    Customer: <strong>{selectedMember?.name}</strong>
                  </p>
                  <p>
                    Available Points:{" "}
                    <strong>{selectedMember
                      ? members.find((m) => m.id === selectedMember.id)?.points
                      : 0}</strong>
                  </p>
                  <div className="mb-3">
                    <label className="form-label">Action</label>
                    <select
                      className="form-select"
                      value={pointsForm.type}
                      onChange={(e) =>
                        setPointsForm({
                          ...pointsForm,
                          type: e.target.value,
                        })
                      }
                    >
                      <option value="Earned">Award Points</option>
                      <option value="Redeemed">Deduct Points</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Points</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      className="form-control"
                      value={pointsForm.points}
                      onChange={(e) =>
                        setPointsForm({
                          ...pointsForm,
                          points: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Reason</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={pointsForm.description}
                      onChange={(e) =>
                        setPointsForm({
                          ...pointsForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Reason for adjustment"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowPointsModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Save Points
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ADD REWARD MODAL */}
      {showRewardModal && (
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
                <h5 className="modal-title">Add Loyalty Reward</h5>
                <button
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowRewardModal(false)}
                />
              </div>
              <form onSubmit={handleAddReward}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Reward Name</label>
                    <input
                      className="form-control"
                      required
                      value={rewardForm.name}
                      onChange={(e) =>
                        setRewardForm({
                          ...rewardForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Required Points</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="form-control"
                      required
                      value={rewardForm.points}
                      onChange={(e) =>
                        setRewardForm({
                          ...rewardForm,
                          points: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={rewardForm.description}
                      onChange={(e) =>
                        setRewardForm({
                          ...rewardForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowRewardModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Add Reward
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* REDEEM MODAL */}
      {showRedeemModal && (
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
                <h5 className="modal-title">Redeem Reward</h5>
                <button
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowRedeemModal(false)}
                />
              </div>
              <div className="modal-body">
                <h6>{selectedReward?.name}</h6>
                <p className="text-primary fw-bold">
                  {selectedReward?.points} Points Required
                </p>
                <label className="form-label">Select Customer</label>
                <select
                  className="form-select"
                  value={selectedMember?.id || ""}
                  onChange={(e) =>
                    setSelectedMember(
                      members.find((m) => m.id === e.target.value) ||
                        null
                    )
                  }
                >
                  <option value="">Select customer</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {member.points} points
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-light"
                  onClick={() => setShowRedeemModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleRedeem}
                >
                  Confirm Redemption
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
