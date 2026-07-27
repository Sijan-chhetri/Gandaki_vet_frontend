import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  Clock3,
  ContactRound,
  Menu,
  Package,
  PawPrint,
  Plus,
  ReceiptText,
  ShoppingCart,
  Syringe,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar";

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: "Vaccination due today",
    message: "Bella is due for the Rabies vaccination.",
    time: "5 min ago",
    type: "vaccniation",
    read: false,
  },
  {
    id: 2,
    title: "New appointment booked",
    message: "Rocky has an appointment at 2:30 PM.",
    time: "24 min ago",
    type: "appointment",
    read: false,
  },
  {
    id: 3,
    title: "Low inventory warning",
    message: "Rabies Vaccine stock is below the reorder level.",
    time: "1 hour ago",
    type: "inventory",
    read: false,
  },
  {
    id: 4,
    title: "Payment received",
    message: "Invoice INV-1045 has been paid.",
    time: "Yesterday",
    type: "payment",
    read: true,
  },
];

const RECENT_ACTIVITIES = [
  {
    id: 1,
    title: "Patient record updated",
    description: "Medical record updated for Max.",
    time: "10 min ago",
    icon: PawPrint,
  },
  {
    id: 2,
    title: "Appointment completed",
    description: "General checkup for Bella was completed.",
    time: "45 min ago",
    icon: CalendarDays,
  },
  {
    id: 3,
    title: "New owner added",
    description: "A new pet owner was registered.",
    time: "2 hours ago",
    icon: ContactRound,
  },
  {
    id: 4,
    title: "Stock adjusted",
    description: "Inventory quantity was updated.",
    time: "Yesterday",
    icon: Package,
  },
];

const QUICK_ACTIONS = [
  {
    label: "Add Pet Owner",
    description: "Register a new pet owner",
    icon: ContactRound,
    to: "/owners",
    action: "add",

  },
  {
    label: "Add Patient",
    description: "Create a new patient record",
    icon: PawPrint,
    to: "/patients",
    action: "add",
  },
  {
    label: "Book Appointment",
    description: "Schedule a clinic appointment",
    icon: CalendarDays,
    to: "/appointments",
    action: "add",

  },
  {
    label: "Add Staff",
    description: "Register a clinic staff member",
    icon: Users,
    to: "/staff",
    action: "add",

  },
  {
    label: "Add Vaccination",
    description: "Create a vaccination record",
    icon: Syringe,
    to: "/vaccniation",
    action: "add",

  },
  {
    label: "Add Inventory Item",
    description: "Create a stock item",
    icon: Package,
    to: "/inventory",
    action: "add",

  },
  {
    label: "Create Sale",
    description: "Record a clinic sale",
    icon: ReceiptText,
    to: "/sales",
    action: "add",

  },
  {
    label: "Create Purchase",
    description: "Record a supplier purchase",
    icon: ShoppingCart,
    to: "/purchases",
    action: "add",

  },
];

function Header({ onMenuClick }) {
  const navigate = useNavigate();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [notifications, setNotifications] = useState(
    INITIAL_NOTIFICATIONS
  );

  const notificationRef = useRef(null);
  const activityRef = useRef(null);
  const quickActionRef = useRef(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  useEffect(() => {
    function handleOutsideClick(event) {
      const clickedInsideNotification =
        notificationRef.current?.contains(event.target);
      const clickedInsideActivity =
        activityRef.current?.contains(event.target);
      const clickedInsideQuickAction =
        quickActionRef.current?.contains(event.target);

      if (
        !clickedInsideNotification &&
        !clickedInsideActivity &&
        !clickedInsideQuickAction
      ) {
        setOpenDropdown(null);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function toggleDropdown(name) {
    setOpenDropdown((current) => (current === name ? null : name));
  }

  function markAllAsRead() {
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  }

  function openNotification(notification) {
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === notification.id
          ? { ...item, read: true }
          : item
      )
    );

    const routes = {
      vaccniation: "/vaccniation",
      appointment: "/appointments",
      inventory: "/inventory",
      payment: "/sales",
    };

    setOpenDropdown(null);
    navigate(routes[notification.type] || "/dashboard");
  }

  function openQuickAction(action) {
  setOpenDropdown(null);

  navigate(action.to, {
    state: {
      action: action.action,
    },
  });
}

  return (
    <header className="app-header bg-white border-bottom sticky-top">
      <div className="container-fluid px-3 px-md-4 py-3">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-light border d-lg-none"
              onClick={onMenuClick}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>

            <div className="d-none d-md-block">
              <h5 className="mb-0 fw-bold">Clinic Dashboard</h5>
              <small className="text-secondary">
                Manage your veterinary clinic
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-end gap-2 flex-grow-1">
            <div className="d-none d-md-block">
              <SearchBar />
            </div>

            <div className="position-relative" ref={notificationRef}>
              <button
                type="button"
                className={`btn border position-relative rounded-3 ${
                  openDropdown === "notifications"
                    ? "btn-primary"
                    : "btn-light"
                }`}
                aria-label="Notifications"
                aria-expanded={openDropdown === "notifications"}
                onClick={() => toggleDropdown("notifications")}
              >
                <Bell size={19} />

                {unreadCount > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: "0.6rem" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {openDropdown === "notifications" && (
                <div className="header-dropdown notification-dropdown bg-white border rounded-4 shadow-lg">
                  <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
                    <div>
                      <h6 className="fw-bold mb-0">Notifications</h6>
                      <small className="text-secondary">
                        {unreadCount} unread notification
                        {unreadCount === 1 ? "" : "s"}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-light border d-flex align-items-center gap-1"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                    >
                      <CheckCheck size={15} />
                      <span className="d-none d-sm-inline">
                        Mark all read
                      </span>
                    </button>
                  </div>

                  <div className="header-dropdown-scroll">
                    {notifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        className={`dropdown-list-item w-100 border-0 text-start ${
                          notification.read ? "" : "unread"
                        }`}
                        onClick={() =>
                          openNotification(notification)
                        }
                      >
                        <span
                          className={`notification-icon notification-${notification.type}`}
                        >
                          <NotificationIcon
                            type={notification.type}
                          />
                        </span>

                        <span className="flex-grow-1">
                          <span className="d-flex align-items-start justify-content-between gap-3">
                            <span className="fw-semibold small text-dark">
                              {notification.title}
                            </span>

                            {!notification.read && (
                              <span className="unread-dot" />
                            )}
                          </span>

                          <span className="d-block text-secondary small mt-1">
                            {notification.message}
                          </span>

                          <span className="d-flex align-items-center gap-1 text-primary mt-2 notification-time">
                            <Clock3 size={13} />
                            {notification.time}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="border-top p-2">
                    <button
                      type="button"
                      className="btn btn-light w-100 small"
                      onClick={() => {
                        setOpenDropdown(null);
                        navigate("/notifications");
                      }}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div
              className="position-relative d-none d-sm-block"
              ref={activityRef}
            >
              <button
                type="button"
                className={`btn border rounded-3 ${
                  openDropdown === "activity"
                    ? "btn-primary"
                    : "btn-light"
                }`}
                aria-label="Recent activity"
                aria-expanded={openDropdown === "activity"}
                onClick={() => toggleDropdown("activity")}
              >
                <Clock3 size={19} />
              </button>

              {openDropdown === "activity" && (
                <div className="header-dropdown activity-dropdown bg-white border rounded-4 shadow-lg">
                  <div className="p-3 border-bottom">
                    <h6 className="fw-bold mb-0">Recent Activity</h6>
                    <small className="text-secondary">
                      Latest actions in your clinic
                    </small>
                  </div>

                  <div className="header-dropdown-scroll">
                    {RECENT_ACTIVITIES.map((activity) => {
                      const Icon = activity.icon;

                      return (
                        <div
                          className="dropdown-list-item"
                          key={activity.id}
                        >
                          <span className="activity-icon">
                            <Icon size={17} />
                          </span>

                          <span className="flex-grow-1">
                            <span className="d-block fw-semibold small">
                              {activity.title}
                            </span>

                            <span className="d-block text-secondary small mt-1">
                              {activity.description}
                            </span>

                            <span className="d-flex align-items-center gap-1 text-secondary mt-2 notification-time">
                              <Clock3 size={13} />
                              {activity.time}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-top p-2">
                    <button
                      type="button"
                      className="btn btn-light w-100 small"
                      onClick={() => {
                        setOpenDropdown(null);
                        navigate("/activity");
                      }}
                    >
                      View complete activity
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="position-relative" ref={quickActionRef}>
              <button
                type="button"
                className={`btn border d-flex align-items-center gap-2 rounded-3 ${
                  openDropdown === "quick"
                    ? "btn-primary"
                    : "btn-light"
                }`}
                aria-label="Create new"
                aria-expanded={openDropdown === "quick"}
                onClick={() => toggleDropdown("quick")}
              >
                {openDropdown === "quick" ? (
                  <X size={18} />
                ) : (
                  <Plus size={18} />
                )}

                <span className="d-none d-lg-inline small fw-semibold">
                  Create
                </span>
              </button>

              {openDropdown === "quick" && (
                <div className="header-dropdown quick-action-dropdown bg-white border rounded-4 shadow-lg">
                  <div className="p-3 border-bottom">
                    <h6 className="fw-bold mb-0">Quick Create</h6>
                    <small className="text-secondary">
                      Add a new clinic record
                    </small>
                  </div>

                  <div className="p-2 quick-action-grid">
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon;

                      return (
                        <button
                          type="button"
                          key={action.label}
                          className="quick-action-item border-0 text-start"
                          onClick={() => openQuickAction(action)}
                        >
                          <span className="quick-action-icon">
                            <Icon size={18} />
                          </span>

                          <span>
                            <span className="d-block fw-semibold small">
                              {action.label}
                            </span>
                            <span className="d-block text-secondary quick-action-description">
                              {action.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-3 border-top bg-light rounded-bottom-4">
                    <div className="d-flex align-items-center gap-2 text-secondary">
                      <UserPlus size={15} />
                      <small>
                        Select an option to open its creation form.
                      </small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="d-md-none mt-3">
          <SearchBar />
        </div>
      </div>

      <style>{`
        .app-header {
          z-index: 1030;
        }

        .header-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          z-index: 1080;
          overflow: hidden;
          animation: headerDropdownIn .16s ease;
        }

        .notification-dropdown,
        .activity-dropdown {
          width: min(390px, calc(100vw - 24px));
        }

        .quick-action-dropdown {
          width: min(470px, calc(100vw - 24px));
        }

        .header-dropdown-scroll {
          max-height: 420px;
          overflow-y: auto;
        }

        .dropdown-list-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: #fff;
          transition: background .16s ease;
        }

        button.dropdown-list-item:hover,
        .dropdown-list-item:hover {
          background: var(--bs-light);
        }

        .dropdown-list-item.unread {
          background: rgba(var(--bs-primary-rgb), .045);
        }

        .notification-icon,
        .activity-icon,
        .quick-action-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .1);
        }

        .notification-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
        }

        .activity-icon,
        .quick-action-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
        }

        .notification-vaccination {
          color: var(--bs-success);
          background: rgba(var(--bs-success-rgb), .1);
        }

        .notification-appointment {
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .1);
        }

        .notification-inventory {
          color: var(--bs-warning);
          background: rgba(var(--bs-warning-rgb), .13);
        }

        .notification-payment {
          color: var(--bs-info);
          background: rgba(var(--bs-info-rgb), .12);
        }

        .notification-time {
          font-size: .72rem;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          margin-top: 4px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--bs-primary);
        }

        .quick-action-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4px;
        }

        .quick-action-item {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 12px;
          border-radius: 12px;
          background: transparent;
          transition: background .16s ease;
        }

        .quick-action-item:hover {
          background: rgba(var(--bs-primary-rgb), .06);
        }

        .quick-action-description {
          margin-top: 2px;
          font-size: .7rem;
          line-height: 1.35;
        }

        @keyframes headerDropdownIn {
          from {
            opacity: 0;
            transform: translateY(-5px) scale(.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 575.98px) {
          .header-dropdown {
            position: fixed;
            top: 76px;
            right: 12px;
            left: 12px;
            width: auto;
          }

          .quick-action-grid {
            grid-template-columns: 1fr;
          }

          .header-dropdown-scroll {
            max-height: calc(100vh - 210px);
          }
        }
      `}</style>
    </header>
  );
}

function NotificationIcon({ type }) {
  if (type === "vaccination") {
    return <Syringe size={18} />;
  }

  if (type === "appointment") {
    return <CalendarDays size={18} />;
  }

  if (type === "inventory") {
    return <Package size={18} />;
  }

  return <ReceiptText size={18} />;
}

export default Header;
