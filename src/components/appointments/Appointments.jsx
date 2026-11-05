import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Download,
  Edit3,
  Eye,
  Filter,
  FileText,
  History,
  Pill,
  ReceiptText,
  LoaderCircle,
  PawPrint,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Syringe,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import apiRequest from "../../services/api";
import appointmentService from "../../services/appointment.service";
import patientService from "../../services/patient.service";
import prescriptionService from "../../services/prescription.service";
import serviceService from "../../services/service.service";
import speciesService from "../../services/species.service";
import vaccinationService from "../../services/vaccination.service.js";
import ServiceMultiSelect from "../../components/ServiceMultiSelect";

// Use the general appointments endpoint filtered by petId
const PATIENT_HISTORY_API_PATH = (petId) =>
  `/appointments`;
const PATIENT_HISTORY_PAGE_SIZE = 20;

const APPOINTMENT_TYPES = [
  { value: "CONSULTATION", label: "Consultation" },
  { value: "VACCINATION", label: "Vaccination" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "SURGERY", label: "Surgery" },
  { value: "EMERGENCY", label: "Emergency" },

  { value: "GROOMING", label: "Grooming" },
  { value: "OTHER", label: "Other" },
];

const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "HOSPITALIZED",
  "DISCHARGED",
  "CANCELLED",
  "NO_SHOW",
];

// Quick date buttons filter the already fetched appointment list without API calls.
const APPOINTMENT_DATE_FILTERS = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
];

const APPOINTMENTS_PAGE_SIZE = 20;
const APPOINTMENTS_FETCH_PAGE_SIZE = 100;
const MAX_APPOINTMENTS_FETCH_PAGES = 300;

const EMPTY_APPOINTMENT_FILTERS = {
  search: "",
  status: "",
  type: "",
  date: "",
  datePreset: "all",
};

// Build local calendar-day ranges once per selected view.
// These are used for client-side filtering ONLY, not API requests.
function getAppointmentDateRange({ datePreset = "all", date = "" }, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  let start;
  let endExclusive;

  switch (datePreset) {
    case "today":
      start = new Date(year, month, day);
      endExclusive = new Date(year, month, day + 1);
      break;
    case "tomorrow":
      start = new Date(year, month, day + 1);
      endExclusive = new Date(year, month, day + 2);
      break;
    case "this_week": {
      // ISO-style calendar week: Monday through Sunday.
      const mondayOffset = (now.getDay() + 6) % 7;
      start = new Date(year, month, day - mondayOffset);
      endExclusive = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 7,
      );
      break;
    }
    case "this_month":
      start = new Date(year, month, 1);
      endExclusive = new Date(year, month + 1, 1);
      break;
    case "custom": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      const [selectedYear, selectedMonth, selectedDay] = date.split("-").map(Number);
      start = new Date(selectedYear, selectedMonth - 1, selectedDay);
      if (formatDateInput(start) !== date) return null;
      endExclusive = new Date(selectedYear, selectedMonth - 1, selectedDay + 1);
      break;
    }
    default:
      return null;
  }

  return {
    dateFrom: start.toISOString(),
    dateTo: new Date(endExclusive.getTime() - 1).toISOString(),
  };
}

const initialFormData = {
  branchId: "",
  mode: "SCHEDULED",
  ownerId: "",
  petId: "",
  veterinarianId: "",
  serviceIds: [],
  type: "CONSULTATION",
  scheduledDate: "",
  walkInOwnerName: "",
  walkInOwnerPhone: "",
  walkInOwnerAddress: "",
  walkInPetName: "",
  walkInPetSpecies: "",
  walkInPetBreed: "",
  walkInPetGender: "",
  walkInPetAge: "",
  walkInPetWeight: "",
  reason: "",
  symptoms: "",
  notes: "",
  vaccineItemId: "",
  vaccineName: "",
  vaccinePricePerDose: "",
  vaccineDose: "",
  vaccineRoute: "Subcutaneous",
  vaccineSite: "",
  vaccineNotes: "",
};

const initialStats = {
  today: {
    total: 0,
    completed: 0,
    cancelled: 0,
    pending: 0,
  },
  upcoming: 0,
  monthlyTotal: 0,
  byStatus: {},
};

function findVaccinationService(services = []) {
  return (
    services.find((service) => {
      const name = String(service?.name || "").toLowerCase();
      const code = String(service?.code || "").toLowerCase();
      return (
        name.includes("vaccination") ||
        name.includes("vaccine") ||
        code.includes("vaccination") ||
        code.includes("vaccine")
      );
    }) || null
  );
}

function extractArray(result, keys = []) {
  const candidates = [
    result,
    result?.data,
    result?.data?.data,
    ...keys.flatMap((key) => [
      result?.[key],
      result?.data?.[key],
      result?.data?.data?.[key],
    ]),
  ];

  return candidates.find((value) => Array.isArray(value)) || [];
}

// Species are shared across the clinic. The walk-in API stores the NAME,
// not the species ID, so keep names as the values shown/submitted.
function normalizeSpeciesOptions(items = []) {
  const names = new Map();
  for (const item of items) {
    const name = (typeof item === "string" ? item : item?.name || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    if (!names.has(key)) {
      names.set(key, {
        id: typeof item === "object" && item ? item.id : undefined,
        name,
      });
    }
  }
  return [...names.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function matchingSpeciesName(items, name) {
  const needle = String(name || "").trim().toLocaleLowerCase();
  return items.find((item) => item.name.toLocaleLowerCase() === needle)?.name || "";
}

function getCreatedSpeciesResult(result) {
  const payload =
    result?.data?.data?.species ||
    result?.data?.species ||
    result?.species ||
    result?.data?.data ||
    result?.data ||
    result;
  return payload && typeof payload === "object" ? payload : { name: payload };
}

function getStoredUser() {
  const candidates = [
    localStorage.getItem("user"),
    localStorage.getItem("authUser"),
    localStorage.getItem("currentUser"),
  ];

  for (const value of candidates) {
    if (!value) continue;

    try {
      const parsed = JSON.parse(value);
      return parsed?.user || parsed?.data || parsed;
    } catch {
      // Ignore malformed storage values.
    }
  }

  return null;
}

function normaliseRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase();
}

function readStoredBranches() {
  try {
    const value = JSON.parse(localStorage.getItem("branches") || "[]");
    return Array.isArray(value)
      ? value.filter((branch) => branch?.isActive !== false)
      : [];
  } catch {
    return [];
  }
}

function Appointments() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser(), []);
  const currentRole = normaliseRole(currentUser?.role);
  const isDoctor = ["DOCTOR", "VETERINARIAN", "VET"].includes(currentRole);

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [veterinarians, setVeterinarians] = useState([]);
  const [veterinariansLoading, setVeterinariansLoading] = useState(false);
  const [veterinariansError, setVeterinariansError] = useState("");
  const [doctorsReloadKey, setDoctorsReloadKey] = useState(0);
  const [services, setServices] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [speciesOptions, setSpeciesOptions] = useState([]);
  const [speciesLoading, setSpeciesLoading] = useState(true);
  const [speciesLoadError, setSpeciesLoadError] = useState("");
  const [speciesCreateError, setSpeciesCreateError] = useState("");
  const [speciesCreating, setSpeciesCreating] = useState(false);
  const [branches, setBranches] = useState(() => readStoredBranches());
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(
    () => localStorage.getItem("selectedBranchId") || "",
  );
  const availableBranches = useMemo(
    () => branches.filter((branch) => branch.isActive !== false),
    [branches],
  );
  const selectedBranch = availableBranches.find(
    (branch) => branch.id === selectedBranchId,
  );
  const showingAllBranches = selectedBranchId === "all";

  // "all" is only a LIST filter. An appointment must belong to one real branch.
  // Resolve a usable branch even if the modal opens before branch state settles.
  const defaultAppointmentBranchId = useMemo(() => {
    const selected = availableBranches.find((b) => b.id === selectedBranchId);
    const stored = localStorage.getItem("selectedBranchId");
    const storedSelected = availableBranches.find((b) => b.id === stored);
    return (
      selected?.id ||
      storedSelected?.id ||
      availableBranches.find((b) => b.isMain)?.id ||
      availableBranches[0]?.id ||
      ""
    );
  }, [availableBranches, selectedBranchId]);

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesError("");
    try {
      // This endpoint applies role-based branch access on the backend.
      const result = await apiRequest("/users/me/branches");
      const responseBranches = extractArray(result, ["branches"]);
      const active = responseBranches.filter(
        (branch) => branch?.isActive !== false,
      );
      setBranches(active);
      localStorage.setItem("branches", JSON.stringify(active));
      localStorage.setItem(
        "branchIds",
        JSON.stringify(active.map((branch) => branch.id)),
      );
      setSelectedBranchId((previous) => {
        const saved = localStorage.getItem("selectedBranchId");
        const chosen =
          active.length > 1 && (previous === "all" || saved === "all")
            ? { id: "all" }
            : active.find((branch) => branch.id === previous) ||
              active.find((branch) => branch.id === saved) ||
              active.find((branch) => branch.isMain) ||
              active[0] ||
              null;
        return chosen?.id || "";
      });
    } catch (err) {
      setBranchesError(
        err.message || "Could not retrieve your assigned branches.",
      );
      // Do not trust stale cached assignments for authorization or list requests.
      setBranches([]);
      setSelectedBranchId("");
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    localStorage.setItem("selectedBranchId", selectedBranchId);
    const branch = availableBranches.find(
      (item) => item.id === selectedBranchId,
    );
    if (branch) localStorage.setItem("selectedBranch", JSON.stringify(branch));
    else localStorage.removeItem("selectedBranch");
  }, [selectedBranchId, availableBranches]);

  const [stats, setStats] = useState(initialStats);
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsRequestId = useRef(0);

  const [filters, setFilters] = useState({ ...EMPTY_APPOINTMENT_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_APPOINTMENT_FILTERS });

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [formData, setFormData] = useState(initialFormData);
  // This list is already filtered by branch on the backend.
  const availableVeterinarians = veterinarians;

  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [selectedServices, setSelectedServices] = useState([]);

  // Shared species endpoints also used by Patients.jsx:
  // GET /pets/species and POST /pets/species with { name }.
  const loadSpecies = useCallback(async () => {
    setSpeciesLoading(true);
    setSpeciesLoadError("");
    try {
      const response = await speciesService.getSpecies();
      const received = extractArray(response, ["species", "items"]);
      // Merge so an older GET cannot hide an item newly added during the request.
      setSpeciesOptions((previous) =>
        normalizeSpeciesOptions([...previous, ...received]),
      );
    } catch (requestError) {
      setSpeciesLoadError(
        requestError?.message || "Unable to load species. Please try again.",
      );
    } finally {
      setSpeciesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpecies();
  }, [loadSpecies]);

  async function addSpeciesAndSelect(inputName) {
    const name = String(inputName || "").trim().replace(/\s+/g, " ");
    if (!name) return false;
    const alreadyExists = matchingSpeciesName(speciesOptions, name);
    if (alreadyExists) {
      handleFormChange({
        target: { name: "walkInPetSpecies", value: alreadyExists },
      });
      setSpeciesCreateError("");
      return true;
    }
    if (speciesCreating) return false;

    setSpeciesCreating(true);
    setSpeciesCreateError("");
    try {
      const response = await speciesService.createSpecies({ name });
      const created = getCreatedSpeciesResult(response);
      const savedName = String(created?.name || name).trim().replace(/\s+/g, " ");
      setSpeciesOptions((previous) =>
        normalizeSpeciesOptions([...previous, { id: created?.id, name: savedName }]),
      );
      handleFormChange({
        target: { name: "walkInPetSpecies", value: savedName },
      });
      return true;
    } catch (requestError) {
      setSpeciesCreateError(
        requestError?.message || "Could not add species. Please retry.",
      );
      // A duplicate might have been added by another staff member. Allow retry.
      return false;
    } finally {
      setSpeciesCreating(false);
    }
  }

  // Registered patient search fields
  const [patientSearch, setPatientSearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [activeSearchField, setActiveSearchField] = useState("");

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [prescriptionPreview, setPrescriptionPreview] = useState(null);
  const [consentPreview, setConsentPreview] = useState(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [patientHistorySubject, setPatientHistorySubject] = useState(null);
  const [error, setError] = useState("");

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === formData.petId) || null,
    [patients, formData.petId],
  );

  // Search the already-loaded registered patients by patient name,
  // owner name, or owner phone. The result is always a registered patient.
  const patientSearchResults = useMemo(() => {
    const searchValue =
      activeSearchField === "patient"
        ? patientSearch
        : activeSearchField === "owner"
          ? ownerSearch
          : phoneSearch;

    const normalizeText = (value) =>
      String(value ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");

    const normalizePhone = (value) => String(value ?? "").replace(/\D/g, "");

    const search = normalizeText(searchValue);
    const phoneQuery = normalizePhone(searchValue);

    // When the field is focused with no search text, show the registered
    // patient list instead of an empty dropdown. Typing then filters it.
    if (!search && !phoneQuery) return patients.slice(0, 50);

    return patients
      .filter((patient) => {
        const patientName = normalizeText(patient?.name);
        const ownerName = normalizeText(getOwnerName(patient?.owner));
        const firstName = normalizeText(patient?.owner?.firstName);
        const lastName = normalizeText(patient?.owner?.lastName);
        const ownerPhone = normalizePhone(patient?.owner?.phone);
        const mobile = normalizePhone(patient?.owner?.mobile);
        const phoneNumber = normalizePhone(patient?.owner?.phoneNumber);

        if (activeSearchField === "patient") {
          return patientName.includes(search);
        }

        if (activeSearchField === "owner") {
          return (
            firstName.includes(search) ||
            lastName.includes(search) ||
            ownerName.includes(search)
          );
        }

        if (activeSearchField === "phone") {
          return (
            (phoneQuery && ownerPhone.includes(phoneQuery)) ||
            (phoneQuery && mobile.includes(phoneQuery)) ||
            (phoneQuery && phoneNumber.includes(phoneQuery))
          );
        }

        return false;
      })
      .slice(0, 20);
  }, [patients, patientSearch, ownerSearch, phoneSearch, activeSearchField]);

  function handleRegisteredPatientSearch(field, value) {
    if (field === "patient") setPatientSearch(value);
    if (field === "owner") setOwnerSearch(value);
    if (field === "phone") setPhoneSearch(value);

    setActiveSearchField(field);

    // Typing after a patient was selected starts a new search, so do not
    // accidentally keep the previous pet/owner IDs.
    if (formData.petId) {
      setFormData((previous) => ({
        ...previous,
        petId: "",
        ownerId: "",
      }));
    }

    setFieldErrors((previous) => ({
      ...previous,
      petId: "",
      ownerId: "",
    }));
    setFormError("");
  }

  function handleRegisteredPatientSelect(patient) {
    setFormData((previous) => ({
      ...previous,
      petId: patient.id,
      ownerId: patient?.owner?.id || patient?.ownerId || "",
    }));

    setPatientSearch(patient?.name || "");
    setOwnerSearch(getOwnerName(patient?.owner) || "");
    setPhoneSearch(patient?.owner?.phone || "");
    setActiveSearchField("");

    setFieldErrors((previous) => ({
      ...previous,
      petId: "",
      ownerId: "",
    }));
    setFormError("");
  }

  function resetRegisteredPatientSearch() {
    setPatientSearch("");
    setOwnerSearch("");
    setPhoneSearch("");
    setActiveSearchField("");
  }

  // Handle service change - MOVED INSIDE COMPONENT
  const handleServiceChange = (services) => {
    const nextServices = services;
    setSelectedServices(nextServices);

    // Services no longer determine an appointment duration.
    setFormData((previous) => ({
      ...previous,
      serviceIds: nextServices.map((service) => service.id),
    }));

    setFieldErrors((previous) => ({
      ...previous,
      serviceIds: "",
    }));

    setFormError("");
  };

  // Load the complete appointment dataset for the current branch and advanced
  // filters. Quick-date choices are deliberately NOT dependencies or API params.
  // That allows instant switching among dates, including appointments that
  // would otherwise fall on a different server-pagination page.
  const loadAppointments = useCallback(
    async (desiredPage = 1) => {
      const requestId = ++appointmentsRequestId.current;
      try {
        setLoading(true);
        setError("");
        if (branchesLoading) return;
        if (
          !selectedBranchId ||
          (selectedBranchId !== "all" &&
            !availableBranches.some((branch) => branch.id === selectedBranchId))
        ) {
          setAppointments([]);
          setCurrentPage(1);
          if (!branchesError) {
            setError("Select an accessible branch to view appointments.");
          }
          return;
        }

        const query = {
          branchId: selectedBranchId,
          limit: APPOINTMENTS_FETCH_PAGE_SIZE,
          search: appliedFilters.search,
          status: appliedFilters.status,
          type: appliedFilters.type,
        };
        if (isDoctor && currentUser?.id) {
          query.veterinarianId = currentUser.id;
        }

        const allAppointments = [];
        const seenIds = new Set();
        let fetchedRows = 0;
        let finished = false;
        for (let page = 1; page <= MAX_APPOINTMENTS_FETCH_PAGES; page += 1) {
          const result = await appointmentService.getAppointments({ ...query, page });
          if (requestId !== appointmentsRequestId.current) return;

          const batch = extractArray(result, ["appointments"]);
          fetchedRows += batch.length;
          for (const appointment of batch) {
            // Keep the existing clinic access + doctor rules.
            if (selectedBranchId !== "all" && appointment.branchId !== selectedBranchId) {
              continue;
            }
            if (
              isDoctor && currentUser?.id &&
              appointment.veterinarianId !== currentUser.id &&
              appointment.veterinarian?.id !== currentUser.id
            ) {
              continue;
            }
            if (appointment.id && seenIds.has(appointment.id)) continue;
            if (appointment.id) seenIds.add(appointment.id);
            allAppointments.push(appointment);
          }

          const pageInfo = result?.pagination || result?.data?.pagination || {};
          const reportedPages = Number(
            pageInfo.totalPages ?? pageInfo.pages ??
            result?.totalPages ?? result?.data?.totalPages,
          );
          const reportedTotal = Number(pageInfo.total ?? result?.total);

          if (Number.isFinite(reportedPages) && reportedPages > 0) {
            finished = page >= reportedPages;
          } else if (Number.isFinite(reportedTotal) && reportedTotal >= 0) {
            // Count actual returned rows, since some APIs cap requested limit.
            finished = fetchedRows >= reportedTotal;
          } else {
            finished = batch.length < APPOINTMENTS_FETCH_PAGE_SIZE;
          }
          if (batch.length === 0) finished = true;
          if (finished) break;
        }

        if (requestId !== appointmentsRequestId.current) return;
        if (!finished) {
          throw new Error(
            "There are too many appointments to load for instant date filtering. " +
            "Please narrow the search or branch and retry.",
          );
        }
        setAppointments(allAppointments);
        setCurrentPage(Math.max(1, Number(desiredPage) || 1));
      } catch (requestError) {
        if (requestId !== appointmentsRequestId.current) return;
        setAppointments([]);
        setCurrentPage(1);
        setError(requestError.message || "Unable to retrieve appointments.");
      } finally {
        if (requestId === appointmentsRequestId.current) setLoading(false);
      }
    },
    [
      appliedFilters.search,
      appliedFilters.status,
      appliedFilters.type,
      isDoctor,
      currentUser?.id,
      selectedBranchId,
      availableBranches,
      branchesLoading,
      branchesError,
    ],
  );

  // Pure in-memory filtering: no loading state and no network activity when
  // a quick date is clicked. A walk-in with no scheduledAt uses its visit date.
  const filteredAppointments = useMemo(() => {
    const range = getAppointmentDateRange(appliedFilters);
    if (!range) return appointments;
    const from = new Date(range.dateFrom).getTime();
    const to = new Date(range.dateTo).getTime();
    return appointments.filter((appointment) => {
      const value = appointment.scheduledAt || appointment.createdAt;
      if (!value) return false;
      const time = new Date(value).getTime();
      return Number.isFinite(time) && time >= from && time <= to;
    });
  }, [appointments, appliedFilters.datePreset, appliedFilters.date]);

  const pagination = useMemo(() => {
    const total = filteredAppointments.length;
    const totalPages = Math.max(1, Math.ceil(total / APPOINTMENTS_PAGE_SIZE));
    return {
      page: Math.min(currentPage, totalPages),
      limit: APPOINTMENTS_PAGE_SIZE,
      total,
      totalPages,
    };
  }, [currentPage, filteredAppointments.length]);

  const visibleAppointments = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filteredAppointments.slice(start, start + pagination.limit);
  }, [filteredAppointments, pagination.page, pagination.limit]);

  const loadStats = useCallback(async () => {
    try {
      const result = await appointmentService.getAppointmentStats();

      setStats({
        ...initialStats,
        ...(result?.data || {}),
      });
    } catch (requestError) {
      console.error("Unable to load appointment statistics:", requestError);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      setOptionsLoading(true);

      // Load every registered patient page-by-page. The previous
      // implementation only loaded the first 100 ACTIVE patients, so
      // owner/phone searches could not find patients outside that page.
      const loadAllPatients = async () => {
        const allPatients = [];
        const seenIds = new Set();
        const pageSize = 100;
        const maxPages = 1000;
        let page = 1;
        let totalPages = null;

        while (page <= maxPages) {
          const result = await patientService.getPatients({
            page,
            limit: pageSize,
          });

          const pagePatients = extractArray(result, ["patients", "pets"]);

          const currentPage = page;
          pagePatients.forEach((patient, index) => {
            const key = patient?.id || `page-${currentPage}-${index}`;
            if (seenIds.has(key)) return; // skip duplicate
            seenIds.add(key); // mark as seen
            allPatients.push(patient); // add to result
          });

          const paginationData =
            result?.pagination || result?.data?.pagination || {};
          const reportedTotalPages = Number(
            paginationData.totalPages ??
              paginationData.pages ??
              result?.totalPages ??
              result?.data?.totalPages,
          );

          if (Number.isFinite(reportedTotalPages) && reportedTotalPages > 0) {
            totalPages = reportedTotalPages;
          }

          if (totalPages !== null && page >= totalPages) break;
          if (pagePatients.length < pageSize) break;

          page += 1;
        }

        return allPatients;
      };

      // Patients and owners are clinic-wide, independent of appointment branch.
      const [allPatients, servicesResult, vaccinesResult] =
        await Promise.all([
          loadAllPatients(),

          serviceService.getServices({
            page: 1,
            limit: 100,
            isActive: true,
            sortBy: "name",
            sortOrder: "desc",
          }),

          vaccinationService.getVaccineInventory({
            page: 1,
            limit: 100,
            sortBy: "name",
            sortOrder: "desc",
          }),
        ]);

      setPatients(allPatients);

      setServices(extractArray(servicesResult, ["services"]));

      setVaccines(extractArray(vaccinesResult, ["items", "inventoryItems"]));
    } catch (requestError) {
      setError(requestError.message || "Unable to load appointment options.");
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    loadStats();
  }, [loadOptions, loadStats]);

  // Every authenticated clinic user can load active veterinarians for their
  // selected accessible branch. Patients and owners remain clinic-wide.
  // The backend GET /users route must use authentication, NOT admin-only middleware.
  // Ensure the appointment form has a real branch after an async branch fetch.
  // Never use the special "all" list filter as an appointment's branch ID.
  useEffect(() => {
    if (!showForm || editingAppointment || !defaultAppointmentBranchId) return;
    setFormData((prev) => {
      if (availableBranches.some((b) => b.id === prev.branchId)) return prev;
      return { ...prev, branchId: defaultAppointmentBranchId, veterinarianId: "" };
    });
  }, [showForm, editingAppointment, defaultAppointmentBranchId, availableBranches]);

  // Keep the modal's chosen branch or resolve a real default for new appointments.
  const resolvedFormBranchId =
    availableBranches.some((b) => b.id === formData.branchId)
      ? formData.branchId
      : !editingAppointment
        ? defaultAppointmentBranchId
        : "";

  useEffect(() => {
    let cancelled = false;
    const branchId = resolvedFormBranchId;

    if (
      !branchId ||
      branchId === "all" ||
      !availableBranches.some((branch) => branch.id === branchId)
    ) {
      setVeterinarians([]);
      setVeterinariansError("");
      setVeterinariansLoading(false);
      return undefined;
    }

    async function loadBranchVeterinarians() {
      setVeterinarians([]);
      setVeterinariansError("");
      setVeterinariansLoading(true);

      try {
        const params = new URLSearchParams({
          role: "VETERINARIAN",
          branchId,
          isActive: "true",
          limit: "100",
        });

        // No frontend role checks: receptionist, cashier, veterinarian,
        // assistants and admins all call the same authenticated endpoint.
        const result = await apiRequest(`/users?${params.toString()}`);
        if (cancelled) return;

        const doctors = extractArray(result, ["users", "veterinarians"])
          .filter((doctor) => doctor?.role === "VETERINARIAN" && doctor?.isActive !== false);
        setVeterinarians(doctors);
      } catch (requestError) {
        if (cancelled) return;
        setVeterinarians([]);
        setVeterinariansError(
          requestError.message || "Unable to load veterinarians for the selected branch."
        );
      } finally {
        if (!cancelled) setVeterinariansLoading(false);
      }
    }

    loadBranchVeterinarians();
    return () => { cancelled = true; };
  }, [resolvedFormBranchId, availableBranches, doctorsReloadKey]);

  useEffect(() => {
    loadAppointments(1);
  }, [loadAppointments]);

  // Keep the vaccination service selected after services load.
  useEffect(() => {
    if (formData.type !== "VACCINATION") return;

    const vaccinationService = findVaccinationService(services);
    if (!vaccinationService) return;

    const nextServiceId = vaccinationService.id || "";
    setSelectedServices([vaccinationService]);
    setFormData((previous) => {
      if (
        previous.type === "VACCINATION" &&
        previous.serviceIds?.length === 1 &&
        previous.serviceIds[0] === nextServiceId
      ) {
        return previous;
      }

      return {
        ...previous,
        serviceIds: [nextServiceId],
      };
    });
  }, [services, formData.type]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
      // Choosing a calendar date overrides a quick-date preset.
      ...(name === "date" ? { datePreset: value ? "custom" : "all" } : {}),
    }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({
      ...filters,
      search: filters.search.trim(),
    });
  }

  function applyQuickDateFilter(datePreset) {
    if (!APPOINTMENT_DATE_FILTERS.some((item) => item.value === datePreset)) return;
    // Only update local date selection; do not request appointments again.
    // Retain existing applied search/status/type filters. Unsaved text input
    // can still be applied separately with the Search button.
    setFilters((previous) => ({ ...previous, date: "", datePreset }));
    setAppliedFilters((previous) => ({ ...previous, date: "", datePreset }));
    setCurrentPage(1);
  }

  function clearFilters() {
    setFilters({ ...EMPTY_APPOINTMENT_FILTERS });
    setAppliedFilters({ ...EMPTY_APPOINTMENT_FILTERS });
    setCurrentPage(1);
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setFormError("");
    if (name === "walkInPetSpecies") setSpeciesCreateError("");

    if (name === "branchId") {
      // A real assigned branch, never "all" or an unknown value.
      if (!availableBranches.some((branch) => branch.id === value)) return;
      setFormData((previous) => ({
        ...previous,
        branchId: value,
        veterinarianId: "",
      }));
      return;
    }

    /* -------------------------------------------------- */
    /* Patient selection                                  */
    /* -------------------------------------------------- */

    if (name === "petId") {
      const patient = patients.find((item) => item.id === value) || null;

      setFormData((previous) => ({
        ...previous,

        petId: value,

        // Automatically set owner from selected patient
        ownerId: patient?.owner?.id || patient?.ownerId || "",
      }));

      setFieldErrors((previous) => ({
        ...previous,
        petId: "",
        ownerId: "",
      }));

      return;
    }

    /* -------------------------------------------------- */
    /* Appointment type                                   */
    /* -------------------------------------------------- */

    if (name === "type") {
      const vaccinationService = findVaccinationService(services);

      if (value === "VACCINATION" && vaccinationService) {
        setSelectedServices([vaccinationService]);

        setFormData((previous) => ({
          ...previous,

          type: value,

          serviceIds: [vaccinationService.id],


          veterinarianId: "",
        }));

        setFieldErrors((previous) => ({
          ...previous,
          type: "",
          serviceIds: "",
        }));

        return;
      }

      // Switching away from vaccination
      setSelectedServices([]);

      setFormData((previous) => ({
        ...previous,
        type: value,
        serviceIds: [],
      }));

      return;
    }

    /* -------------------------------------------------- */
    /* Vaccine selection                                  */
    /* -------------------------------------------------- */

    if (name === "vaccineItemId") {
      const selectedVaccine = vaccines.find((vaccine) => vaccine.id === value);

      setFormData((previous) => ({
        ...previous,

        vaccineItemId: value,

        vaccineName: selectedVaccine?.name || "",

        vaccinePricePerDose:
          selectedVaccine?.sellingPrice ?? selectedVaccine?.price ?? "",
      }));

      return;
    }

    /* -------------------------------------------------- */
    /* Normal fields                                      */
    /* -------------------------------------------------- */

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ADD openAddForm function
  function openAddForm() {
    const date = formatDateInput(new Date());

    setEditingAppointment(null);
    setSelectedServices([]);
    resetRegisteredPatientSearch();
    setFormData({
      ...initialFormData,
      branchId: defaultAppointmentBranchId,
      scheduledDate: date,
      serviceIds: [],
    });
    setFieldErrors({});
    setFormError("");
    setSpeciesCreateError("");
    setShowForm(true);
  }

  // ONLY ONE openEditForm function - KEEP THIS ONE
  function openEditForm(appointment) {
    const scheduledAt = new Date(appointment.scheduledAt);

    // Extract services from appointment
    const services = appointment.services?.map((aps) => aps.service) || [];
    setSelectedServices(services);

    setEditingAppointment(appointment);
    setFormData({
      branchId: appointment.branchId || "",
      mode: appointment.mode || "SCHEDULED",
      ownerId: appointment.ownerId || "",
      petId: appointment.petId || "",
      veterinarianId: appointment.veterinarianId || "",
      serviceIds: services.map((s) => s.id),
      type: appointment.type || "CONSULTATION",
      scheduledDate: Number.isNaN(scheduledAt.getTime())
        ? ""
        : formatDateInput(scheduledAt),
      walkInOwnerName: appointment.walkInOwnerName || "",
      walkInOwnerPhone: appointment.walkInOwnerPhone || "",
      walkInOwnerAddress: appointment.walkInOwnerAddress || "",
      walkInPetName: appointment.walkInPetName || "",
      walkInPetSpecies: appointment.walkInPetSpecies || "",
      walkInPetBreed: appointment.walkInPetBreed || "",
      walkInPetGender: appointment.walkInPetGender || "",
      walkInPetAge: appointment.walkInPetAge || "",
      walkInPetWeight:
        appointment.walkInPetWeight !== null &&
        appointment.walkInPetWeight !== undefined
          ? String(appointment.walkInPetWeight)
          : "",
      reason: appointment.reason || "",
      symptoms: appointment.symptoms || "",
      notes: appointment.notes || "",
      vaccineItemId: appointment.vaccination?.vaccineItemId || "",
      vaccineName: appointment.vaccination?.vaccineName || "",
      vaccinePricePerDose:
        appointment.vaccination?.pricePerDose ??
        appointment.vaccination?.vaccineItem?.sellingPrice ??
        "",
      vaccineDose: appointment.vaccination?.dose || "",
      vaccineRoute: appointment.vaccination?.route || "Subcutaneous",
      vaccineSite: appointment.vaccination?.site || "",
      vaccineNotes: appointment.vaccination?.notes || "",
    });

    const appointmentPatient =
      appointment.pet ||
      patients.find((patient) => patient.id === appointment.petId) ||
      null;

    setPatientSearch(appointmentPatient?.name || "");
    setOwnerSearch(
      getOwnerName(appointment.owner || appointmentPatient?.owner) || "",
    );
    setPhoneSearch(
      appointment.owner?.phone || appointmentPatient?.owner?.phone || "",
    );
    setActiveSearchField("");

    setFieldErrors({});
    setFormError("");
    setSpeciesCreateError("");
    setShowDetails(false);
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;

    setShowForm(false);
    setEditingAppointment(null);
    setFormData(initialFormData);
    setSelectedServices([]);
    resetRegisteredPatientSearch();
    setFieldErrors({});
    setFormError("");
  }

  function validateForm() {
    const errors = {};
    const isWalkIn = formData.mode === "WALK_IN";

    if (
      !resolvedFormBranchId ||
      !availableBranches.some((branch) => branch.id === resolvedFormBranchId)
    ) {
      errors.branchId = "Select a valid assigned branch.";
    }
    if (
      formData.veterinarianId &&
      (veterinariansLoading ||
        !availableVeterinarians.some(
          (doctor) => doctor.id === formData.veterinarianId,
        ))
    ) {
      errors.veterinarianId =
        "Selected veterinarian does not work at this branch.";
    }

    if (isWalkIn) {
      if (!formData.walkInOwnerName.trim()) {
        errors.walkInOwnerName = "Walk-in owner name is required.";
      }

      if (!formData.walkInOwnerPhone.trim()) {
        errors.walkInOwnerPhone = "Walk-in owner phone is required.";
      }

      if (!formData.walkInPetName.trim()) {
        errors.walkInPetName = "Walk-in pet name is required.";
      }

      if (!formData.walkInPetSpecies.trim()) {
        errors.walkInPetSpecies = "Walk-in pet species is required.";
      } else if (
        !matchingSpeciesName(speciesOptions, formData.walkInPetSpecies) &&
        // Retain historical walk-in names when editing older records.
        !(
          editingAppointment?.mode === "WALK_IN" &&
          editingAppointment.walkInPetSpecies?.trim().toLocaleLowerCase() ===
            formData.walkInPetSpecies.trim().toLocaleLowerCase()
        )
      ) {
        errors.walkInPetSpecies =
          "Choose a species from the list or click Add species to save it first.";
      }

      if (
        formData.walkInPetWeight &&
        (!Number.isFinite(Number(formData.walkInPetWeight)) ||
          Number(formData.walkInPetWeight) <= 0)
      ) {
        errors.walkInPetWeight = "Pet weight must be greater than zero.";
      }
    } else {
      if (!formData.petId) {
        errors.petId = "Please select a patient.";
      }

      const ownerId =
        formData.ownerId ||
        selectedPatient?.owner?.id ||
        selectedPatient?.ownerId;

      if (!ownerId) {
        errors.ownerId = "The selected patient has no owner.";
      }

      if (!formData.scheduledDate) {
        errors.scheduledDate = "Appointment date is required.";
      }
    }

    if (!formData.type) {
      errors.type = "Appointment type is required.";
    }

    if (formData.type === "VACCINATION") {
      if (!formData.vaccineItemId) {
        errors.vaccineItemId = "Please select a vaccine.";
      }
    }

    // Validate at least one service is selected
    if (selectedServices.length === 0) {
      errors.serviceIds = "Please select at least one service.";
    }

    return errors;
  }

  function createPayload() {
    const isWalkIn = formData.mode === "WALK_IN";

    const vaccination =
      formData.type === "VACCINATION"
        ? {
            vaccineItemId: formData.vaccineItemId,
            vaccineName: formData.vaccineName.trim(),
            pricePerDose:
              formData.vaccinePricePerDose !== ""
                ? Number(formData.vaccinePricePerDose)
                : null,
            dose: formData.vaccineDose.trim() || null,
            route: formData.vaccineRoute || null,
            site: formData.vaccineSite.trim() || null,
            notes: formData.vaccineNotes.trim() || null,
          }
        : undefined;

    const commonPayload = {
      branchId: resolvedFormBranchId,
      mode: formData.mode,
      veterinarianId: formData.veterinarianId || null,
      serviceIds: selectedServices.map((s) => s.id),
      type: formData.type,
      // Compatibility with the existing API/Prisma schema, where durationMin
      // is required. No duration is selected, displayed or validated in the UI.
      // Remove this fallback once the backend makes durationMin optional.
      durationMin: editingAppointment?.durationMin || 30,
      reason: formData.reason.trim() || null,
      symptoms: formData.symptoms.trim() || null,
      notes: formData.notes.trim() || null,
    };

    if (isWalkIn) {
      return {
        ...commonPayload,
        ownerId: formData.ownerId.trim() || null,
        petId: formData.petId.trim() || null,
        walkInOwnerName: formData.walkInOwnerName.trim(),
        walkInOwnerPhone: formData.walkInOwnerPhone.trim(),
        walkInOwnerAddress: formData.walkInOwnerAddress.trim() || null,
        walkInPetName: formData.walkInPetName.trim(),
        walkInPetSpecies:
          matchingSpeciesName(speciesOptions, formData.walkInPetSpecies) ||
          formData.walkInPetSpecies.trim(),
        walkInPetBreed: formData.walkInPetBreed.trim() || null,
        walkInPetGender: formData.walkInPetGender || null,
        walkInPetAge: formData.walkInPetAge.trim() || null,
        walkInPetWeight:
          formData.walkInPetWeight !== ""
            ? Number(formData.walkInPetWeight)
            : null,
        vaccination,
      };
    }

    // The user selects a DATE only. The existing API still expects a
    // scheduledAt DateTime, so encode it without a user-selected time.
    // For today, use the current instant to avoid submitting an old hour.
    // For other dates, use local noon to avoid timezone date rollover.
    const scheduledAt = toDateOnlyCompatibleTimestamp(formData.scheduledDate);

    return {
      ...commonPayload,
      ownerId: formData.ownerId || selectedPatient?.owner?.id || null,
      petId: formData.petId || selectedPatient?.id || null,
      scheduledAt,
      walkInOwnerName: null,
      walkInOwnerPhone: null,
      walkInOwnerAddress: null,
      walkInPetName: null,
      walkInPetSpecies: null,
      walkInPetBreed: null,
      walkInPetGender: null,
      walkInPetAge: null,
      walkInPetWeight: null,
      vaccination,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validateForm();
    if (speciesCreating) {
      setFormError("Finish adding the species before saving this appointment.");
      return;
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setFormError("Please correct the highlighted fields.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      setFieldErrors({});

      const payload = createPayload();
      // The backend must receive a valid, real branch ID on both modes.
      if (!payload.branchId || payload.branchId === "all") {
        setFormError("Please select a branch for this appointment.");
        return;
      }

      if (editingAppointment) {
        await appointmentService.updateAppointment(
          editingAppointment.id,
          payload,
        );
      } else {
        await appointmentService.createAppointment(payload);
      }

      setShowForm(false);
      setEditingAppointment(null);
      setFormData(initialFormData);
      setSelectedServices([]);
      resetRegisteredPatientSearch();
      setFieldErrors({});
      setFormError("");

      await Promise.all([
        loadAppointments(editingAppointment ? pagination.page : 1),
        loadStats(),
      ]);
    } catch (requestError) {
      setFormError(requestError.message || "Unable to save appointment.");

      setFieldErrors(requestError.errors || {});
    } finally {
      setSubmitting(false);
    }
  }

  // Open a dedicated, read-only longitudinal history for registered pets.
  // Unregistered walk-ins have no petId, so the API cannot link prior visits.
  function openPatientHistory(appointment) {
    const petId = appointment?.petId || appointment?.pet?.id;
    if (!petId) return;
    const registeredPet = patients.find((item) => item.id === petId);
    setPatientHistorySubject({
      petId,
      fallbackPatient: appointment?.pet || registeredPet || null,
      fallbackOwner: appointment?.owner || registeredPet?.owner || null,
    });
    setShowDetails(false);
  }

  async function openAppointmentDetails(appointment) {
    try {
      setDetailsLoading(true);
      setError("");
      setSelectedAppointment(appointment);
      setShowDetails(true);

      const result = await appointmentService.getAppointmentById(
        appointment.id,
      );

      setSelectedAppointment(result?.data || appointment);
    } catch (requestError) {
      setShowDetails(false);
      setError(requestError.message || "Unable to retrieve appointment.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function updateStatus(appointment, status) {
    try {
      setActionLoading(`${appointment.id}:${status}`);
      setError("");

      const result = await appointmentService.updateAppointmentStatus(
        appointment.id,
        status,
      );

      const updated = result?.data || {
        ...appointment,
        status,
      };

      setSelectedAppointment(updated);

      await Promise.all([loadAppointments(pagination.page), loadStats()]);
    } catch (requestError) {
      setError(requestError.message || "Unable to update appointment status.");
    } finally {
      setActionLoading("");
    }
  }

  async function cancelAppointment(appointment) {
    const reason = window.prompt("Enter the cancellation reason:");

    if (reason === null) return;

    if (!reason.trim()) {
      setError("Cancellation reason is required.");
      return;
    }

    try {
      setActionLoading(`${appointment.id}:CANCELLED`);
      setError("");

      const result = await appointmentService.cancelAppointment(
        appointment.id,
        reason.trim(),
      );

      setSelectedAppointment(
        result?.data || {
          ...appointment,
          status: "CANCELLED",
        },
      );

      await Promise.all([loadAppointments(pagination.page), loadStats()]);
    } catch (requestError) {
      setError(requestError.message || "Unable to cancel appointment.");
    } finally {
      setActionLoading("");
    }
  }

  async function deleteAppointment(appointment) {
    const confirmed = window.confirm(
      `Delete appointment ${appointment.appointmentNo}?`,
    );

    if (!confirmed) return;

    try {
      setActionLoading(`${appointment.id}:DELETE`);
      setError("");

      await appointmentService.deleteAppointment(appointment.id);

      setShowDetails(false);
      setSelectedAppointment(null);

      await Promise.all([loadAppointments(pagination.page), loadStats()]);
    } catch (requestError) {
      setError(requestError.message || "Unable to delete appointment.");
    } finally {
      setActionLoading("");
    }
  }

  function openPrescription(appointment) {
    navigate(`/prescriptions/new/${appointment.id}`, {
      state: { appointment },
    });
  }

  // Print either of the same consent forms available in Header.jsx, with
  // the appointment's registered or walk-in details filled automatically.
  // Load the full appointment first, since list rows may omit owner address,
  // date of birth, or veterinarian information.
  async function openConsentPrint(appointment, formType = "surgery") {
    if (!appointment?.id) return;

    setError("");
    setShowDetails(false);
    setConsentPreview({ appointment, type: formType, loadError: "" });
    setConsentLoading(true);

    try {
      const response = await appointmentService.getAppointmentById(appointment.id);
      const full =
        response?.data?.appointment ||
        response?.data?.data?.appointment ||
        response?.data?.data ||
        response?.data ||
        response?.appointment ||
        response;

      if (!full || typeof full !== "object" || !full.id) {
        throw new Error("The appointment details could not be read.");
      }

      // Preserve any populated relationships present on the row if the detail
      // API omits them, and prefer the fresh details when they are provided.
      const merged = {
        ...appointment,
        ...full,
        owner: full.owner || appointment.owner,
        pet: full.pet || appointment.pet,
        veterinarian: full.veterinarian || appointment.veterinarian,
      };
      setConsentPreview((previous) =>
        previous?.appointment?.id === appointment.id
          ? { ...previous, appointment: merged, loadError: "" }
          : previous,
      );
    } catch (requestError) {
      // Basic details already in the appointment row can still be printed.
      // Never manufacture missing information such as owner address or doctor.
      setConsentPreview((previous) =>
        previous?.appointment?.id === appointment.id
          ? {
              ...previous,
              loadError: requestError?.message || "Full appointment details are unavailable.",
            }
          : previous,
      );
    } finally {
      setConsentLoading(false);
    }
  }

  // Display the saved prescription IN THIS PAGE rather than navigating to
  // PrescriptionForm.jsx. Always re-check live status before enabling printing.
  async function printPrescription(appointment) {
    if (!appointment?.id) return;

    if (appointment.status !== "COMPLETED") {
      setError("Only completed appointments can have their prescriptions printed.");
      return;
    }

    try {
      setActionLoading(`${appointment.id}:PRINT`);
      setError("");

      const [appointmentResponse, prescriptionResponse] = await Promise.all([
        appointmentService.getAppointmentById(appointment.id),
        prescriptionService.getByAppointment(appointment.id),
      ]);

      const latestAppointment =
        appointmentResponse?.data?.appointment ||
        appointmentResponse?.data?.data ||
        appointmentResponse?.data ||
        appointmentResponse?.appointment ||
        appointmentResponse;

      // Use the database's latest status, not a potentially stale table row.
      if (latestAppointment?.status !== "COMPLETED") {
        throw new Error("This appointment is no longer completed. Refresh the list before printing.");
      }

      const prescription =
        prescriptionResponse?.data?.prescription ||
        prescriptionResponse?.data?.data ||
        prescriptionResponse?.data ||
        prescriptionResponse?.prescription ||
        prescriptionResponse;

      if (!prescription?.id) {
        throw new Error("No saved prescription found for this appointment.");
      }

      if (prescription.appointmentId && prescription.appointmentId !== appointment.id) {
        throw new Error("The saved prescription does not belong to this appointment.");
      }

      // Close the details modal, then open the read-only printable preview here.
      setShowDetails(false);
      setPrescriptionPreview({ appointment: latestAppointment, prescription });
    } catch (requestError) {
      setError(requestError?.message || "Could not open the prescription preview.");
    } finally {
      setActionLoading("");
    }
  }

  function exportVisibleAppointments() {
    const rows = [
      [
        "Branch",
        "Appointment No",
        "Date",
        "Patient",
        "Owner",
        "Phone",
        "Type",
        "Service",
        "Veterinarian",
        "Status",
        "Reason",
      ],
      ...filteredAppointments.map((appointment) => [
        appointment.branch?.name ||
          availableBranches.find((b) => b.id === appointment.branchId)?.name ||
          "",
        appointment.appointmentNo,
        formatDateOnly(appointment.scheduledAt || appointment.createdAt),
        appointment.pet?.name || appointment.walkInPetName || "",
        getOwnerName(appointment.owner) || appointment.walkInOwnerName || "",
        appointment.owner?.phone || appointment.walkInOwnerPhone || "",
        appointment.type,
        getServiceNames(appointment) || "",
        getUserName(appointment.veterinarian),
        appointment.status,
        appointment.reason || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `appointments-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            {isDoctor ? "My Appointments" : "Appointments"}
          </h3>

          <p className="text-secondary mb-0">
            {isDoctor
              ? "View your assigned patients, manage visits and create prescriptions."
              : "Schedule consultations, assign veterinarians and manage clinic visits."}
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={() => loadAppointments(pagination.page)}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "spin-icon" : ""} />
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={exportVisibleAppointments}
            disabled={!filteredAppointments.length}
          >
            <Download size={17} />
            Export
          </button>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={openAddForm}
            disabled={
              optionsLoading ||
              branchesLoading ||
              !selectedBranchId ||
              availableBranches.length === 0 ||
              Boolean(branchesError)
            }
          >
            <Plus size={18} />
            New Appointment
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <AlertCircle size={19} />
            <span>{error}</span>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
            aria-label="Close"
          />
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body d-flex flex-column flex-md-row align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-2 fw-semibold">
            <Building2 size={18} /> Appointment branch
          </div>
          {branchesLoading ? (
            <span className="small text-secondary">
              Loading accessible branches...
            </span>
          ) : branchesError ? (
            <div className="alert alert-danger mb-0 py-2">
              {branchesError}{" "}
              <button
                type="button"
                className="btn btn-sm btn-outline-danger ms-2"
                onClick={loadBranches}
              >
                Retry
              </button>
            </div>
          ) : availableBranches.length === 0 ? (
            <span className="text-danger small">
              No accessible active branches. Ask an administrator to assign you
              a branch.
            </span>
          ) : availableBranches.length === 1 ? (
            <span className="badge bg-primary-subtle text-primary px-3 py-2">
              {availableBranches[0].name} (automatic)
            </span>
          ) : (
            <select
              className="form-select"
              style={{ maxWidth: 340 }}
              aria-label="Filter appointments by branch"
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
            >
              <option value="all">All Branches</option>
              {availableBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                  {branch.isMain ? " (Main)" : ""}
                </option>
              ))}
            </select>
          )}
          {(selectedBranch || showingAllBranches) && (
            <small className="text-secondary">
              {showingAllBranches
                ? "Showing appointments from all accessible branches"
                : `Showing appointments for ${selectedBranch.name}`}
            </small>
          )}
        </div>
      </div>

      <div className="row g-3 mb-4">
        <SummaryCard
          title="Today (Clinic-wide)"
          value={stats.today?.total || 0}
          icon={Clock3}
          iconClass="bg-info-subtle text-info-emphasis"
        />

        <SummaryCard
          title="Upcoming (Clinic-wide)"
          value={stats.upcoming || 0}
          icon={CalendarDays}
          iconClass="bg-primary-subtle text-primary"
        />

        <SummaryCard
          title="Completed Today (Clinic-wide)"
          value={stats.today?.completed || 0}
          icon={CheckCircle2}
          iconClass="bg-success-subtle text-success"
        />

        <SummaryCard
          title="Monthly Total (Clinic-wide)"
          value={stats.monthlyTotal || 0}
          icon={Stethoscope}
          iconClass="bg-warning-subtle text-warning-emphasis"
        />
      </div>

      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-2 mb-3">
            <div className="d-flex align-items-center flex-wrap gap-2">
              <span className="small fw-semibold text-secondary d-inline-flex align-items-center gap-1 me-1">
                <CalendarDays size={16} /> Quick date
              </span>
              {APPOINTMENT_DATE_FILTERS.map((preset) => {
                const isActive =
                  appliedFilters.datePreset === preset.value &&
                  !appliedFilters.date;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 ${
                      isActive ? "btn-primary" : "btn-outline-secondary"
                    }`}
                    aria-pressed={isActive}
                    onClick={() => applyQuickDateFilter(preset.value)}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <small className="text-secondary">
              {appliedFilters.datePreset === "custom" && appliedFilters.date
                ? `Custom date: ${appliedFilters.date}`
                : APPOINTMENT_DATE_FILTERS.find(
                    (preset) => preset.value === appliedFilters.datePreset,
                  )?.label || "All Dates"}
            </small>
          </div>

          <form className="row g-2 mb-4" onSubmit={applyFilters}>
            <div className="col-12 col-xl">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={18} />
                </span>

                <input
                  type="search"
                  className="form-control border-start-0"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search appointment, patient, owner or phone"
                />
              </div>
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-2">
              <input
                type="date"
                className={`form-control ${filters.date ? "border-primary" : ""}`}
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
                aria-label="Custom appointment date"
                title="Choose a custom date, then click Search"
              />
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-2">
              <select
                className="form-select"
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
              >
                <option value="">All types</option>

                {APPOINTMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-2">
              <select
                className="form-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All statuses</option>

                {APPOINTMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatEnum(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-sm-6 col-lg-auto">
              <button type="submit" className="btn btn-primary w-100">
                Search
              </button>
            </div>

            <div className="col-sm-6 col-lg-auto">
              <button
                type="button"
                className="btn btn-light border w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={clearFilters}
              >
                <Filter size={16} />
                Clear
              </button>
            </div>
          </form>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <small className="text-secondary">
              Showing {visibleAppointments.length} of {pagination.total} matching appointments
            </small>
            {filters.datePreset === "custom" &&
              filters.date &&
              (appliedFilters.date !== filters.date || appliedFilters.datePreset !== "custom") && (
                <small className="text-primary">
                  Click Search to apply the selected custom date.
                </small>
              )}
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Branch</th>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Owner</th>
                  <th>Type / Service</th>
                  <th>Veterinarian</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <LoaderCircle
                        size={32}
                        className="spin-icon text-primary mb-3"
                      />

                      <div className="text-secondary">
                        Loading appointments...
                      </div>
                    </td>
                  </tr>
                ) : visibleAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <CalendarDays size={44} className="text-secondary mb-3" />

                      <h6 className="fw-semibold">No appointments found</h6>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={openAddForm}
                      >
                        New Appointment
                      </button>
                    </td>
                  </tr>
                ) : (
                  visibleAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>
                        <span className="badge bg-primary-subtle text-primary">
                          {appointment.branch?.name ||
                            availableBranches.find(
                              (branch) => branch.id === appointment.branchId,
                            )?.name ||
                            "Unknown branch"}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold small">
                          {formatDateOnly(appointment.scheduledAt || appointment.createdAt)}
                        </div>
                      </td>

                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                              width: 38,
                              height: 38,
                            }}
                          >
                            <PawPrint size={17} />
                          </div>

                          <div>
                            <div className="fw-semibold small">
                              {appointment.pet?.name ||
                                appointment.walkInPetName ||
                                "—"}
                            </div>

                            <small className="text-secondary">
                              {appointment.pet?.species?.name ||
                                appointment.walkInPetSpecies ||
                                "—"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="small fw-semibold">
                          {getOwnerName(appointment.owner) ||
                            appointment.walkInOwnerName ||
                            "—"}
                        </div>

                        <small className="text-secondary">
                          {appointment.owner?.phone ||
                            appointment.walkInOwnerPhone ||
                            "—"}
                        </small>
                      </td>

                      <td>
                        <div className="small fw-semibold">
                          {formatEnum(appointment.type)}
                        </div>

                        <small className="text-secondary">
                          {getServiceNames(appointment)}
                        </small>
                      </td>

                      <td>
                        <div className="small d-flex align-items-center gap-2">
                          <UserRound size={15} />
                          {getUserName(appointment.veterinarian) ||
                            "Unassigned"}
                        </div>
                      </td>

                      <td>
                        <StatusBadge status={appointment.status} />
                      </td>

                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            title="View appointment"
                            onClick={() => openAppointmentDetails(appointment)}
                          >
                            <Eye size={16} />
                          </button>

                          {isDoctor && (
                            <button
                              type="button"
                              className="btn btn-sm btn-success d-flex align-items-center gap-1"
                              title="Open prescription"
                              onClick={() => openPrescription(appointment)}
                            >
                              <FileText size={16} />
                              <span className="d-none d-xxl-inline">
                                Prescription
                              </span>
                            </button>
                          )}

                          {(appointment.petId || appointment.pet?.id) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
                              title="View patient appointment and medical history"
                              aria-label={`View visit and medical history for ${appointment.pet?.name || appointment.walkInPetName || "patient"}`}
                              onClick={() => openPatientHistory(appointment)}
                            >
                              <History size={16} />
                              <span className="d-none d-xxl-inline">History</span>
                            </button>
                          )}

                          {/* One Print menu for prescriptions and both consent forms. */}
                          <AppointmentPrintMenu
                            compact
                            appointment={appointment}
                            printing={actionLoading === `${appointment.id}:PRINT`}
                            onSelect={(type) =>
                              type === "prescription"
                                ? printPrescription(appointment)
                                : openConsentPrint(appointment, type)
                            }
                          />

                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            title="Edit appointment"
                            onClick={() => openEditForm(appointment)}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title="Delete appointment"
                            disabled={
                              actionLoading === `${appointment.id}:DELETE`
                            }
                            onClick={() => deleteAppointment(appointment)}
                          >
                            {actionLoading === `${appointment.id}:DELETE` ? (
                              <LoaderCircle size={16} className="spin-icon" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && pagination.totalPages > 1 && (
            <Pagination
              pagination={pagination}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </section>

      {showForm && (
        <AppointmentFormModal
          editing={Boolean(editingAppointment)}
          formData={{ ...formData, branchId: resolvedFormBranchId }}
          patients={patients}
          veterinarians={availableVeterinarians}
          veterinariansLoading={veterinariansLoading}
          veterinariansError={veterinariansError}
          onRetryVeterinarians={() => setDoctorsReloadKey((key) => key + 1)}
          branches={availableBranches}
          services={services}
          vaccines={vaccines}
          speciesOptions={speciesOptions}
          speciesLoading={speciesLoading}
          speciesLoadError={speciesLoadError}
          speciesCreateError={speciesCreateError}
          speciesCreating={speciesCreating}
          onRetrySpecies={loadSpecies}
          onCreateSpecies={addSpeciesAndSelect}
          selectedPatient={selectedPatient}
          selectedServices={selectedServices}
          patientSearch={patientSearch}
          ownerSearch={ownerSearch}
          phoneSearch={phoneSearch}
          activeSearchField={activeSearchField}
          patientSearchResults={patientSearchResults}
          onRegisteredPatientSearch={handleRegisteredPatientSearch}
          onRegisteredPatientSelect={handleRegisteredPatientSelect}
          onSearchFieldFocus={setActiveSearchField}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onChange={handleFormChange}
          onServiceChange={handleServiceChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {showDetails && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          loading={detailsLoading}
          actionLoading={actionLoading}
          onClose={() => {
            setShowDetails(false);
            setSelectedAppointment(null);
          }}
          onEdit={() => openEditForm(selectedAppointment)}
          onStatusChange={(status) => updateStatus(selectedAppointment, status)}
          onCancel={() => cancelAppointment(selectedAppointment)}
          canPrescribe={isDoctor}
          onPrescription={() => openPrescription(selectedAppointment)}
          onPatientHistory={() => openPatientHistory(selectedAppointment)}
          onPrint={(type) =>
            type === "prescription"
              ? printPrescription(selectedAppointment)
              : openConsentPrint(selectedAppointment, type)
          }
        />
      )}

      {patientHistorySubject && (
        <PatientAppointmentHistoryModal
          key={patientHistorySubject.petId}
          subject={patientHistorySubject}
          accessibleBranches={availableBranches}
          onClose={() => setPatientHistorySubject(null)}
        />
      )}

      {consentPreview && (
        <AppointmentConsentPrintPreview
          key={`${consentPreview.appointment?.id}:${consentPreview.type}`}
          initialType={consentPreview.type}
          appointment={consentPreview.appointment}
          loadError={consentPreview.loadError}
          loading={consentLoading}
          patients={patients}
          veterinarians={veterinarians}
          onClose={() => setConsentPreview(null)}
        />
      )}

      {prescriptionPreview && (
        <AppointmentPrescriptionPreview
          data={prescriptionPreview}
          onClose={() => setPrescriptionPreview(null)}
        />
      )}

      <style>{`
        .spin-icon {
          animation: appointments-spin 0.9s linear infinite;
        }

        @keyframes appointments-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}


// Read-only on-page preview. All content is taken from the SAVED prescription.
// The existing PrescriptionForm page is not opened for printing.
// Printable surgery and boarding consent forms, matching Header.jsx.
// Missing information remains a blank handwriting line rather than a guess.
function getAppointmentConsentFields(appointment, patients, veterinarians) {
  const patient = appointment?.pet || patients.find((p) => p.id === appointment?.petId) || {};
  const owner = appointment?.owner || patient.owner || {};
  const doctor =
    appointment?.veterinarian ||
    veterinarians.find((v) => v.id === appointment?.veterinarianId) ||
    {};

  const ownerAddress = appointment?.walkInOwnerAddress || formatConsentAddress(owner);
  const ownerName =
    getOwnerName(owner) || owner.fullName || owner.name || appointment?.walkInOwnerName || "";
  const petName = patient.name || appointment?.walkInPetName || "";
  const birth = patient.dateOfBirth || patient.birthDate || patient.dob;
  const rawAge = appointment?.walkInPetAge || patient.age;
  const age = rawAge !== null && rawAge !== undefined && String(rawAge).trim()
    ? (typeof rawAge === "number" || /^\d+(?:\.\d+)?$/.test(String(rawAge)))
      ? `${rawAge} ${patient.ageUnit || "years"}`
      : String(rawAge)
    : birth ? rxAge(birth).replace("—", "") : "";
  const gender = patient.gender || patient.sex || appointment?.walkInPetGender || "";
  const weight = appointment?.walkInPetWeight ?? patient.weightKg ?? patient.weight ?? null;
  const formattedWeight = weight !== null && weight !== undefined && weight !== ""
    ? `${weight} kg` : "";

  return {
    appointmentNo: appointment?.appointmentNo || "",
    date: formatDateOnly(appointment?.scheduledAt || appointment?.createdAt).replace("—", ""),
    ownerName,
    address: ownerAddress,
    phone: owner.phone || owner.mobile || owner.phoneNumber || appointment?.walkInOwnerPhone || "",
    petName,
    age,
    sex: gender ? formatEnum(String(gender)) : "",
    doctorName: getUserName(doctor) || doctor.fullName || doctor.name || "",
    weight: formattedWeight,
  };
}

function formatConsentAddress(owner) {
  if (!owner || typeof owner !== "object") return "";
  const address = owner.address;
  if (typeof address === "string" && address.trim()) return address.trim();
  if (address && typeof address === "object") {
    const readable = [address.line1, address.line2, address.street, address.ward,
      address.city, address.district, address.province].filter(Boolean).join(", ");
    if (readable) return readable;
  }
  return [owner.addressLine1, owner.addressLine2, owner.street, owner.wardNo,
    owner.city, owner.district].filter(Boolean).join(", ");
}

function AppointmentConsentPrintPreview({
  initialType = "surgery",
  appointment,
  patients,
  veterinarians,
  loading,
  loadError,
  onClose,
}) {
  const [type, setType] = useState(initialType);
  const fields = getAppointmentConsentFields(appointment, patients, veterinarians);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const pageTitle =
    type === "surgery" ? "Surgery & Anaesthetic Consent" :
    type === "boarding" ? "Boarding Consent Form" : "Both Consent Forms";

  return (
    <div className="appointment-consent-preview-overlay" role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div className="appointment-consent-preview-modal" role="dialog"
        aria-modal="true" aria-label="Appointment consent form print preview">
        <div className="appointment-consent-preview-toolbar">
          <div>
            <h5 className="fw-bold mb-1">{pageTitle}</h5>
            <small className="text-secondary">
              {fields.petName || "Patient"} · {appointment?.appointmentNo || "Appointment"} · A4 Preview
            </small>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <button type="button" className="btn btn-light border" onClick={onClose}>Close</button>
            <button type="button" className="btn btn-primary d-flex align-items-center gap-2"
              disabled={loading} onClick={() => window.print()}>
              <Printer size={17} /> Print / Save as PDF
            </button>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 px-3 py-2 border-bottom bg-white appointment-consent-selector">
          <button type="button" className={`btn btn-sm ${type === "surgery" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setType("surgery")}>Surgery & Anaesthetic</button>
          <button type="button" className={`btn btn-sm ${type === "boarding" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setType("boarding")}>Boarding</button>
          <button type="button" className={`btn btn-sm ${type === "both" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setType("both")}>Print Both</button>
        </div>
        {loading && <div className="small text-secondary px-3 py-2">Loading full appointment details…</div>}
        {!loading && loadError && (
          <div className="small text-warning-emphasis px-3 py-2" role="status">
            Could not retrieve full details: {loadError}. Blank fields must be completed by hand.
          </div>
        )}
        <div className="appointment-consent-preview-scroll">
          <div className="appointment-consent-print-root" id="appointment-consent-print-root">
            {(type === "surgery" || type === "both") && <AppointmentSurgeryConsentSheet fields={fields} />}
            {(type === "boarding" || type === "both") && <AppointmentBoardingConsentSheet fields={fields} />}
          </div>
        </div>
      </div>
      <style>{APPOINTMENT_CONSENT_PRINT_STYLES}</style>
    </div>
  );
}

function AppointmentConsentLetterhead() {

  return (

    <div className="appointment-consent-letterhead">

      <div className="appointment-consent-letterhead-title">

        <span className="appointment-consent-print-logo" aria-hidden="true">

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



function AppointmentConsentLine({ label, value = "", className = "" }) {
  const filled = String(value ?? "").trim();
  return (
    <div className={`appointment-consent-blank-line ${className}`}>
      <span className="appointment-consent-blank-label">{label}</span>
      <span className="appointment-consent-blank-rule">
        {filled && <span className="appointment-consent-value">{filled}</span>}
      </span>
    </div>
  );
}



function AppointmentSurgeryConsentSheet({ fields }) {

  return (

    <section className="appointment-consent-sheet" aria-label="Surgery and anaesthetic consent form">

      <AppointmentConsentLetterhead />

      <div className="appointment-consent-metadata">

        <AppointmentConsentLine label="Consent form no.:" value={fields.appointmentNo} />

        <AppointmentConsentLine label="Date:" value={fields.date} />

      </div>

      <h2 className="appointment-consent-document-title">SURGERY AND ANAESTHETIC CONSENT</h2>



      <div className="appointment-consent-two-column appointment-consent-identity-fields">

        <div>

          <AppointmentConsentLine label="Owner's Name:" value={fields.ownerName} />

          <AppointmentConsentLine label="Address:" value={fields.address} />

          <AppointmentConsentLine label="Contact number:" value={fields.phone} />

        </div>

        <div>

          <AppointmentConsentLine label="Name of Dog/Cat:" value={fields.petName} />

          <AppointmentConsentLine label="Age:" value={fields.age} />

          <AppointmentConsentLine label="Sex:" value={fields.sex} />

        </div>

      </div>



      <h3 className="appointment-consent-section-heading">SURGICAL PROCEDURE</h3>

      <p className="appointment-consent-section-subheading">Details of the Operation/Procedure</p>

      <div className="appointment-consent-procedure-lines">

        <div className="appointment-consent-blank-rule" />

        <div className="appointment-consent-blank-rule" />

      </div>



      <ul className="appointment-consent-bullets">

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



      <p className="appointment-consent-declaration">

        I have read and understood the information on this form. The information

        has been explained to me, and my questions have been answered. I give my

        consent to the above-noted procedure(s) and agree to sign this document.

      </p>



      <div className="appointment-consent-two-column appointment-consent-signatures">

        <div>

          <AppointmentConsentLine label="Name of Owner:" value={fields.ownerName} />

          <AppointmentConsentLine label="Signature of Owner:" />

        </div>

        <div>

          <AppointmentConsentLine label="Doctor in Charge:" value={fields.doctorName} />

          <AppointmentConsentLine label="Doctor's Signature:" />

        </div>

      </div>

    </section>

  );

}



function AppointmentBoardingConsentSheet({ fields }) {

  return (

    <section className="appointment-consent-sheet" aria-label="Boarding consent form">

      <AppointmentConsentLetterhead />

      <h2 className="appointment-consent-document-title">BOARDING CONSENT FORM</h2>



      <div className="appointment-consent-two-column appointment-consent-boarding-fields">

        <div>

          <AppointmentConsentLine label="Client's Name:" value={fields.ownerName} />

          <AppointmentConsentLine label="Date Admitted:" value={fields.date} />

          <AppointmentConsentLine label="Disease condition:" />

        </div>

        <div>

          <AppointmentConsentLine label="Pet's Name:" value={fields.petName} />

          <AppointmentConsentLine label="Date of Pickup:" />

          <AppointmentConsentLine label="Weight:" value={fields.weight} />

        </div>

      </div>



      <p className="appointment-consent-vaccine-heading">

        ALL CATS AND DOGS ADMITTED TO THE HOSPITAL MUST BE CURRENT ON THE FOLLOWING VACCINES:

      </p>

      <p className="appointment-consent-vaccine-types">

        <strong>DOGS:</strong> DHPPL, RABIES   /  

        <strong>CATS:</strong> RABIES AND PHC

      </p>

      <p className="appointment-consent-body-paragraph">

        If the owner does not provide vaccination details, vaccination of the

        pet may be required at the owner's expense. This is to protect your pet,

        our staff and other clients' pets.

      </p>



      <h3 className="appointment-consent-section-heading">CONSENT FOR ADMISSION TO CLINIC</h3>

      <p className="appointment-consent-body-paragraph">

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



      <div className="appointment-consent-boarding-signatures">

        <AppointmentConsentLine label="Owner's Signature:" />

        <div className="appointment-consent-two-column">

          <AppointmentConsentLine label="Date:" value={fields.date} />

          <AppointmentConsentLine label="Emergency contact number:" value={fields.phone} />

        </div>

      </div>

    </section>

  );

}

const APPOINTMENT_CONSENT_PRINT_STYLES = `

  .appointment-consent-preview-overlay {

    position: fixed; inset: 0; z-index: 2000;

    display: flex; align-items: center; justify-content: center;

    padding: 18px; background: rgba(17, 24, 39, .72);

  }

  .appointment-consent-preview-modal {

    display: flex; flex-direction: column; width: min(1080px, 100%);

    max-height: calc(100vh - 36px); background: #fff;

    border-radius: 16px; overflow: hidden;

    box-shadow: 0 24px 80px rgba(0, 0, 0, .3);

  }

  .appointment-consent-preview-toolbar {

    display: flex; justify-content: space-between; align-items: center;

    flex-wrap: wrap; gap: 12px; padding: 17px 22px;

    border-bottom: 1px solid #e2e8f0; background: #fff;

  }

  .appointment-consent-preview-scroll {

    overflow: auto; padding: 25px; background: #e9eef4;

  }

  .appointment-consent-print-root {

    display: flex; flex-direction: column; align-items: center; gap: 25px;

  }

  .appointment-consent-sheet {

    font-family: Georgia, 'Times New Roman', serif;

    box-sizing: border-box; width: 210mm; min-height: 297mm;

    padding: 17mm 17mm 16mm; background: white; color: #111;

    box-shadow: 0 4px 24px rgba(0, 0, 0, .16);

    font-size: 11pt; line-height: 1.43;

    print-color-adjust: exact; -webkit-print-color-adjust: exact;

  }

  .appointment-consent-letterhead {

    padding-bottom: 6mm; border-bottom: 1.5px solid #111;

    margin-bottom: 6mm; text-align: center;

  }

  .appointment-consent-letterhead-title {

    display: flex; align-items: center; justify-content: center; gap: 13px;

  }

  .appointment-consent-print-logo {

    width: 45px; height: 45px; border: 1.5px solid #111;

    border-radius: 50%; display: flex; align-items: center;

    justify-content: center; flex-shrink: 0;

  }

  .appointment-consent-letterhead h1 {

    margin: 0; font: 700 20pt/1.2 Georgia, 'Times New Roman', serif;

    text-transform: uppercase; letter-spacing: .25px;

  }

  .appointment-consent-letterhead p {

    margin: 6px 0 0; font: 700 10.5pt/1.3 Arial, sans-serif;

    letter-spacing: .6px;

  }

  .appointment-consent-document-title {

    margin: 8mm 0 7mm; font: 700 14pt/1.3 Georgia, serif;

    text-align: center; text-decoration: underline; text-underline-offset: 4px;

  }

  .appointment-consent-metadata {

    display: flex; justify-content: space-between; gap: 20mm;

  }

  .appointment-consent-metadata .appointment-consent-blank-line {flex: 1;}

  .appointment-consent-two-column {

    display: grid; grid-template-columns: 1fr 1fr; column-gap: 12mm;

  }

  .appointment-consent-blank-line {

    display: flex; align-items: baseline; gap: 5px;

    min-height: 8mm; margin-bottom: 2mm; font-size: 10.5pt;

  }

  .appointment-consent-blank-label {flex: 0 0 auto; white-space: nowrap;}

  .appointment-consent-blank-rule {
    flex: 1;
    display: flex;
    align-items: baseline;
    min-width: 12mm;
    min-height: 1.25em;
    border-bottom: 1px dotted #444;
    padding: 0 1mm 1px;
  }
  .appointment-consent-value {
    font-weight: 600;
    line-height: 1.25;
    overflow-wrap: anywhere;
    min-width: 0;
  }

  .appointment-consent-section-heading {

    margin: 8mm 0 2mm; font: 700 12pt/1.3 Georgia, serif;

  }

  .appointment-consent-section-subheading {font-weight: bold; margin: 0 0 3mm;}

  .appointment-consent-procedure-lines .appointment-consent-blank-rule {

    margin: 6mm 0; width: 100%;

  }

  .appointment-consent-bullets {

    margin: 5mm 0 5mm; padding-left: 6mm; text-align: justify;

  }

  .appointment-consent-bullets li {margin-bottom: 3mm; padding-left: 1mm;}

  .appointment-consent-declaration {

    margin: 6mm 0; font-style: italic; text-align: justify;

  }

  .appointment-consent-signatures {margin-top: 14mm;}

  .appointment-consent-signatures .appointment-consent-blank-line {margin-bottom: 7mm;}

  .appointment-consent-boarding-fields {margin-top: 9mm;}

  .appointment-consent-vaccine-heading {

    margin: 7mm 0 4mm; font-weight: 700; font-size: 10.8pt;

  }

  .appointment-consent-vaccine-types {margin: 0 0 7mm; font-weight: 600;}

  .appointment-consent-body-paragraph {margin: 0 0 6mm; line-height: 1.5; text-align: justify;}

  .appointment-consent-boarding-signatures {margin-top: 16mm;}

  .appointment-consent-boarding-signatures > .appointment-consent-blank-line {width: 64%; margin-bottom: 7mm;}



  @media screen and (max-width: 850px) {

    .appointment-consent-preview-scroll {padding: 12px;}

    .appointment-consent-sheet {zoom: .76;}

  }

  @media screen and (max-width: 540px) {

    .appointment-consent-preview-overlay {padding: 7px;}

    .appointment-consent-preview-modal {max-height: calc(100vh - 14px);}

    .appointment-consent-preview-toolbar {padding: 12px;}

    .appointment-consent-sheet {zoom: .48;}

  }



  @page { size: A4 portrait; margin: 12mm; }

  @media print {

    html, body {height: auto !important; overflow: visible !important; background: #fff !important;}

    body * {visibility: hidden !important;}

    .appointment-consent-print-root, .appointment-consent-print-root * {visibility: visible !important;}

    .appointment-consent-preview-overlay, .appointment-consent-preview-modal, .appointment-consent-preview-scroll {

      position: static !important; display: block !important;

      width: 100% !important; height: auto !important;

      max-height: none !important; margin: 0 !important;

      padding: 0 !important; overflow: visible !important;

      background: white !important; border: 0 !important;

      box-shadow: none !important;

    }

    .appointment-consent-preview-toolbar, .appointment-consent-selector {display: none !important;}

    .appointment-consent-print-root {

      position: absolute !important; top: 0 !important; left: 0 !important;

      display: block !important; width: 100% !important;

      margin: 0 !important; padding: 0 !important;

    }

    .appointment-consent-sheet {

      display: block !important; box-sizing: border-box !important;

      zoom: 1 !important; width: 100% !important;

      min-height: 0 !important; margin: 0 !important; padding: 0 !important;

      box-shadow: none !important; font-size: 10.5pt !important;

      break-after: page; page-break-after: always;

    }

    .appointment-consent-sheet:last-child {break-after: auto; page-break-after: auto;}

  }

`;





function AppointmentPrescriptionPreview({ data, onClose }) {
  const { appointment, prescription: rx } = data;
  const pet = appointment.pet || rx.pet || {};
  const owner = appointment.owner || rx.owner || {};
  const vet = appointment.veterinarian || rx.veterinarian || {};
  const medicines = Array.isArray(rx.medicines)
    ? rx.medicines.filter((item) => String(item?.medicineName || "").trim())
    : [];
  const labs = Array.isArray(rx.laboratoryTests) ? rx.laboratoryTests.filter((x) => x?.testName) : [];
  const imaging = Array.isArray(rx.imagingRequests)
    ? rx.imagingRequests.filter((x) => x?.bodyPart || x?.clinicalHistory || x?.result?.findings || x?.result?.impression)
    : [];
  const vaccinations = Array.isArray(rx.vaccinations)
    ? rx.vaccinations.filter((x) => x?.vaccineName)
    : [];
  const blood = rx.bloodReport || {};
  const cbcRows = Array.isArray(blood.rows)
    ? blood.rows.filter((x) => String(x?.result ?? "").trim())
    : [];
  const biochem = blood.biochemistry || {};
  const biochemRows = biochem.enabled && Array.isArray(biochem.rows)
    ? biochem.rows.filter((x) => String(x?.result ?? "").trim())
    : [];
  const panelLabels = {
    LFT: "LFT — Liver / Hepatobiliary Profile",
    KFT: "KFT — Renal Function Profile",
    ELECTROLYTES: "Electrolytes & Mineral Profile",
    OTHER: "Other Biochemistry",
  };
  const panels = [...new Set(biochemRows.map((x) => x.panel || "OTHER"))];
  const bloodNotes = [blood.smearFindings, blood.interpretation, blood.remarks]
    .some((v) => String(v || "").trim());
  const hasBlood = cbcRows.length > 0 || bloodNotes;
  const ownerName = getOwnerName(owner) || appointment.walkInOwnerName || "—";
  const patientName = pet.name || appointment.walkInPetName || "—";
  const doctorName = getUserName(vet) || "—";
  const temperature = rx.temperatureF !== null && rx.temperatureF !== undefined && rx.temperatureF !== ""
    ? rx.temperatureF
    : rx.temperatureC !== null && rx.temperatureC !== undefined && rx.temperatureC !== ""
      ? ((Number(rx.temperatureC) * 9) / 5 + 32).toFixed(1)
      : "";
  const plans = Array.isArray(rx.treatmentPlans)
    ? rx.treatmentPlans.filter((x) => x?.plan?.trim())
    : [];

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="appointment-rx-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="appointment-rx-dialog" role="dialog" aria-modal="true" aria-label="Prescription print preview">
        <div className="appointment-rx-toolbar">
          <div>
            <h5 className="fw-bold mb-1">Prescription Preview</h5>
            <small className="text-secondary">{patientName} · {appointment.appointmentNo || appointment.id}</small>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-light border" onClick={onClose}>Close</button>
            <button type="button" className="btn btn-primary d-flex align-items-center gap-2" onClick={() => window.print()}>
              <Printer size={17} /> Print / Save as PDF
            </button>
          </div>
        </div>

        <div className="appointment-rx-scroll">
          <article className="appointment-rx-document" id="appointment-rx-print">
            <header className="appointment-rx-letterhead">
              <div>
                <h1>Gandaki vet and pet</h1>
                <div>Veterinary Clinic & Pet Care Centre</div>
                <small>Pokhara, Kaski, Nepal</small>
              </div>
              <div className="appointment-rx-contact">
                <div>+977-9802859465</div>
                <div>pokharapethouse@example.com</div>
              </div>
            </header>

            <div className="appointment-rx-title">
              <div>
                <h2>Veterinary Prescription & Clinical Report</h2>
                <small>Prescription ID: {rx.id}</small>
              </div>
              <span className="appointment-rx-symbol">℞</span>
            </div>

            <section className="appointment-rx-grid">
              <RxInfo label="Patient" value={patientName} />
              <RxInfo label="Species" value={pet.species?.name || appointment.walkInPetSpecies} />
              <RxInfo label="Breed" value={pet.breed?.name || (typeof pet.breed === "string" ? pet.breed : "") || appointment.walkInPetBreed} />
              <RxInfo label="Sex" value={pet.gender || pet.sex || appointment.walkInPetGender} />
              <RxInfo label="Age" value={pet.age ? `${pet.age} years` : appointment.walkInPetAge || rxAge(pet.dateOfBirth)} />
              <RxInfo label="Owner" value={ownerName} />
              <RxInfo label="Phone" value={owner.phone || appointment.walkInOwnerPhone} />
              <RxInfo label="Visit date" value={formatDateOnly(appointment.scheduledAt)} />
              <RxInfo label="Veterinarian" value={doctorName} />
              <RxInfo label="Branch" value={appointment.branch?.name} />
              <RxInfo label="Appointment No." value={appointment.appointmentNo} />
            </section>

            <RxSection title="Clinical Summary">
              <RxLine label="Chief complaint" value={rx.chiefComplaint} />
              <RxLine label="History of present illness" value={rx.history} />
              <RxLine label="Known allergies" value={rx.allergies} />
              <div className="appointment-rx-grid appointment-rx-vitals">
                <RxInfo label="Weight" value={rx.weightKg !== null && rx.weightKg !== undefined && rx.weightKg !== "" ? `${rx.weightKg} kg` : ""} />
                <RxInfo label="Temperature" value={temperature !== "" ? `${temperature} °F` : ""} />
                <RxInfo label="Pulse" value={rx.pulseBpm ? `${rx.pulseBpm} bpm` : ""} />
                <RxInfo label="Respiration" value={rx.respirationRate ? `${rx.respirationRate}/min` : ""} />
                <RxInfo label="Hydration" value={rx.hydrationStatus} />
                <RxInfo label="BCS" value={rx.bodyConditionScore ? `${rx.bodyConditionScore}/9` : ""} />
              </div>
              <RxLine label="Physical examination" value={rx.physicalExamination} />
            </RxSection>

            <RxSection title="Assessment & Treatment">
              <RxLine label="Investigation" value={rx.investigation === "OTHER" ? rx.investigationOther : rx.investigation || rx.differentialDiagnosis} />
              <RxLine label="Diagnosis" value={rx.diagnosis} />
              {plans.length ? plans.map((plan, i) => (
                <RxLine key={`plan-${i}`} label={`Treatment plan ${plan.date ? `(${plan.date})` : i + 1}`} value={plan.plan} />
              )) : <RxLine label="Treatment plan" value={rx.treatmentPlan} />}
            </RxSection>

            {medicines.length > 0 && (
              <RxSection title="Medicines / Prescription">
                <div className="appointment-rx-table-scroll">
                  <table className="appointment-rx-table">
                    <thead><tr><th>#</th><th>Medicine</th><th>Strength</th><th>Dose / Route</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
                    <tbody>{medicines.map((medicine, i) => (
                      <tr key={`${medicine.id || medicine.medicineName}-${i}`}>
                        <td>{i + 1}</td><td>{medicine.medicineName}</td><td>{medicine.strength || "—"}</td>
                        <td>{[medicine.dosage, medicine.route ? formatEnum(medicine.route) : ""].filter(Boolean).join(" / ") || "—"}</td>
                        <td>{medicine.frequency || "—"}</td><td>{medicine.duration || "—"}</td>
                        <td>{medicine.quantity || "—"}</td><td>{medicine.instructions || "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </RxSection>
            )}

            {hasBlood && (
              <RxSection title="Complete Blood Count (CBC)">
                <div className="appointment-rx-grid">
                  <RxInfo label="Report date" value={blood.reportDate} />
                  <RxInfo label="Sample ID" value={blood.sampleId} />
                  <RxInfo label="Specimen" value={blood.specimen} />
                  <RxInfo label="Analyser" value={blood.analyser} />
                  <RxInfo label="Technician" value={blood.technicianName} />
                  <RxInfo label="Authorised by" value={blood.pathologistName} />
                </div>
                {cbcRows.length > 0 && (
                  <table className="appointment-rx-table">
                    <thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference range</th><th>Flag</th></tr></thead>
                    <tbody>{cbcRows.map((row, i) => (
                      <tr key={`${row.key || row.test}-${i}`}>
                        <td>{row.test}</td><td><strong>{row.result}</strong></td><td>{row.unit}</td><td>{row.range}</td><td>{row.flag || "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
                <RxLine label="Smear findings" value={blood.smearFindings} />
                <RxLine label="Interpretation" value={blood.interpretation} />
                <RxLine label="Remarks" value={blood.remarks} />
              </RxSection>
            )}

            {biochemRows.length > 0 && (
              <RxSection title="Serum Biochemistry">
                <div className="appointment-rx-grid">
                  <RxInfo label="Report date" value={biochem.reportDate} />
                  <RxInfo label="Sample ID" value={biochem.sampleId} />
                  <RxInfo label="Specimen" value={biochem.specimen} />
                  <RxInfo label="Analyser" value={biochem.analyser} />
                </div>
                {panels.map((panel) => (
                  <div className="appointment-rx-panel" key={panel}>
                    <h4>{panelLabels[panel] || formatEnum(panel)}</h4>
                    <table className="appointment-rx-table">
                      <thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference range</th><th>Flag</th></tr></thead>
                      <tbody>{biochemRows.filter((row) => (row.panel || "OTHER") === panel).map((row, i) => (
                        <tr key={`${row.key || row.test}-${i}`}>
                          <td>{row.test}</td><td><strong>{row.result}</strong></td><td>{row.unit}</td><td>{row.range}</td><td>{row.flag || "—"}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ))}
              </RxSection>
            )}

            {labs.length > 0 && (
              <RxSection title="Additional Laboratory Requests">
                <ol className="appointment-rx-list">
                  {labs.map((lab, i) => (
                    <li key={lab.id || i}>{[lab.testName, lab.specimen, formatEnum(lab.priority), lab.instructions].filter(Boolean).join(" — ")}</li>
                  ))}
                </ol>
              </RxSection>
            )}

            {imaging.length > 0 && (
              <RxSection title="Imaging Requests & Results">
                <ol className="appointment-rx-list">
                  {imaging.map((item, i) => (
                    <li key={item.id || i}>
                      <strong>{formatEnum(item.type)} — {item.bodyPart || "Not specified"}</strong>
                      {item.views ? ` | Views: ${item.views}` : ""}
                      {item.clinicalHistory ? ` | Clinical history: ${item.clinicalHistory}` : ""}
                      {item.result?.findings ? <div>Findings: {item.result.findings}</div> : null}
                      {item.result?.impression ? <div>Impression: {item.result.impression}</div> : null}
                      {item.result?.recommendations ? <div>Recommendations: {item.result.recommendations}</div> : null}
                    </li>
                  ))}
                </ol>
              </RxSection>
            )}

            {vaccinations.length > 0 && (
              <RxSection title="Vaccinations">
                <ol className="appointment-rx-list">
                  {vaccinations.map((item, i) => (
                    <li key={item.id || i}>
                      <strong>{item.vaccineName}</strong> — {[item.dose, formatEnum(item.route), item.batchNo ? `Batch ${item.batchNo}` : "", item.manufacturer].filter(Boolean).join(", ")}
                      {item.administeredDate ? ` | Administered: ${item.administeredDate}` : ""}
                      {item.nextDueDate ? ` | Next due: ${item.nextDueDate}` : ""}
                      {item.notes ? <div>{item.notes}</div> : null}
                    </li>
                  ))}
                </ol>
              </RxSection>
            )}

            <RxSection title="Advice & Follow-up">
              <RxLine label="Advice / home care" value={rx.advice} />
              <RxLine label="Follow-up date" value={rx.followUpDate} />
              <RxLine label="Follow-up notes" value={rx.followUpNotes} />
              <RxLine label="Other reports" value={rx.otherReports} />
            </RxSection>

            <section className="appointment-rx-signatures">
              <div><div className="appointment-rx-sign-line" /><strong>{blood.technicianName || ""}</strong><small>Lab Technician</small></div>
              <div><div className="appointment-rx-sign-line" /><strong>{blood.pathologistName || ""}</strong><small>Report Authorised By</small></div>
              <div><div className="appointment-rx-sign-line" /><strong>{doctorName !== "—" ? doctorName : ""}</strong><small>Veterinarian Signature & Stamp</small></div>
            </section>
            <footer className="appointment-rx-footer">Gandaki vet and pet · Pokhara, Nepal · +977-9802859465 · Computer-generated clinical document</footer>
          </article>
        </div>
      </div>

      <style>{`
        .appointment-rx-overlay { position:fixed; inset:0; z-index:1200; background:rgba(15,23,42,.65); display:flex; justify-content:center; align-items:center; padding:16px; }
        .appointment-rx-dialog { width:min(1050px,100%); height:min(94vh,1100px); background:#f1f5f9; border-radius:15px; box-shadow:0 20px 75px rgba(0,0,0,.3); display:flex; flex-direction:column; overflow:hidden; }
        .appointment-rx-toolbar { background:#fff; padding:15px 20px; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; flex-shrink:0; }
        .appointment-rx-scroll { overflow:auto; padding:25px 16px 40px; flex:1; }
        .appointment-rx-document { width:210mm; max-width:100%; min-height:297mm; margin:0 auto; padding:17mm 14mm; background:white; color:#182336; font-family:Arial, sans-serif; font-size:11px; line-height:1.55; box-shadow:0 3px 18px rgba(0,0,0,.12); box-sizing:border-box; }
        .appointment-rx-letterhead { display:flex; justify-content:space-between; gap:20px; padding-bottom:12px; border-bottom:3px solid #0b5b80; }
        .appointment-rx-letterhead h1 { font-size:22px; margin:0 0 4px; font-weight:800; color:#0b5b80; }
        .appointment-rx-contact { text-align:right; font-size:10px; }
        .appointment-rx-title { display:flex; justify-content:space-between; align-items:center; padding:15px 0 12px; }
        .appointment-rx-title h2 { font-size:16px; margin:0 0 4px; font-weight:800; }
        .appointment-rx-symbol { font-size:38px; font-weight:bold; color:#0b5b80; }
        .appointment-rx-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px 14px; margin-bottom:14px; }
        .appointment-rx-info { overflow-wrap:anywhere; }
        .appointment-rx-info small { display:block; font-size:9px; color:#64748b; }
        .appointment-rx-info strong { font-size:11px; font-weight:600; }
        .appointment-rx-section { margin-top:14px; break-inside:auto; }
        .appointment-rx-section h3 { font-size:12px; text-transform:uppercase; background:#eaf4f9; color:#0b5b80; padding:7px 9px; margin:0 0 9px; font-weight:800; break-after:avoid; }
        .appointment-rx-line { margin:5px 0; white-space:pre-wrap; overflow-wrap:anywhere; }
        .appointment-rx-line strong { margin-right:8px; }
        .appointment-rx-vitals { background:#f8fafc; padding:10px; border:1px solid #e2e8f0; margin-top:10px; }
        .appointment-rx-table-scroll { overflow-x:auto; }
        .appointment-rx-table { border-collapse:collapse; width:100%; margin:8px 0 13px; font-size:10px; }
        .appointment-rx-table th,.appointment-rx-table td { padding:5px 6px; border:1px solid #cbd5e1; text-align:left; vertical-align:top; overflow-wrap:anywhere; }
        .appointment-rx-table thead th { background:#edf3f7; color:#1e293b; }
        .appointment-rx-table thead { display:table-header-group; }
        .appointment-rx-table tr { break-inside:avoid; }
        .appointment-rx-panel { margin:12px 0; }
        .appointment-rx-panel h4 { font-weight:700; font-size:11px; margin:8px 0 4px; }
        .appointment-rx-list { padding-left:20px; margin:5px 0 10px; }
        .appointment-rx-list li { padding:3px 0; break-inside:avoid; }
        .appointment-rx-signatures { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; margin-top:40px; text-align:center; }
        .appointment-rx-signatures strong,.appointment-rx-signatures small { display:block; }
        .appointment-rx-signatures small { font-size:9px; color:#64748b; }
        .appointment-rx-sign-line { border-top:1px solid #64748b; margin-bottom:6px; }
        .appointment-rx-footer { margin-top:25px; padding-top:8px; border-top:1px solid #cbd5e1; color:#64748b; text-align:center; font-size:9px; }
        @media(max-width:650px) { .appointment-rx-document { padding:14px; min-height:unset; } .appointment-rx-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .appointment-rx-contact { display:none; } .appointment-rx-scroll { padding:12px 6px; } }
        @media print {
          @page { size:A4; margin:0; }
          /* Modern browsers: remove unrelated appointment UI from print layout. */
          body:has(#appointment-rx-print) *:not(:has(#appointment-rx-print)):not(#appointment-rx-print):not(#appointment-rx-print *) { display:none !important; }
          body * { visibility:hidden !important; }
          .appointment-rx-overlay, .appointment-rx-dialog, .appointment-rx-scroll { position:static !important; inset:auto !important; width:100% !important; max-width:none !important; height:auto !important; max-height:none !important; min-height:0 !important; overflow:visible !important; padding:0 !important; margin:0 !important; border:0 !important; box-shadow:none !important; background:transparent !important; }
          .appointment-rx-overlay { position:absolute !important; left:0 !important; top:0 !important; display:block !important; }
          .appointment-rx-toolbar { display:none !important; }
          #appointment-rx-print, #appointment-rx-print * { visibility:visible !important; }
          #appointment-rx-print { position:relative !important; width:210mm !important; max-width:210mm !important; min-height:0 !important; margin:0 !important; padding:13mm !important; font-size:10px !important; box-shadow:none !important; }
          #appointment-rx-print .appointment-rx-grid { grid-template-columns:repeat(4,minmax(0,1fr)) !important; }
          #appointment-rx-print .appointment-rx-contact { display:block !important; }
          #appointment-rx-print .appointment-rx-table-scroll { overflow:visible !important; }
          #appointment-rx-print .appointment-rx-section h3 { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
        }
      `}</style>
    </div>
  );
}

function RxInfo({ label, value }) {
  return <div className="appointment-rx-info"><small>{label}</small><strong>{value === null || value === undefined || value === "" ? "—" : value}</strong></div>;
}

function RxLine({ label, value }) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return <div className="appointment-rx-line"><strong>{label}:</strong><span>{value}</span></div>;
}

function RxSection({ title, children }) {
  return <section className="appointment-rx-section"><h3>{title}</h3>{children}</section>;
}

function rxAge(value) {
  if (!value) return "—";
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) return "—";
  return months < 12 ? `${months} months` : `${Math.floor(months / 12)} years ${months % 12} months`;
}

function AppointmentFormModal({
  editing,
  formData,
  patients,
  veterinarians,
  veterinariansLoading,
  veterinariansError,
  onRetryVeterinarians,
  branches,
  services,
  vaccines,
  speciesOptions,
  speciesLoading,
  speciesLoadError,
  speciesCreateError,
  speciesCreating,
  onRetrySpecies,
  onCreateSpecies,
  selectedPatient,
  selectedServices,
  patientSearch,
  ownerSearch,
  phoneSearch,
  activeSearchField,
  patientSearchResults,
  onRegisteredPatientSearch,
  onRegisteredPatientSelect,
  onSearchFieldFocus,
  fieldErrors,
  formError,
  submitting,
  onChange,
  onServiceChange,
  onSubmit,
  onClose,
}) {
  const isWalkIn = formData.mode === "WALK_IN";

  return (
    <ModalShell
      title={editing ? "Edit Appointment" : "Schedule Appointment"}
      subtitle="Create a registered or walk-in appointment from the same form."
      onClose={onClose}
      size="modal-xl"
    >
      <form
        onSubmit={onSubmit}
        className="d-flex flex-column flex-grow-1 overflow-hidden"
      >
        <div className="modal-body overflow-auto">
          {formError && <div className="alert alert-danger">{formError}</div>}

          <FormSection title="Appointment branch">
            <div className="row g-3">
              {branches.length === 1 ? (
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Assigned branch
                  </label>
                  <div className="form-control bg-light d-flex align-items-center gap-2">
                    <Building2 size={16} /> {branches[0].name}
                  </div>
                  <small className="text-secondary">
                    Assigned automatically.
                  </small>
                </div>
              ) : (
                <FormSelect
                  label="Select branch"
                  name="branchId"
                  value={formData.branchId}
                  onChange={onChange}
                  error={fieldErrors.branchId}
                  disabled={editing}
                  required
                  col="col-md-6"
                >
                  <option value="">Choose appointment branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.isMain ? " (Main)" : ""}
                    </option>
                  ))}
                </FormSelect>
              )}
              {editing && (
                <div className="col-12 small text-secondary">
                  Appointment branch cannot be changed while editing; move
                  appointments using a dedicated branch-transfer workflow.
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="Appointment mode">
            <div className="row g-3">
              <FormSelect
                label="Customer type"
                name="mode"
                value={formData.mode}
                onChange={onChange}
                required
                col="col-md-6"
              >
                <option value="SCHEDULED">Registered customer</option>
                <option value="WALK_IN">Walk-in customer</option>
              </FormSelect>

              <div className="col-md-6 d-flex align-items-end">
                <div className="alert alert-light border mb-0 w-100 py-2">
                  {isWalkIn
                    ? "Walk-in visits are checked in immediately. The visit date is recorded automatically."
                    : "Select an existing registered patient and the appointment date."}
                </div>
              </div>
            </div>
          </FormSection>

          {isWalkIn ? (
            <FormSection title="Walk-in customer and pet">
              <div className="row g-3">
                <FormInput
                  label="Owner name"
                  name="walkInOwnerName"
                  value={formData.walkInOwnerName}
                  onChange={onChange}
                  error={fieldErrors.walkInOwnerName}
                  required
                  col="col-md-4"
                />

                <FormInput
                  label="Owner phone"
                  name="walkInOwnerPhone"
                  value={formData.walkInOwnerPhone}
                  onChange={onChange}
                  error={fieldErrors.walkInOwnerPhone}
                  required
                  col="col-md-4"
                />

                <FormInput
                  label="Owner address"
                  name="walkInOwnerAddress"
                  value={formData.walkInOwnerAddress}
                  onChange={onChange}
                  col="col-md-4"
                />

                <FormInput
                  label="Pet name"
                  name="walkInPetName"
                  value={formData.walkInPetName}
                  onChange={onChange}
                  error={fieldErrors.walkInPetName}
                  required
                  col="col-md-4"
                />

                <SpeciesSearchSelect
                  value={formData.walkInPetSpecies}
                  onChange={(name) =>
                    onChange({ target: { name: "walkInPetSpecies", value: name } })
                  }
                  options={speciesOptions}
                  loading={speciesLoading}
                  loadError={speciesLoadError}
                  createError={speciesCreateError}
                  creating={speciesCreating}
                  onRetry={onRetrySpecies}
                  onCreate={onCreateSpecies}
                  error={fieldErrors.walkInPetSpecies}
                  required
                  col="col-md-4"
                />

                <FormInput
                  label="Breed"
                  name="walkInPetBreed"
                  value={formData.walkInPetBreed}
                  onChange={onChange}
                  col="col-md-4"
                />

                <FormSelect
                  label="Gender"
                  name="walkInPetGender"
                  value={formData.walkInPetGender}
                  onChange={onChange}
                  col="col-md-4"
                >
                  <option value="">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </FormSelect>

                <FormInput
                  label="Age"
                  name="walkInPetAge"
                  value={formData.walkInPetAge}
                  onChange={onChange}
                  placeholder="e.g. 2 years"
                  col="col-md-4"
                />

                <FormInput
                  label="Weight (kg)"
                  name="walkInPetWeight"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.walkInPetWeight}
                  onChange={onChange}
                  error={fieldErrors.walkInPetWeight}
                  col="col-md-4"
                />
              </div>
            </FormSection>
          ) : (
            <FormSection title="Patient and owner">
              <div className="row g-3">
                <SearchableRegisteredField
                  label="Patient"
                  value={patientSearch}
                  placeholder="Search patient name"
                  required
                  error={fieldErrors.petId}
                  col="col-md-6"
                  active={activeSearchField === "patient"}
                  results={patientSearchResults}
                  onFocus={() => onSearchFieldFocus("patient")}
                  onChange={(value) =>
                    onRegisteredPatientSearch("patient", value)
                  }
                  onSelect={onRegisteredPatientSelect}
                />

                <SearchableRegisteredField
                  label="Owner"
                  value={ownerSearch}
                  placeholder="Search owner name"
                  error={fieldErrors.ownerId}
                  col="col-md-3"
                  active={activeSearchField === "owner"}
                  results={patientSearchResults}
                  onFocus={() => onSearchFieldFocus("owner")}
                  onChange={(value) =>
                    onRegisteredPatientSearch("owner", value)
                  }
                  onSelect={onRegisteredPatientSelect}
                />

                <SearchableRegisteredField
                  label="Phone"
                  value={phoneSearch}
                  placeholder="Search owner phone"
                  col="col-md-3"
                  active={activeSearchField === "phone"}
                  results={patientSearchResults}
                  onFocus={() => onSearchFieldFocus("phone")}
                  onChange={(value) =>
                    onRegisteredPatientSearch("phone", value)
                  }
                  onSelect={onRegisteredPatientSelect}
                />
              </div>
            </FormSection>
          )}

          <FormSection title="Appointment details">
            <div className="row g-3">
              <FormSelect
                label="Appointment type"
                name="type"
                value={formData.type}
                onChange={onChange}
                error={fieldErrors.type}
                required
                col="col-md-4"
              >
                {APPOINTMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </FormSelect>

              {!isWalkIn && (
                <FormInput
                  label="Date"
                  name="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={onChange}
                  error={fieldErrors.scheduledDate}
                  required
                  col="col-md-4"
                />
              )}

              <FormSelect
                label="Veterinarian"
                name="veterinarianId"
                value={formData.veterinarianId}
                onChange={onChange}
                error={fieldErrors.veterinarianId}
                disabled={!formData.branchId || veterinariansLoading}
                col="col-md-6"
              >
                <option value="">{veterinariansLoading ? "Loading veterinarians..." : "Unassigned"}</option>
                {veterinarians.map((user) => (
                  <option key={user.id} value={user.id}>
                    {getUserName(user)}
                    {user.specialization ? ` — ${user.specialization}` : ""}
                  </option>
                ))}
              </FormSelect>
              {veterinariansError && (
                <div className="col-12 d-flex align-items-center gap-2 text-danger small" role="alert">
                  <span>{veterinariansError}</span>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetryVeterinarians}>
                    Retry
                  </button>
                </div>
              )}
              {!veterinariansLoading && !veterinariansError && formData.branchId && veterinarians.length === 0 && (
                <div className="col-12 text-secondary small">
                  No active veterinarians are assigned to the selected branch. You can leave the appointment unassigned.
                </div>
              )}

              {/* SERVICES MULTI-SELECT */}
              <div className="col-12">
                <label className="form-label">Services</label>
                <ServiceMultiSelect
                  selectedServices={selectedServices}
                  onServicesChange={onServiceChange}
                  services={services}
                  disabled={formData.type === "VACCINATION"}
                  error={fieldErrors.serviceIds}
                />
                {formData.type === "VACCINATION" && (
                  <div className="alert alert-info mt-2">
                    <small>
                      💉 Vaccination service will be automatically added.
                    </small>
                  </div>
                )}
              </div>
              {/* END OF SERVICES MULTI-SELECT */}
            </div>
          </FormSection>

          {formData.type === "VACCINATION" && (
            <FormSection title="Vaccination details">
              <div className="row g-3">
                <FormSelect
                  label="Vaccine"
                  name="vaccineItemId"
                  value={formData.vaccineItemId}
                  onChange={onChange}
                  error={fieldErrors.vaccineItemId}
                  required
                  disabled={editing}
                  col="col-md-6"
                >
                  <option value="">Select vaccine</option>
                  {vaccines.map((vaccine) => (
                    <option key={vaccine.id} value={vaccine.id}>
                      {vaccine.name}
                      {vaccine.code ? ` — ${vaccine.code}` : ""}
                    </option>
                  ))}
                </FormSelect>

                <FormInput
                  label="Vaccine name"
                  name="vaccineName"
                  value={formData.vaccineName}
                  readOnly
                  col="col-md-6"
                />

                <FormInput
                  label="Price per dose"
                  name="vaccinePricePerDose"
                  value={formData.vaccinePricePerDose}
                  readOnly
                  col="col-md-4"
                />

                <FormInput
                  label="Dose"
                  name="vaccineDose"
                  value={formData.vaccineDose}
                  onChange={onChange}
                  disabled={editing}
                  placeholder="e.g. 1 ml"
                  col="col-md-4"
                />

                <FormSelect
                  label="Route"
                  name="vaccineRoute"
                  value={formData.vaccineRoute}
                  onChange={onChange}
                  disabled={editing}
                  col="col-md-4"
                >
                  <option value="Subcutaneous">Subcutaneous</option>
                  <option value="Intramuscular">Intramuscular</option>
                  <option value="Intravenous">Intravenous</option>
                  <option value="Oral">Oral</option>
                  <option value="Other">Other</option>
                </FormSelect>

                <FormInput
                  label="Site"
                  name="vaccineSite"
                  value={formData.vaccineSite}
                  onChange={onChange}
                  disabled={editing}
                  placeholder="e.g. Right shoulder"
                  col="col-md-4"
                />

                <FormTextarea
                  label="Vaccination notes"
                  name="vaccineNotes"
                  value={formData.vaccineNotes}
                  onChange={onChange}
                  disabled={editing}
                  col="col-12"
                  rows="2"
                />
              </div>
              <div className="alert alert-info mt-3 mb-0 small">
                {editing
                  ? "Vaccination details are shown from the linked vaccination record. Manage administration and stock from the Vaccination module."
                  : "This appointment schedules the vaccination. The existing Vaccination module can later mark it as administered and deduct vaccine stock."}
              </div>
            </FormSection>
          )}

          <FormSection title="Clinical details">
            <div className="row g-3">
              <FormTextarea
                label="Reason"
                name="reason"
                value={formData.reason}
                onChange={onChange}
                col="col-md-6"
                rows="3"
              />

              <FormTextarea
                label="Symptoms"
                name="symptoms"
                value={formData.symptoms}
                onChange={onChange}
                col="col-md-6"
                rows="3"
              />

              <FormTextarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={onChange}
                col="col-12"
                rows="3"
              />
            </div>
          </FormSection>
        </div>

        <div className="modal-footer bg-white flex-shrink-0">
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary d-flex align-items-center gap-2"
            disabled={submitting || speciesCreating}
          >
            {submitting && <LoaderCircle size={17} className="spin-icon" />}

            {editing
              ? "Save Changes"
              : isWalkIn
                ? "Create Walk-in"
                : "Schedule Appointment"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ================================================================
// PATIENT HISTORY — chronological appointments + clinical records
// Accepts appointment history responses with { data: appointments[], summary, pagination }
// or { appointments: [...] }. Loads full prescriptions separately when needed.
// Data is fetched only when this modal opens (and on Load Older or branch change).
// Quick-date filters on the appointments table remain entirely client-side.
// ================================================================
function historyValue(value) {
  if (value === null || value === undefined || value === "") return "";
  return typeof value === "object" ? "" : String(value).trim();
}

function HistoryTextField({ label, value, wide = false }) {
  const text = historyValue(value);
  if (!text) return null;
  return (
    <div className={`patient-history-field ${wide ? "patient-history-field-wide" : ""}`}>
      <span>{label}</span>
      <div>{text}</div>
    </div>
  );
}

function HistorySection({ title, icon: Icon, children }) {
  return (
    <section className="patient-history-section">
      <h4>{Icon && <Icon size={16} />} {title}</h4>
      <div className="patient-history-section-body">{children}</div>
    </section>
  );
}

// The appointment history response may embed prescriptions inside a medical
// record, while this clinic also saves full prescriptions separately.
// Keep both sources and avoid showing the same saved prescription twice.
function historyPrescriptionList(visit, lookup) {
  const embedded = [
    ...(Array.isArray(visit?.medicalRecord?.prescriptions) ? visit.medicalRecord.prescriptions : []),
    ...(Array.isArray(visit?.prescriptions) ? visit.prescriptions : []),
    ...(visit?.prescription && typeof visit.prescription === "object" ? [visit.prescription] : []),
    ...(lookup?.state === "found" && lookup.prescription ? [lookup.prescription] : []),
  ].filter((prescription) => prescription && typeof prescription === "object");

  const byId = new Map();
  const withoutId = [];
  for (const prescription of embedded) {
    if (prescription.id) {
      // The separate saved record normally has more detail than a compact
      // prescription nested inside the appointment history response.
      byId.set(prescription.id, { ...(byId.get(prescription.id) || {}), ...prescription });
    } else {
      withoutId.push(prescription);
    }
  }
  return [...byId.values(), ...withoutId];
}

function historySavedPrescriptionFromResponse(response, appointmentId) {
  const root = response?.data?.data?.prescription ||
    response?.data?.prescription ||
    response?.prescription ||
    response?.data?.data ||
    response?.data ||
    response;
  const prescription = Array.isArray(root) ? root.find((item) => item?.id) : root;
  if (!prescription || typeof prescription !== "object" || !prescription.id) return null;
  // Do not accidentally display another appointment's clinical information.
  if (prescription.appointmentId && prescription.appointmentId !== appointmentId) {
    throw new Error("Prescription does not belong to this appointment.");
  }
  return prescription;
}

function historyPrescriptionNotFound(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0);
  if (status === 404) return true;
  const message = String(error?.message || "");
  return /(?:\b404\b|no saved prescription|prescription not found|no prescription found)/i.test(message);
}

function HistoryPrescriptionDetails({ prescription, number }) {
  const rx = prescription || {};
  const medicines = (
    Array.isArray(rx.medicines) ? rx.medicines :
    Array.isArray(rx.items) ? rx.items : []
  ).filter((item) => item && typeof item === "object");
  const treatmentPlans = Array.isArray(rx.treatmentPlans) ? rx.treatmentPlans : [];
  const labs = Array.isArray(rx.laboratoryTests) ? rx.laboratoryTests : [];
  const imaging = Array.isArray(rx.imagingRequests) ? rx.imagingRequests : [];
  const vaccines = Array.isArray(rx.vaccinations) ? rx.vaccinations : [];
  const cbc = rx.bloodReport || {};
  const cbcRows = Array.isArray(cbc.rows) ? cbc.rows : [];
  const biochemical = cbc.biochemistry || {};
  const biochemRows = Array.isArray(biochemical.rows) ? biochemical.rows : [];
  const temp = rx.temperatureF != null && rx.temperatureF !== ""
    ? `${rx.temperatureF} °F`
    : rx.temperatureC != null && rx.temperatureC !== "" ? `${rx.temperatureC} °C` : "";

  const clinicalFields = [
    ["Chief complaint", rx.chiefComplaint],
    ["Present illness / history", rx.history],
    ["Known allergies", rx.allergies],
    ["Physical examination", rx.physicalExamination],
    ["Investigation", rx.investigation === "OTHER" ? rx.investigationOther : rx.investigation],
    ["Differential diagnosis", rx.differentialDiagnosis],
    ["Diagnosis", rx.diagnosis],
    ["Treatment plan", rx.treatmentPlan],
  ];
  const hasClinical = clinicalFields.some(([, value]) => historyValue(value));
  const hasVitals = [rx.weightKg, temp, rx.pulseBpm, rx.respirationRate,
    rx.hydrationStatus, rx.bodyConditionScore].some((value) => value !== null && value !== undefined && value !== "");

  return (
    <div className="patient-history-rx patient-history-rx-detailed">
      <div className="patient-history-rx-heading">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <span className="patient-history-rx-icon"><Pill size={17} /></span>
          <div>
            <strong>Prescription {number}</strong>
            {rx.id && <small className="d-block text-secondary">Reference: {rx.id}</small>}
          </div>
          {rx.status && <span className="patient-history-small-chip">{formatEnum(rx.status)}</span>}
        </div>
        <div className="patient-history-muted">
          {rx.startDate ? `Started ${formatDateOnly(rx.startDate)}` : ""}
          {rx.endDate ? ` · Until ${formatDateOnly(rx.endDate)}` : ""}
        </div>
      </div>

      {hasClinical && (
        <div className="patient-history-rx-subsection">
          <h5>Clinical examination and assessment</h5>
          <div className="patient-history-fields">
            {clinicalFields.map(([label, value]) => (
              <HistoryTextField key={label} label={label} value={value} wide />
            ))}
          </div>
        </div>
      )}
      {hasVitals && (
        <div className="patient-history-rx-subsection">
          <h5>Recorded vitals</h5>
          <div className="patient-history-fields">
            <HistoryTextField label="Weight" value={rx.weightKg != null && rx.weightKg !== "" ? `${rx.weightKg} kg` : ""} />
            <HistoryTextField label="Temperature" value={temp} />
            <HistoryTextField label="Pulse" value={rx.pulseBpm != null && rx.pulseBpm !== "" ? `${rx.pulseBpm} bpm` : ""} />
            <HistoryTextField label="Respiration" value={rx.respirationRate != null && rx.respirationRate !== "" ? `${rx.respirationRate}/min` : ""} />
            <HistoryTextField label="Hydration" value={rx.hydrationStatus} />
            <HistoryTextField label="Body condition score" value={rx.bodyConditionScore != null && rx.bodyConditionScore !== "" ? `${rx.bodyConditionScore}/9` : ""} />
          </div>
        </div>
      )}
      {treatmentPlans.length > 0 && (
        <div className="patient-history-rx-subsection">
          <h5>Treatment plan history</h5>
          {treatmentPlans.map((item, index) => (
            <HistoryTextField key={item.id || index}
              label={`Plan ${index + 1}${item.date ? ` · ${formatDateOnly(item.date)}` : ""}`}
              value={item.plan} wide />
          ))}
        </div>
      )}
      {medicines.length > 0 && (
        <div className="patient-history-rx-subsection">
          <h5>Prescribed medicines</h5>
          <div className="table-responsive">
            <table className="table table-sm align-middle patient-history-med-table">
              <thead><tr><th>Medicine</th><th>Strength</th><th>Dose</th><th>Frequency / route</th><th>Duration</th><th>Quantity</th></tr></thead>
              <tbody>
                {medicines.map((medicine, index) => (
                  <tr key={`${medicine.id || medicine.medicineName || "med"}-${index}`}>
                    <td><strong>{historyValue(medicine.medicineName) || "—"}</strong>
                      {medicine.instructions && <small className="d-block text-secondary patient-history-prescription-instructions">{medicine.instructions}</small>}
                    </td>
                    <td>{historyValue(medicine.strength) || "—"}</td>
                    <td>{historyValue(medicine.dosage) || "—"}</td>
                    <td>{[historyValue(medicine.frequency), medicine.route && formatEnum(medicine.route)].filter(Boolean).join(" / ") || "—"}</td>
                    <td>{historyValue(medicine.duration) || "—"}</td>
                    <td>{historyValue(medicine.quantity) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {(cbcRows.length > 0 || biochemRows.length > 0 || historyValue(cbc.interpretation)) && (
        <div className="patient-history-rx-subsection">
          <h5>Laboratory findings</h5>
          {cbcRows.length > 0 && (
            <div className="table-responsive">
              <div className="patient-history-rx-minor-title">Complete blood count</div>
              <table className="table table-sm patient-history-med-table">
                <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference range</th><th>Flag</th></tr></thead>
                <tbody>{cbcRows.map((row, index) => (
                  <tr key={`${row.key || row.test}-${index}`}><td>{row.test}</td><td><strong>{row.result ?? "—"}</strong></td>
                    <td>{row.unit || "—"}</td><td>{row.range || "—"}</td><td>{row.flag || "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {biochemRows.length > 0 && (
            <div className="table-responsive">
              <div className="patient-history-rx-minor-title">Biochemistry</div>
              <table className="table table-sm patient-history-med-table">
                <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference range</th><th>Flag</th></tr></thead>
                <tbody>{biochemRows.map((row, index) => (
                  <tr key={`${row.key || row.test}-${index}`}><td>{row.test}</td><td><strong>{row.result ?? "—"}</strong></td>
                    <td>{row.unit || "—"}</td><td>{row.range || "—"}</td><td>{row.flag || "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="patient-history-fields">
            <HistoryTextField label="Smear findings" value={cbc.smearFindings} wide />
            <HistoryTextField label="Interpretation" value={cbc.interpretation} wide />
            <HistoryTextField label="Lab remarks" value={cbc.remarks} wide />
          </div>
        </div>
      )}
      {labs.length > 0 && (
        <div className="patient-history-rx-subsection">
          <h5>Laboratory requests</h5>
          {labs.map((lab, index) => (
            <div className="patient-history-rx-simple-row" key={lab.id || index}>
              <strong>{lab.testName || "Laboratory test"}</strong>
              <div>{[lab.specimen, lab.priority && formatEnum(lab.priority), lab.instructions].filter(Boolean).join(" · ")}</div>
            </div>
          ))}
        </div>
      )}
      {imaging.length > 0 && (
        <div className="patient-history-rx-subsection">
          <h5>Imaging / diagnostic reports</h5>
          {imaging.map((item, index) => (
            <div className="patient-history-rx-simple-row" key={item.id || index}>
              <strong>{[item.type && formatEnum(item.type), item.bodyPart].filter(Boolean).join(" · ") || "Imaging"}</strong>
              <div>{item.clinicalHistory || ""}</div>
              <div>{item.result?.findings ? `Findings: ${item.result.findings}` : ""}</div>
              <div>{item.result?.impression ? `Impression: ${item.result.impression}` : ""}</div>
              <div>{item.result?.recommendations ? `Recommendations: ${item.result.recommendations}` : ""}</div>
            </div>
          ))}
        </div>
      )}
      {vaccines.length > 0 && (
        <div className="patient-history-rx-subsection">
          <h5>Vaccinations documented in prescription</h5>
          {vaccines.map((vaccine, index) => (
            <div className="patient-history-rx-simple-row" key={vaccine.id || index}>
              <strong>{vaccine.vaccineName || "Vaccine"}</strong>
              <div>{[vaccine.dose, vaccine.route && formatEnum(vaccine.route),
                vaccine.batchNo && `Batch ${vaccine.batchNo}`,
                vaccine.administeredDate && `Given ${formatDateOnly(vaccine.administeredDate)}`,
                vaccine.nextDueDate && `Next due ${formatDateOnly(vaccine.nextDueDate)}`].filter(Boolean).join(" · ")}</div>
            </div>
          ))}
        </div>
      )}
      {(rx.instructions || rx.advice || rx.followUpDate || rx.followUpNotes || rx.otherReports) && (
        <div className="patient-history-rx-subsection">
          <h5>Advice and follow-up</h5>
          <div className="patient-history-fields">
            <HistoryTextField label="Medication instructions" value={rx.instructions} wide />
            <HistoryTextField label="Home care advice" value={rx.advice} wide />
            <HistoryTextField label="Follow-up date" value={rx.followUpDate && formatDateOnly(rx.followUpDate)} />
            <HistoryTextField label="Follow-up notes" value={rx.followUpNotes} wide />
            <HistoryTextField label="Additional reports" value={rx.otherReports} wide />
          </div>
        </div>
      )}
      {!hasClinical && !hasVitals && !treatmentPlans.length && !medicines.length &&
        !cbcRows.length && !biochemRows.length && !labs.length && !imaging.length &&
        !vaccines.length && !rx.instructions && !rx.advice && (
        <p className="patient-history-muted mb-0 mt-2">The prescription is saved, but no clinical details were included in this response.</p>
      )}
    </div>
  );
}

function PatientHistoryVisit({ visit, showMedicalOnly, expanded, onToggle, prescriptionLookup, onRetryPrescription }) {
  const record = visit.medicalRecord;
  const prescriptions = historyPrescriptionList(visit, prescriptionLookup);
  const serviceNames = getServiceNames(visit);
  const withClinical = Boolean(record || prescriptions.length);
  const showDetails = showMedicalOnly || expanded;
  const hasExtras = Boolean(visit.vaccination || visit.invoice || prescriptions.length);
  const clinicalDiagnosis = historyValue(record?.diagnosis) ||
    prescriptions.map((item) => historyValue(item.diagnosis)).find(Boolean) || "";
  const date = visit.scheduledAt || visit.createdAt;

  return (
    <article className={`patient-history-visit ${withClinical ? "has-record" : ""}`}>
      <div className="patient-history-rail" aria-hidden="true"><span /></div>
      <div className="patient-history-visit-card">
        <div className="patient-history-visit-top">
          <div className="d-flex gap-3 align-items-start flex-grow-1" style={{ minWidth: 0 }}>
            <div className="patient-history-date-icon"><CalendarDays size={20} /></div>
            <div style={{ minWidth: 0 }}>
              <div className="d-flex gap-2 flex-wrap align-items-center">
                <h3 className="patient-history-visit-title">{formatEnum(visit.type)}</h3>
                <StatusBadge status={visit.status} />
                {record && <span className="patient-history-record-chip"><Stethoscope size={12} /> Medical record</span>}
                {prescriptions.length > 0 && <span className="patient-history-record-chip"><Pill size={12} /> {prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""}</span>}
              </div>
              <p className="patient-history-muted mb-1">
                {formatDateOnly(date)} {visit.appointmentNo ? ` · ${visit.appointmentNo}` : ""}
              </p>
              <div className="patient-history-meta">
                {visit.veterinarian && <span><UserRound size={13} /> {getUserName(visit.veterinarian)}</span>}
                {visit.branch?.name && <span><Building2 size={13} /> {visit.branch.name}</span>}
                {visit.mode && <span><ClipboardList size={13} /> {formatEnum(visit.mode)}</span>}
              </div>
            </div>
          </div>
          {!showMedicalOnly && (
            <button
              type="button"
              className="btn btn-sm btn-light border patient-history-expand"
              aria-expanded={expanded}
              onClick={onToggle}
            >
              {expanded ? "Hide details" : "View details"}
              <ChevronDown size={15} className={expanded ? "patient-history-rotate" : ""} />
            </button>
          )}
        </div>

        {clinicalDiagnosis && (
          <div className="patient-history-diagnosis">
            <strong>Diagnosis</strong>
            <span>{clinicalDiagnosis}</span>
          </div>
        )}
        {!showDetails && !clinicalDiagnosis && visit.reason && (
          <p className="patient-history-preview"><strong>Reason:</strong> {visit.reason}</p>
        )}
        {!showDetails && serviceNames && <div className="patient-history-services"><strong>Services:</strong> {serviceNames}</div>}

        {showDetails && (
          <div className="patient-history-expanded">
            {!showMedicalOnly && (
              <HistorySection title="Appointment information" icon={CalendarDays}>
                <div className="patient-history-fields">
                  <HistoryTextField label="Reason for visit" value={visit.reason} wide />
                  <HistoryTextField label="Symptoms" value={visit.symptoms} wide />
                  <HistoryTextField label="Services" value={serviceNames} wide />
                  <HistoryTextField label="Appointment notes" value={visit.notes} wide />
                  <HistoryTextField label="Checked in" value={visit.checkedInAt && formatDateOnly(visit.checkedInAt)} />
                  <HistoryTextField label="Completed" value={visit.completedAt && formatDateOnly(visit.completedAt)} />
                </div>
              </HistorySection>
            )}

            {withClinical ? (
              <HistorySection title="Medical / clinical record" icon={Stethoscope}>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {record.status && <span className="patient-history-small-chip">Record: {formatEnum(record.status)}</span>}
                  {record.finalizedAt && <span className="patient-history-small-chip">Finalized: {formatDateOnly(record.finalizedAt)}</span>}
                </div>
                <div className="patient-history-fields">
                  <HistoryTextField label="Chief complaint" value={record.chiefComplaint} wide />
                  <HistoryTextField label="Medical history" value={record.history} wide />
                  <HistoryTextField label="Examination" value={record.examination} wide />
                  <HistoryTextField label="Diagnosis" value={record.diagnosis} wide />
                  <HistoryTextField label="Differential diagnosis" value={record.differentialDiagnosis} wide />
                  <HistoryTextField label="Treatment plan" value={record.treatmentPlan} wide />
                  <HistoryTextField label="Follow-up date" value={record.followUpDate && formatDateOnly(record.followUpDate)} />
                  <HistoryTextField label="Clinical notes" value={record.notes} wide />
                </div>
                {!record.chiefComplaint && !record.history && !record.examination &&
                  !record.diagnosis && !record.treatmentPlan && !record.notes && (
                    <p className="patient-history-muted mb-0">A medical record is linked, but no clinical narrative was supplied.</p>
                  )}
              </HistorySection>
            ) : !showMedicalOnly && !prescriptions.length && (
              <div className="patient-history-no-clinical"><Stethoscope size={16} /> No medical record is linked to this appointment.</div>
            )}

            {prescriptions.length > 0 && (
              <HistorySection title="Saved prescriptions and treatment details" icon={Pill}>
                {prescriptions.map((rx, index) => (
                  <HistoryPrescriptionDetails
                    key={rx.id || `${visit.id}-prescription-${index}`}
                    prescription={rx}
                    number={index + 1}
                  />
                ))}
              </HistorySection>
            )}
            {prescriptionLookup?.state === "loading" && (
              <div className="patient-history-prescription-status" role="status">
                <LoaderCircle size={15} className="spin-icon" /> Checking the saved prescription for this visit…
              </div>
            )}
            {prescriptionLookup?.state === "error" && (
              <div className="patient-history-prescription-status patient-history-prescription-warning" role="alert">
                <AlertCircle size={16} />
                <span>Prescription could not be loaded: {prescriptionLookup.error}</span>
                <button type="button" className="btn btn-sm btn-outline-secondary ms-auto"
                  onClick={() => onRetryPrescription(visit.id)}>Retry</button>
              </div>
            )}

            {visit.vaccination && (
              <HistorySection title="Vaccination record" icon={Syringe}>
                <div className="patient-history-fields">
                  <HistoryTextField label="Vaccine" value={visit.vaccination.vaccineName} />
                  <HistoryTextField label="Status" value={formatEnum(visit.vaccination.status)} />
                  <HistoryTextField label="Dose" value={visit.vaccination.dose} />
                  <HistoryTextField label="Batch number" value={visit.vaccination.batchNumber} />
                  <HistoryTextField label="Administered" value={visit.vaccination.administeredDate && formatDateOnly(visit.vaccination.administeredDate)} />
                  <HistoryTextField label="Next due" value={visit.vaccination.nextDueDate && formatDateOnly(visit.vaccination.nextDueDate)} />
                  <HistoryTextField label="Notes" value={visit.vaccination.notes} wide />
                </div>
              </HistorySection>
            )}

            {visit.invoice && !showMedicalOnly && (
              <HistorySection title="Invoice" icon={ReceiptText}>
                <div className="patient-history-fields">
                  <HistoryTextField label="Invoice number" value={visit.invoice.invoiceNumber} />
                  <HistoryTextField label="Status" value={formatEnum(visit.invoice.status)} />
                  <HistoryTextField label="Total (NPR)" value={historyMoney(visit.invoice.totalAmount)} />
                  <HistoryTextField label="Paid (NPR)" value={historyMoney(visit.invoice.paidAmount)} />
                  <HistoryTextField label="Balance (NPR)" value={historyMoney(visit.invoice.balanceAmount)} />
                </div>
              </HistorySection>
            )}
            {!withClinical && !hasExtras && !visit.reason && !visit.notes && !visit.symptoms && (
              <p className="patient-history-muted mb-0">No additional details were recorded for this visit.</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function historyMoney(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("en-NP", { maximumFractionDigits: 2 }) : String(value);
}

function PatientAppointmentHistoryModal({ subject, accessibleBranches, onClose }) {
  const [branchId, setBranchId] = useState("all");
  const [tab, setTab] = useState("appointments");
  const [patient, setPatient] = useState(subject.fallbackPatient || null);
  const [visits, setVisits] = useState([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [expandedIds, setExpandedIds] = useState([]);
  // Cache saved prescriptions by appointment ID. Unlike many clinical fields,
  // prescriptions are often stored outside the MedicalRecord relation.
  const [prescriptionLookup, setPrescriptionLookup] = useState({});
  const prescriptionRequests = useRef(new Set());
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [onClose]);

  const loadHistory = useCallback(async (page = 1) => {
    const currentRequest = ++requestId.current;
    const isFirstPage = page === 1;
    if (isFirstPage) {
      setLoading(true);
      setVisits([]);
      setPagination({ page: 1, totalPages: 0, total: 0 });
    } else {
      setLoadingMore(true);
    }
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PATIENT_HISTORY_PAGE_SIZE),
        petId: subject.petId,
      });
      if (branchId !== "all") params.set("branchId", branchId);
      const response = await apiRequest(`${PATIENT_HISTORY_API_PATH(subject.petId)}?${params}`);
      if (requestId.current !== currentRequest) return;
      if (response?.success === false || response?.data?.success === false) {
        throw new Error(response?.message || response?.data?.message || "Could not retrieve patient history.");
      }
      // Match the user's provided backend response: response.data is the visits array.
      // Allow an extra axios/apiRequest wrapper without misreading its pagination.
      const payload = Array.isArray(response?.data) || response?.patient || response?.pagination
        ? response : (response?.data || response);
      const pageVisits = Array.isArray(payload?.data) ? payload.data :
        (Array.isArray(payload?.data?.appointments) ? payload.data.appointments :
          (Array.isArray(payload?.appointments) ? payload.appointments : []));
      if (payload?.patient) setPatient(payload.patient);
      setSummary({
        total: Number(payload?.summary?.total ?? payload?.pagination?.total ?? 0),
        completed: Number(payload?.summary?.completed ?? 0),
      });
      const paging = payload?.pagination || {};
      const totalPages = Number(paging.totalPages ?? 1);
      setPagination({
        page: Number(paging.page || page),
        totalPages: Number.isFinite(totalPages) ? totalPages : 1,
        total: Number(paging.total ?? payload?.summary?.total ?? pageVisits.length),
      });
      setVisits((previous) => {
        if (isFirstPage) return pageVisits;
        const seen = new Set(previous.map((v) => v.id).filter(Boolean));
        return [...previous, ...pageVisits.filter((v) => !v.id || !seen.has(v.id))];
      });
    } catch (requestError) {
      if (requestId.current !== currentRequest) return;
      setError(requestError?.message || "Could not retrieve patient history.");
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [subject.petId, branchId]);

  useEffect(() => {
    loadHistory(1);
    return () => { requestId.current += 1; };
  }, [loadHistory]);

  // Fetch saved prescriptions only when the Medical Records tab is opened or
  // one appointment is expanded. This avoids 20 extra requests during normal
  // history browsing. Limit concurrent requests to protect the backend.
  useEffect(() => {
    const toCheck = (tab === "medical"
      ? visits
      : visits.filter((visit) => expandedIds.includes(visit.id)))
      .filter((visit) => visit.id && !prescriptionRequests.current.has(visit.id));
    if (!toCheck.length) return;

    for (const visit of toCheck) prescriptionRequests.current.add(visit.id);
    setPrescriptionLookup((previous) => {
      const next = { ...previous };
      for (const visit of toCheck) next[visit.id] = { state: "loading" };
      return next;
    });

    const readOne = async (visit) => {
      try {
        const response = await prescriptionService.getByAppointment(visit.id);
        if (response?.success === false || response?.data?.success === false) {
          throw new Error(response?.message || response?.data?.message || "Unable to retrieve the saved prescription.");
        }
        const prescription = historySavedPrescriptionFromResponse(response, visit.id);
        if (isMounted.current) {
          setPrescriptionLookup((previous) => ({
            ...previous,
            [visit.id]: prescription ? { state: "found", prescription } : { state: "none" },
          }));
        }
      } catch (err) {
        const notFound = historyPrescriptionNotFound(err);
        if (isMounted.current) {
          setPrescriptionLookup((previous) => ({
            ...previous,
            [visit.id]: notFound
              ? { state: "none" }
              : { state: "error", error: err?.message || "Request failed" },
          }));
        }
      }
    };

    const fetchInBatches = async () => {
      for (let i = 0; i < toCheck.length; i += 4) {
        if (!isMounted.current) break;
        await Promise.all(toCheck.slice(i, i + 4).map(readOne));
      }
    };
    void fetchInBatches();
  }, [tab, visits, expandedIds, prescriptionLookup]);

  function retryPrescription(appointmentId) {
    prescriptionRequests.current.delete(appointmentId);
    setPrescriptionLookup((previous) => {
      const next = { ...previous };
      delete next[appointmentId];
      return next;
    });
  }

  const hasClinicalHistory = (visit) =>
    Boolean(visit.medicalRecord || historyPrescriptionList(visit, prescriptionLookup[visit.id]).length);
  const medicalCount = visits.filter(hasClinicalHistory).length;
  const prescriptionCount = visits.reduce((sum, visit) =>
    sum + historyPrescriptionList(visit, prescriptionLookup[visit.id]).length, 0);
  const prescriptionChecksPending = tab === "medical" && visits.some((visit) =>
    !prescriptionLookup[visit.id] || prescriptionLookup[visit.id]?.state === "loading");
  const shownVisits = tab === "medical"
    ? visits.filter((visit) => hasClinicalHistory(visit) ||
      !prescriptionLookup[visit.id] || prescriptionLookup[visit.id]?.state === "loading" ||
      prescriptionLookup[visit.id]?.state === "error")
    : visits;
  const hasMore = pagination.totalPages > pagination.page;
  const pet = patient || subject.fallbackPatient || {};
  const owner = pet.owner || subject.fallbackOwner || {};
  const petAge = pet.approximateAge != null && pet.approximateAge !== ""
    ? (typeof pet.approximateAge === "number"
      ? `${pet.approximateAge} years (approx.)`
      : String(pet.approximateAge))
    : (pet.dateOfBirth ? rxAge(pet.dateOfBirth) : "");
  const species = typeof pet.species === "string" ? pet.species : pet.species?.name;
  const breed = typeof pet.breed === "string" ? pet.breed : pet.breed?.name;

  function toggleExpanded(id) {
    setExpandedIds((previous) => previous.includes(id)
      ? previous.filter((current) => current !== id)
      : [...previous, id]);
  }

  return createPortal(
    <div className="patient-history-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="patient-history-modal" role="dialog" aria-modal="true" aria-labelledby="patient-history-title">
        <div className="patient-history-toolbar">
          <div className="d-flex align-items-center gap-3">
            <div className="patient-history-toolbar-icon"><History size={22} /></div>
            <div>
              <h2 id="patient-history-title">Patient History</h2>
              <p>Appointments, clinical examinations, treatments and follow-up care</p>
            </div>
          </div>
          <button type="button" className="btn btn-light border d-flex gap-2 align-items-center" onClick={onClose}>
            <X size={17} /> Close
          </button>
        </div>
        <div className="patient-history-scroll">
          <div className="patient-history-hero">
            <div className="patient-history-avatar">
              {pet.photoUrl ? <img src={pet.photoUrl} alt={`Patient ${pet.name || ""}`} /> : <PawPrint size={30} />}
            </div>
            <div className="patient-history-identity">
              <h3>{pet.name || "Patient"}</h3>
              <p>{[species, breed, petAge && `Age: ${petAge}`, pet.gender && formatEnum(pet.gender)].filter(Boolean).join(" · ") || "Patient profile"}</p>
              <div className="patient-history-identity-meta">
                {pet.petCode && <span>Patient ID: {pet.petCode}</span>}
                {getOwnerName(owner) && <span><UserRound size={14} /> {getOwnerName(owner)}</span>}
                {owner.phone && <span>Contact: {owner.phone}</span>}
              </div>
            </div>
          </div>

          <div className="patient-history-summary">
            <div className="patient-history-stat"><span><CalendarDays size={16} /> Total appointments</span><strong>{loading ? "—" : summary.total}</strong></div>
            <div className="patient-history-stat"><span><CheckCircle2 size={16} /> Completed visits</span><strong>{loading ? "—" : summary.completed}</strong></div>
            <div className="patient-history-stat"><span><Stethoscope size={16} /> Visits with clinical records</span><strong>{loading ? "—" : medicalCount}</strong></div>
            <div className="patient-history-stat"><span><Pill size={16} /> Prescriptions found</span><strong>{loading ? "—" : prescriptionCount}</strong></div>
          </div>

          <div className="patient-history-controls">
            <div className="patient-history-tabs" role="tablist" aria-label="Patient history view">
              <button type="button" role="tab" aria-selected={tab === "appointments"} className={tab === "appointments" ? "active" : ""} onClick={() => setTab("appointments")}>
                <CalendarDays size={16} /> Appointment history
              </button>
              <button type="button" role="tab" aria-selected={tab === "medical"} className={tab === "medical" ? "active" : ""} onClick={() => setTab("medical")}>
                <Stethoscope size={16} /> Medical records
              </button>
            </div>
            {accessibleBranches.length > 1 && (
              <label className="patient-history-branch">
                <Building2 size={15} />
                <select value={branchId} onChange={(event) => { setBranchId(event.target.value); setExpandedIds([]); }} aria-label="Filter patient history by branch">
                  <option value="all">All accessible branches</option>
                  {accessibleBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="patient-history-timeline-container">
            {!loading && prescriptionChecksPending && (
              <div className="patient-history-prescription-scan" role="status">
                <LoaderCircle size={15} className="spin-icon" /> Checking saved prescriptions for loaded visits…
              </div>
            )}
            {loading ? (
              <div className="patient-history-state"><LoaderCircle size={30} className="spin-icon text-primary" /><strong>Loading patient history</strong><span>Retrieving appointment and medical records…</span></div>
            ) : error && visits.length === 0 ? (
              <div className="patient-history-state patient-history-error" role="alert"><AlertCircle size={28} /><strong>Unable to load patient history</strong><span>{error}</span><button type="button" className="btn btn-outline-primary btn-sm" onClick={() => loadHistory(1)}><RefreshCw size={14} /> Retry</button></div>
            ) : (
              <>
                {error && <div className="alert alert-warning d-flex align-items-center gap-2"><AlertCircle size={17} /> {error} <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => loadHistory(pagination.page + 1)}>Retry</button></div>}
                {shownVisits.length > 0 ? (
                  <div className="patient-history-timeline">
                    {shownVisits.map((visit) => (
                      <PatientHistoryVisit
                        key={visit.id}
                        visit={visit}
                        showMedicalOnly={tab === "medical"}
                        expanded={expandedIds.includes(visit.id)}
                        onToggle={() => toggleExpanded(visit.id)}
                        prescriptionLookup={prescriptionLookup[visit.id]}
                        onRetryPrescription={retryPrescription}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="patient-history-state">
                    {tab === "medical" ? <Stethoscope size={32} /> : <CalendarDays size={32} />}
                    <strong>{tab === "medical" ? "No medical records or prescriptions in loaded visits" : "No appointments found"}</strong>
                    <span>{tab === "medical" && hasMore
                      ? "Older appointments may contain medical records or prescriptions. Load older visits to continue reviewing."
                      : tab === "medical" ? "No medical records or saved prescriptions were found for these appointments." : "There are no appointment records for this patient in the selected branch."}</span>
                  </div>
                )}
                {hasMore && (
                  <div className="patient-history-load-more">
                    <button type="button" className="btn btn-outline-primary" disabled={loadingMore} onClick={() => loadHistory(pagination.page + 1)}>
                      {loadingMore ? <LoaderCircle size={16} className="spin-icon" /> : <ChevronDown size={16} />}
                      {loadingMore ? "Loading older visits…" : "Load older visits"}
                    </button>
                    <small>{visits.length} of {pagination.total} appointments loaded</small>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="patient-history-footer">
          <span><AlertCircle size={14} /> Read-only clinical history · Access is restricted by your clinic permissions</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
        </div>
      </div>
      <style>{PATIENT_HISTORY_STYLES}</style>
    </div>,
    document.body,
  );
}

const PATIENT_HISTORY_STYLES = `
  .patient-history-overlay { position:fixed; inset:0; z-index:1500; padding:22px; display:flex; align-items:center; justify-content:center; background:rgba(15,23,42,.67); }
  .patient-history-modal { width:min(1120px,100%); max-height:calc(100vh - 44px); display:flex; flex-direction:column; background:#f8fafc; border-radius:18px; overflow:hidden; box-shadow:0 25px 85px rgba(0,0,0,.25); color:#1e293b; }
  .patient-history-toolbar { background:white; padding:17px 24px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; gap:14px; flex-shrink:0; }
  .patient-history-toolbar h2 { margin:0 0 3px; font-size:19px; font-weight:750; }
  .patient-history-toolbar p { margin:0; font-size:12px; color:#64748b; }
  .patient-history-toolbar-icon { height:43px; width:43px; border-radius:12px; background:#eff6ff; color:#2563eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .patient-history-scroll { min-height:0; overflow:auto; padding:23px; }
  .patient-history-hero { background:white; border:1px solid #e2e8f0; border-radius:16px; padding:20px; display:flex; align-items:center; gap:17px; margin-bottom:16px; }
  .patient-history-avatar { width:70px; height:70px; background:#eff6ff; border:1px solid #dbeafe; color:#2563eb; border-radius:16px; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; }
  .patient-history-avatar img { width:100%; height:100%; object-fit:cover; }
  .patient-history-identity { min-width:0; }
  .patient-history-identity h3 { font-size:21px; line-height:1.3; margin:0 0 5px; font-weight:750; }
  .patient-history-identity p { font-size:13px; color:#475569; margin:0 0 8px; }
  .patient-history-identity-meta { display:flex; flex-wrap:wrap; gap:7px 15px; color:#64748b; font-size:12px; }
  .patient-history-identity-meta span, .patient-history-meta span { display:inline-flex; align-items:center; gap:5px; }
  .patient-history-summary { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:13px; margin-bottom:18px; }
  .patient-history-stat { background:white; border:1px solid #e2e8f0; border-radius:14px; padding:17px 18px; display:flex; flex-direction:column; gap:8px; }
  .patient-history-stat span { display:flex; gap:8px; align-items:center; font-size:12px; color:#64748b; }
  .patient-history-stat strong { font-size:27px; line-height:1; color:#0f172a; }
  .patient-history-controls { display:flex; justify-content:space-between; align-items:center; gap:12px; margin:0 0 20px; flex-wrap:wrap; }
  .patient-history-tabs { display:inline-flex; align-items:center; gap:4px; padding:4px; border:1px solid #e2e8f0; border-radius:11px; background:#eaf0f7; }
  .patient-history-tabs button { border:0; background:none; display:inline-flex; align-items:center; gap:8px; border-radius:8px; padding:9px 14px; font-size:12px; font-weight:650; color:#64748b; }
  .patient-history-tabs button.active { background:white; color:#2563eb; box-shadow:0 1px 6px rgba(15,23,42,.12); }
  .patient-history-branch { display:flex; align-items:center; gap:8px; background:white; border:1px solid #e2e8f0; border-radius:9px; padding:7px 10px; color:#64748b; }
  .patient-history-branch select { border:0; color:#334155; background:transparent; outline:none; font-size:12px; max-width:230px; }
  .patient-history-timeline-container { background:white; border:1px solid #e2e8f0; padding:24px 22px; border-radius:16px; min-height:220px; }
  .patient-history-timeline { display:flex; flex-direction:column; }
  .patient-history-visit { position:relative; display:grid; grid-template-columns:24px minmax(0,1fr); gap:14px; }
  .patient-history-rail { display:flex; flex-direction:column; align-items:center; position:relative; }
  .patient-history-rail:after { content:""; position:absolute; top:20px; bottom:0; width:2px; background:#e2e8f0; }
  .patient-history-visit:last-child .patient-history-rail:after { display:none; }
  .patient-history-rail span { width:13px; height:13px; border-radius:50%; border:3px solid #fff; background:#94a3b8; box-shadow:0 0 0 2px #cbd5e1; margin-top:21px; position:relative; z-index:1; }
  .patient-history-visit.has-record .patient-history-rail span { background:#2563eb; box-shadow:0 0 0 2px #bfdbfe; }
  .patient-history-visit-card { border:1px solid #e2e8f0; border-radius:14px; padding:17px 18px; margin-bottom:17px; min-width:0; }
  .patient-history-visit.has-record .patient-history-visit-card { border-color:#cbdffb; }
  .patient-history-visit-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
  .patient-history-date-icon { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#64748b; flex-shrink:0; }
  .patient-history-visit-title { margin:0; font-weight:750; font-size:14px; }
  .patient-history-muted { font-size:11px; color:#64748b; }
  .patient-history-meta { display:flex; flex-wrap:wrap; gap:7px 15px; font-size:11px; color:#64748b; }
  .patient-history-record-chip, .patient-history-small-chip { border-radius:100px; padding:4px 9px; background:#eff6ff; font-size:10px; font-weight:650; color:#1d4ed8; display:inline-flex; gap:4px; align-items:center; white-space:nowrap; }
  .patient-history-small-chip { background:#f1f5f9; color:#475569; }
  .patient-history-expand { display:flex; gap:6px; align-items:center; white-space:nowrap; }
  .patient-history-rotate { transform:rotate(180deg); }
  .patient-history-diagnosis { padding:10px 13px; background:#f1f7ff; border:1px solid #dbeafe; border-radius:9px; font-size:12px; margin-top:14px; display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap; }
  .patient-history-diagnosis strong { color:#1d4ed8; white-space:nowrap; }
  .patient-history-diagnosis span { overflow-wrap:anywhere; }
  .patient-history-preview, .patient-history-services { margin:11px 0 0; font-size:12px; color:#475569; overflow-wrap:anywhere; }
  .patient-history-expanded { border-top:1px solid #e2e8f0; margin-top:16px; padding-top:2px; }
  .patient-history-section { padding-top:17px; }
  .patient-history-section h4 { display:flex; gap:8px; align-items:center; margin:0 0 12px; color:#334155; font-size:12px; font-weight:750; text-transform:uppercase; letter-spacing:.5px; }
  .patient-history-section-body { border:1px solid #e2e8f0; background:#fcfdff; border-radius:10px; padding:13px; }
  .patient-history-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
  .patient-history-field { min-width:0; }
  .patient-history-field-wide { grid-column:1/-1; }
  .patient-history-field > span { display:block; color:#64748b; font-size:10px; font-weight:600; margin-bottom:3px; }
  .patient-history-field > div { font-size:12px; line-height:1.65; color:#1e293b; white-space:pre-wrap; overflow-wrap:anywhere; }
  .patient-history-no-clinical { margin-top:16px; padding:12px; background:#f8fafc; border-radius:9px; font-size:12px; color:#64748b; display:flex; align-items:center; gap:8px; }
  .patient-history-rx { padding:10px 0; border-bottom:1px solid #e2e8f0; }
  .patient-history-rx:last-child { border-bottom:0; }
  .patient-history-rx-detailed { padding:14px; border:1px solid #dbeafe; border-radius:12px; background:#fff; margin-bottom:13px; }
  .patient-history-rx-detailed:last-child { margin-bottom:0; }
  .patient-history-rx-heading { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; padding-bottom:12px; }
  .patient-history-rx-heading strong { font-size:13px; }
  .patient-history-rx-icon { width:34px; height:34px; background:#eff6ff; color:#2563eb; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; }
  .patient-history-rx-subsection { border-top:1px solid #e2e8f0; padding-top:12px; margin-top:12px; }
  .patient-history-rx-subsection h5 { color:#1e40af; font-size:11px; font-weight:750; text-transform:uppercase; letter-spacing:.5px; margin-bottom:12px; }
  .patient-history-rx-minor-title { font-size:12px; font-weight:700; color:#475569; margin-bottom:6px; }
  .patient-history-rx-simple-row { padding:9px 0; border-bottom:1px solid #f1f5f9; font-size:12px; white-space:pre-wrap; overflow-wrap:anywhere; }
  .patient-history-rx-simple-row:last-child { border:0; }
  .patient-history-rx-simple-row div { color:#475569; margin-top:4px; }
  .patient-history-prescription-instructions { white-space:pre-wrap; }
  .patient-history-prescription-scan, .patient-history-prescription-status { display:flex; align-items:center; gap:8px; color:#475569; font-size:12px; padding:11px 13px; background:#eff6ff; border:1px solid #dbeafe; border-radius:10px; margin-bottom:14px; }
  .patient-history-prescription-status { margin-top:14px; margin-bottom:0; }
  .patient-history-prescription-warning { background:#fffbeb; border-color:#fde68a; color:#92400e; }
  .patient-history-med-table { font-size:11px; margin-bottom:5px; }
  .patient-history-med-table thead th { color:#64748b; background:#f1f5f9; white-space:nowrap; }
  .patient-history-rx-note { font-size:12px; margin-top:8px; }
  .patient-history-state { min-height:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center; color:#94a3b8; padding:18px; }
  .patient-history-state strong { color:#475569; font-size:14px; }
  .patient-history-state span { font-size:12px; color:#64748b; max-width:530px; }
  .patient-history-error { color:#dc2626; }
  .patient-history-load-more { display:flex; flex-direction:column; align-items:center; gap:8px; padding:15px; }
  .patient-history-load-more button { display:inline-flex; align-items:center; gap:8px; }
  .patient-history-load-more small { color:#94a3b8; }
  .patient-history-footer { padding:12px 22px; background:#fff; border-top:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0; }
  .patient-history-footer span { display:flex; align-items:center; gap:8px; color:#64748b; font-size:11px; }
  @media(max-width:700px) {
    .patient-history-overlay { padding:5px; }
    .patient-history-modal { max-height:calc(100vh - 10px); border-radius:12px; }
    .patient-history-toolbar { padding:12px; }
    .patient-history-toolbar h2 { font-size:16px; }
    .patient-history-toolbar p { font-size:10px; }
    .patient-history-scroll { padding:12px; }
    .patient-history-hero { padding:13px; gap:12px; }
    .patient-history-avatar { height:54px; width:54px; }
    .patient-history-identity h3 { font-size:17px; }
    .patient-history-summary { gap:7px; grid-template-columns:repeat(2,minmax(0,1fr)); }
    .patient-history-stat { padding:11px 9px; }
    .patient-history-stat span { font-size:10px; }
    .patient-history-stat strong { font-size:21px; }
    .patient-history-controls { align-items:stretch; }
    .patient-history-tabs { width:100%; }
    .patient-history-tabs button { flex:1; justify-content:center; padding:9px 6px; font-size:11px; }
    .patient-history-timeline-container { padding:14px 8px; }
    .patient-history-visit { grid-template-columns:12px minmax(0,1fr); gap:9px; }
    .patient-history-visit-card { padding:11px 10px; }
    .patient-history-visit-top { flex-wrap:wrap; }
    .patient-history-expand { margin-left:auto; }
    .patient-history-fields { grid-template-columns:1fr; }
    .patient-history-field-wide { grid-column:auto; }
    .patient-history-footer { padding:10px; }
  }
`;

// The print menu is rendered above overflowed tables and modal footers.
// The same menu opens the saved prescription or an appointment-prefilled
// consent form. Prescription printing requires a completed appointment.
function AppointmentPrintMenu({ appointment, onSelect, compact = false, printing = false }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const box = buttonRef.current?.getBoundingClientRect();
    if (!box) return;
    const width = 276;
    const estimatedHeight = 255;
    const margin = 8;
    const left = Math.max(margin, Math.min(box.right - width, window.innerWidth - width - margin));
    const below = window.innerHeight - box.bottom;
    const top = below >= estimatedHeight + margin
      ? box.bottom + 6
      : Math.max(margin, box.top - estimatedHeight - 6);
    setPosition({ top, left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function closeOnScroll(event) {
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", closeOnScroll);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", closeOnScroll);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [open]);

  function choose(type) {
    if (printing || (type === "prescription" && appointment?.status !== "COMPLETED")) return;
    setOpen(false);
    onSelect(type);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={compact
          ? "btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 text-nowrap"
          : "btn btn-outline-secondary d-inline-flex align-items-center gap-2 text-nowrap"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Print options for ${appointment?.appointmentNo || appointment?.id || "appointment"}`}
        title="Choose what to print"
        disabled={printing}
        onClick={toggle}
      >
        {printing ? <LoaderCircle size={compact ? 15 : 16} className="spin-icon" /> : <Printer size={compact ? 15 : 16} />}
        Print
        <ChevronDown size={compact ? 13 : 15} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Choose what to print"
          className="bg-white border rounded-3 shadow-lg p-1"
          style={{ position: "fixed", top: position.top, left: position.left, width: 276, maxWidth: "calc(100vw - 16px)", zIndex: 2500 }}
        >
          {[
            { value: "prescription", title: "Print Prescription", icon: FileText },
            { value: "surgery", title: "Surgery & Anaesthetic Consent", icon: FileText },
            { value: "boarding", title: "Boarding Consent Form", icon: ClipboardList },
            { value: "both", title: "Print Both Forms", icon: Printer },
          ].map(({ value, title, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className="btn btn-light border-0 w-100 d-flex align-items-center gap-2 text-start py-2 px-3"
              style={{ minHeight: 45, fontSize: 13 }}
              disabled={printing || (value === "prescription" && appointment?.status !== "COMPLETED")}
              title={value === "prescription" && appointment?.status !== "COMPLETED"
                ? "Prescription printing is available after completion" : title}
              onClick={() => choose(value)}
            >
              <Icon size={17} className="text-primary flex-shrink-0" />
              <span>
                {title}
                {value === "prescription" && appointment?.status !== "COMPLETED" && (
                  <small className="d-block text-secondary" style={{ fontSize: 11 }}>
                    Available after appointment completion
                  </small>
                )}
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function AppointmentDetailsModal({
  appointment,
  loading,
  actionLoading,
  onClose,
  onEdit,
  onStatusChange,
  onCancel,
  canPrescribe,
  onPrescription,
  onPatientHistory,
  onPrint,
}) {
  const actions = getAvailableActions(appointment?.status);

  return (
    <ModalShell
      title="Appointment Details"
      subtitle={appointment?.appointmentNo || "Appointment information"}
      onClose={onClose}
      size="modal-lg"
    >
      <div className="modal-body overflow-auto">
        {loading || !appointment ? (
          <div className="text-center py-5">
            <LoaderCircle size={34} className="spin-icon text-primary mb-3" />
            <div className="text-secondary">Loading appointment...</div>
          </div>
        ) : (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
              <StatusBadge status={appointment.status} />

              <span className="badge rounded-pill bg-light text-dark">
                {formatEnum(appointment.type)}
              </span>
            </div>

            <div className="row g-4">
              <div className="col-md-6">
                <DetailSection title="Schedule">
                  <DetailRow
                    label="Branch"
                    value={
                      appointment.branch?.name ||
                      appointment.branchId ||
                      "Unassigned"
                    }
                  />
                  <DetailRow
                    label="Date"
                    value={formatDateOnly(appointment.scheduledAt)}
                  />

                  <DetailRow
                    label="Veterinarian"
                    value={
                      getUserName(appointment.veterinarian) || "Unassigned"
                    }
                  />

                  <DetailRow
                    label="Services"
                    value={getServiceNames(appointment) || "No service"}
                  />
                </DetailSection>
              </div>

              <div className="col-md-6">
                <DetailSection title="Patient and owner">
                  <DetailRow
                    label="Patient"
                    value={
                      appointment.pet?.name || appointment.walkInPetName || "—"
                    }
                  />

                  <DetailRow
                    label="Species"
                    value={
                      appointment.pet?.species?.name ||
                      appointment.walkInPetSpecies ||
                      "—"
                    }
                  />

                  <DetailRow
                    label="Owner"
                    value={
                      getOwnerName(appointment.owner) ||
                      appointment.walkInOwnerName ||
                      "—"
                    }
                  />

                  <DetailRow
                    label="Phone"
                    value={
                      appointment.owner?.phone ||
                      appointment.walkInOwnerPhone ||
                      "—"
                    }
                  />
                </DetailSection>
              </div>
            </div>

            <DetailSection title="Clinical details">
              <DetailRow label="Reason" value={appointment.reason || "—"} />

              <DetailRow label="Symptoms" value={appointment.symptoms || "—"} />

              <DetailRow label="Notes" value={appointment.notes || "—"} />

              {appointment.cancellationReason && (
                <DetailRow
                  label="Cancellation reason"
                  value={appointment.cancellationReason}
                />
              )}
            </DetailSection>

            {actions.length > 0 && (
              <DetailSection title="Actions">
                <div className="d-flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      className={action.className}
                      disabled={
                        actionLoading === `${appointment.id}:${action.status}`
                      }
                      onClick={() =>
                        action.status === "CANCELLED"
                          ? onCancel()
                          : onStatusChange(action.status)
                      }
                    >
                      {actionLoading ===
                      `${appointment.id}:${action.status}` ? (
                        <LoaderCircle size={15} className="spin-icon" />
                      ) : (
                        action.label
                      )}
                    </button>
                  ))}
                </div>
              </DetailSection>
            )}
          </>
        )}
      </div>

      <div className="modal-footer bg-white flex-shrink-0">
        <button
          type="button"
          className="btn btn-light border"
          onClick={onClose}
        >
          Close
        </button>

        {appointment && (appointment.petId || appointment.pet?.id) && (
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={onPatientHistory}
          >
            <History size={16} />
            Patient History
          </button>
        )}

        {appointment && canPrescribe && (
          <button
            type="button"
            className="btn btn-success d-flex align-items-center gap-2"
            onClick={onPrescription}
          >
            <FileText size={16} />
            Prescription
          </button>
        )}

        {appointment && (
          <AppointmentPrintMenu
            appointment={appointment}
            printing={actionLoading === `${appointment.id}:PRINT`}
            onSelect={onPrint}
          />
        )}

        {appointment &&
          !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(
            appointment.status,
          ) && (
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={onEdit}
            >
              <Edit3 size={16} />
              Edit Appointment
            </button>
          )}
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, subtitle, size = "modal-lg", onClose, children }) {
  return (
    <>
      <div
        className="modal show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{
          zIndex: 1060,
          overflowY: "hidden",
        }}
      >
        <div
          className={`modal-dialog modal-dialog-centered ${size}`}
          style={{
            height: "calc(100vh - 32px)",
            marginTop: 16,
            marginBottom: 16,
          }}
        >
          <div
            className="modal-content border-0 shadow-lg rounded-4 overflow-hidden"
            style={{
              maxHeight: "100%",
            }}
          >
            <div className="modal-header bg-white flex-shrink-0">
              <div>
                <h5 className="modal-title fw-bold mb-1">{title}</h5>

                {subtitle && (
                  <p className="text-secondary small mb-0">{subtitle}</p>
                )}
              </div>

              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            {children}
          </div>
        </div>
      </div>

      <div className="modal-backdrop show" style={{ zIndex: 1055 }} />
    </>
  );
}

function SummaryCard({ title, value, icon: Icon, iconClass }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <small className="text-secondary">{title}</small>

            <h3 className="fw-bold mt-2 mb-0">{value}</h3>
          </div>

          <div
            className={`rounded-3 d-flex align-items-center justify-content-center ${iconClass}`}
            style={{
              width: 48,
              height: 48,
            }}
          >
            <Icon size={22} />
          </div>
        </div>
      </div>
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

// Searchable species combobox for walk-in appointments. Creation is persisted
// immediately via POST /pets/species, then automatically selected in the form.
function SpeciesSearchSelect({
  value,
  onChange,
  options = [],
  loading,
  loadError,
  createError,
  creating,
  onRetry,
  onCreate,
  error,
  required,
  col = "col-12",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const term = String(value || "").trim();
  const matches = (showAll || !term
    ? options
    : options.filter((species) =>
        species.name.toLocaleLowerCase().includes(term.toLocaleLowerCase()),
      )
  ).slice(0, 50);
  const exactMatch = matchingSpeciesName(options, term);
  const canAdd = Boolean(term && !exactMatch && !loading && !creating);

  function choose(name) {
    onChange(name);
    setIsOpen(false);
    setShowAll(false);
  }

  async function create() {
    if (!canAdd) return;
    const successful = await onCreate(term);
    if (successful) {
      setIsOpen(false);
      setShowAll(false);
    }
  }

  return (
    <div
      className={`${col} position-relative`}
      onBlur={(event) => {
        // Moving focus to a dropdown button does not close the popup.
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setShowAll(false);
        }
      }}
    >
      <label htmlFor="walk-in-species-input" className="form-label">
        Species {required && <span className="text-danger">*</span>}
      </label>
      <div className="input-group">
        <input
          id="walk-in-species-input"
          type="text"
          className={`form-control ${error ? "is-invalid" : ""}`}
          value={value || ""}
          autoComplete="off"
          placeholder="Type or search species"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="walk-in-species-listbox"
          aria-invalid={Boolean(error)}
          disabled={creating}
          onFocus={() => {
            setIsOpen(true);
            setShowAll(false);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setShowAll(false);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setIsOpen(false);
            }
            if (event.key === "ArrowDown") {
              setIsOpen(true);
            }
            if (event.key === "Enter" && isOpen) {
              event.preventDefault(); // Do not accidentally submit the whole appointment.
              if (exactMatch) choose(exactMatch);
              else if (matches.length === 1) choose(matches[0].name);
              else if (matches.length === 0 && canAdd) void create();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          title="Show all species"
          aria-label="Show all species"
          disabled={creating}
          onClick={() => {
            setShowAll(true);
            setIsOpen((open) => !open);
          }}
        >
          {loading ? <LoaderCircle size={16} className="spin-icon" /> : "▾"}
        </button>
      </div>

      {error && (
        <div className="text-danger small mt-1">
          {Array.isArray(error) ? error[0] : error}
        </div>
      )}
      {createError && (
        <div className="text-danger small mt-1" role="alert">
          {createError}
        </div>
      )}

      {isOpen && (
        <div
          id="walk-in-species-listbox"
          role="listbox"
          aria-label="Species options"
          className="position-absolute bg-white border rounded-3 shadow-sm w-100 mt-1"
          style={{ zIndex: 1100, maxHeight: 240, overflowY: "auto", left: 0 }}
        >
          {loading ? (
            <div className="text-secondary small p-3">Loading species…</div>
          ) : (
            <>
              {loadError && (
                <div className="px-3 py-2 text-danger small">
                  {loadError}{" "}
                  <button type="button" className="btn btn-link btn-sm p-0" onClick={onRetry}>
                    Retry
                  </button>
                </div>
              )}
              {matches.map((species) => (
                <button
                  key={species.id || species.name}
                  type="button"
                  role="option"
                  aria-selected={species.name === value}
                  className="btn btn-light rounded-0 w-100 text-start px-3 py-2 border-0"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(species.name)}
                >
                  {species.name}
                </button>
              ))}
              {matches.length === 0 && !loadError && (
                <div className="text-secondary small px-3 py-2">
                  {term ? `No species found for “${term}”.` : "No species found."}
                </div>
              )}
              {canAdd && (
                <button
                  type="button"
                  className="btn btn-light text-primary fw-semibold rounded-0 w-100 text-start px-3 py-2 border-top d-flex align-items-center gap-2"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void create()}
                >
                  <Plus size={16} /> Add species “{term}”
                </button>
              )}
              {creating && (
                <div className="text-secondary small px-3 py-2">
                  <LoaderCircle size={14} className="spin-icon me-2" /> Saving species…
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SearchableRegisteredField({
  label,
  value,
  placeholder,
  error,
  required,
  col = "col-12",
  active,
  results = [],
  onFocus,
  onChange,
  onSelect,
}) {
  return (
    <div className={`${col} position-relative`}>
      <label className="form-label">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </label>

      <input
        type={label === "Phone" ? "tel" : "text"}
        className={`form-control ${error ? "is-invalid" : ""}`}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
      />

      {active && results.length > 0 && (
        <div
          className="position-absolute w-100 bg-white border rounded-3 shadow-sm mt-1"
          style={{ zIndex: 1080, maxHeight: 240, overflowY: "auto" }}
        >
          {results.map((patient) => (
            <button
              key={patient.id}
              type="button"
              className="w-100 text-start border-0 bg-white px-3 py-2"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(patient)}
            >
              <div className="fw-semibold">
                {patient.name || "Unnamed patient"}
              </div>
              <small className="text-secondary">
                {patient.species?.name || "Unknown species"}
                {" • "}
                {getOwnerName(patient.owner) || "No owner"}
                {" • "}
                {patient.owner?.phone || "No phone"}
              </small>
            </button>
          ))}
        </div>
      )}

      {active && value.trim() && results.length === 0 && !error && (
        <div
          className="position-absolute w-100 bg-white border rounded-3 shadow-sm mt-1 p-3 text-secondary small"
          style={{ zIndex: 1080 }}
        >
          No registered patients found.
        </div>
      )}

      {error && (
        <div className="invalid-feedback d-block">
          {Array.isArray(error) ? error[0] : error}
        </div>
      )}
    </div>
  );
}

function FormInput({ label, error, col = "col-12", ...inputProps }) {
  return (
    <div className={col}>
      <label className="form-label">
        {label}
        {inputProps.required && <span className="text-danger ms-1">*</span>}
      </label>

      <input
        className={`form-control ${error ? "is-invalid" : ""}`}
        {...inputProps}
      />

      {error && (
        <div className="invalid-feedback">
          {Array.isArray(error) ? error[0] : error}
        </div>
      )}
    </div>
  );
}

function FormSelect({
  label,
  error,
  col = "col-12",
  children,
  ...selectProps
}) {
  return (
    <div className={col}>
      <label className="form-label">
        {label}
        {selectProps.required && <span className="text-danger ms-1">*</span>}
      </label>

      <select
        className={`form-select ${error ? "is-invalid" : ""}`}
        {...selectProps}
      >
        {children}
      </select>

      {error && (
        <div className="invalid-feedback">
          {Array.isArray(error) ? error[0] : error}
        </div>
      )}
    </div>
  );
}

function FormTextarea({ label, col = "col-12", ...textareaProps }) {
  return (
    <div className={col}>
      <label className="form-label">{label}</label>

      <textarea className="form-control" {...textareaProps} />
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="mb-4">
      <h6 className="fw-bold mb-3">{title}</h6>
      <div className="border rounded-4 p-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <small className="text-secondary">{label}</small>

      <small className="fw-semibold text-end">{value || "—"}</small>
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    SCHEDULED: "bg-secondary-subtle text-secondary",
    CONFIRMED: "bg-primary-subtle text-primary",
    CHECKED_IN: "bg-warning-subtle text-warning-emphasis",
    IN_PROGRESS: "bg-info-subtle text-info-emphasis",
    COMPLETED: "bg-success-subtle text-success",
    CANCELLED: "bg-danger-subtle text-danger",
    NO_SHOW: "bg-dark-subtle text-dark",
    HOSPITALIZED: "bg-danger-subtle text-danger",
    DISCHARGED: "bg-success-subtle text-success",
  };

  return (
    <span
      className={`badge rounded-pill ${
        classes[status] || "bg-light text-secondary"
      }`}
    >
      {formatEnum(status)}
    </span>
  );
}

function Pagination({ pagination, onPageChange }) {
  return (
    <div className="d-flex justify-content-between align-items-center mt-4">
      <button
        type="button"
        className="btn btn-sm btn-light border"
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1)}
      >
        Previous
      </button>

      <small className="text-secondary">
        Page {pagination.page} of {pagination.totalPages}
      </small>

      <button
        type="button"
        className="btn btn-sm btn-light border"
        disabled={pagination.page >= pagination.totalPages}
        onClick={() => onPageChange(pagination.page + 1)}
      >
        Next
      </button>
    </div>
  );
}

function getAvailableActions(status) {
  const actions = {
    SCHEDULED: [
      {
        status: "CONFIRMED",
        label: "Confirm",
        className: "btn btn-outline-primary btn-sm",
      },
      {
        status: "CHECKED_IN",
        label: "Check in",
        className: "btn btn-outline-warning btn-sm",
      },
      {
        status: "NO_SHOW",
        label: "No show",
        className: "btn btn-outline-dark btn-sm",
      },
      {
        status: "CANCELLED",
        label: "Cancel",
        className: "btn btn-outline-danger btn-sm",
      },
    ],

    CONFIRMED: [
      {
        status: "CHECKED_IN",
        label: "Check in",
        className: "btn btn-outline-warning btn-sm",
      },
      {
        status: "NO_SHOW",
        label: "No show",
        className: "btn btn-outline-dark btn-sm",
      },
      {
        status: "CANCELLED",
        label: "Cancel",
        className: "btn btn-outline-danger btn-sm",
      },
    ],

    CHECKED_IN: [
      {
        status: "HOSPITALIZED",
        label: "Hospitalize",
        className: "btn btn-outline-danger btn-sm",
      },
      {
        status: "IN_PROGRESS",
        label: "Start visit",
        className: "btn btn-outline-info btn-sm",
      },
      {
        status: "NO_SHOW",
        label: "No show",
        className: "btn btn-outline-dark btn-sm",
      },
      {
        status: "CANCELLED",
        label: "Cancel",
        className: "btn btn-outline-danger btn-sm",
      },
    ],

    IN_PROGRESS: [
      {
        status: "HOSPITALIZED",
        label: "Hospitalize",
        className: "btn btn-outline-danger btn-sm",
      },
      {
        status: "COMPLETED",
        label: "Complete",
        className: "btn btn-outline-success btn-sm",
      },
      {
        status: "CANCELLED",
        label: "Cancel",
        className: "btn btn-outline-danger btn-sm",
      },
    ],

    HOSPITALIZED: [
      {
        status: "DISCHARGED",
        label: "Discharge",
        className: "btn btn-outline-success btn-sm",
      },
    ],
  };

  return actions[status] || [];
}

function getOwnerName(owner) {
  if (!owner) return "";

  return [owner.firstName, owner.lastName].filter(Boolean).join(" ");
}

function getUserName(user) {
  if (!user) return "";

  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}
function getServiceNames(appointment) {
  if (!appointment) return "";

  // NEW FORMAT: appointment.services[] with service objects
  if (appointment.services?.length) {
    const names = appointment.services
      .map((item) => item.service?.name)
      .filter(Boolean);
    if (names.length) return names.join(", ");
  }

  // OLD FORMAT: Single service object
  if (appointment.service?.name) {
    return appointment.service.name;
  }

  // Fallback: if serviceId exists but no service object
  if (appointment.serviceId && appointment.serviceName) {
    return appointment.serviceName;
  }

  return "";
}
function formatEnum(value) {
  if (!value) return "—";

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateOnly(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

// Temporary DateTime adapter for APIs that have not adopted date-only visits.
// This is NOT a time chosen by staff and must not be used to enforce time slots.
function toDateOnlyCompatibleTimestamp(dateValue) {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  const now = new Date();
  return formatDateInput(now) === dateValue ? now.toISOString() : date.toISOString();
}

export default Appointments;
