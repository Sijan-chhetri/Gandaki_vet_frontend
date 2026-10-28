import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  CircleHelp,
  ContactRound,
  LayoutDashboard,
  LogOut,
  Package,
  PawPrint,
  ReceiptText,
  Settings,
  ShoppingCart,
  Stethoscope,
  Syringe,
  Users,
  X,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

/* -------------------------------------------------------------------------- */

/*                                  Roles                                     */

/* -------------------------------------------------------------------------- */

const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",

  ADMIN: "ADMIN",

  VETERINARIAN: "VETERINARIAN",

  VET_ASSISTANT: "VET_ASSISTANT",

  RECEPTIONIST: "RECEPTIONIST",

  CASHIER: "CASHIER",

  INVENTORY_MANAGER: "INVENTORY_MANAGER",
};

const ALL_AUTHENTICATED_ROLES = [
  ROLES.SUPER_ADMIN,

  ROLES.ADMIN,

  ROLES.VETERINARIAN,

  ROLES.VET_ASSISTANT,

  ROLES.RECEPTIONIST,

  ROLES.CASHIER,

  ROLES.INVENTORY_MANAGER,
];

const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

const CLINICAL_ROLES = [
  ROLES.SUPER_ADMIN,

  ROLES.ADMIN,

  ROLES.VETERINARIAN,

  ROLES.VET_ASSISTANT,
];

const FRONT_DESK_ROLES = [
  ROLES.SUPER_ADMIN,

  ROLES.ADMIN,

  ROLES.VETERINARIAN,

  ROLES.VET_ASSISTANT,

  ROLES.RECEPTIONIST,
];

const FINANCE_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CASHIER];

const INVENTORY_ROLES = [
  ROLES.SUPER_ADMIN,

  ROLES.ADMIN,
  // ROLES.VETERINARIAN,  // ROLES.VET_ASSISTANT,
  ROLES.CASHIER,

  ROLES.INVENTORY_MANAGER,
];

/* -------------------------------------------------------------------------- */

/*                              Sidebar items                                 */

/* -------------------------------------------------------------------------- */

const clinicItems = [
  {
    label: "Pet Owners",

    icon: ContactRound,

    to: "/owners",

    roles: FRONT_DESK_ROLES,
  },

  {
    label: "Patients",

    icon: PawPrint,

    to: "/patients",

    roles: FRONT_DESK_ROLES,
  },

  {
    label: "Appointments",

    icon: CalendarDays,

    to: "/appointments",

    roles: FRONT_DESK_ROLES,
  },

  {
    label: "Services",

    icon: Stethoscope,

    to: "/services",

    roles: [
      ROLES.SUPER_ADMIN,

      ROLES.ADMIN,
      // ROLES.VETERINARIAN,
      ROLES.VET_ASSISTANT,

      ROLES.RECEPTIONIST,

      ROLES.CASHIER,
    ],
  },

  {
    label: "Attendance",
    icon: ClipboardCheck,
    to: "/attendance",
    roles: ALL_AUTHENTICATED_ROLES,
  },

  {
    label: "Staff List",

    icon: Users,

    to: "/staff",

    roles: ADMIN_ROLES,
  },

  {
    label: "Branches",

    icon: Building2,

    to: "/branches",

    roles: ADMIN_ROLES,
  },
];

const financeItems = [
  {
    label: "Sales",

    icon: ReceiptText,

    to: "/sales",

    roles: FINANCE_ROLES,
  },

  // {

  //   label: "Purchases",

  //   icon: ShoppingCart,

  //   to: "/purchases",

  //   roles: [

  //     ROLES.SUPER_ADMIN,

  //     ROLES.ADMIN,

  //     ROLES.INVENTORY_MANAGER,

  //   ],

  // },
];

const otherItems = [
  // {

  //   label: "Events",

  //   icon: CalendarDays,

  //   to: "/event",

  //   roles: [

  //     ROLES.SUPER_ADMIN,

  //     ROLES.ADMIN,

  //     ROLES.RECEPTIONIST,

  //   ],

  // },

  {
    label: "Vaccination",

    icon: Syringe,

    to: "/vaccination",

    roles: CLINICAL_ROLES,
  },

  {
    label: "Inventory",

    icon: Package,

    to: "/inventory",

    roles: INVENTORY_ROLES,
  },

  // {

  //   label: "Settings",

  //   icon: Settings,

  //   to: "/settings",

  //   roles: ADMIN_ROLES,

  // },

  // {

  //   label: "Customer Support",

  //   icon: CircleHelp,

  //   to: "/support",

  //   roles: ALL_AUTHENTICATED_ROLES,

  // },
];

/* -------------------------------------------------------------------------- */

/*                              Helper functions                              */

/* -------------------------------------------------------------------------- */

function normaliseRole(role) {
  if (!role) {
    return "";
  }

  return String(role)
    .trim()

    .replaceAll("-", "_")

    .replaceAll(" ", "_")

    .toUpperCase();
}

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error(
      "Unable to read stored user:",

      error,
    );

    return null;
  }
}

function getCurrentUserRole(user) {
  return normaliseRole(
    user?.role || user?.userRole || user?.data?.role || user?.user?.role,
  );
}

function hasAccess(item, userRole) {
  if (!item.roles?.length) {
    return true;
  }

  return item.roles.includes(userRole);
}

function filterItemsByRole(
  items,

  userRole,
) {
  return items.filter((item) => hasAccess(item, userRole));
}

function getRoleDisplayName(role) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";

    case "ADMIN":
      return "Administrator";

    case "VETERINARIAN":
      return "Doctor";

    case "VET_ASSISTANT":
      return "Vet Assistant";

    case "RECEPTIONIST":
      return "Receptionist";

    case "CASHIER":
      return "Cashier";

    case "INVENTORY_MANAGER":
      return "Inventory Manager";

    default:
      return "Authenticated User";
  }
}

/* -------------------------------------------------------------------------- */

/*                              Sidebar item                                  */

/* -------------------------------------------------------------------------- */

function SidebarItem({
  icon: Icon,

  label,

  to,

  onItemClick,
}) {
  if (!to) {
    return null;
  }

  return (
    <NavLink
      to={to}

      end={to === "/dashboard"}

      onClick={onItemClick}

      className={({ isActive }) =>
        [
          "btn",

          "border-0",

          "w-100",

          "d-flex",

          "align-items-center",

          "justify-content-between",

          "px-3",

          "py-2",

          "rounded-3",

          "mb-1",

          "text-start",

          "text-decoration-none",

          isActive
            ? "bg-primary-subtle text-primary fw-semibold"
            : "text-secondary",
        ].join(" ")
      }
    >
      <span className="d-flex align-items-center gap-3">
        <Icon
          size={18}

          strokeWidth={1.8}
        />

        <span
          style={{
            fontSize: "0.9rem",
          }}
        >
          {label}
        </span>
      </span>
    </NavLink>
  );
}

/* -------------------------------------------------------------------------- */

/*                            Sidebar section                                 */

/* -------------------------------------------------------------------------- */

function SidebarSection({
  title,

  items,

  onItemClick,
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="mt-4">
      <p
        className="

          text-uppercase

          text-secondary

          fw-semibold

          px-3

          mb-2

        "

        style={{
          fontSize: "0.7rem",

          letterSpacing: "0.08rem",
        }}
      >
        {title}
      </p>

      {items.map((item) => (
        <SidebarItem
          key={item.to}

          {...item}

          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/*                                 Sidebar                                    */

/* -------------------------------------------------------------------------- */

function Sidebar({
  isOpen,

  onClose,
}) {
  const navigate = useNavigate();

  const user = getStoredUser();

  const userRole = getCurrentUserRole(user);

  const visibleClinicItems = filterItemsByRole(
    clinicItems,

    userRole,
  );

  const visibleFinanceItems = filterItemsByRole(
    financeItems,

    userRole,
  );

  const visibleOtherItems = filterItemsByRole(
    otherItems,

    userRole,
  );

  function handleLogout() {
    localStorage.removeItem("accessToken");

    localStorage.removeItem("token");

    localStorage.removeItem("refreshToken");

    localStorage.removeItem("user");

    sessionStorage.clear();

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <aside
      className={`

        app-sidebar

        bg-white

        border-end

        ${isOpen ? "sidebar-open" : ""}

      `}
    >
      <div className="d-flex flex-column h-100">
        {/* Sidebar header */}

        <div className="d-flex align-items-center justify-content-between px-3 py-4">
          <NavLink
            to="/dashboard"

            onClick={onClose}

            className="

              d-flex

              align-items-center

              gap-2

              text-decoration-none

              text-dark

            "
          >
            <div
              className="

                d-flex

                align-items-center

                justify-content-center

                rounded-3

                bg-success-subtle

                text-success

              "

              style={{
                width: "42px",

                height: "42px",

                minWidth: "42px",
              }}
            >
              <Stethoscope size={24} />
            </div>

            <div>
              <h5 className="mb-0 fw-bold">Gandaki vet and pet</h5>

              <small className="text-secondary">Veterinary Clinic</small>
            </div>
          </NavLink>

          <button
            type="button"

            className="

              btn

              btn-light

              border-0

              d-lg-none

            "

            onClick={onClose}

            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}

        <nav
          className="px-3 flex-grow-1"

          style={{
            overflowY: "auto",

            minHeight: 0,
          }}
        >
          <SidebarItem
            icon={LayoutDashboard}

            label="Dashboard"

            to="/dashboard"

            onItemClick={onClose}
          />

          <SidebarSection
            title="Clinic"

            items={visibleClinicItems}

            onItemClick={onClose}
          />

          <SidebarSection
            title="Finance"

            items={visibleFinanceItems}

            onItemClick={onClose}
          />

          <SidebarSection
            title="Others"

            items={visibleOtherItems}

            onItemClick={onClose}
          />
        </nav>

        {/* Logged-in user information */}

        {/* Logged-in user information */}
        <div className="px-3 pt-2">
          <div className="border rounded-3 px-2 py-2 bg-light">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary fw-bold"
                style={{
                  width: "30px",
                  height: "30px",
                  minWidth: "30px",
                  fontSize: "12px",
                }}
              >
                {String(user?.firstName || user?.name || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="overflow-hidden" style={{ minWidth: 0 }}>
                <div
                  className="fw-semibold text-truncate"
                  style={{
                    fontSize: "12px",
                    lineHeight: "15px",
                  }}
                >
                  {user?.firstName || user?.name || "Clinic User"}
                  {user?.lastName ? ` ${user.lastName}` : ""}
                </div>

                <div
                  className="text-secondary text-truncate"
                  style={{
                    fontSize: "10px",
                    lineHeight: "13px",
                    marginTop: "1px",
                  }}
                >
                  {getRoleDisplayName(userRole)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}

        <div className="px-3 py-3">
          <button
            type="button"

            onClick={handleLogout}

            className="

              btn

              border-0

              w-100

              d-flex

              align-items-center

              justify-content-between

              px-3

              py-2

              rounded-3

              text-danger

            "

            style={{
              background: "#fff5f5",
            }}
          >
            <span className="d-flex align-items-center gap-3">
              <LogOut
                size={18}

                strokeWidth={1.8}
              />

              <span
                style={{
                  fontSize: "0.9rem",
                }}
              >
                Logout
              </span>
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
