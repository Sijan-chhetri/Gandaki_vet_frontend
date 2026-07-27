import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bell,
  Boxes,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Globe2,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Moon,
  Package,
  Palette,
  Save,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Sun,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

const DEFAULT_SETTINGS = {
  clinic: {
    name: "VetNeary Animal Care",
    registrationNumber: "VET-NP-2026-018",
    phone: "+977 9800000000",
    email: "hello@vetneary.com",
    website: "www.vetneary.com",
    address: "Pokhara, Kaski, Nepal",
    timezone: "Asia/Kathmandu",
    currency: "NPR",
    dateFormat: "YYYY-MM-DD",
  },
  profile: {
    fullName: "Dr. Sarthak Bhattarai",
    role: "Administrator",
    email: "sarthak@vetneary.com",
    phone: "+977 9800000000",
  },
  notifications: {
    appointmentReminders: true,
    vaccinationAlerts: true,
    lowStockAlerts: true,
    expiryAlerts: true,
    paymentAlerts: true,
    emailNotifications: true,
    smsNotifications: false,
    desktopNotifications: true,
    reminderHours: "24",
  },
  preferences: {
    theme: "system",
    language: "English",
    compactMode: false,
    showPetPhotos: true,
    dashboardCards: true,
  },
  security: {
    twoFactor: false,
    sessionTimeout: "30",
    loginAlerts: true,
  },
  billing: {
    taxRate: "13",
    invoicePrefix: "INV",
    paymentDueDays: "7",
    showLogoOnInvoice: true,
    allowPartialPayment: true,
  },
};

const SETTINGS_STORAGE_KEY = "vetnearySettings";

export default function Settings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved
        ? mergeSettings(DEFAULT_SETTINGS, JSON.parse(saved))
        : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [activeSection, setActiveSection] = useState("clinic");
  const [savedMessage, setSavedMessage] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const sections = useMemo(
    () => [
      {
        id: "clinic",
        label: "Clinic Profile",
        description: "Business information and regional settings",
        icon: Building2,
      },
      {
        id: "account",
        label: "My Account",
        description: "Personal profile and account information",
        icon: UserRound,
      },
      {
        id: "notifications",
        label: "Notifications",
        description: "Manage alerts, reminders and communication",
        icon: Bell,
      },
      {
        id: "appearance",
        label: "Appearance",
        description: "Theme, language and dashboard preferences",
        icon: Palette,
      },
      {
        id: "security",
        label: "Security",
        description: "Password, sessions and account protection",
        icon: ShieldCheck,
      },
      {
        id: "billing",
        label: "Billing & Invoices",
        description: "Tax, invoice and payment preferences",
        icon: WalletCards,
      },
      {
        id: "data",
        label: "Data & Privacy",
        description: "Backups, exports and account removal",
        icon: Database,
      },
    ],
    []
  );

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  function updateGroup(group, key, value) {
    setSettings((previous) => ({
      ...previous,
      [group]: {
        ...previous[group],
        [key]: value,
      },
    }));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setSavedMessage("Settings saved successfully.");
    window.setTimeout(() => setSavedMessage(""), 2500);
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Reset all settings to the default values?"
    );

    if (!confirmed) return;

    setSettings(DEFAULT_SETTINGS);
    setSavedMessage("Settings restored to default.");
    window.setTimeout(() => setSavedMessage(""), 2500);
  }

  function exportSettings() {
    const content = JSON.stringify(settings, null, 2);
    const blob = new Blob([content], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "vetneary-settings-backup.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const ActiveIcon =
    sections.find((section) => section.id === activeSection)?.icon ||
    Building2;

  return (
    <div className="settings-page">
      <section className="settings-hero rounded-4 p-4 p-lg-5 mb-4 position-relative overflow-hidden">
        <div className="settings-orb settings-orb-one" />
        <div className="settings-orb settings-orb-two" />

        <div className="row align-items-center g-4 position-relative">
          <div className="col-lg-8">
            <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-75 px-3 py-2 rounded-pill text-primary small fw-semibold mb-3">
              <Stethoscope size={16} />
              System settings
            </div>

            <h2 className="fw-bold mb-3">
              Configure your clinic, team and application preferences.
            </h2>

            <p className="text-secondary mb-0" style={{ maxWidth: 720 }}>
              Manage clinic details, notifications, billing, privacy and
              account security from one central settings workspace.
            </p>
          </div>

          <div className="col-lg-4">
            <div className="settings-overview bg-white rounded-4 p-4 shadow-sm">
              <div className="d-flex align-items-center gap-3">
                <div className="settings-main-icon">
                  <ActiveIcon size={25} />
                </div>

                <div>
                  <small className="text-secondary">
                    Current section
                  </small>
                  <h6 className="fw-bold mb-0">
                    {
                      sections.find(
                        (section) => section.id === activeSection
                      )?.label
                    }
                  </h6>
                </div>
              </div>

              <div className="border-top mt-4 pt-3 d-flex justify-content-between align-items-center">
                <span className="small text-secondary">
                  Changes save locally
                </span>
                <span className="badge rounded-pill bg-success-subtle text-success d-inline-flex align-items-center gap-1">
                  <Check size={12} />
                  Synced
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {savedMessage && (
        <div className="alert alert-success d-flex align-items-center gap-2 rounded-4">
          <Check size={18} />
          {savedMessage}
        </div>
      )}

      <div className="row g-4">
        <aside className="col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 settings-sidebar">
            <div className="card-body p-3">
              <div className="px-2 pt-2 pb-3">
                <small className="text-uppercase text-secondary fw-semibold">
                  Settings
                </small>
              </div>

              <div className="d-grid gap-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;

                  return (
                    <button
                      type="button"
                      key={section.id}
                      className={`settings-nav-item ${
                        active ? "active" : ""
                      }`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <span className="settings-nav-icon">
                        <Icon size={19} />
                      </span>

                      <span className="flex-grow-1 text-start">
                        <span className="d-block fw-semibold small">
                          {section.label}
                        </span>
                        <span className="d-none d-xxl-block text-secondary settings-nav-description">
                          {section.description}
                        </span>
                      </span>

                      <ChevronRight size={16} />
                    </button>
                  );
                })}
              </div>

              <div className="border-top mt-3 pt-3">
                <button
                  type="button"
                  className="settings-help-card border-0 w-100 text-start rounded-4 p-3"
                >
                  <div className="d-flex gap-3">
                    <span className="settings-help-icon">
                      <CircleHelp size={19} />
                    </span>
                    <div>
                      <div className="fw-semibold small">Need help?</div>
                      <small className="text-secondary">
                        Contact customer support
                      </small>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="col-xl-9">
          {activeSection === "clinic" && (
            <ClinicSettings
              data={settings.clinic}
              update={(key, value) =>
                updateGroup("clinic", key, value)
              }
            />
          )}

          {activeSection === "account" && (
            <AccountSettings
              data={settings.profile}
              update={(key, value) =>
                updateGroup("profile", key, value)
              }
            />
          )}

          {activeSection === "notifications" && (
            <NotificationSettings
              data={settings.notifications}
              update={(key, value) =>
                updateGroup("notifications", key, value)
              }
            />
          )}

          {activeSection === "appearance" && (
            <AppearanceSettings
              data={settings.preferences}
              update={(key, value) =>
                updateGroup("preferences", key, value)
              }
            />
          )}

          {activeSection === "security" && (
            <SecuritySettings
              data={settings.security}
              update={(key, value) =>
                updateGroup("security", key, value)
              }
              onPasswordChange={() => setShowPasswordModal(true)}
            />
          )}

          {activeSection === "billing" && (
            <BillingSettings
              data={settings.billing}
              update={(key, value) =>
                updateGroup("billing", key, value)
              }
            />
          )}

          {activeSection === "data" && (
            <DataSettings
              onExport={exportSettings}
              onReset={resetSettings}
              onDelete={() => setShowDeleteModal(true)}
            />
          )}

          <div className="settings-footer card border-0 shadow-sm rounded-4 mt-4">
            <div className="card-body p-3 p-md-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <h6 className="fw-bold mb-1">Save your changes</h6>
                <small className="text-secondary">
                  Settings are also stored automatically in this browser.
                </small>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={resetSettings}
                >
                  Reset
                </button>

                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center gap-2 px-4"
                  onClick={saveSettings}
                >
                  <Save size={17} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      <style>{`
        .settings-page {
          min-height: 100%;
        }

        .settings-hero {
          background:
            linear-gradient(
              135deg,
              rgba(var(--bs-primary-rgb), .12),
              rgba(var(--bs-primary-rgb), .035)
            ),
            #fff;
          border: 1px solid rgba(var(--bs-primary-rgb), .12);
        }

        .settings-orb {
          position: absolute;
          border-radius: 50%;
          background: rgba(var(--bs-primary-rgb), .08);
          pointer-events: none;
        }

        .settings-orb-one {
          width: 220px;
          height: 220px;
          top: -100px;
          right: -55px;
        }

        .settings-orb-two {
          width: 120px;
          height: 120px;
          right: 32%;
          bottom: -70px;
        }

        .settings-overview {
          border: 1px solid rgba(var(--bs-primary-rgb), .1);
        }

        .settings-main-icon {
          width: 54px;
          height: 54px;
          border-radius: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .1);
        }

        .settings-sidebar {
          position: sticky;
          top: 20px;
        }

        .settings-nav-item {
          width: 100%;
          border: 0;
          background: transparent;
          border-radius: 14px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--bs-body-color);
          transition: background .18s ease, color .18s ease;
        }

        .settings-nav-item:hover {
          background: var(--bs-light);
        }

        .settings-nav-item.active {
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .09);
        }

        .settings-nav-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bs-secondary-color);
          background: var(--bs-light);
        }

        .settings-nav-item.active .settings-nav-icon {
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .12);
        }

        .settings-nav-description {
          margin-top: 2px;
          font-size: .72rem;
          line-height: 1.3;
        }

        .settings-help-card {
          color: inherit;
          background: rgba(var(--bs-primary-rgb), .055);
        }

        .settings-help-icon,
        .settings-section-icon,
        .setting-row-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .1);
        }

        .settings-help-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 12px;
        }

        .settings-section-card {
          border: 1px solid rgba(var(--bs-primary-rgb), .08) !important;
        }

        .settings-section-icon {
          width: 48px;
          height: 48px;
          border-radius: 15px;
          flex-shrink: 0;
        }

        .setting-row {
          padding: 18px 0;
          border-bottom: 1px solid var(--bs-border-color);
        }

        .setting-row:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .setting-row:first-child {
          padding-top: 0;
        }

        .setting-row-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          flex-shrink: 0;
        }

        .settings-switch.form-check-input {
          width: 2.75rem;
          height: 1.45rem;
          cursor: pointer;
        }

        .theme-option {
          border: 1px solid var(--bs-border-color);
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: border-color .18s ease, background .18s ease;
        }

        .theme-option:hover {
          border-color: rgba(var(--bs-primary-rgb), .35);
        }

        .theme-option.active {
          border-color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .055);
          box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), .08);
        }

        .theme-preview {
          height: 86px;
          border-radius: 12px;
          border: 1px solid var(--bs-border-color);
          overflow: hidden;
          padding: 9px;
        }

        .theme-preview-light {
          background: #f7f8fa;
        }

        .theme-preview-dark {
          background: #252a31;
        }

        .theme-preview-system {
          background: linear-gradient(90deg, #f7f8fa 50%, #252a31 50%);
        }

        .theme-preview-bar {
          width: 44%;
          height: 8px;
          margin-bottom: 7px;
          border-radius: 20px;
          background: rgba(var(--bs-primary-rgb), .65);
        }

        .theme-preview-card {
          height: 52px;
          border-radius: 8px;
          background: rgba(255, 255, 255, .9);
          border: 1px solid rgba(0, 0, 0, .07);
        }

        .theme-preview-dark .theme-preview-card {
          background: #373d45;
          border-color: #454d57;
        }

        .theme-preview-system .theme-preview-card {
          background: linear-gradient(90deg, #fff 50%, #373d45 50%);
        }

        .danger-zone {
          border: 1px solid rgba(var(--bs-danger-rgb), .22) !important;
          background: rgba(var(--bs-danger-rgb), .025);
        }

        .settings-footer {
          border: 1px solid rgba(var(--bs-primary-rgb), .08) !important;
        }

        @media (max-width: 1199.98px) {
          .settings-sidebar {
            position: static;
          }

          .settings-sidebar .d-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 575.98px) {
          .settings-hero {
            padding: 24px !important;
          }

          .settings-sidebar .d-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function ClinicSettings({ data, update }) {
  return (
    <SettingsCard
      icon={Building2}
      title="Clinic Profile"
      description="Update the information displayed across records, invoices and reports."
    >
      <div className="row g-3">
        <Field
          label="Clinic Name"
          value={data.name}
          onChange={(value) => update("name", value)}
          icon={Building2}
          col="col-md-8"
        />

        <Field
          label="Registration Number"
          value={data.registrationNumber}
          onChange={(value) =>
            update("registrationNumber", value)
          }
          icon={ShieldCheck}
          col="col-md-4"
        />

        <Field
          label="Phone Number"
          value={data.phone}
          onChange={(value) => update("phone", value)}
          icon={Smartphone}
          col="col-md-6"
        />

        <Field
          label="Clinic Email"
          type="email"
          value={data.email}
          onChange={(value) => update("email", value)}
          icon={Mail}
          col="col-md-6"
        />

        <Field
          label="Website"
          value={data.website}
          onChange={(value) => update("website", value)}
          icon={Globe2}
          col="col-md-6"
        />

        <Field
          label="Address"
          value={data.address}
          onChange={(value) => update("address", value)}
          icon={MapPin}
          col="col-md-6"
        />

        <SelectField
          label="Timezone"
          value={data.timezone}
          onChange={(value) => update("timezone", value)}
          options={[
            "Asia/Kathmandu",
            "Asia/Kolkata",
            "Asia/Dhaka",
            "UTC",
          ]}
          icon={Clock3}
          col="col-md-4"
        />

        <SelectField
          label="Currency"
          value={data.currency}
          onChange={(value) => update("currency", value)}
          options={["NPR", "USD", "INR", "EUR"]}
          icon={WalletCards}
          col="col-md-4"
        />

        <SelectField
          label="Date Format"
          value={data.dateFormat}
          onChange={(value) => update("dateFormat", value)}
          options={["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]}
          icon={CalendarIcon}
          col="col-md-4"
        />
      </div>
    </SettingsCard>
  );
}

function AccountSettings({ data, update }) {
  return (
    <SettingsCard
      icon={UserRound}
      title="My Account"
      description="Manage your personal details and role information."
    >
      <div className="d-flex flex-column flex-md-row align-items-md-center gap-4 mb-4 pb-4 border-bottom">
        <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold fs-3"
          style={{ width: 84, height: 84, flexShrink: 0 }}
        >
          {initials(data.fullName)}
        </div>

        <div className="flex-grow-1">
          <h5 className="fw-bold mb-1">{data.fullName}</h5>
          <p className="text-secondary mb-2">{data.role}</p>
          <button type="button" className="btn btn-sm btn-light border">
            Change Profile Photo
          </button>
        </div>
      </div>

      <div className="row g-3">
        <Field
          label="Full Name"
          value={data.fullName}
          onChange={(value) => update("fullName", value)}
          icon={UserRound}
          col="col-md-6"
        />

        <Field
          label="Role"
          value={data.role}
          onChange={(value) => update("role", value)}
          icon={UsersRound}
          col="col-md-6"
        />

        <Field
          label="Email Address"
          type="email"
          value={data.email}
          onChange={(value) => update("email", value)}
          icon={Mail}
          col="col-md-6"
        />

        <Field
          label="Phone Number"
          value={data.phone}
          onChange={(value) => update("phone", value)}
          icon={Smartphone}
          col="col-md-6"
        />
      </div>
    </SettingsCard>
  );
}

function NotificationSettings({ data, update }) {
  return (
    <SettingsCard
      icon={Bell}
      title="Notifications"
      description="Choose which clinic activities should trigger alerts."
    >
      <ToggleRow
        icon={CalendarIcon}
        title="Appointment reminders"
        description="Receive reminders before scheduled appointments."
        checked={data.appointmentReminders}
        onChange={(value) =>
          update("appointmentReminders", value)
        }
      />

      <ToggleRow
        icon={ShieldCheck}
        title="Vaccination alerts"
        description="Notify the team about upcoming and overdue vaccinations."
        checked={data.vaccinationAlerts}
        onChange={(value) => update("vaccinationAlerts", value)}
      />

      <ToggleRow
        icon={Package}
        title="Low-stock alerts"
        description="Get notified when inventory reaches its reorder level."
        checked={data.lowStockAlerts}
        onChange={(value) => update("lowStockAlerts", value)}
      />

      <ToggleRow
        icon={Clock3}
        title="Expiry alerts"
        description="Receive warnings before medicines and vaccines expire."
        checked={data.expiryAlerts}
        onChange={(value) => update("expiryAlerts", value)}
      />

      <ToggleRow
        icon={WalletCards}
        title="Payment alerts"
        description="Notify administrators about overdue and completed payments."
        checked={data.paymentAlerts}
        onChange={(value) => update("paymentAlerts", value)}
      />

      <div className="setting-row">
        <h6 className="fw-bold mb-3">Notification channels</h6>
        <div className="row g-3">
          <ChannelToggle
            icon={Mail}
            label="Email"
            checked={data.emailNotifications}
            onChange={(value) =>
              update("emailNotifications", value)
            }
          />
          <ChannelToggle
            icon={Smartphone}
            label="SMS"
            checked={data.smsNotifications}
            onChange={(value) =>
              update("smsNotifications", value)
            }
          />
          <ChannelToggle
            icon={Bell}
            label="Desktop"
            checked={data.desktopNotifications}
            onChange={(value) =>
              update("desktopNotifications", value)
            }
          />
        </div>
      </div>

      <div className="setting-row">
        <label className="form-label fw-semibold">
          Default reminder time
        </label>
        <select
          className="form-select"
          style={{ maxWidth: 320 }}
          value={data.reminderHours}
          onChange={(event) =>
            update("reminderHours", event.target.value)
          }
        >
          <option value="1">1 hour before</option>
          <option value="6">6 hours before</option>
          <option value="12">12 hours before</option>
          <option value="24">24 hours before</option>
          <option value="48">48 hours before</option>
        </select>
      </div>
    </SettingsCard>
  );
}

function AppearanceSettings({ data, update }) {
  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Smartphone },
  ];

  return (
    <SettingsCard
      icon={Palette}
      title="Appearance"
      description="Personalize the interface for your working style."
    >
      <div className="mb-4 pb-4 border-bottom">
        <h6 className="fw-bold mb-3">Theme</h6>

        <div className="row g-3">
          {themes.map((theme) => {
            const Icon = theme.icon;
            const active = data.theme === theme.id;

            return (
              <div className="col-md-4" key={theme.id}>
                <button
                  type="button"
                  className={`theme-option w-100 text-start ${
                    active ? "active" : ""
                  }`}
                  onClick={() => update("theme", theme.id)}
                >
                  <div
                    className={`theme-preview theme-preview-${theme.id} mb-3`}
                  >
                    <div className="theme-preview-bar" />
                    <div className="theme-preview-card" />
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="d-flex align-items-center gap-2 fw-semibold">
                      <Icon size={17} />
                      {theme.label}
                    </span>

                    {active && (
                      <span className="text-primary">
                        <Check size={18} />
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="row g-3 mb-4 pb-4 border-bottom">
        <SelectField
          label="Language"
          value={data.language}
          onChange={(value) => update("language", value)}
          options={["English", "नेपाली"]}
          icon={Globe2}
          col="col-md-6"
        />
      </div>

      <ToggleRow
        icon={Archive}
        title="Compact mode"
        description="Reduce spacing to show more information on screen."
        checked={data.compactMode}
        onChange={(value) => update("compactMode", value)}
      />

      <ToggleRow
        icon={UserRound}
        title="Show pet photos"
        description="Display pet profile images in cards and tables."
        checked={data.showPetPhotos}
        onChange={(value) => update("showPetPhotos", value)}
      />

      <ToggleRow
        icon={Boxes}
        title="Dashboard summary cards"
        description="Display key summary cards at the top of dashboards."
        checked={data.dashboardCards}
        onChange={(value) => update("dashboardCards", value)}
      />
    </SettingsCard>
  );
}

function SecuritySettings({ data, update, onPasswordChange }) {
  return (
    <>
      <SettingsCard
        icon={ShieldCheck}
        title="Security"
        description="Protect your account and control active sessions."
      >
        <div className="setting-row d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex gap-3">
            <span className="setting-row-icon">
              <KeyRound size={19} />
            </span>
            <div>
              <h6 className="fw-semibold mb-1">Password</h6>
              <small className="text-secondary">
                Last changed 32 days ago
              </small>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-light border"
            onClick={onPasswordChange}
          >
            Change Password
          </button>
        </div>

        <ToggleRow
          icon={LockKeyhole}
          title="Two-factor authentication"
          description="Require a verification code in addition to your password."
          checked={data.twoFactor}
          onChange={(value) => update("twoFactor", value)}
        />

        <ToggleRow
          icon={Bell}
          title="New login alerts"
          description="Receive an email when your account is used on a new device."
          checked={data.loginAlerts}
          onChange={(value) => update("loginAlerts", value)}
        />

        <div className="setting-row">
          <label className="form-label fw-semibold">
            Automatic session timeout
          </label>
          <select
            className="form-select"
            style={{ maxWidth: 340 }}
            value={data.sessionTimeout}
            onChange={(event) =>
              update("sessionTimeout", event.target.value)
            }
          >
            <option value="15">After 15 minutes</option>
            <option value="30">After 30 minutes</option>
            <option value="60">After 1 hour</option>
            <option value="240">After 4 hours</option>
            <option value="0">Never</option>
          </select>
        </div>
      </SettingsCard>

      <div className="card border-0 shadow-sm rounded-4 mt-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
            <div>
              <h5 className="fw-bold mb-1">Active Sessions</h5>
              <p className="text-secondary small mb-0">
                Devices currently signed in to your account.
              </p>
            </div>
            <button type="button" className="btn btn-sm btn-outline-danger">
              Sign Out Others
            </button>
          </div>

          <SessionRow
            device="Chrome on macOS"
            location="Pokhara, Nepal"
            time="Current session"
            current
          />
          <SessionRow
            device="VetNeary Mobile App"
            location="Kathmandu, Nepal"
            time="Last active 2 hours ago"
          />
        </div>
      </div>
    </>
  );
}

function BillingSettings({ data, update }) {
  return (
    <SettingsCard
      icon={WalletCards}
      title="Billing & Invoices"
      description="Configure taxes, invoice numbering and payment behaviour."
    >
      <div className="row g-3 mb-4 pb-4 border-bottom">
        <Field
          label="Tax Rate (%)"
          type="number"
          min="0"
          value={data.taxRate}
          onChange={(value) => update("taxRate", value)}
          icon={WalletCards}
          col="col-md-4"
        />

        <Field
          label="Invoice Prefix"
          value={data.invoicePrefix}
          onChange={(value) => update("invoicePrefix", value)}
          icon={Archive}
          col="col-md-4"
        />

        <Field
          label="Payment Due (Days)"
          type="number"
          min="0"
          value={data.paymentDueDays}
          onChange={(value) =>
            update("paymentDueDays", value)
          }
          icon={Clock3}
          col="col-md-4"
        />
      </div>

      <ToggleRow
        icon={Building2}
        title="Show clinic logo on invoices"
        description="Display the clinic logo at the top of printed and digital invoices."
        checked={data.showLogoOnInvoice}
        onChange={(value) =>
          update("showLogoOnInvoice", value)
        }
      />

      <ToggleRow
        icon={WalletCards}
        title="Allow partial payment"
        description="Permit clients to pay an invoice in multiple installments."
        checked={data.allowPartialPayment}
        onChange={(value) =>
          update("allowPartialPayment", value)
        }
      />
    </SettingsCard>
  );
}

function DataSettings({ onExport, onReset, onDelete }) {
  return (
    <>
      <SettingsCard
        icon={Database}
        title="Data & Privacy"
        description="Manage backups, exports and stored application data."
      >
        <ActionRow
          icon={Database}
          title="Export settings backup"
          description="Download a JSON copy of your current system settings."
          buttonLabel="Export Backup"
          onClick={onExport}
        />

        <ActionRow
          icon={Clock3}
          title="Automatic backups"
          description="Clinic data is backed up every day at 2:00 AM."
          buttonLabel="Configure"
        />

        <ActionRow
          icon={UsersRound}
          title="Staff access log"
          description="Review recent account activity and administrative actions."
          buttonLabel="View Log"
        />

        <ActionRow
          icon={Database}
          title="Reset application preferences"
          description="Restore all settings to their original default values."
          buttonLabel="Reset Settings"
          onClick={onReset}
        />
      </SettingsCard>

      <div className="danger-zone card border-0 shadow-sm rounded-4 mt-4">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex gap-3">
              <span className="setting-row-icon text-danger bg-danger-subtle">
                <Trash2 size={19} />
              </span>
              <div>
                <h5 className="fw-bold text-danger mb-1">
                  Delete Clinic Account
                </h5>
                <p className="text-secondary small mb-0">
                  Permanently remove the clinic account and all related data.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline-danger flex-shrink-0"
              onClick={onDelete}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingsCard({ icon: Icon, title, description, children }) {
  return (
    <section className="settings-section-card card border-0 shadow-sm rounded-4">
      <div className="card-body p-3 p-md-4">
        <div className="d-flex align-items-center gap-3 mb-4 pb-4 border-bottom">
          <span className="settings-section-icon">
            <Icon size={22} />
          </span>

          <div>
            <h5 className="fw-bold mb-1">{title}</h5>
            <p className="text-secondary small mb-0">{description}</p>
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  col = "col-12",
  ...props
}) {
  return (
    <div className={col}>
      <label className="form-label fw-semibold small">
        {label}
      </label>

      <div className="input-group">
        <span className="input-group-text bg-white">
          <Icon size={17} />
        </span>
        <input
          className="form-control"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...props}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  col = "col-12",
}) {
  return (
    <div className={col}>
      <label className="form-label fw-semibold small">
        {label}
      </label>

      <div className="input-group">
        <span className="input-group-text bg-white">
          <Icon size={17} />
        </span>

        <select
          className="form-select"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="setting-row d-flex justify-content-between align-items-center gap-3">
      <div className="d-flex gap-3">
        <span className="setting-row-icon">
          <Icon size={19} />
        </span>

        <div>
          <h6 className="fw-semibold mb-1">{title}</h6>
          <small className="text-secondary">{description}</small>
        </div>
      </div>

      <div className="form-check form-switch m-0">
        <input
          className="form-check-input settings-switch"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={title}
        />
      </div>
    </div>
  );
}

function ChannelToggle({
  icon: Icon,
  label,
  checked,
  onChange,
}) {
  return (
    <div className="col-md-4">
      <label className="border rounded-4 p-3 w-100 d-flex justify-content-between align-items-center gap-2">
        <span className="d-flex align-items-center gap-2 fw-semibold small">
          <Icon size={17} className="text-primary" />
          {label}
        </span>

        <input
          type="checkbox"
          className="form-check-input m-0"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  description,
  buttonLabel,
  onClick,
}) {
  return (
    <div className="setting-row d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
      <div className="d-flex gap-3">
        <span className="setting-row-icon">
          <Icon size={19} />
        </span>

        <div>
          <h6 className="fw-semibold mb-1">{title}</h6>
          <small className="text-secondary">{description}</small>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-light border flex-shrink-0"
        onClick={onClick}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function SessionRow({ device, location, time, current }) {
  return (
    <div className="setting-row d-flex justify-content-between align-items-center gap-3">
      <div className="d-flex gap-3">
        <span className="setting-row-icon">
          <Smartphone size={19} />
        </span>

        <div>
          <div className="d-flex align-items-center gap-2">
            <h6 className="fw-semibold mb-0">{device}</h6>
            {current && (
              <span className="badge rounded-pill bg-success-subtle text-success">
                Current
              </span>
            )}
          </div>
          <small className="text-secondary">
            {location} · {time}
          </small>
        </div>
      </div>

      {!current && (
        <button type="button" className="btn btn-sm btn-light border">
          Sign Out
        </button>
      )}
    </div>
  );
}

function PasswordModal({ onClose }) {
  const [form, setForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [error, setError] = useState("");

  useModalLock(onClose);

  function submit(event) {
    event.preventDefault();

    if (!form.current || !form.next || !form.confirm) {
      setError("Please complete all password fields.");
      return;
    }

    if (form.next.length < 8) {
      setError("The new password must contain at least 8 characters.");
      return;
    }

    if (form.next !== form.confirm) {
      setError("The new passwords do not match.");
      return;
    }

    onClose();
  }

  return (
    <ModalShell onClose={onClose}>
      <form
        className="bg-white rounded-4 shadow-lg p-4"
        style={{ width: "min(500px, 100%)" }}
        onSubmit={submit}
      >
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h5 className="fw-bold mb-1">Change Password</h5>
            <small className="text-secondary">
              Choose a strong password for your account.
            </small>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          />
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <PasswordField
          label="Current Password"
          value={form.current}
          onChange={(value) =>
            setForm((previous) => ({
              ...previous,
              current: value,
            }))
          }
        />

        <PasswordField
          label="New Password"
          value={form.next}
          onChange={(value) =>
            setForm((previous) => ({
              ...previous,
              next: value,
            }))
          }
        />

        <PasswordField
          label="Confirm New Password"
          value={form.confirm}
          onChange={(value) =>
            setForm((previous) => ({
              ...previous,
              confirm: value,
            }))
          }
        />

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Cancel
          </button>

          <button type="submit" className="btn btn-primary">
            Update Password
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function PasswordField({ label, value, onChange }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold small">
        {label}
      </label>
      <input
        type="password"
        className="form-control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function DeleteAccountModal({ onClose }) {
  const [confirmation, setConfirmation] = useState("");

  useModalLock(onClose);

  return (
    <ModalShell onClose={onClose}>
      <div
        className="bg-white rounded-4 shadow-lg p-4"
        style={{ width: "min(520px, 100%)" }}
      >
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h5 className="fw-bold text-danger mb-1">
              Delete Clinic Account
            </h5>
            <small className="text-secondary">
              This will permanently remove the account and clinic data.
            </small>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          />
        </div>

        <div className="alert alert-danger">
          Type <strong>DELETE</strong> to confirm this action.
        </div>

        <input
          className="form-control"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Type DELETE"
        />

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-danger"
            disabled={confirmation !== "DELETE"}
            onClick={() =>
              window.alert(
                "Connect this action to your backend account deletion endpoint."
              )
            }
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </ModalShell>
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

function mergeSettings(defaults, saved) {
  return {
    clinic: { ...defaults.clinic, ...(saved.clinic || {}) },
    profile: { ...defaults.profile, ...(saved.profile || {}) },
    notifications: {
      ...defaults.notifications,
      ...(saved.notifications || {}),
    },
    preferences: {
      ...defaults.preferences,
      ...(saved.preferences || {}),
    },
    security: {
      ...defaults.security,
      ...(saved.security || {}),
    },
    billing: {
      ...defaults.billing,
      ...(saved.billing || {}),
    },
  };
}

function initials(name) {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function CalendarIcon(props) {
  return <Clock3 {...props} />;
}
