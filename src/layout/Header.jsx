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
  Printer,
  FileText,
  ClipboardList,
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
  const printMenuRef = useRef(null);
  const [consentPreview, setConsentPreview] = useState(null);

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
      const clickedInsidePrintMenu =
        printMenuRef.current?.contains(event.target);

      if (
        !clickedInsideNotification &&
        !clickedInsideActivity &&
        !clickedInsideQuickAction &&
        !clickedInsidePrintMenu
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
    navigate(action.to, { state: { action: action.action } });
  }

  // Consent forms print directly from the header, on any page in the app.
  function openConsentPreview(formType) {
    setOpenDropdown(null);
    setConsentPreview(formType);
  }

  return (
    <>
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



            {/* Print consent forms from anywhere in the dashboard. */}
            <div className="position-relative" ref={printMenuRef}>
              <button
                type="button"
                className={`btn border d-flex align-items-center gap-2 rounded-3 ${
                  openDropdown === "print" ? "btn-primary" : "btn-light"
                }`}
                aria-label="Print clinic forms"
                aria-haspopup="menu"
                aria-expanded={openDropdown === "print"}
                onClick={() => toggleDropdown("print")}
              >
                <Printer size={18} />
                <span className="d-none d-lg-inline small fw-semibold">Print Forms</span>
              </button>

              {openDropdown === "print" && (
                <div
                  className="header-dropdown consent-menu bg-white border rounded-4 shadow-lg"
                  role="menu"
                  aria-label="Printable clinic forms"
                >
                  <div className="p-3 border-bottom">
                    <h6 className="fw-bold mb-0">Clinic Consent Forms</h6>
                    <small className="text-secondary">
                      Preview A4 forms before printing
                    </small>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      role="menuitem"
                      className="consent-menu-item"
                      onClick={() => openConsentPreview("surgery")}
                    >
                      <FileText size={19} />
                      <span>
                        <strong>Surgery & Anaesthetic Consent</strong>
                        <small>Owner and patient consent form</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="consent-menu-item"
                      onClick={() => openConsentPreview("boarding")}
                    >
                      <ClipboardList size={19} />
                      <span>
                        <strong>Boarding Consent Form</strong>
                        <small>Admission and boarding agreement</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="consent-menu-item"
                      onClick={() => openConsentPreview("both")}
                    >
                      <Printer size={19} />
                      <span>
                        <strong>Print Both Forms</strong>
                        <small>One form per A4 page</small>
                      </span>
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

        .consent-menu {
          width: min(365px, calc(100vw - 24px));
        }

        .consent-menu-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          width: 100%;
          padding: 12px 13px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #202c3a;
          text-align: left;
          transition: background-color .15s ease;
        }

        .consent-menu-item:hover,
        .consent-menu-item:focus-visible {
          background: #eff6ff;
        }

        .consent-menu-item svg {
          color: #2563eb;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .consent-menu-item strong,
        .consent-menu-item small {
          display: block;
        }

        .consent-menu-item strong {
          font-size: .875rem;
        }

        .consent-menu-item small {
          margin-top: 2px;
          color: #64748b;
          font-size: .75rem;
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

    {consentPreview && (
      <ConsentPrintPreview
        type={consentPreview}
        onClose={() => setConsentPreview(null)}
      />
    )}
    </>
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


/* ================================================================
   PRINTABLE CONSENT FORMS — no additional dependencies or API calls
   ============================================================== */

function ConsentPrintPreview({ type, onClose }) {
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const pageTitle =
    type === "surgery"
      ? "Surgery & Anaesthetic Consent"
      : type === "boarding"
        ? "Boarding Consent Form"
        : "Both Consent Forms";

  return (
    <div
      className="consent-preview-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="consent-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-preview-title"
      >
        <div className="consent-preview-toolbar">
          <div>
            <h5 id="consent-preview-title" className="mb-1 fw-bold">
              {pageTitle}
            </h5>
            <small className="text-secondary">
              A4 print preview · Blank fields can be completed by hand
            </small>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button type="button" className="btn btn-light border" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={() => window.print()}
            >
              <Printer size={17} /> Print / Save as PDF
            </button>
          </div>
        </div>

        <div className="consent-preview-scroll">
          <div className="consent-print-root" id="consent-print-root">
            {(type === "surgery" || type === "both") && <SurgeryConsentSheet />}
            {(type === "boarding" || type === "both") && <BoardingConsentSheet />}
          </div>
        </div>
      </div>
      <style>{CONSENT_PRINT_STYLES}</style>
    </div>
  );
}

function ConsentLetterhead() {
  return (
    <div className="consent-letterhead">
      <div className="consent-letterhead-title">
        <span className="consent-print-logo" aria-hidden="true">
          <PawPrint size={29} strokeWidth={1.6} />
        </span>
        <div>
          <h1>Gandaki Vet & Pet Clinic</h1>
          <p>RANIPAUWA-11, POKHARA</p>
        </div>
      </div>
    </div>
  );
}

function BlankLine({ label, className = "" }) {
  return (
    <div className={`consent-blank-line ${className}`}>
      <span className="consent-blank-label">{label}</span>
      <span className="consent-blank-rule" aria-hidden="true" />
    </div>
  );
}

function SurgeryConsentSheet() {
  return (
    <section className="consent-sheet" aria-label="Surgery and anaesthetic consent form">
      <ConsentLetterhead />
      <div className="consent-metadata">
        <BlankLine label="Consent form no.:" />
        <BlankLine label="Date:" />
      </div>
      <h2 className="consent-document-title">SURGERY AND ANAESTHETIC CONSENT</h2>

      <div className="consent-two-column consent-identity-fields">
        <div>
          <BlankLine label="Owner's Name:" />
          <BlankLine label="Address:" />
          <BlankLine label="Contact number:" />
        </div>
        <div>
          <BlankLine label="Name of Dog/Cat:" />
          <BlankLine label="Age:" />
          <BlankLine label="Sex:" />
        </div>
      </div>

      <h3 className="consent-section-heading">SURGICAL PROCEDURE</h3>
      <p className="consent-section-subheading">Details of the Operation/Procedure</p>
      <div className="consent-procedure-lines">
        <div className="consent-blank-rule" />
        <div className="consent-blank-rule" />
      </div>

      <ul className="consent-bullets">
        <li>
          I hereby give permission for the administration of anaesthesia to my
          animal and for the surgical or other procedures detailed on this form.
          I also permit other reasonable alternative courses of action that may
          prove necessary. I understand the potential benefits, risks and side
          effects of these procedures.
        </li>
        <li>
          The nature of these procedures, and any other procedures that may
          become necessary, has been explained to me. I understand the potential
          benefits, risks and side effects of the proposed treatment(s) and
          procedure(s), including drug therapy.
        </li>
        <li>
          I understand that all anaesthetic techniques and surgical procedures
          involve some risks.
        </li>
        <li>
          If my dog/cat/animal dies during the above-mentioned surgical
          procedure, I will not ask for compensation or file a case.
        </li>
      </ul>

      <p className="consent-declaration">
        I have read and understood the information on this form. The information
        has been explained to me, and my questions have been answered. I give my
        consent to the above-noted procedure(s) and agree to sign this document.
      </p>

      <div className="consent-two-column consent-signatures">
        <div>
          <BlankLine label="Name of Owner:" />
          <BlankLine label="Signature of Owner:" />
        </div>
        <div>
          <BlankLine label="Doctor in Charge:" />
          <BlankLine label="Doctor's Signature:" />
        </div>
      </div>
    </section>
  );
}

function BoardingConsentSheet() {
  return (
    <section className="consent-sheet" aria-label="Boarding consent form">
      <ConsentLetterhead />
      <h2 className="consent-document-title">BOARDING CONSENT FORM</h2>

      <div className="consent-two-column consent-boarding-fields">
        <div>
          <BlankLine label="Client's Name:" />
          <BlankLine label="Date Admitted:" />
          <BlankLine label="Disease condition:" />
        </div>
        <div>
          <BlankLine label="Pet's Name:" />
          <BlankLine label="Date of Pickup:" />
          <BlankLine label="Weight:" />
        </div>
      </div>

      <p className="consent-vaccine-heading">
        ALL CATS AND DOGS ADMITTED TO THE HOSPITAL MUST BE CURRENT ON THE FOLLOWING VACCINES:
      </p>
      <p className="consent-vaccine-types">
        <strong>DOGS:</strong> DHPPL, RABIES &nbsp; / &nbsp;
        <strong>CATS:</strong> RABIES AND PHC
      </p>
      <p className="consent-body-paragraph">
        If the owner does not provide vaccination details, vaccination of the
        pet may be required at the owner's expense. This is to protect your pet,
        our staff and other clients' pets.
      </p>

      <h3 className="consent-section-heading">CONSENT FOR ADMISSION TO CLINIC</h3>
      <p className="consent-body-paragraph">
        I, the owner of the pet described above, give consent to the employees of
        Gandaki Vet & Pet Clinic, Pokhara to perform the services necessary for
        examination, medication and treatment of my pet. I authorize the
        veterinarians on duty (and the assistants they designate) to examine my
        pet and administer medical treatment or emergency surgical treatment
        considered therapeutically and/or diagnostically necessary based on
        findings during the examination. I consent to such procedures as are
        necessary and desirable in the exercise of the veterinarian's
        professional judgment. I understand that my pet will be treated with
        due care and in accordance with the prevailing standards of veterinary
        practice. I will not claim compensation if my pet dies during
        boarding. I assume financial responsibility for all charges incurred
        for services rendered and understand that full payment is required
        upon discharge.
      </p>

      <div className="consent-boarding-signatures">
        <BlankLine label="Owner's Signature:" />
        <div className="consent-two-column">
          <BlankLine label="Date:" />
          <BlankLine label="Emergency contact number:" />
        </div>
      </div>
    </section>
  );
}

const CONSENT_PRINT_STYLES = `
  .consent-preview-overlay {
    position: fixed; inset: 0; z-index: 2000;
    display: flex; align-items: center; justify-content: center;
    padding: 18px; background: rgba(17, 24, 39, .72);
  }
  .consent-preview-modal {
    display: flex; flex-direction: column; width: min(1080px, 100%);
    max-height: calc(100vh - 36px); background: #fff;
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 24px 80px rgba(0, 0, 0, .3);
  }
  .consent-preview-toolbar {
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 12px; padding: 17px 22px;
    border-bottom: 1px solid #e2e8f0; background: #fff;
  }
  .consent-preview-scroll {
    overflow: auto; padding: 25px; background: #e9eef4;
  }
  .consent-print-root {
    display: flex; flex-direction: column; align-items: center; gap: 25px;
  }
  .consent-sheet {
    font-family: Georgia, 'Times New Roman', serif;
    box-sizing: border-box; width: 210mm; min-height: 297mm;
    padding: 17mm 17mm 16mm; background: white; color: #111;
    box-shadow: 0 4px 24px rgba(0, 0, 0, .16);
    font-size: 11pt; line-height: 1.43;
    print-color-adjust: exact; -webkit-print-color-adjust: exact;
  }
  .consent-letterhead {
    padding-bottom: 6mm; border-bottom: 1.5px solid #111;
    margin-bottom: 6mm; text-align: center;
  }
  .consent-letterhead-title {
    display: flex; align-items: center; justify-content: center; gap: 13px;
  }
  .consent-print-logo {
    width: 45px; height: 45px; border: 1.5px solid #111;
    border-radius: 50%; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
  }
  .consent-letterhead h1 {
    margin: 0; font: 700 20pt/1.2 Georgia, 'Times New Roman', serif;
    text-transform: uppercase; letter-spacing: .25px;
  }
  .consent-letterhead p {
    margin: 6px 0 0; font: 700 10.5pt/1.3 Arial, sans-serif;
    letter-spacing: .6px;
  }
  .consent-document-title {
    margin: 8mm 0 7mm; font: 700 14pt/1.3 Georgia, serif;
    text-align: center; text-decoration: underline; text-underline-offset: 4px;
  }
  .consent-metadata {
    display: flex; justify-content: space-between; gap: 20mm;
  }
  .consent-metadata .consent-blank-line {flex: 1;}
  .consent-two-column {
    display: grid; grid-template-columns: 1fr 1fr; column-gap: 12mm;
  }
  .consent-blank-line {
    display: flex; align-items: baseline; gap: 5px;
    min-height: 8mm; margin-bottom: 2mm; font-size: 10.5pt;
  }
  .consent-blank-label {flex: 0 0 auto; white-space: nowrap;}
  .consent-blank-rule {
    flex: 1; display: block; min-width: 12mm; height: 1px;
    border-bottom: 1px dotted #444;
  }
  .consent-section-heading {
    margin: 8mm 0 2mm; font: 700 12pt/1.3 Georgia, serif;
  }
  .consent-section-subheading {font-weight: bold; margin: 0 0 3mm;}
  .consent-procedure-lines .consent-blank-rule {
    margin: 6mm 0; width: 100%;
  }
  .consent-bullets {
    margin: 5mm 0 5mm; padding-left: 6mm; text-align: justify;
  }
  .consent-bullets li {margin-bottom: 3mm; padding-left: 1mm;}
  .consent-declaration {
    margin: 6mm 0; font-style: italic; text-align: justify;
  }
  .consent-signatures {margin-top: 14mm;}
  .consent-signatures .consent-blank-line {margin-bottom: 7mm;}
  .consent-boarding-fields {margin-top: 9mm;}
  .consent-vaccine-heading {
    margin: 7mm 0 4mm; font-weight: 700; font-size: 10.8pt;
  }
  .consent-vaccine-types {margin: 0 0 7mm; font-weight: 600;}
  .consent-body-paragraph {margin: 0 0 6mm; line-height: 1.5; text-align: justify;}
  .consent-boarding-signatures {margin-top: 16mm;}
  .consent-boarding-signatures > .consent-blank-line {width: 64%; margin-bottom: 7mm;}

  @media screen and (max-width: 850px) {
    .consent-preview-scroll {padding: 12px;}
    .consent-sheet {zoom: .76;}
  }
  @media screen and (max-width: 540px) {
    .consent-preview-overlay {padding: 7px;}
    .consent-preview-modal {max-height: calc(100vh - 14px);}
    .consent-preview-toolbar {padding: 12px;}
    .consent-sheet {zoom: .48;}
  }

  @page { size: A4 portrait; margin: 12mm; }
  @media print {
    html, body {height: auto !important; overflow: visible !important; background: #fff !important;}
    body * {visibility: hidden !important;}
    .consent-print-root, .consent-print-root * {visibility: visible !important;}
    .consent-preview-overlay, .consent-preview-modal, .consent-preview-scroll {
      position: static !important; display: block !important;
      width: 100% !important; height: auto !important;
      max-height: none !important; margin: 0 !important;
      padding: 0 !important; overflow: visible !important;
      background: white !important; border: 0 !important;
      box-shadow: none !important;
    }
    .consent-preview-toolbar {display: none !important;}
    .consent-print-root {
      position: absolute !important; top: 0 !important; left: 0 !important;
      display: block !important; width: 100% !important;
      margin: 0 !important; padding: 0 !important;
    }
    .consent-sheet {
      display: block !important; box-sizing: border-box !important;
      zoom: 1 !important; width: 100% !important;
      min-height: 0 !important; margin: 0 !important; padding: 0 !important;
      box-shadow: none !important; font-size: 10.5pt !important;
      break-after: page; page-break-after: always;
    }
    .consent-sheet:last-child {break-after: auto; page-break-after: auto;}
  }
`;

export default Header;
