import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import MainShell from "./layout/MainShell";
import ProtectedRoute from "./routes/ProtectedRoute";

import Dashboard from "./components/dashboard/Dashboard";
import PetOwners from "./components/owners/PetOwners";
import Patients from "./components/patients/Patients";
import Appointments from "./components/appointments/Appointments";
import StaffList from "./components/staff/StaffList";
import Sales from "./components/sales/Sales";
import Purchases from "./components/purchase/Purchases";
import Events from "./components/event/Events";
import Vaccination from "./components/vaccination/Vaccination";
import Inventory from "./components/inventory/Inventory";
import Settings from "./components/setting/Settings";
import CustomerSupport from "./components/customerSupport/CustomerSupport";
import Services from "./components/services/Services";
import Unauthorized from "./components/common/Unauthorized";

import Login from "./auth/Login";

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
  INVENTORY_MANAGER:
    "INVENTORY_MANAGER",
};

const ALL_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.VETERINARIAN,
  ROLES.VET_ASSISTANT,
  ROLES.RECEPTIONIST,
  ROLES.CASHIER,
  ROLES.INVENTORY_MANAGER,
];

const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
];

const FRONT_DESK_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.VETERINARIAN,
  ROLES.VET_ASSISTANT,
  ROLES.RECEPTIONIST,
];

const CLINICAL_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.VETERINARIAN,
  ROLES.VET_ASSISTANT,
];

const SERVICE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.VETERINARIAN,
  ROLES.VET_ASSISTANT,
  ROLES.RECEPTIONIST,
  ROLES.CASHIER,
];

const FINANCE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.CASHIER,
];

const PURCHASE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.INVENTORY_MANAGER,
];

const EVENT_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.RECEPTIONIST,
];

const INVENTORY_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.CASHIER,
  ROLES.INVENTORY_MANAGER,
];

/* -------------------------------------------------------------------------- */
/*                                Not found                                   */
/* -------------------------------------------------------------------------- */

function NotFound() {
  return (
    <div className="text-center py-5">
      <h1 className="display-3 fw-bold">
        404
      </h1>

      <p className="text-secondary">
        Page not found.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    App                                     */
/* -------------------------------------------------------------------------- */

function App() {
  return (
    <Routes>
      {/* Public route */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* Authenticated application shell */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={ALL_ROLES}
          />
        }
      >
        <Route element={<MainShell />}>
          <Route
            path="/"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          {/* Dashboard */}

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Owners */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  FRONT_DESK_ROLES
                }
              />
            }
          >
            <Route
              path="/owners"
              element={<PetOwners />}
            />
          </Route>

          {/* Patients */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  FRONT_DESK_ROLES
                }
              />
            }
          >
            <Route
              path="/patients"
              element={<Patients />}
            />
          </Route>

          {/* Appointments */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  FRONT_DESK_ROLES
                }
              />
            }
          >
            <Route
              path="/appointments"
              element={<Appointments />}
            />
          </Route>

          {/* Services */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  SERVICE_ROLES
                }
              />
            }
          >
            <Route
              path="/services"
              element={<Services />}
            />
          </Route>

          {/* Staff */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  ADMIN_ROLES
                }
              />
            }
          >
            <Route
              path="/staff"
              element={<StaffList />}
            />
          </Route>

          {/* Sales */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  FINANCE_ROLES
                }
              />
            }
          >
            <Route
              path="/sales"
              element={<Sales />}
            />
          </Route>

          {/* Purchases */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  PURCHASE_ROLES
                }
              />
            }
          >
            <Route
              path="/purchases"
              element={<Purchases />}
            />
          </Route>

          {/* Events */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  EVENT_ROLES
                }
              />
            }
          >
            <Route
              path="/event"
              element={<Events />}
            />
          </Route>

          {/* Vaccination */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  CLINICAL_ROLES
                }
              />
            }
          >
            <Route
              path="/vaccination"
              element={<Vaccination />}
            />
          </Route>

          {/* Inventory */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  INVENTORY_ROLES
                }
              />
            }
          >
            <Route
              path="/inventory"
              element={<Inventory />}
            />
          </Route>

          {/* Settings */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  ADMIN_ROLES
                }
              />
            }
          >
            <Route
              path="/settings"
              element={<Settings />}
            />
          </Route>

          {/* Customer support */}

          <Route
            element={
              <ProtectedRoute
                allowedRoles={
                  ALL_ROLES
                }
              />
            }
          >
            <Route
              path="/support"
              element={
                <CustomerSupport />
              }
            />
          </Route>

          {/* Unauthorized */}

          <Route
            path="/unauthorized"
            element={<Unauthorized />}
          />

          {/* Protected 404 */}

          <Route
            path="*"
            element={<NotFound />}
          />
        </Route>
      </Route>

      {/* Public fallback */}

      <Route
        path="*"
        element={<NotFound />}
      />
    </Routes>
  );
}

export default App;