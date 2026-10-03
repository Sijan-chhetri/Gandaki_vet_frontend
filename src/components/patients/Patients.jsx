import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  LoaderCircle,
  PawPrint,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  Trash2,
  UserRound,
  Weight,
  
} from "lucide-react";

import patientService from "../../services/patient.service";

const initialFormData = {
  ownerId: "",
  speciesId: "",
  breedId: "",
  name: "",
  gender: "MALE",
  dateOfBirth: "",
  approximateAge: "",
  color: "",
  weightKg: "",
  microchipNumber: "",
  bloodGroup: "",
  allergies: "",
  identifyingMarks: "",
  photoUrl: "",
  status: "ACTIVE",
  isNeutered: false,
};

const initialPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

const initialStats = {
  total: 0,
  active: 0,
  inactive: 0,
  deceased: 0,
  missing: 0,
  neutered: 0,
  microchipped: 0,
  dueVaccinations: 0,
};

function extractArray(result, possibleKeys = []) {
  const candidates = [
    result,
    result?.data,
    result?.data?.data,
    ...possibleKeys.flatMap((key) => [
      result?.[key],
      result?.data?.[key],
      result?.data?.data?.[key],
    ]),
  ];

  return (
    candidates.find((candidate) =>
      Array.isArray(candidate),
    ) || []
  );
}

function extractPagination(result, fallbackPage = 1) {
  const pagination =
    result?.pagination ||
    result?.data?.pagination ||
    result?.data?.data?.pagination;

  return pagination && typeof pagination === "object"
    ? {
        ...initialPagination,
        ...pagination,
      }
    : {
        ...initialPagination,
        page: fallbackPage,
      };
}

function Patients() {
  const [patients, setPatients] = useState([]);
  const [owners, setOwners] = useState([]);
  const [species, setSpecies] = useState([]);
  const [breeds, setBreeds] = useState([]);

  const [stats, setStats] = useState(initialStats);
  const [pagination, setPagination] =
    useState(initialPagination);

  const [filters, setFilters] = useState({
    search: "",
    speciesId: "",
    gender: "",
    status: "",
  });

  const [appliedSearch, setAppliedSearch] =
    useState("");

  const [formData, setFormData] =
    useState(initialFormData);

  const [editingPatient, setEditingPatient] =
    useState(null);

  const [selectedPatient, setSelectedPatient] =
    useState(null);

  const [vaccinationData, setVaccinationData] =
    useState(null);

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] =
    useState(false);

  const [showCatalogue, setShowCatalogue] =
    useState(false);

  const [catalogueTab, setCatalogueTab] =
    useState("species");

  const [speciesForm, setSpeciesForm] = useState({
    id: "",
    name: "",
  });

  const [breedForm, setBreedForm] = useState({
    id: "",
    speciesId: "",
    name: "",
  });

  const [catalogueError, setCatalogueError] =
    useState("");

  const [catalogueSubmitting, setCatalogueSubmitting] =
    useState(false);

  const [catalogueDeletingId, setCatalogueDeletingId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] =
    useState(true);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [exporting, setExporting] =
    useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState({});

  const loadPatients = useCallback(
    async (page = pagination.page) => {
      try {
        setLoading(true);
        setError("");

        const result =
          await patientService.getPatients({
            page,
            limit: pagination.limit,
            search: appliedSearch,
            speciesId: filters.speciesId,
            gender: filters.gender,
            status: filters.status,
          });

        setPatients(
          extractArray(result, ["patients", "pets"]),
        );
        setPagination(
          extractPagination(result, page),
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Unable to retrieve patients.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      appliedSearch,
      filters.speciesId,
      filters.gender,
      filters.status,
      pagination.limit,
      pagination.page
    ],
  );

  const loadStats = useCallback(async () => {
    try {
      const result = await patientService.getPatientStats();

      const statsData =
        result?.data?.stats ||
        result?.data?.data ||
        result?.data ||
        result?.stats ||
        {};

      setStats({
        ...initialStats,
        ...(statsData &&
        typeof statsData === "object" &&
        !Array.isArray(statsData)
          ? statsData
          : {}),
      });
    } catch (requestError) {
      console.error(
        "Unable to load patient statistics:",
        requestError,
      );
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      setOptionsLoading(true);

      const [ownersResult, speciesResult] =
        await Promise.all([
          patientService.getOwners({
            page: 1,
            limit: 1000,
            isActive: true,
            sortBy: "firstName",
            sortOrder: "asc",
          }),
          patientService.getSpecies(),
        ]);

      setOwners(
        extractArray(ownersResult, ["owners"]),
      );
      setSpecies(
        extractArray(speciesResult, ["species"]),
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load owners and species.",
      );
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    loadStats();
  }, [loadOptions, loadStats]);

  useEffect(() => {
    loadPatients(1);
  }, [
    loadPatients
  ]);

  async function loadBreeds(speciesId) {
    if (!speciesId) {
      setBreeds([]);
      return;
    }

    try {
      const result =
        await patientService.getBreeds(speciesId);

      setBreeds(
        extractArray(result, ["breeds"]),
      );
    } catch (requestError) {
      setFormError(
        requestError.message ||
          "Unable to load breeds.",
      );
    }
  }

  async function refreshCatalogueOptions(
    selectedSpeciesId = formData.speciesId,
  ) {
    const speciesResult =
      await patientService.getSpecies();

    const nextSpecies = extractArray(
      speciesResult,
      ["species"],
    );
    setSpecies(nextSpecies);

    if (selectedSpeciesId) {
      const breedResult =
        await patientService.getBreeds(
          selectedSpeciesId,
        );

      setBreeds(
        extractArray(breedResult, ["breeds"]),
      );
    } else {
      setBreeds([]);
    }
  }

  function openCatalogueManager() {
    setCatalogueError("");
    setSpeciesForm({ id: "", name: "" });
    setBreedForm({
      id: "",
      speciesId: "",
      name: "",
    });
    setShowCatalogue(true);
  }

  function closeCatalogueManager() {
    if (catalogueSubmitting) return;

    setShowCatalogue(false);
    setCatalogueError("");
    setSpeciesForm({ id: "", name: "" });
    setBreedForm({
      id: "",
      speciesId: "",
      name: "",
    });
  }

  async function handleSpeciesSubmit(event) {
    event.preventDefault();

    const name = speciesForm.name.trim();

    if (!name) {
      setCatalogueError(
        "Species name is required.",
      );
      return;
    }

    try {
      setCatalogueSubmitting(true);
      setCatalogueError("");

      if (speciesForm.id) {
        await patientService.updateSpecies(
          speciesForm.id,
          name,
        );
      } else {
        await patientService.createSpecies(name);
      }

      setSpeciesForm({ id: "", name: "" });
      await refreshCatalogueOptions();
    } catch (requestError) {
      setCatalogueError(
        requestError.message ||
          "Unable to save species.",
      );
    } finally {
      setCatalogueSubmitting(false);
    }
  }

  function editSpecies(item) {
    setCatalogueTab("species");
    setCatalogueError("");
    setSpeciesForm({
      id: item.id,
      name: item.name || "",
    });
  }

  async function deleteSpecies(item) {
    const confirmed = window.confirm(
      `Delete species "${item.name}"?`,
    );

    if (!confirmed) return;

    try {
      setCatalogueDeletingId(item.id);
      setCatalogueError("");

      await patientService.deleteSpecies(
        item.id,
      );

      if (speciesForm.id === item.id) {
        setSpeciesForm({ id: "", name: "" });
      }

      if (breedForm.speciesId === item.id) {
        setBreedForm({
          id: "",
          speciesId: "",
          name: "",
        });
      }

      await refreshCatalogueOptions();
    } catch (requestError) {
      setCatalogueError(
        requestError.message ||
          "Unable to delete species.",
      );
    } finally {
      setCatalogueDeletingId("");
    }
  }

  async function handleBreedSubmit(event) {
    event.preventDefault();

    const speciesId =
      breedForm.speciesId.trim();
    const name = breedForm.name.trim();

    if (!speciesId || !name) {
      setCatalogueError(
        "Species and breed name are required.",
      );
      return;
    }

    try {
      setCatalogueSubmitting(true);
      setCatalogueError("");

      const payload = {
        speciesId,
        name,
      };

      if (breedForm.id) {
        await patientService.updateBreed(
          breedForm.id,
          payload,
        );
      } else {
        await patientService.createBreed(
          payload,
        );
      }

      setBreedForm({
        id: "",
        speciesId,
        name: "",
      });

      await refreshCatalogueOptions(
        formData.speciesId,
      );
    } catch (requestError) {
      setCatalogueError(
        requestError.message ||
          "Unable to save breed.",
      );
    } finally {
      setCatalogueSubmitting(false);
    }
  }

  function editBreed(item) {
    setCatalogueTab("breeds");
    setCatalogueError("");
    setBreedForm({
      id: item.id,
      speciesId: item.speciesId || "",
      name: item.name || "",
    });
  }

  async function deleteBreed(item) {
    const confirmed = window.confirm(
      `Delete breed "${item.name}"?`,
    );

    if (!confirmed) return;

    try {
      setCatalogueDeletingId(item.id);
      setCatalogueError("");

      await patientService.deleteBreed(item.id);

      if (breedForm.id === item.id) {
        setBreedForm({
          id: "",
          speciesId: "",
          name: "",
        });
      }

      await refreshCatalogueOptions(
        formData.speciesId,
      );
    } catch (requestError) {
      setCatalogueError(
        requestError.message ||
          "Unable to delete breed.",
      );
    } finally {
      setCatalogueDeletingId("");
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setAppliedSearch(filters.search.trim());
  }

  function clearFilters() {
    setFilters({
      search: "",
      speciesId: "",
      gender: "",
      status: "",
    });

    setAppliedSearch("");
  }

  function handleFormChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox" ? checked : value,
      ...(name === "speciesId"
        ? {
            breedId: "",
          }
        : {}),
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setFormError("");

    if (name === "speciesId") {
      loadBreeds(value);
    }
  }

  function openAddForm() {
    setEditingPatient(null);
    setFormData(initialFormData);
    setBreeds([]);
    setFormError("");
    setFieldErrors({});
    setShowForm(true);
  }

  async function openEditForm(patient) {
    setEditingPatient(patient);
    setFormError("");
    setFieldErrors({});

    const speciesId = patient.speciesId || "";
    const breedId = patient.breedId || "";

    setFormData({
      ownerId: patient.ownerId || "",
      speciesId,
      breedId,
      name: patient.name || "",
      gender: patient.gender || "MALE",
      dateOfBirth: toDateInput(
        patient.dateOfBirth,
      ),
      approximateAge:
        patient.approximateAge || "",
      color: patient.color || "",
      weightKg:
        patient.weightKg === null ||
        patient.weightKg === undefined
          ? ""
          : String(patient.weightKg),
      microchipNumber:
        patient.microchipNumber || "",
      bloodGroup: patient.bloodGroup || "",
      allergies: patient.allergies || "",
      identifyingMarks:
        patient.identifyingMarks || "",
      photoUrl: patient.photoUrl || "",
      status: patient.status || "ACTIVE",
      isNeutered: Boolean(
        patient.isNeutered,
      ),
    });

    setShowDetails(false);
    setShowForm(true);

    await loadBreeds(speciesId);
  }

  function closeForm() {
    if (submitting) return;

    setShowForm(false);
    setEditingPatient(null);
    setFormData(initialFormData);
    setBreeds([]);
    setFormError("");
    setFieldErrors({});
  }

  function validateForm() {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Patient name is required.";
    }

    if (!formData.ownerId) {
      errors.ownerId =
        "Please select a pet owner.";
    }

    if (!formData.speciesId) {
      errors.speciesId =
        "Please select a species.";
    }

    if (
      formData.weightKg !== "" &&
      Number(formData.weightKg) <= 0
    ) {
      errors.weightKg =
        "Weight must be greater than zero.";
    }

    if (
      formData.dateOfBirth &&
      new Date(formData.dateOfBirth) >
        new Date()
    ) {
      errors.dateOfBirth =
        "Date of birth cannot be in the future.";
    }

    return errors;
  }

  function createPayload() {
    return {
      ownerId: formData.ownerId,
      speciesId: formData.speciesId,
      breedId: formData.breedId || null,
      name: formData.name.trim(),
      gender: formData.gender,
      dateOfBirth:
        formData.dateOfBirth || null,
      approximateAge:
        formData.approximateAge.trim() ||
        null,
      color: formData.color.trim() || null,
      weightKg:
        formData.weightKg === ""
          ? null
          : Number(formData.weightKg),
      microchipNumber:
        formData.microchipNumber.trim() ||
        null,
      bloodGroup:
        formData.bloodGroup.trim() || null,
      allergies:
        formData.allergies.trim() || null,
      identifyingMarks:
        formData.identifyingMarks.trim() ||
        null,
      photoUrl:
        formData.photoUrl.trim() || null,
      status: formData.status,
      isNeutered: formData.isNeutered,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateForm();

    if (
      Object.keys(validationErrors).length >
      0
    ) {
      setFieldErrors(validationErrors);
      setFormError(
        "Please correct the highlighted fields.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      setFieldErrors({});

      const payload = createPayload();

      if (editingPatient) {
        await patientService.updatePatient(
          editingPatient.id,
          payload,
        );
      } else {
        await patientService.createPatient(
          payload,
        );
      }

      closeForm();

      await Promise.all([
        loadPatients(
          editingPatient
            ? pagination.page
            : 1,
        ),
        loadStats(),
      ]);
    } catch (requestError) {
      setFormError(
        requestError.message ||
          "Unable to save patient.",
      );

      setFieldErrors(
        requestError.errors || {},
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openPatientDetails(patient) {
    try {
      setDetailsLoading(true);
      setError("");
      setShowDetails(true);
      setSelectedPatient(patient);
      setVaccinationData(null);

      const [
        patientResult,
        vaccinationResult,
      ] = await Promise.all([
        patientService.getPatientById(patient.id),
        patientService
          .getPatientVaccinationSummary(patient.id)
          .catch(() => null),
      ]);

      setSelectedPatient(
        patientResult?.data?.patient ||
          patientResult?.data?.data ||
          patientResult?.data ||
          patientResult?.patient ||
          null,
      );
      setVaccinationData(
        vaccinationResult?.data?.vaccinations ||
          vaccinationResult?.data?.data ||
          vaccinationResult?.data ||
          vaccinationResult?.vaccinations ||
          null,
      );
    } catch (requestError) {
      setShowDetails(false);
      setError(
        requestError.message ||
          "Unable to retrieve patient details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleArchive(patient) {
    const confirmed = window.confirm(
      `Archive ${patient.name}? The patient will be removed from the active patient list.`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await patientService.archivePatient(
        patient.id,
      );

      await Promise.all([
        loadPatients(pagination.page),
        loadStats(),
      ]);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to archive patient.",
      );
    }
  }

  async function handleExport() {
    try {
      setExporting(true);
      setError("");

      const blob =
        await patientService.exportPatientsCsv({
          search: appliedSearch,
          speciesId: filters.speciesId,
          gender: filters.gender,
          status: filters.status,
        });

      const fileUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = fileUrl;
      link.download = `patients-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(fileUrl);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to export patients.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            Patients
          </h3>

          <p className="text-secondary mb-0">
            Manage pet records, ownership and
            clinical information.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={() =>
              loadPatients(pagination.page)
            }
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading ? "spin-icon" : ""
              }
            />
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <LoaderCircle
                size={17}
                className="spin-icon"
              />
            ) : (
              <Download size={17} />
            )}

            Export
          </button>

          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={openCatalogueManager}
            disabled={optionsLoading}
          >
            <Settings2 size={17} />
            Species & Breeds
          </button>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={openAddForm}
            disabled={optionsLoading}
          >
            <Plus size={18} />
            Add Patient
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

      <div className="row g-3 mb-4">
        <SummaryCard
          title="Total Patients"
          value={stats.total}
          icon={PawPrint}
          iconClass="bg-primary-subtle text-primary"
        />

        <SummaryCard
          title="Active Patients"
          value={stats.active}
          icon={Activity}
          iconClass="bg-success-subtle text-success"
        />

        <SummaryCard
          title="Due Vaccinations"
          value={stats.dueVaccinations}
          icon={ShieldAlert}
          iconClass="bg-warning-subtle text-warning-emphasis"
        />

        <SummaryCard
          title="Microchipped"
          value={stats.microchipped}
          icon={Weight}
          iconClass="bg-info-subtle text-info-emphasis"
        />
      </div>

      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          <form
            className="row g-2 mb-4"
            onSubmit={handleSearchSubmit}
          >
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
                  placeholder="Search patient, owner, phone, breed or microchip"
                />
              </div>
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-2">
              <select
                className="form-select"
                name="speciesId"
                value={filters.speciesId}
                onChange={handleFilterChange}
              >
                <option value="">
                  All species
                </option>

                {(Array.isArray(species) ? species : []).map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-2">
              <select
                className="form-select"
                name="gender"
                value={filters.gender}
                onChange={handleFilterChange}
              >
                <option value="">
                  All genders
                </option>
                <option value="MALE">
                  Male
                </option>
                <option value="FEMALE">
                  Female
                </option>
                <option value="UNKNOWN">
                  Unknown
                </option>
              </select>
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-2">
              <select
                className="form-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">
                  All status
                </option>
                <option value="ACTIVE">
                  Active
                </option>
                <option value="INACTIVE">
                  Inactive
                </option>
                <option value="DECEASED">
                  Deceased
                </option>
                <option value="MISSING">
                  Missing
                </option>
              </select>
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-auto">
              <button
                type="submit"
                className="btn btn-primary w-100"
              >
                Search
              </button>
            </div>

            <div className="col-sm-6 col-lg-3 col-xl-auto">
              <button
                type="button"
                className="btn btn-light border w-100"
                onClick={clearFilters}
              >
                Clear
              </button>
            </div>
          </form>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <small className="text-secondary">
              Showing {patients.length} of{" "}
              {pagination.total} patients
            </small>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Patient</th>
                  <th>Owner</th>
                  <th>Species</th>
                  <th>Gender</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Records</th>
                  <th className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-5"
                    >
                      <LoaderCircle
                        size={32}
                        className="spin-icon text-primary mb-3"
                      />

                      <div className="text-secondary">
                        Loading patients...
                      </div>
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-5"
                    >
                      <PawPrint
                        size={44}
                        className="text-secondary mb-3"
                      />

                      <h6 className="fw-semibold">
                        No patients found
                      </h6>

                      <p className="text-secondary small">
                        Change the filters or
                        register a patient.
                      </p>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={openAddForm}
                      >
                        Add Patient
                      </button>
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <PatientAvatar
                            patient={patient}
                          />

                          <div>
                            <div className="fw-semibold">
                              {patient.name}
                            </div>

                            <small className="text-secondary">
                              {patient.petCode}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="fw-medium">
                          {getOwnerName(
                            patient.owner,
                          )}
                        </div>

                        <small className="text-secondary">
                          {patient.owner?.phone ||
                            "No phone"}
                        </small>
                      </td>

                      <td>
                        <div>
                          {patient.species?.name ||
                            "—"}
                        </div>

                        <small className="text-secondary">
                          {patient.breed?.name ||
                            "No breed"}
                        </small>
                      </td>

                      <td>
                        {formatEnum(
                          patient.gender,
                        )}
                      </td>

                      <td>
                        {patient.weightKg !==
                          null &&
                        patient.weightKg !==
                          undefined
                          ? `${patient.weightKg} kg`
                          : "—"}
                      </td>

                      <td>
                        <StatusBadge
                          status={patient.status}
                        />
                      </td>

                      <td>
                        <small className="d-block">
                          Medical:{" "}
                          {patient._count
                            ?.medicalRecords || 0}
                        </small>

                        <small className="text-secondary">
                          Vaccines:{" "}
                          {patient._count
                            ?.vaccinations || 0}
                        </small>
                      </td>

                      <td>
                        <div className="d-flex justify-content-end gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            title="View patient"
                            onClick={() =>
                              openPatientDetails(
                                patient,
                              )
                            }
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            title="Edit patient"
                            onClick={() =>
                              openEditForm(patient)
                            }
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title="Archive patient"
                            onClick={() =>
                              handleArchive(
                                patient,
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading &&
            pagination.totalPages > 1 && (
              <Pagination
                pagination={pagination}
                onPageChange={loadPatients}
              />
            )}
        </div>
      </section>

      {showForm && (
        <PatientFormModal
          editing={Boolean(editingPatient)}
          formData={formData}
          owners={owners}
          species={species}
          breeds={breeds}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {showDetails && (
        <PatientDetailsModal
          patient={selectedPatient}
          vaccinationData={vaccinationData}
          loading={detailsLoading}
          onClose={() => {
            setShowDetails(false);
            setSelectedPatient(null);
            setVaccinationData(null);
          }}
          onEdit={() =>
            openEditForm(selectedPatient)
          }
        />
      )}

      {showCatalogue && (
        <CatalogueManagerModal
          activeTab={catalogueTab}
          onTabChange={setCatalogueTab}
          species={species}
          speciesForm={speciesForm}
          setSpeciesForm={setSpeciesForm}
          breedForm={breedForm}
          setBreedForm={setBreedForm}
          error={catalogueError}
          submitting={catalogueSubmitting}
          deletingId={catalogueDeletingId}
          onSpeciesSubmit={handleSpeciesSubmit}
          onBreedSubmit={handleBreedSubmit}
          onEditSpecies={editSpecies}
          onDeleteSpecies={deleteSpecies}
          onEditBreed={editBreed}
          onDeleteBreed={deleteBreed}
          onClose={closeCatalogueManager}
        />
      )}

      <style>{`
        .spin-icon {
          animation: patients-spin 0.9s linear infinite;
        }

        @keyframes patients-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}


function CatalogueManagerModal({
  activeTab,
  onTabChange,
  species,
  speciesForm,
  setSpeciesForm,
  breedForm,
  setBreedForm,
  error,
  submitting,
  deletingId,
  onSpeciesSubmit,
  onBreedSubmit,
  onEditSpecies,
  onDeleteSpecies,
  onEditBreed,
  onDeleteBreed,
  onClose,
}) {
  const allBreeds = species.flatMap((item) =>
    (item.breeds || []).map((breed) => ({
      ...breed,
      speciesName: item.name,
      speciesId: breed.speciesId || item.id,
    })),
  );

  return (
    <ModalShell
      title="Species and Breed Catalogue"
      subtitle="Create and manage the classification options used when registering patients."
      onClose={onClose}
      size="modal-lg"
    >
      <div className="modal-body">
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${
                activeTab === "species"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                onTabChange("species")
              }
            >
              Species
            </button>
          </li>

          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${
                activeTab === "breeds"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                onTabChange("breeds")
              }
            >
              Breeds
            </button>
          </li>
        </ul>

        {activeTab === "species" ? (
          <>
            <form
              className="border rounded-4 p-3 mb-4"
              onSubmit={onSpeciesSubmit}
            >
              <h6 className="fw-bold mb-3">
                {speciesForm.id
                  ? "Edit species"
                  : "Add species"}
              </h6>

              <div className="row g-2">
                <div className="col-md">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="For example: Dog"
                    value={speciesForm.name}
                    onChange={(event) =>
                      setSpeciesForm(
                        (previous) => ({
                          ...previous,
                          name: event.target.value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="col-md-auto d-flex gap-2">
                  {speciesForm.id && (
                    <button
                      type="button"
                      className="btn btn-light border"
                      onClick={() =>
                        setSpeciesForm({
                          id: "",
                          name: "",
                        })
                      }
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={submitting}
                  >
                    {submitting && (
                      <LoaderCircle
                        size={16}
                        className="spin-icon"
                      />
                    )}

                    {speciesForm.id
                      ? "Update"
                      : "Add Species"}
                  </button>
                </div>
              </div>
            </form>

            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Species</th>
                    <th>Breeds</th>
                    <th>Patients</th>
                    <th className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {species.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="text-center text-secondary py-4"
                      >
                        No species available.
                      </td>
                    </tr>
                  ) : (
                    species.map((item) => (
                      <tr key={item.id}>
                        <td className="fw-semibold">
                          {item.name}
                        </td>

                        <td>
                          {item.breeds?.length || 0}
                        </td>

                        <td>
                          {item._count?.pets || 0}
                        </td>

                        <td>
                          <div className="d-flex justify-content-end gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              onClick={() =>
                                onEditSpecies(item)
                              }
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={
                                deletingId === item.id
                              }
                              onClick={() =>
                                onDeleteSpecies(item)
                              }
                            >
                              {deletingId ===
                              item.id ? (
                                <LoaderCircle
                                  size={15}
                                  className="spin-icon"
                                />
                              ) : (
                                <Trash2 size={15} />
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
          </>
        ) : (
          <>
            <form
              className="border rounded-4 p-3 mb-4"
              onSubmit={onBreedSubmit}
            >
              <h6 className="fw-bold mb-3">
                {breedForm.id
                  ? "Edit breed"
                  : "Add breed"}
              </h6>

              <div className="row g-2">
                <div className="col-md-5">
                  <select
                    className="form-select"
                    value={breedForm.speciesId}
                    onChange={(event) =>
                      setBreedForm(
                        (previous) => ({
                          ...previous,
                          speciesId:
                            event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      Select species
                    </option>

                    {(Array.isArray(species) ? species : []).map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="For example: Labrador Retriever"
                    value={breedForm.name}
                    onChange={(event) =>
                      setBreedForm(
                        (previous) => ({
                          ...previous,
                          name: event.target.value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="col-md-auto d-flex gap-2">
                  {breedForm.id && (
                    <button
                      type="button"
                      className="btn btn-light border"
                      onClick={() =>
                        setBreedForm({
                          id: "",
                          speciesId: "",
                          name: "",
                        })
                      }
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={submitting}
                  >
                    {submitting && (
                      <LoaderCircle
                        size={16}
                        className="spin-icon"
                      />
                    )}

                    {breedForm.id
                      ? "Update"
                      : "Add Breed"}
                  </button>
                </div>
              </div>
            </form>

            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Breed</th>
                    <th>Species</th>
                    <th>Patients</th>
                    <th className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {allBreeds.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="text-center text-secondary py-4"
                      >
                        No breeds available.
                      </td>
                    </tr>
                  ) : (
                    allBreeds.map((item) => (
                      <tr key={item.id}>
                        <td className="fw-semibold">
                          {item.name}
                        </td>

                        <td>{item.speciesName}</td>

                        <td>
                          {item._count?.pets || 0}
                        </td>

                        <td>
                          <div className="d-flex justify-content-end gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              onClick={() =>
                                onEditBreed(item)
                              }
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={
                                deletingId === item.id
                              }
                              onClick={() =>
                                onDeleteBreed(item)
                              }
                            >
                              {deletingId ===
                              item.id ? (
                                <LoaderCircle
                                  size={15}
                                  className="spin-icon"
                                />
                              ) : (
                                <Trash2 size={15} />
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
          </>
        )}
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-light border"
          onClick={onClose}
          disabled={submitting}
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

function PatientFormModal({
  editing,
  formData,
  owners,
  species,
  breeds,
  fieldErrors,
  formError,
  submitting,
  onChange,
  onSubmit,
  onClose,
}) {
  const safeOwners = Array.isArray(owners)
    ? owners
    : [];

  const safeSpecies = Array.isArray(species)
    ? species
    : [];

  const safeBreeds = Array.isArray(breeds)
    ? breeds
    : [];

  return (
    <ModalShell
      title={
        editing
          ? "Edit Patient"
          : "Register Patient"
      }
      subtitle="Enter the pet, owner and clinical information."
      onClose={onClose}
      size="modal-xl"
    >
      <form
        onSubmit={onSubmit}
        className="d-flex flex-column h-100"
      >
        <div
          className="modal-body overflow-auto"
          style={{
            maxHeight: "calc(100vh - 220px)",
          }}
        >
          {formError && (
            <div className="alert alert-danger">
              {formError}
            </div>
          )}

          <FormSection title="Ownership and classification">
            <div className="row g-3">
              {/* SEARCHABLE OWNER PICKER */}
              <div className="col-md-6">
                <SearchableOwnerSelect
                  owners={safeOwners}
                  value={formData.ownerId}
                  onChange={onChange}
                  error={fieldErrors.ownerId}
                  required
                />
              </div>

              <FormSelect
                label="Species"
                name="speciesId"
                value={formData.speciesId}
                onChange={onChange}
                error={fieldErrors.speciesId}
                required
                col="col-md-3"
              >
                <option value="">
                  Select species
                </option>

                {safeSpecies.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </FormSelect>

              <FormSelect
                label="Breed"
                name="breedId"
                value={formData.breedId}
                onChange={onChange}
                col="col-md-3"
                disabled={!formData.speciesId}
              >
                <option value="">
                  No breed selected
                </option>

                {safeBreeds.map((breed) => (
                  <option
                    key={breed.id}
                    value={breed.id}
                  >
                    {breed.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          </FormSection>

          <FormSection title="Basic information">
            <div className="row g-3">
              <FormInput
                label="Patient name"
                name="name"
                value={formData.name}
                onChange={onChange}
                error={fieldErrors.name}
                required
                col="col-md-4"
              />

              <FormSelect
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={onChange}
                col="col-md-4"
              >
                <option value="MALE">
                  Male
                </option>

                <option value="FEMALE">
                  Female
                </option>

                <option value="UNKNOWN">
                  Unknown
                </option>
              </FormSelect>

              <FormSelect
                label="Status"
                name="status"
                value={formData.status}
                onChange={onChange}
                col="col-md-4"
              >
                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>

                <option value="DECEASED">
                  Deceased
                </option>

                <option value="MISSING">
                  Missing
                </option>
              </FormSelect>

              <FormInput
                label="Date of birth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={onChange}
                error={fieldErrors.dateOfBirth}
                col="col-md-4"
              />

              <FormInput
                label="Approximate age"
                name="approximateAge"
                value={formData.approximateAge}
                onChange={onChange}
                placeholder="For example: 2 years"
                col="col-md-4"
              />

              <FormInput
                label="Weight in kg"
                name="weightKg"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.weightKg}
                onChange={onChange}
                error={fieldErrors.weightKg}
                col="col-md-4"
              />

              <FormInput
                label="Colour"
                name="color"
                value={formData.color}
                onChange={onChange}
                col="col-md-4"
              />

              <FormInput
                label="Microchip number"
                name="microchipNumber"
                value={formData.microchipNumber}
                onChange={onChange}
                col="col-md-4"
              />

              <FormInput
                label="Blood group"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={onChange}
                col="col-md-4"
              />

              <div className="col-12">
                <div className="form-check">
                  <input
                    id="isNeutered"
                    className="form-check-input"
                    type="checkbox"
                    name="isNeutered"
                    checked={formData.isNeutered}
                    onChange={onChange}
                  />

                  <label
                    className="form-check-label"
                    htmlFor="isNeutered"
                  >
                    Patient is neutered or
                    spayed
                  </label>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Clinical and identification information">
            <div className="row g-3">
              <FormTextarea
                label="Allergies"
                name="allergies"
                value={formData.allergies}
                onChange={onChange}
                col="col-md-6"
              />

              <FormTextarea
                label="Identifying marks"
                name="identifyingMarks"
                value={formData.identifyingMarks}
                onChange={onChange}
                col="col-md-6"
              />

              <FormInput
                label="Photo URL"
                name="photoUrl"
                type="url"
                value={formData.photoUrl}
                onChange={onChange}
                col="col-12"
              />
            </div>
          </FormSection>
        </div>

        <div
          className="modal-footer bg-white border-top"
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 10,
          }}
        >
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
            {submitting ? (
              <>
                <LoaderCircle
                  size={17}
                  className="spin-icon"
                />

                Saving...
              </>
            ) : editing ? (
              <>
                <Edit3 size={17} />
                Save Changes
              </>
            ) : (
              <>
                <Plus size={17} />
                Add Patient
              </>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
function PatientDetailsModal({
  patient,
  vaccinationData,
  loading,
  onClose,
  onEdit,
}) {
  return (
    <ModalShell
      title="Patient Details"
      subtitle="Patient, owner and medical record summary."
      onClose={onClose}
      size="modal-lg"
    >
      <div className="modal-body">
        {loading || !patient ? (
          <div className="text-center py-5">
            <LoaderCircle
              size={34}
              className="spin-icon text-primary mb-3"
            />

            <div className="text-secondary">
              Loading patient details...
            </div>
          </div>
        ) : (
          <>
            <div className="d-flex align-items-center gap-3 mb-4">
              <PatientAvatar
                patient={patient}
                size={64}
              />

              <div>
                <h4 className="fw-bold mb-1">
                  {patient.name}
                </h4>

                <div className="text-secondary">
                  {patient.petCode}
                </div>

                <StatusBadge
                  status={patient.status}
                />
              </div>
            </div>

            <DetailSection title="Patient information">
              <div className="row g-3">
                <DetailItem
                  label="Species"
                  value={
                    patient.species?.name
                  }
                />

                <DetailItem
                  label="Breed"
                  value={patient.breed?.name}
                />

                <DetailItem
                  label="Gender"
                  value={formatEnum(
                    patient.gender,
                  )}
                />

                <DetailItem
                  label="Date of birth"
                  value={formatDate(
                    patient.dateOfBirth,
                  )}
                />

                <DetailItem
                  label="Approximate age"
                  value={
                    patient.approximateAge
                  }
                />

                <DetailItem
                  label="Weight"
                  value={
                    patient.weightKg !==
                      null &&
                    patient.weightKg !==
                      undefined
                      ? `${patient.weightKg} kg`
                      : null
                  }
                />

                <DetailItem
                  label="Colour"
                  value={patient.color}
                />

                <DetailItem
                  label="Microchip"
                  value={
                    patient.microchipNumber
                  }
                />

                <DetailItem
                  label="Blood group"
                  value={patient.bloodGroup}
                />

                <DetailItem
                  label="Neutered"
                  value={
                    patient.isNeutered
                      ? "Yes"
                      : "No"
                  }
                />
              </div>
            </DetailSection>

            <DetailSection title="Owner">
              <div className="row g-3">
                <DetailItem
                  label="Owner name"
                  value={getOwnerName(
                    patient.owner,
                  )}
                />

                <DetailItem
                  label="Phone"
                  value={patient.owner?.phone}
                />

                <DetailItem
                  label="Email"
                  value={patient.owner?.email}
                />

                <DetailItem
                  label="Address"
                  value={[
                    patient.owner?.address,
                    patient.owner?.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
              </div>
            </DetailSection>

            <DetailSection title="Clinical information">
              <div className="row g-3">
                <DetailItem
                  label="Allergies"
                  value={patient.allergies}
                  col="col-md-6"
                />

                <DetailItem
                  label="Identifying marks"
                  value={
                    patient.identifyingMarks
                  }
                  col="col-md-6"
                />
              </div>
            </DetailSection>

            <DetailSection title="Vaccination summary">
              <div className="row g-3">
                <DetailItem
                  label="Total vaccinations"
                  value={
                    vaccinationData?.summary
                      ?.total ?? 0
                  }
                />

                <DetailItem
                  label="Administered"
                  value={
                    vaccinationData?.summary
                      ?.administered ?? 0
                  }
                />

                <DetailItem
                  label="Scheduled"
                  value={
                    vaccinationData?.summary
                      ?.scheduled ?? 0
                  }
                />

                <DetailItem
                  label="Overdue"
                  value={
                    vaccinationData?.summary
                      ?.overdue ?? 0
                  }
                />
              </div>
            </DetailSection>
          </>
        )}
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-light border"
          onClick={onClose}
        >
          Close
        </button>

        {!loading && patient && (
          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={onEdit}
          >
            <Edit3 size={17} />
            Edit Patient
          </button>
        )}
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  subtitle,
  size = "modal-lg",
  onClose,
  children,
}) {
  return (
    <>
      <div
        className="modal show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        style={{
          zIndex: 1060,
          overflowY: "auto",
        }}
      >
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`}
        >
          <div className="modal-content border-0 rounded-4 shadow">
            <div className="modal-header">
              <div>
                <h5 className="modal-title fw-bold">
                  {title}
                </h5>

                {subtitle && (
                  <small className="text-secondary">
                    {subtitle}
                  </small>
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

      <div
        className="modal-backdrop show"
        style={{
          zIndex: 1055,
        }}
      />
    </>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <small className="text-secondary">
              {title}
            </small>

            <h3 className="fw-bold mt-2 mb-0">
              {value ?? 0}
            </h3>
          </div>

          <div
            className={`rounded-3 d-flex align-items-center justify-content-center ${iconClass}`}
            style={{
              width: "48px",
              height: "48px",
            }}
          >
            <Icon size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientAvatar({
  patient,
  size = 46,
}) {
  if (patient.photoUrl) {
    return (
      <img
        src={patient.photoUrl}
        alt={patient.name}
        className="rounded-circle object-fit-cover flex-shrink-0"
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <div
      className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
      style={{
        width: size,
        height: size,
      }}
    >
      <PawPrint size={size * 0.45} />
    </div>
  );
}

function SearchableOwnerSelect({
  owners = [],
  value,
  onChange,
  error,
  required,
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedOwner = useMemo(() => {
    return owners.find((owner) => owner.id === value) || null;
  }, [owners, value]);

  const filteredOwners = useMemo(() => {
    const query = String(search || "").trim().toLowerCase();
    if (!query) return owners;

    return owners.filter((owner) => {
      const fullName = getOwnerName(owner).toLowerCase();
      const phone = String(owner?.phone || "")
        .replace(/\s+/g, "")
        .toLowerCase();
      const cleanQuery = query.replace(/\s+/g, "");

      return fullName.includes(query) || phone.includes(cleanQuery);
    });
  }, [owners, search]);

  function handleSelect(owner) {
    onChange({
      target: {
        name: "ownerId",
        value: owner.id,
      },
    });
    setSearch("");
    setIsOpen(false);
  }

  function handleClear(event) {
    event.preventDefault();
    event.stopPropagation();

    onChange({
      target: {
        name: "ownerId",
        value: "",
      },
    });
    setSearch("");
    setIsOpen(true);
  }

  return (
    <div
      className="position-relative"
      style={{ zIndex: isOpen ? 1090 : "auto" }}
    >
      <label className="form-label">
        Pet owner
        {required && <span className="text-danger ms-1">*</span>}
      </label>

      <div className={`input-group ${error ? "has-validation" : ""}`}>
        <span
          className={`input-group-text bg-white ${
            error ? "border-danger" : ""
          }`}
        >
          <Search size={17} className="text-secondary" />
        </span>

        <input
          type="search"
          className={`form-control shadow-none ${
            error ? "is-invalid" : ""
          }`}
          value={search}
          autoComplete="off"
          placeholder={
            selectedOwner
              ? `${getOwnerName(selectedOwner)} selected`
              : "Search owner by name or phone..."
          }
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setIsOpen(true);
          }}
        />

        {selectedOwner && (
          <button
            type="button"
            className="btn btn-light border"
            onClick={handleClear}
            title="Clear selected owner"
          >
            ×
          </button>
        )}

        {error && (
          <div className="invalid-feedback">
            {Array.isArray(error) ? error[0] : error}
          </div>
        )}
      </div>

      {selectedOwner && (
        <div className="mt-2">
          <div className="border rounded-3 bg-primary-subtle p-2">
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 34, height: 34 }}
              >
                <UserRound size={16} />
              </div>

              <div className="flex-grow-1 overflow-hidden">
                <div className="fw-semibold small text-truncate">
                  {getOwnerName(selectedOwner)}
                </div>

                <div className="small text-secondary text-truncate">
                  {selectedOwner.phone || "No phone"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ zIndex: 1080 }}
            onClick={() => setIsOpen(false)}
          />

          <div
            className="position-absolute start-0 end-0 mt-1 bg-white border rounded-3 shadow-lg overflow-hidden"
            style={{ zIndex: 1090 }}
          >
            <div className="px-3 py-2 bg-light border-bottom d-flex justify-content-between align-items-center">
              <small className="fw-semibold">Owners</small>

              <small className="text-secondary">
                {filteredOwners.length} found
              </small>
            </div>

            <div className="overflow-auto" style={{ maxHeight: "300px" }}>
              {filteredOwners.length === 0 ? (
                <div className="text-center py-4 px-3">
                  <Search size={28} className="text-secondary mb-2" />

                  <div className="fw-semibold small">No owner found</div>

                  <div className="small text-secondary mt-1">
                    Search using owner name or phone number.
                  </div>
                </div>
              ) : (
                filteredOwners.map((owner) => {
                  const isSelected = owner.id === value;

                  return (
                    <button
                      key={owner.id}
                      type="button"
                      className={`w-100 border-0 border-bottom text-start p-3 ${
                        isSelected ? "bg-primary-subtle" : "bg-white"
                      }`}
                      style={{ cursor: "pointer" }}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelect(owner)}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 42, height: 42 }}
                        >
                          <UserRound size={18} />
                        </div>

                        <div className="flex-grow-1 overflow-hidden">
                          <div className="fw-semibold text-truncate">
                            {getOwnerName(owner)}
                          </div>
                        </div>

                        <div
                          className="text-end flex-shrink-0"
                          style={{ maxWidth: "45%" }}
                        >
                          <div className="small fw-semibold text-truncate">
                            {owner.phone || "No phone"}
                          </div>

                          {owner.email && (
                            <small className="text-secondary text-truncate d-block">
                              {owner.email}
                            </small>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {filteredOwners.length > 0 && (
              <div className="px-3 py-2 border-top bg-light">
                <small className="text-secondary">
                  Search by owner name or phone number.
                </small>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    ACTIVE: "bg-success-subtle text-success",
    INACTIVE:
      "bg-secondary-subtle text-secondary",
    DECEASED: "bg-dark-subtle text-dark",
    MISSING: "bg-danger-subtle text-danger",
  };

  return (
    <span
      className={`badge rounded-pill ${
        classes[status] ||
        "bg-light text-dark"
      }`}
    >
      {formatEnum(status)}
    </span>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="border rounded-4 p-3 mb-3">
      <h6 className="fw-bold mb-3">
        {title}
      </h6>

      {children}
    </section>
  );
}

function DetailSection({
  title,
  children,
}) {
  return (
    <section className="border-top pt-3 mt-3">
      <h6 className="fw-bold mb-3">
        {title}
      </h6>

      {children}
    </section>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  col = "col-md-4",
  error,
  required = false,
  ...rest
}) {
  return (
    <div className={col}>
      <label
        className="form-label"
        htmlFor={name}
      >
        {label}

        {required && (
          <span className="text-danger ms-1">
            *
          </span>
        )}
      </label>

      <input
        id={name}
        className={`form-control ${
          error ? "is-invalid" : ""
        }`}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        required={required}
        {...rest}
      />

      {error && (
        <div className="invalid-feedback">
          {error}
        </div>
      )}
    </div>
  );
}

function FormSelect({
  label,
  name,
  value,
  onChange,
  col = "col-md-4",
  error,
  required = false,
  children,
  ...rest
}) {
  return (
    <div className={col}>
      <label
        className="form-label"
        htmlFor={name}
      >
        {label}

        {required && (
          <span className="text-danger ms-1">
            *
          </span>
        )}
      </label>

      <select
        id={name}
        className={`form-select ${
          error ? "is-invalid" : ""
        }`}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        {...rest}
      >
        {children}
      </select>

      {error && (
        <div className="invalid-feedback">
          {error}
        </div>
      )}
    </div>
  );
}

function FormTextarea({
  label,
  name,
  value,
  onChange,
  col = "col-md-6",
}) {
  return (
    <div className={col}>
      <label
        className="form-label"
        htmlFor={name}
      >
        {label}
      </label>

      <textarea
        id={name}
        className="form-control"
        name={name}
        value={value}
        onChange={onChange}
        rows="3"
      />
    </div>
  );
}

function DetailItem({
  label,
  value,
  col = "col-sm-6 col-lg-3",
}) {
  return (
    <div className={col}>
      <small className="text-secondary d-block mb-1">
        {label}
      </small>

      <div className="fw-medium">
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : String(value)}
      </div>
    </div>
  );
}

function Pagination({
  pagination,
  onPageChange,
}) {
  return (
    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 border-top pt-3 mt-3">
      <small className="text-secondary">
        Page {pagination.page} of{" "}
        {pagination.totalPages}
      </small>

      <div className="btn-group">
        <button
          type="button"
          className="btn btn-light border d-flex align-items-center gap-1"
          disabled={
            !pagination.hasPreviousPage
          }
          onClick={() =>
            onPageChange(
              pagination.page - 1,
            )
          }
        >
          <ChevronLeft size={17} />
          Previous
        </button>

        <button
          type="button"
          className="btn btn-light border d-flex align-items-center gap-1"
          disabled={!pagination.hasNextPage}
          onClick={() =>
            onPageChange(
              pagination.page + 1,
            )
          }
        >
          Next
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

function getOwnerName(owner) {
  if (!owner) return "No owner";

  return (
    [owner.firstName, owner.lastName]
      .filter(Boolean)
      .join(" ") || "Unnamed owner"
  );
}

function formatEnum(value) {
  if (!value) return "—";

  return String(value)
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default Patients;