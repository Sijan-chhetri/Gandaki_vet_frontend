import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  Eye,
  Filter,
  FileText,
  LoaderCircle,
  PawPrint,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";

import apiRequest from "../../services/api";
import appointmentService from "../../services/appointment.service";
import patientService from "../../services/patient.service";
import prescriptionService from "../../services/prescription.service";
import serviceService from "../../services/service.service";
import vaccinationService from "../../services/vaccination.service.js";
import ServiceMultiSelect from "../../components/ServiceMultiSelect";

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

const initialFormData = {
  branchId: "",
  mode: "SCHEDULED",
  ownerId: "",
  petId: "",
  veterinarianId: "",
  serviceIds: [],
  type: "CONSULTATION",
  scheduledDate: "",
  scheduledTime: "09:00",
  durationMin: "30",
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

const initialPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
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
  const [pagination, setPagination] = useState(initialPagination);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    type: "",
    date: "",
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

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

    const totalDuration = nextServices.reduce(
      (total, service) => total + Number(service.durationMin || 0),
      0,
    );

    setFormData((previous) => ({
      ...previous,
      serviceIds: nextServices.map((service) => service.id),
      durationMin: totalDuration > 0 ? String(totalDuration) : "30",
    }));

    setFieldErrors((previous) => ({
      ...previous,
      serviceIds: "",
    }));

    setFormError("");
  };

  const loadAppointments = useCallback(
    async (page = 1) => {
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
          setPagination(initialPagination);
          if (!branchesError)
            setError("Select an accessible branch to view appointments.");
          return;
        }

        const query = {
          branchId: selectedBranchId,
          page,
          limit: pagination.limit,
          search: appliedFilters.search,
          status: appliedFilters.status,
          type: appliedFilters.type,
        };

        if (appliedFilters.date) {
          query.dateFrom = `${appliedFilters.date}T00:00:00.000`;
          query.dateTo = `${appliedFilters.date}T23:59:59.999`;
        }

        if (isDoctor && currentUser?.id) {
          query.veterinarianId = currentUser.id;
        }

        const result = await appointmentService.getAppointments(query);

        const receivedAppointments = extractArray(result, [
          "appointments",
        ]).filter(
          (appointment) =>
            selectedBranchId === "all" ||
            appointment.branchId === selectedBranchId,
        );

        setAppointments(
          isDoctor && currentUser?.id
            ? receivedAppointments.filter(
                (appointment) =>
                  appointment.veterinarianId === currentUser.id ||
                  appointment.veterinarian?.id === currentUser.id,
              )
            : receivedAppointments,
        );

        setPagination({
          ...initialPagination,
          ...(result?.pagination || result?.data?.pagination || {}),
          page,
        });
      } catch (requestError) {
        setError(requestError.message || "Unable to retrieve appointments.");
      } finally {
        setLoading(false);
      }
    },
    [
      appliedFilters,
      pagination.limit,
      isDoctor,
      currentUser?.id,
      selectedBranchId,
      availableBranches,
      branchesLoading,
      branchesError,
    ],
  );

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

  // Keep the Vaccination service and duration synchronized after services load
  // or when an admin changes the configured service duration in the database.
  useEffect(() => {
    if (formData.type !== "VACCINATION") return;

    const vaccinationService = findVaccinationService(services);
    if (!vaccinationService) return;

    const nextServiceId = vaccinationService.id || "";
    const nextDuration = String(vaccinationService.durationMin || 30);
    setSelectedServices([vaccinationService]);
    setFormData((previous) => {
      if (
        previous.type === "VACCINATION" &&
        previous.serviceIds?.length === 1 &&
        previous.serviceIds[0] === nextServiceId &&
        previous.durationMin === nextDuration
      ) {
        return previous;
      }

      return {
        ...previous,
        serviceIds: [nextServiceId],
        durationMin: nextDuration,
      };
    });
  }, [services, formData.type]);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setAppliedFilters({
      ...filters,
      search: filters.search.trim(),
    });
  }

  function clearFilters() {
    const emptyFilters = {
      search: "",
      status: "",
      type: "",
      date: "",
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setFormError("");

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

          durationMin: String(vaccinationService.durationMin || 30),

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
        durationMin: "30",
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
    const now = new Date();
    const date = now.toISOString().slice(0, 10);

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
      scheduledDate: formatDateInput(scheduledAt),
      scheduledTime: formatTimeInput(scheduledAt),
      durationMin: String(appointment.durationMin || 30),
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

      if (!formData.scheduledDate || !formData.scheduledTime) {
        errors.scheduledAt = "Appointment date and time are required.";
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

    const duration = Number(formData.durationMin);

    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
      errors.durationMin = "Duration must be between 5 and 480 minutes.";
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
      durationMin: Number(formData.durationMin),
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
        walkInPetSpecies: formData.walkInPetSpecies.trim(),
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

    const scheduledAt = new Date(
      `${formData.scheduledDate}T${formData.scheduledTime}:00`,
    );

    return {
      ...commonPayload,
      ownerId: formData.ownerId || selectedPatient?.owner?.id || null,
      petId: formData.petId || selectedPatient?.id || null,
      scheduledAt: scheduledAt.toISOString(),
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
        "Date and Time",
        "Patient",
        "Owner",
        "Phone",
        "Type",
        "Service",
        "Veterinarian",
        "Status",
        "Reason",
      ],
      ...appointments.map((appointment) => [
        appointment.branch?.name ||
          availableBranches.find((b) => b.id === appointment.branchId)?.name ||
          "",
        appointment.appointmentNo,
        appointment.scheduledAt,
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
            disabled={!appointments.length}
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
                className="form-control"
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
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

          <div className="d-flex justify-content-between align-items-center mb-3">
            <small className="text-secondary">
              Showing {appointments.length} of {pagination.total} appointments
            </small>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Branch</th>
                  <th>Date & Time</th>
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
                ) : appointments.length === 0 ? (
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
                  appointments.map((appointment) => (
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
                          {formatDateTime(appointment.scheduledAt)}
                        </div>

                        <small className="text-secondary">
                          {appointment.durationMin} min
                        </small>
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

                          {appointment.status === "COMPLETED" && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                              title="Print saved prescription (completed appointments only)"
                              aria-label={`Print prescription for ${appointment.appointmentNo || appointment.id}`}
                              onClick={() => printPrescription(appointment)}
                              disabled={actionLoading === `${appointment.id}:PRINT`}
                            >
                              {actionLoading === `${appointment.id}:PRINT` ? (
                                <LoaderCircle size={16} className="spin-icon" />
                              ) : (
                                <Printer size={16} />
                              )}
                              <span className="d-none d-xxl-inline">Print</span>
                            </button>
                          )}

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
              onPageChange={loadAppointments}
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
          onPrintPrescription={() => printPrescription(selectedAppointment)}
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
              <RxInfo label="Visit date" value={formatDateTime(appointment.scheduledAt)} />
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
                    ? "Walk-in appointments are checked in immediately using the current date and time."
                    : "Select an existing registered patient and appointment schedule."}
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

                <FormInput
                  label="Species"
                  name="walkInPetSpecies"
                  value={formData.walkInPetSpecies}
                  onChange={onChange}
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

          <FormSection title="Appointment schedule">
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
                <>
                  <FormInput
                    label="Date"
                    name="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={onChange}
                    error={fieldErrors.scheduledAt}
                    required
                    col="col-md-3"
                  />
                  <FormInput
                    label="Time"
                    name="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={onChange}
                    error={fieldErrors.scheduledAt}
                    required
                    col="col-md-2"
                  />
                </>
              )}

              <FormInput
                label="Duration"
                name="durationMin"
                type="number"
                min="5"
                max="480"
                step="5"
                value={formData.durationMin}
                onChange={onChange}
                error={fieldErrors.durationMin}
                required
                disabled={formData.type === "VACCINATION"}
                col={isWalkIn ? "col-md-4" : "col-md-3"}
              />

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
            disabled={submitting}
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
  onPrintPrescription,
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
                    label="Date and time"
                    value={formatDateTime(appointment.scheduledAt)}
                  />

                  <DetailRow
                    label="Duration"
                    value={`${appointment.durationMin} minutes`}
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

        {appointment?.status === "COMPLETED" && (
          <button
            type="button"
            className="btn btn-outline-primary d-flex align-items-center gap-2"
            onClick={onPrintPrescription}
          >
            <Printer size={16} />
            Print Prescription
          </button>
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

function formatDateTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateInput(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function formatTimeInput(value) {
  const date = new Date(value);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export default Appointments;
