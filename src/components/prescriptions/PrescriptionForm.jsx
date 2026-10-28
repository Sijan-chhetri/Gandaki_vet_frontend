import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Beaker,
  Bone,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  Image,
  LoaderCircle,
  Microscope,
  Pill,
  Plus,
  Printer,
  Save,
  ShieldPlus,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";

import appointmentService from "../../services/appointment.service";
import prescriptionService from "../../services/prescription.service";
import "./PrescriptionForm.css";

const CLINIC = {
  name: "Gandaki vet and pet",
  subtitle: "Veterinary Clinic & Pet Care Centre",
  address: "Pokhara, Kaski, Nepal",
  phone: "+977-9802859465",
  email: "pokharapethouse@example.com",
  registration: "Clinic Reg. No.: __________",
};

const TABS = [
  { id: "general", label: "General", icon: ClipboardList },
  { id: "medicines", label: "Medicines", icon: Pill },
  { id: "blood", label: "Blood Report", icon: Microscope },
  { id: "laboratory", label: "Laboratory", icon: FlaskConical },
  { id: "imaging", label: "Imaging", icon: Image },
  { id: "vaccination", label: "Vaccination", icon: ShieldPlus },
  { id: "other", label: "Other Reports", icon: FileText },
];

const emptyMedicine = {
  medicineName: "",
  strength: "",
  dosage: "",
  route: "ORAL",
  frequency: "",
  duration: "",
  quantity: "",
  instructions: "",
};

const emptyLab = {
  testName: "",
  specimen: "",
  priority: "ROUTINE",
  instructions: "",
};

const emptyImaging = {
  type: "X_RAY",
  bodyPart: "",
  views: "",
  priority: "ROUTINE",
  clinicalHistory: "",
  result: {
    status: "DRAFT",
    resultDate: "",
    performedBy: "",
    findings: "",
    impression: "",
    recommendations: "",
  },
};

const emptyVaccination = {
  vaccineName: "",
  dose: "",
  route: "SUBCUTANEOUS",
  batchNo: "",
  manufacturer: "",
  administeredDate: "",
  nextDueDate: "",
  notes: "",
};

const CBC_TEMPLATE = [
  { key: "wbc", test: "WBC", unit: "10³/µL", range: "6.0–17.0" },
  { key: "neutrophils", test: "Neutrophils", unit: "%", range: "60–77" },
  { key: "lymphocytes", test: "Lymphocytes", unit: "%", range: "12–30" },
  { key: "monocytes", test: "Monocytes", unit: "%", range: "3–10" },
  { key: "eosinophils", test: "Eosinophils", unit: "%", range: "2–10" },
  { key: "basophils", test: "Basophils", unit: "%", range: "0–1" },
  { key: "rbc", test: "RBC", unit: "10⁶/µL", range: "5.5–8.5" },
  { key: "hemoglobin", test: "Haemoglobin", unit: "g/dL", range: "12–18" },
  { key: "hematocrit", test: "Haematocrit / PCV", unit: "%", range: "37–55" },
  { key: "mcv", test: "MCV", unit: "fL", range: "60–77" },
  { key: "mch", test: "MCH", unit: "pg", range: "19.5–24.5" },
  { key: "mchc", test: "MCHC", unit: "g/dL", range: "32–36" },
  { key: "rdw", test: "RDW", unit: "%", range: "11–15.5" },
  { key: "platelets", test: "Platelets", unit: "10³/µL", range: "200–500" },
  { key: "mpv", test: "MPV", unit: "fL", range: "7–12" },
];

const CAT_CBC_TEMPLATE = [
  { key: "wbc", test: "WBC", unit: "10³/µL", range: "5.5–19.5" },
  { key: "neutrophils", test: "Neutrophils", unit: "%", range: "35–75" },
  { key: "lymphocytes", test: "Lymphocytes", unit: "%", range: "20–55" },
  { key: "monocytes", test: "Monocytes", unit: "%", range: "1–4" },
  { key: "eosinophils", test: "Eosinophils", unit: "%", range: "2–12" },
  { key: "basophils", test: "Basophils", unit: "%", range: "0–1" },
  { key: "rbc", test: "RBC", unit: "10⁶/µL", range: "5.0–10.0" },
  { key: "hemoglobin", test: "Haemoglobin", unit: "g/dL", range: "8–15" },
  { key: "hematocrit", test: "Haematocrit / PCV", unit: "%", range: "24–45" },
  { key: "mcv", test: "MCV", unit: "fL", range: "39–55" },
  { key: "mch", test: "MCH", unit: "pg", range: "13–17" },
  { key: "mchc", test: "MCHC", unit: "g/dL", range: "30–36" },
  { key: "rdw", test: "RDW", unit: "%", range: "14–18" },
  { key: "platelets", test: "Platelets", unit: "10³/µL", range: "300–800" },
  { key: "mpv", test: "MPV", unit: "fL", range: "8–14" },
];

// ─── Serum Biochemistry (Gandaki vet and pet reference) ───────────
const BIOCHEMISTRY_PANELS = [
  {
    id: "LFT",
    label: "LFT — Liver / Hepatobiliary Profile",
    parameters: [
      { key: "totalProtein", test: "Total Protein", unit: "g/dL", dog: "5.4–7.5", cat: "6.0–7.9" },
      { key: "albumin", test: "Albumin", unit: "g/dL", dog: "2.3–3.1", cat: "2.8–3.9" },
      { key: "globulin", test: "Globulin", unit: "g/dL", dog: "2.7–4.4", cat: "2.6–5.1" },
      { key: "agRatio", test: "A/G ratio", unit: "—", dog: "Calculate*", cat: "Calculate*" },
      { key: "totalBilirubin", test: "Total Bilirubin", unit: "mg/dL", dog: "0–0.3", cat: "0–0.1" },
      { key: "directBilirubin", test: "Direct Bilirubin", unit: "mg/dL", dog: "Lab-specific", cat: "Lab-specific" },
      { key: "indirectBilirubin", test: "Indirect Bilirubin", unit: "mg/dL", dog: "Lab-specific", cat: "Lab-specific" },
      { key: "alt", test: "ALT / SGPT", unit: "U/L", dog: "10–109", cat: "25–97" },
      { key: "ast", test: "AST / SGOT", unit: "U/L", dog: "13–15", cat: "7–38" },
      { key: "alp", test: "ALP / ALKP", unit: "U/L", dog: "1–114", cat: "0–45" },
      { key: "cholesterol", test: "Cholesterol", unit: "mg/dL", dog: "135–278", cat: "71–156" },
    ],
  },
  {
    id: "KFT",
    label: "KFT — Renal Function Profile",
    parameters: [
      { key: "bun", test: "Urea nitrogen (BUN)", unit: "mg/dL", dog: "8–28", cat: "19–34" },
      { key: "creatinine", test: "Creatinine", unit: "mg/dL", dog: "0.5–1.7", cat: "0.9–2.2" },
    ],
  },
  {
    id: "ELECTROLYTES",
    label: "Electrolytes & Mineral Profile",
    parameters: [
      { key: "sodium", test: "Sodium (Na)", unit: "mEq/L", dog: "142–152", cat: "146–156" },
      { key: "potassium", test: "Potassium (K)", unit: "mEq/L", dog: "3.9–5.1", cat: "3.7–6.1" },
      { key: "chloride", test: "Chloride (Cl)", unit: "mEq/L", dog: "110–124", cat: "115–130" },
      { key: "calcium", test: "Calcium", unit: "mg/dL", dog: "9.1–11.7", cat: "8.7–11.7" },
    ],
  },
  {
    id: "OTHER",
    label: "Other Biochemistry",
    parameters: [
      { key: "glucose", test: "Glucose", unit: "mg/dL", dog: "76–119", cat: "60–120" },
      { key: "creatineKinase", test: "Creatine Kinase (CK)", unit: "U/L", dog: "52–368", cat: "69–214" },
    ],
  },
];

function buildBiochemistryRows(species) {
  const sp = speciesKey(species) === "CAT" ? "cat" : "dog";
  return BIOCHEMISTRY_PANELS.flatMap((panel) =>
    panel.parameters.map((p) => ({
      key: `${panel.id}_${p.key}`,
      panel: panel.id,
      test: p.test,
      unit: p.unit,
      range: p[sp] || "",
      result: "",
      flag: "",
    }))
  );
}

const NORMAL_PHYSICAL_EXAM_TEMPLATE =
  "BAR, clinically healthy on examination, TPR WNL, MM pink/moist, CRT <2 sec, hydration adequate, cardiopulmonary auscultation unremarkable, no obvious clinical abnormalities. Fit for vaccination";

const NORMAL_PHYSICAL_EXAM_TEMPLATES = {
  DOG: NORMAL_PHYSICAL_EXAM_TEMPLATE,
  CAT: NORMAL_PHYSICAL_EXAM_TEMPLATE,
};

function speciesKey(name) {
  return String(name || "DOG").trim().toUpperCase();
}

function getCbcTemplateForSpecies(name) {
  return speciesKey(name) === "CAT" ? CAT_CBC_TEMPLATE : CBC_TEMPLATE;
}

function getNormalPhysicalTemplate(name) {
  return NORMAL_PHYSICAL_EXAM_TEMPLATES[speciesKey(name)] || NORMAL_PHYSICAL_EXAM_TEMPLATES.DOG;
}

function calculateBloodFlag(result, range) {
  if (result === null || result === undefined || String(result).trim() === "") return "";
  const value = Number(String(result).replace(/,/g, ""));
  if (!Number.isFinite(value)) return "";

  const text = String(range || "").replace(/,/g, "").trim();
  const between = text.match(/^(-?\d+(?:\.\d+)?)\s*[–—-]\s*(-?\d+(?:\.\d+)?)$/);
  if (between) {
    const low = Number(between[1]);
    const high = Number(between[2]);
    return value < low ? "LOW" : value > high ? "HIGH" : "NORMAL";
  }

  const less = text.match(/^[<≤]\s*(-?\d+(?:\.\d+)?)$/);
  if (less) return value <= Number(less[1]) ? "NORMAL" : "HIGH";

  const greater = text.match(/^[>≥]\s*(-?\d+(?:\.\d+)?)$/);
  if (greater) return value >= Number(greater[1]) ? "NORMAL" : "LOW";

  return "";
}

const createBloodReport = () => ({
  reportDate: new Date().toISOString().slice(0, 10),
  sampleId: "",
  specimen: "EDTA whole blood",
  analyser: "",
  method: "Automated haematology analyser",
  collectedAt: "",
  receivedAt: "",
  reportedAt: "",
  technicianName: "",
  pathologistName: "",
  rows: CBC_TEMPLATE.map((row) => ({ ...row, result: "", flag: "" })),
  biochemistry: {
    enabled: false,
    reportDate: "",
    sampleId: "",
    specimen: "Serum",
    analyser: "",
    rows: buildBiochemistryRows("DOG"),
  },
  smearFindings: "",
  interpretation: "",
  remarks: "",
});

const initialForm = {
  chiefComplaint: "",
  history: "",
  allergies: "",
  weightKg: "",
  temperatureF: "",
  pulseBpm: "",
  respirationRate: "",
  hydrationStatus: "",
  bodyConditionScore: "",
  physicalExamination: NORMAL_PHYSICAL_EXAM_TEMPLATE,
  physicalExamStatus: "NORMAL",
  physicalExamTemplate: NORMAL_PHYSICAL_EXAM_TEMPLATE,
  investigation: "",
  investigationOther: "",
  diagnosis: "",
  differentialDiagnosis: "",
  treatmentPlan: "",
  treatmentPlans: [],
  hospitalized: false,
  advice: "",
  followUpDate: "",
  followUpNotes: "",
  medicines: [{ ...emptyMedicine }],
  bloodReport: createBloodReport(),
  laboratoryTests: [],
  imagingRequests: [],
  vaccinations: [],
  otherReports: "",
};

function PrescriptionForm() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const wantsAutoPrint = new URLSearchParams(location.search).get("print") === "1";
  const autoPrintedRef = useRef(false);

  const [activeTab, setActiveTab] = useState("general");
  const [appointment, setAppointment] = useState(null);
  const [prescriptionId, setPrescriptionId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  //  NEW: State for appointment status
  const [appointmentStatus, setAppointmentStatus] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);

  const patientName =
    appointment?.pet?.name ||
    appointment?.walkInPetName ||
    "Patient";

  const ownerName = useMemo(
    () =>
      [
        appointment?.owner?.firstName,
        appointment?.owner?.lastName,
      ]
        .filter(Boolean)
        .join(" ") ||
      appointment?.walkInOwnerName ||
      "—",
    [appointment],
  );
  const doctorName = getUserName(appointment?.veterinarian);

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        setAppointment(null);
        setPrescriptionId(null);
        setFormData(initialForm);

        console.log("📋 Loading appointment:", appointmentId);

        const appointmentResult = await appointmentService.getAppointmentById(appointmentId);

        if (!appointmentResult?.data && !appointmentResult) {
          throw new Error("Appointment not found.");
        }

        const appointmentData = appointmentResult?.data || appointmentResult;
        setAppointment(appointmentData);
        console.log("✅ Appointment loaded:", appointmentData?.appointmentNo);

        // Try to fetch existing prescription
        try {
          console.log("🔍 Checking for existing prescription...");
          const prescriptionResult = await prescriptionService.getByAppointment(appointmentId);
          const existing = prescriptionResult?.data || prescriptionResult;

          if (existing?.id) {
            console.log("✅ Existing prescription found:", existing.id);
            setPrescriptionId(existing.id);
            setFormData((previous) => ({
              ...previous,
              ...existing,
              investigation: existing.investigation || existing.differentialDiagnosis || "",
              investigationOther: existing.investigationOther || "",
              medicines: existing.medicines?.length
                ? existing.medicines
                : [{ ...emptyMedicine }],
              temperatureF:
                existing.temperatureC !== null && existing.temperatureC !== undefined && existing.temperatureC !== ""
                  ? ((Number(existing.temperatureC) * 9) / 5 + 32).toFixed(1)
                  : "",
              physicalExamStatus: existing.physicalExamStatus || "NORMAL",
              physicalExamTemplate:
                existing.physicalExamTemplate || NORMAL_PHYSICAL_EXAM_TEMPLATE,
              physicalExamination:
                existing.physicalExamination ||
                (existing.physicalExamStatus === "ABNORMAL" ? "" : NORMAL_PHYSICAL_EXAM_TEMPLATE),
              treatmentPlans: Array.isArray(existing.treatmentPlans) && existing.treatmentPlans.length
                ? existing.treatmentPlans
                : (existing.treatmentPlan ? [{ date: new Date(existing.createdAt || Date.now()).toISOString().slice(0, 10), plan: existing.treatmentPlan }] : []),
              hospitalized: existing.hospitalized === true || existing.appointment?.status === "HOSPITALIZED",
              bloodReport: existing.bloodReport
                ? {
                  ...createBloodReport(),
                  ...existing.bloodReport,
                  rows: existing.bloodReport.rows?.length
                    ? existing.bloodReport.rows.map((row) => ({ ...row, flag: calculateBloodFlag(row.result, row.range) }))
                    : createBloodReport().rows,
                  biochemistry: {
                    ...createBloodReport().biochemistry,
                    ...(existing.bloodReport.biochemistry || {}),
                    rows: existing.bloodReport.biochemistry?.rows?.length
                      ? existing.bloodReport.biochemistry.rows.map((row) => ({
                        ...row,
                        flag: calculateBloodFlag(row.result, row.range),
                      }))
                      : buildBiochemistryRows(
                        (existing.appointment || appointmentData)?.pet?.species?.name
                      ),
                  },
                }
                : {
                  ...createBloodReport(),
                  rows: getCbcTemplateForSpecies((existing.appointment || appointmentData)?.pet?.species?.name).map((row) => ({ ...row, result: "", flag: "" })),
                },
              laboratoryTests: existing.laboratoryTests || [],
              imagingRequests: existing.imagingRequests || [],
              vaccinations: existing.vaccinations || [],
            }));
          }
        } catch (prescriptionError) {
          // ✅ 404 is expected if no prescription exists yet - this is normal!
          if (prescriptionError?.status === 404 || prescriptionError?.response?.status === 404) {
            console.log(" No existing prescription found - opening new form");
            setPrescriptionId(null);
          } else {
            console.warn(" Could not load existing prescription:", prescriptionError?.message);
            if (wantsAutoPrint) {
              setError(prescriptionError?.message || "Unable to load the saved prescription for printing.");
            }
          }
        }
      } catch (requestError) {
        console.error(" Error loading page:", requestError);
        setError(requestError?.message || "Unable to load appointment details.");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [appointmentId]);

  // Reset the one-time print flag if the user opens a different appointment
  // or navigates from editing to the print URL.
  useEffect(() => {
    autoPrintedRef.current = false;
  }, [appointmentId, location.search]);

  // The appointment and prescription come from the API, not navigation state.
  // Never auto-print a draft or a prescription for a non-completed appointment.
  useEffect(() => {
    if (!wantsAutoPrint || loading || autoPrintedRef.current) return;

    if (!appointment || appointment.status !== "COMPLETED") {
      setError("Only completed appointments can have their prescriptions printed.");
      return;
    }

    if (!prescriptionId) {
      setError("No saved prescription was found. Save a prescription before printing.");
      return;
    }

    // Wait for React to paint PrintablePrescription with the fetched record.
    const timer = window.setTimeout(() => {
      autoPrintedRef.current = true;
      window.print();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [wantsAutoPrint, loading, appointment, prescriptionId]);

  useEffect(() => {
    const species = appointment?.pet?.species?.name;
    if (!species) return;
    setFormData((previous) => ({
      ...previous,
      physicalExamTemplate: previous.physicalExamTemplate || getNormalPhysicalTemplate(species),
      bloodReport: previous.bloodReport?.rows?.length
        ? {
          ...previous.bloodReport,
          rows: previous.bloodReport.rows.map((row, index) => {
            const template = getCbcTemplateForSpecies(species)[index] || row;
            return { ...row, unit: row.unit || template.unit, range: row.range || template.range };
          }),
          biochemistry: previous.bloodReport?.biochemistry?.enabled
            ? {
              ...previous.bloodReport.biochemistry,
              rows: previous.bloodReport.biochemistry.rows.map((row) => {
                const panel = BIOCHEMISTRY_PANELS.find((p) => p.id === row.panel);
                const param = panel?.parameters.find((p) => row.key === `${panel.id}_${p.key}`);
                if (!param) return row;
                const range = speciesKey(species) === "CAT" ? param.cat : param.dog;
                return { ...row, range, flag: calculateBloodFlag(row.result, range) };
              }),
            }
            : previous.bloodReport?.biochemistry,
        }
        : {
          ...createBloodReport(),
          rows: getCbcTemplateForSpecies(species).map((row) => ({ ...row, result: "", flag: "" })),
        },
    }));
  }, [appointment?.pet?.species?.name]);


  function handleSaveClick() {
    if (!validate()) return;

    // Hospitalized checkbox has priority
    if (formData.hospitalized) {
      savePrescription("HOSPITALIZED");
      return;
    }

    // Otherwise ask what status this appointment should have
    setAppointmentStatus("");
    setShowStatusModal(true);
  }

  function updateField(event) {
    const { name, value } = event.target;

    if (name === "physicalExamStatus") {
      setFormData((previous) => ({
        ...previous,
        physicalExamStatus: value,
        physicalExamination:
          value === "NORMAL" ? NORMAL_PHYSICAL_EXAM_TEMPLATE : "",
        physicalExamTemplate:
          value === "NORMAL" ? NORMAL_PHYSICAL_EXAM_TEMPLATE : "",
      }));
      setSuccess("");
      return;
    }

    setFormData((previous) => ({ ...previous, [name]: value }));
    setSuccess("");
  }

  function updateArrayItem(key, index, field, value) {
    setFormData((previous) => ({
      ...previous,
      [key]: previous[key].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    setSuccess("");
  }

  function addArrayItem(key, template) {
    setFormData((previous) => ({
      ...previous,
      [key]: [...previous[key], { ...template }],
    }));
  }

  function removeArrayItem(key, index) {
    setFormData((previous) => ({
      ...previous,
      [key]: previous[key].filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateBloodMeta(field, value) {
    setFormData((previous) => ({
      ...previous,
      bloodReport: { ...previous.bloodReport, [field]: value },
    }));
  }

  function updateBloodRow(index, field, value) {
    setFormData((previous) => ({
      ...previous,
      bloodReport: {
        ...previous.bloodReport,
        rows: previous.bloodReport.rows.map((row, rowIndex) => {
          if (rowIndex !== index) return row;
          const next = { ...row, [field]: value };
          if (field === "result" || field === "range") {
            next.flag = calculateBloodFlag(next.result, next.range);
          }
          return next;
        }),
      },
    }));
  }

  // ── NEW: Biochemistry handlers ─────────────────────────────
  function updateBiochemMeta(field, value) {
    setFormData((previous) => ({
      ...previous,
      bloodReport: {
        ...previous.bloodReport,
        biochemistry: {
          ...previous.bloodReport.biochemistry,
          [field]: value,
        },
      },
    }));
  }

  function toggleBiochemistry(enabled) {
    setFormData((previous) => {
      const species = appointment?.pet?.species?.name || "DOG";
      const existing = previous.bloodReport.biochemistry;
      const rows = existing.rows?.length
        ? existing.rows
        : buildBiochemistryRows(species);

      return {
        ...previous,
        bloodReport: {
          ...previous.bloodReport,
          biochemistry: { ...existing, enabled, rows },
        },
      };
    });
  }

  function updateBiochemRow(index, field, value) {
    setFormData((previous) => ({
      ...previous,
      bloodReport: {
        ...previous.bloodReport,
        biochemistry: {
          ...previous.bloodReport.biochemistry,
          rows: previous.bloodReport.biochemistry.rows.map((row, i) => {
            if (i !== index) return row;
            const next = { ...row, [field]: value };
            if (field === "result" || field === "range") {
              next.flag = calculateBloodFlag(next.result, next.range);
            }
            return next;
          }),
        },
      },
    }));
  }

  function addTreatmentPlan() {
    const date = new Date().toISOString().slice(0, 10);
    setFormData((previous) => ({
      ...previous,
      treatmentPlans: [...(previous.treatmentPlans || []), { date, plan: "" }],
    }));
  }

  function updateTreatmentPlan(index, field, value) {
    setFormData((previous) => {
      const treatmentPlans = (previous.treatmentPlans || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      );
      const latest = treatmentPlans[treatmentPlans.length - 1];
      return { ...previous, treatmentPlans, treatmentPlan: latest?.plan || "" };
    });
  }

  function removeTreatmentPlan(index) {
    setFormData((previous) => {
      const treatmentPlans = (previous.treatmentPlans || []).filter((_, itemIndex) => itemIndex !== index);
      const latest = treatmentPlans[treatmentPlans.length - 1];
      return { ...previous, treatmentPlans, treatmentPlan: latest?.plan || "" };
    });
  }

  function fail(tab, message) {
    setActiveTab(tab);
    setError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return false;
  }

  function validate() {
    if (!formData.diagnosis.trim()) {
      return fail(
        "general",
        "Diagnosis is required before saving the prescription.",
      );
    }

    const incompleteMedicine = formData.medicines.some((item) => {
      const hasAnyMedicineValue = [
        item.medicineName,
        item.strength,
        item.dosage,
        item.frequency,
        item.duration,
        item.quantity,
        item.instructions,
      ].some((value) => String(value ?? "").trim());

      return (
        hasAnyMedicineValue &&
        (!String(item.medicineName ?? "").trim() ||
          !String(item.dosage ?? "").trim() ||
          !String(item.frequency ?? "").trim())
      );
    });

    if (incompleteMedicine) {
      return fail(
        "medicines",
        "For each entered medicine, medicine name, dose and frequency are required.",
      );
    }

    setError("");
    return true;
  }

  async function savePrescription(statusOverride = null) {
    if (!validate()) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      //  Get the selected status from the dropdown
      const selectedStatus =
        statusOverride ||
        (formData.hospitalized
          ? "HOSPITALIZED"
          : appointmentStatus || null);

      console.log(" Saving prescription for appointment:", appointmentId);
      console.log(" Form data:", formData);
      console.log("Selected status:", selectedStatus);

      const payload = {
        appointmentId,
        petId: appointment?.petId || appointment?.pet?.id,
        ownerId: appointment?.ownerId || appointment?.owner?.id,
        veterinarianId: appointment?.veterinarianId || appointment?.veterinarian?.id,
        ...formData,
        investigation:
          formData.investigation === "OTHER"
            ? formData.investigationOther
            : formData.investigation,
        differentialDiagnosis:
          formData.investigation === "OTHER"
            ? formData.investigationOther
            : formData.investigation,
        weightKg: formData.weightKg ? Number(formData.weightKg) : null,
        temperatureC: formData.temperatureF
          ? ((Number(formData.temperatureF) - 32) * 5) / 9
          : null,
        hospitalized: Boolean(formData.hospitalized),
        treatmentPlans: formData.treatmentPlans || [],
        physicalExamStatus: formData.physicalExamStatus,
        physicalExamTemplate: formData.physicalExamTemplate,
        pulseBpm: formData.pulseBpm ? Number(formData.pulseBpm) : null,
        respirationRate: formData.respirationRate
          ? Number(formData.respirationRate)
          : null,
        bodyConditionScore: formData.bodyConditionScore
          ? Number(formData.bodyConditionScore)
          : null,
        medicines: formData.medicines.filter((item) =>
          String(item.medicineName || "").trim(),
        ),
        laboratoryTests: formData.laboratoryTests.filter((item) =>
          String(item.testName || "").trim(),
        ),
        imagingRequests: formData.imagingRequests.filter(
          (item) =>
            String(item.bodyPart || "").trim() ||
            String(item.clinicalHistory || "").trim(),
        ),
        vaccinations: formData.vaccinations.filter((item) =>
          String(item.vaccineName || "").trim(),
        ),
        //  NEW: Include the selected status in the payload
        appointmentStatus: selectedStatus,
      };

      console.log("📤 Sending payload:", payload);

      const result = prescriptionId
        ? await prescriptionService.update(prescriptionId, payload)
        : await prescriptionService.create(payload);

      const saved = result?.data || result;

      setPrescriptionId(saved?.id || prescriptionId);

      /*
      |--------------------------------------------------------------------------
      | Update appointment status
      |--------------------------------------------------------------------------
      */

      if (selectedStatus) {
        console.log(
          "Updating appointment status:",
          appointmentId,
          selectedStatus
        );

        await appointmentService.updateAppointmentStatus(
          appointmentId,
          selectedStatus
        );

        // Update the status shown on the page immediately
        setAppointment((previous) => ({
          ...previous,
          status: selectedStatus,
        }));

        setAppointmentStatus("");
      }

      /*
      |--------------------------------------------------------------------------
      | Success
      |--------------------------------------------------------------------------
      */

      setSuccess(
        selectedStatus === "HOSPITALIZED"
          ? "Prescription saved and patient hospitalized successfully."
          : "Prescription and clinical record saved successfully."
      );
      // If we just created a new prescription, refresh the page data
      if (!prescriptionId && saved?.id) {
        console.log(" Refreshing data with new prescription ID:", saved.id);
      }

    } catch (requestError) {
      console.error("❌ Save prescription error:", requestError);
      console.error("❌ Full error details:", {
        message: requestError?.message,
        details: requestError?.response?.details || requestError?.details,
        status: requestError?.status,
      });

      const errorMessage =
        requestError?.response?.message ||
        requestError?.message ||
        "Unable to save prescription.";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    if (appointment?.status !== "COMPLETED") {
      setError("Complete the appointment before printing the prescription.");
      return;
    }
    if (!prescriptionId) {
      setError("Save the prescription before printing it.");
      return;
    }
    setError("");
    setTimeout(() => window.print(), 50);
  }

  if (loading) {
    return (
      <div className="prescription-loading">
        <LoaderCircle className="prescription-spin text-primary" size={38} />
        <p>Loading prescription...</p>
      </div>
    );
  }

  return (
    <div className="prescription-page">
      <header className="prescription-header screen-only">
        <div className="d-flex align-items-center gap-3">
          <button type="button" className="btn btn-light border prescription-back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h3 className="fw-bold mb-0">Advanced Veterinary Prescription</h3>
              {prescriptionId && <span className="badge rounded-pill bg-success-subtle text-success">Existing record</span>}
            </div>
            <p className="text-secondary mb-0 small">{patientName} · {ownerName} · {appointment?.appointmentNo || "—"}</p>
          </div>
        </div>
        <div className="d-flex gap-2 prescription-header-actions">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={handlePrint}
            disabled={appointment?.status !== "COMPLETED" || !prescriptionId}
            title={appointment?.status !== "COMPLETED"
              ? "Available after completing the appointment"
              : !prescriptionId
                ? "Save a prescription first"
                : "Print or save prescription as PDF"}
          >
            <Printer size={17} /> Print / PDF
          </button>
          <button type="button" className="btn btn-primary d-flex align-items-center gap-2" onClick={handleSaveClick} disabled={saving}>
            {saving ? <LoaderCircle size={17} className="prescription-spin" /> : <Save size={17} />}
            Save Prescription
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger d-flex align-items-center gap-2 screen-only"><AlertCircle size={18} />{error}</div>}
      {success && <div className="alert alert-success d-flex align-items-center gap-2 screen-only"><CheckCircle2 size={18} />{success}</div>}

      <section className="prescription-patient-card screen-only">
        <Info
          label="Patient"
          value={
            appointment?.pet?.name ||
            appointment?.walkInPetName ||
            "—"
          }
        />

        <Info
          label="Species"
          value={
            appointment?.pet?.species?.name ||
            appointment?.walkInPetSpecies ||
            "—"
          }
        />

        <Info
          label="Breed"
          value={
            appointment?.pet?.breed?.name ||
            appointment?.pet?.breed ||
            appointment?.walkInPetBreed ||
            "—"
          }
        />

        <Info
          label="Sex"
          value={
            appointment?.pet?.gender ||
            appointment?.pet?.sex ||
            appointment?.walkInPetGender ||
            "—"
          }
        />

        <Info
          label="Owner"
          value={
            ownerName
          }
        />

        <Info
          label="Phone"
          value={
            appointment?.owner?.phone ||
            appointment?.walkInOwnerPhone ||
            "—"
          }
        />

        <Info
          label="Visit"
          value={formatDate(appointment?.scheduledAt)}
        />
        <Info label="Veterinarian" value={doctorName} />
      </section>

      <div className="prescription-workspace screen-only">
        <nav className="prescription-tabs" aria-label="Prescription sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`prescription-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>

        <main className="prescription-panel">
          {activeTab === "general" && (
            <GeneralTab
              formData={formData}
              appointment={appointment}
              onChange={updateField}
              onTreatmentAdd={addTreatmentPlan}
              onTreatmentChange={updateTreatmentPlan}
              onTreatmentRemove={removeTreatmentPlan}
              appointmentStatus={appointmentStatus}
              setAppointmentStatus={setAppointmentStatus}
            />
          )}
          {activeTab === "medicines" && (
            <RepeatableSection title="Medicines" description="Add medicines when prescribed. Medicine name, dose and frequency are required only for entered medicines." icon={Pill} items={formData.medicines} template={emptyMedicine} collectionKey="medicines" onAdd={addArrayItem} onRemove={removeArrayItem} renderItem={(item, index) => <MedicineFields item={item} index={index} onChange={updateArrayItem} />} />
          )}
          {activeTab === "blood" && (
            <BloodReportTab
              report={formData.bloodReport}
              onMetaChange={updateBloodMeta}
              onRowChange={updateBloodRow}
              onBiochemMetaChange={updateBiochemMeta}
              onBiochemRowChange={updateBiochemRow}
              onToggleBiochem={toggleBiochemistry}
            />
          )}
          {activeTab === "laboratory" && (
            <RepeatableSection title="Laboratory Requests" description="Add requested investigations when applicable." icon={FlaskConical} items={formData.laboratoryTests} template={emptyLab} collectionKey="laboratoryTests" onAdd={addArrayItem} onRemove={removeArrayItem} emptyLabel="No additional laboratory tests added." renderItem={(item, index) => <LabFields item={item} index={index} onChange={updateArrayItem} />} />
          )}
          {activeTab === "imaging" && (
            <ImagingTab
              items={formData.imagingRequests}
              onAdd={addArrayItem}
              onRemove={removeArrayItem}
              onChange={updateArrayItem}
            />
          )}
          {activeTab === "vaccination" && (
            <RepeatableSection title="Vaccinations" description="Record administered or planned vaccines." icon={ShieldPlus} items={formData.vaccinations} template={emptyVaccination} collectionKey="vaccinations" onAdd={addArrayItem} onRemove={removeArrayItem} emptyLabel="No vaccination added." renderItem={(item, index) => <VaccinationFields item={item} index={index} onChange={updateArrayItem} />} />
          )}
          {activeTab === "other" && (
            <SectionCard title="Other Reports and Instructions" description="Add referral notes, certificates or additional instructions when applicable." icon={FileText}>
              <textarea className="form-control" rows="14" name="otherReports" value={formData.otherReports} onChange={updateField} placeholder="Referral notes, specialised reports, certificates or additional instructions..." />
            </SectionCard>
          )}
        </main>
      </div>

      <PrintablePrescription clinic={CLINIC} appointment={appointment} formData={formData} patientName={patientName} ownerName={ownerName} doctorName={doctorName} prescriptionId={prescriptionId} />

      {showStatusModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content border-0"
              style={{
                borderRadius: "18px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div className="modal-header border-0 px-4 pt-4 pb-2">
                <div>
                  <h5 className="modal-title fw-bold mb-1">
                    Save Prescription
                  </h5>

                  <p className="text-secondary small mb-0">
                    Choose the patient's current appointment status.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStatusModal(false)}
                  disabled={saving}
                />
              </div>

              {/* Body */}
              <div className="modal-body px-4 py-4">
                <div className="d-grid gap-2">

                  {/* Checked In */}
                  <button
                    type="button"
                    className="btn text-start border bg-white p-3"
                    disabled={saving}
                    style={{
                      borderRadius: "12px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow =
                        "0 5px 15px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onClick={async () => {
                      setShowStatusModal(false);
                      await savePrescription("CHECKED_IN");
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold mb-1">
                          Checked In
                        </div>

                        <small className="text-secondary">
                          Patient has arrived and is ready for consultation.
                        </small>
                      </div>

                      <span
                        className="d-flex align-items-center justify-content-center ms-3"
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          backgroundColor: "#f1f5f9",
                          fontSize: "18px",
                        }}
                      >
                        ›
                      </span>
                    </div>
                  </button>

                  {/* In Progress */}
                  <button
                    type="button"
                    className="btn text-start border bg-white p-3"
                    disabled={saving}
                    style={{
                      borderRadius: "12px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow =
                        "0 5px 15px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onClick={async () => {
                      setShowStatusModal(false);
                      await savePrescription("IN_PROGRESS");
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold mb-1">
                          In Progress
                        </div>

                        <small className="text-secondary">
                          Consultation or treatment is currently ongoing.
                        </small>
                      </div>

                      <span
                        className="d-flex align-items-center justify-content-center ms-3"
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          backgroundColor: "#f1f5f9",
                          fontSize: "18px",
                        }}
                      >
                        ›
                      </span>
                    </div>
                  </button>

                  {/* Completed */}
                  <button
                    type="button"
                    className="btn text-start border bg-white p-3"
                    disabled={saving}
                    style={{
                      borderRadius: "12px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow =
                        "0 5px 15px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onClick={async () => {
                      setShowStatusModal(false);
                      await savePrescription("COMPLETED");
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold mb-1">
                          Completed
                        </div>

                        <small className="text-secondary">
                          Consultation is finished and the patient can leave.
                        </small>
                      </div>

                      <span
                        className="d-flex align-items-center justify-content-center ms-3"
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          backgroundColor: "#f1f5f9",
                          fontSize: "18px",
                        }}
                      >
                        ›
                      </span>
                    </div>
                  </button>

                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer border-0 px-4 pt-0 pb-4">
                <button
                  type="button"
                  className="btn btn-light border px-4"
                  style={{ borderRadius: "10px" }}
                  onClick={() => setShowStatusModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

//  UPDATED: GeneralTab with Status Management Dropdown
function GeneralTab({ formData, appointment, onChange, onTreatmentAdd, onTreatmentChange, onTreatmentRemove, appointmentStatus, setAppointmentStatus }) {
  // Get available status transitions based on current status
  const getAvailableStatuses = (currentStatus) => {
    const transitions = {
      SCHEDULED: [
        { value: "CONFIRMED", label: "Confirm Appointment" },
        { value: "CANCELLED", label: " Cancel Appointment" },
        { value: "NO_SHOW", label: "Mark as No Show" }
      ],
      CONFIRMED: [
        { value: "CHECKED_IN", label: " Check In Patient" },
        { value: "CANCELLED", label: " Cancel Appointment" },
        { value: "NO_SHOW", label: "Mark as No Show" }
      ],
      CHECKED_IN: [
        { value: "IN_PROGRESS", label: " Start Visit" },
        { value: "CANCELLED", label: " Cancel Appointment" }
      ],
      IN_PROGRESS: [
        { value: "COMPLETED", label: " Complete Appointment" },
        { value: "HOSPITALIZED", label: " Hospitalize Patient" }
      ],
      HOSPITALIZED: [
        { value: "DISCHARGED", label: " Discharge Patient" }
      ],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
      DISCHARGED: [],
    };
    return transitions[currentStatus] || [];
  };

  const availableStatuses = getAvailableStatuses(appointment?.status);
  const currentStatus = appointment?.status || "SCHEDULED";

  return (
    <div className="d-grid gap-4">
      <SectionCard title="Clinical History" icon={Stethoscope}>
        <div className="row g-3">
          <Field label="Chief complaint" name="chiefComplaint" value={formData.chiefComplaint} onChange={onChange} col="col-md-6" textarea />
          <Field label="History of present illness" name="history" value={formData.history} onChange={onChange} col="col-md-6" textarea />
          <Field label="Known allergies" name="allergies" value={formData.allergies} onChange={onChange} col="col-12" placeholder="Enter None when no known allergy" />
        </div>
      </SectionCard>
      <SectionCard title="Vitals and Examination" icon={HeartPulse}>
        <div className="row g-3">
          <Field label="Weight (kg)" name="weightKg" type="number" min="0" step="0.01" value={formData.weightKg} onChange={onChange} col="col-6 col-lg-2" />
          <Field label="Temperature (°F)" name="temperatureF" type="number" min="80" max="120" step="0.1" value={formData.temperatureF} onChange={onChange} col="col-6 col-lg-2" />
          <Field label="Pulse (bpm)" name="pulseBpm" type="number" min="0" value={formData.pulseBpm} onChange={onChange} col="col-6 col-lg-2" />
          <Field label="Respiration/min" name="respirationRate" type="number" min="0" value={formData.respirationRate} onChange={onChange} col="col-6 col-lg-2" />
          <Field label="Hydration" name="hydrationStatus" value={formData.hydrationStatus} onChange={onChange} col="col-6 col-lg-2" placeholder="Normal / 5%..." />
          <Field label="BCS (1–9)" name="bodyConditionScore" type="number" min="1" max="9" value={formData.bodyConditionScore} onChange={onChange} col="col-6 col-lg-2" />
          <div className="col-12">
            <label className="form-label fw-semibold small mb-2">Physical examination</label>
            <div className="d-flex gap-3 mb-2">
              <label className="form-check-label">
                <input
                  className="form-check-input me-1"
                  type="radio"
                  name="physicalExamStatus"
                  value="NORMAL"
                  checked={formData.physicalExamStatus === "NORMAL"}
                  onChange={onChange}
                />
                Normal
              </label>
              <label className="form-check-label">
                <input
                  className="form-check-input me-1"
                  type="radio"
                  name="physicalExamStatus"
                  value="ABNORMAL"
                  checked={formData.physicalExamStatus === "ABNORMAL"}
                  onChange={onChange}
                />
                Abnormal
              </label>
            </div>
            <textarea
              className="form-control"
              rows="4"
              name="physicalExamination"
              value={formData.physicalExamination}
              onChange={onChange}
              placeholder={
                formData.physicalExamStatus === "NORMAL"
                  ? "Normal examination template will appear here..."
                  : "Enter abnormal physical examination findings..."
              }
            />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Assessment and Plan" icon={Beaker}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold small">Investigation</label>
            <select
              className="form-select"
              name="investigation"
              value={formData.investigation}
              onChange={onChange}
            >
              <option value="">Choose an investigation</option>
              <option value="CBC">CBC / Complete Blood Count</option>
              <option value="BLOOD_CHEMISTRY">Blood Chemistry</option>
              <option value="URINALYSIS">Urinalysis</option>
              <option value="FECAL_EXAMINATION">Fecal Examination</option>
              <option value="SKIN_SCRAPING">Skin Scraping</option>
              <option value="CYTOLOGY">Cytology</option>
              <option value="BIOPSY">Biopsy</option>
              <option value="X_RAY">X-Ray</option>
              <option value="ULTRASOUND">Ultrasound</option>
              <option value="CT_SCAN">CT Scan</option>
              <option value="MRI">MRI</option>
              <option value="ENDOSCOPY">Endoscopy</option>
              <option value="ECG">ECG</option>
              <option value="OTHER">Other</option>
            </select>
            {formData.investigation === "OTHER" && (
              <input
                className="form-control mt-2"
                name="investigationOther"
                value={formData.investigationOther}
                onChange={onChange}
                placeholder="Enter investigation name"
              />
            )}
          </div>
          <Field required label="Diagnosis" name="diagnosis" value={formData.diagnosis} onChange={onChange} col="col-md-6" textarea />

          {/* Treatment Plan - Always visible, but Add Plan button only for hospitalized */}
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="form-label fw-semibold small mb-0">Treatment Plan</label>
              {formData.hospitalized && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                  onClick={onTreatmentAdd}
                >
                  <Plus size={15} /> Add Plan
                </button>
              )}
            </div>

            {formData.hospitalized && (formData.treatmentPlans || []).length > 0 ? (
              (formData.treatmentPlans || []).map((item, index) => (
                <div className="border rounded p-2 mb-2" key={`treatment-${index}`}>
                  <div className="d-flex gap-2 mb-2">
                    <input
                      className="form-control form-control-sm"
                      type="date"
                      value={item.date || ""}
                      onChange={(e) => onTreatmentChange(index, "date", e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onTreatmentRemove(index)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={item.plan || ""}
                    onChange={(e) => onTreatmentChange(index, "plan", e.target.value)}
                    placeholder="Treatment for this date..."
                  />
                </div>
              ))
            ) : formData.hospitalized ? (
              <div className="text-center text-secondary py-3 border rounded">
                <small>No treatment plans added. Click "Add Plan" to create one.</small>
              </div>
            ) : (
              <textarea
                className="form-control"
                rows="4"
                name="treatmentPlan"
                value={formData.treatmentPlan}
                onChange={onChange}
                placeholder="Enter treatment plan for this patient..."
              />
            )}
          </div>

          {/*  NEW: Appointment Status Management */}
          <div className="col-12">
            <label className="form-label fw-semibold small">Appointment Status</label>
            <div className="border rounded p-3">
              <div className="row g-3 align-items-center">
                <div className="col-md-6">
                  <div className="d-flex align-items-center gap-3">
                    <span className="text-muted">Current:</span>
                    <span className={`badge bg-${getStatusColor(currentStatus)} fs-6 px-3 py-2`}>
                      {formatStatus(currentStatus)}
                    </span>
                  </div>
                </div>
                <div className="col-md-6">
                  {availableStatuses.length > 0 ? (
                    <div className="d-flex flex-column gap-2">
                      <label className="form-label small mb-0">Update Status (optional)</label>
                      <select
                        className="form-select"
                        value={appointmentStatus}
                        onChange={(e) => setAppointmentStatus(e.target.value)}
                      >
                        <option value="">Keep current status</option>
                        {availableStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <small className="text-muted">Select a status to update when saving</small>
                    </div>
                  ) : (
                    <div className="text-muted text-center py-2">
                      <small>No status changes available - this is a final state</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Patient care status - Full width to prevent overlapping */}
          <div className="col-12">
            <label className="form-label fw-semibold small">Patient care status</label>
            <div className="border rounded p-3">
              <label className="form-check d-flex align-items-center gap-2 mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="hospitalized"
                  checked={Boolean(formData.hospitalized)}
                  onChange={(e) => onChange({ target: { name: "hospitalized", value: e.target.checked } })}
                />
                <span className="fw-semibold">Hospitalized patient</span>
              </label>
              <small className="text-secondary d-block mt-2">When enabled, saving keeps the appointment in Hospitalized status and allows date-wise treatment plans.</small>
            </div>
          </div>

          {/* Advice and Follow-up in separate row */}
          <div className="col-12">
            <div className="row g-3">
              <Field label="Advice / home care" name="advice" value={formData.advice} onChange={onChange} col="col-md-6" textarea />
              <Field label="Follow-up date" name="followUpDate" type="date" value={formData.followUpDate} onChange={onChange} col="col-md-3" />
              <Field label="Follow-up notes" name="followUpNotes" value={formData.followUpNotes} onChange={onChange} col="col-md-3" />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

//  Helper functions for status display
function getStatusColor(status) {
  const colors = {
    SCHEDULED: 'secondary',
    CONFIRMED: 'info',
    CHECKED_IN: 'warning',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    HOSPITALIZED: 'danger',
    DISCHARGED: 'success',
    CANCELLED: 'dark',
    NO_SHOW: 'secondary',
  };
  return colors[status] || 'secondary';
}

function formatStatus(status) {
  const labels = {
    SCHEDULED: 'Scheduled',
    CONFIRMED: 'Confirmed',
    CHECKED_IN: 'Checked In',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    HOSPITALIZED: 'Hospitalized',
    DISCHARGED: 'Discharged',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
  };
  return labels[status] || status;
}

//  UPDATED: BloodReportTab now includes Serum Biochemistry
function BloodReportTab({ report, onMetaChange, onRowChange, onBiochemMetaChange, onBiochemRowChange, onToggleBiochem }) {
  const biochem = report.biochemistry || { enabled: false, rows: [] };

  return (
    <div className="d-grid gap-4">
      <SectionCard title="CBC Sample and Report Details" description="Optional manual CBC report. Reference ranges can be edited according to species, analyser and laboratory SOP." icon={Microscope}>
        <div className="row g-3">
          <MiniField label="Report date" type="date" value={report.reportDate} onChange={(v) => onMetaChange("reportDate", v)} col="col-md-3" />
          <MiniField label="Sample ID" value={report.sampleId} onChange={(v) => onMetaChange("sampleId", v)} col="col-md-3" />
          <MiniField label="Specimen" value={report.specimen} onChange={(v) => onMetaChange("specimen", v)} col="col-md-3" />
          <MiniField label="Analyser" value={report.analyser} onChange={(v) => onMetaChange("analyser", v)} col="col-md-3" placeholder="e.g. ERBA Elite 580" />
          <MiniField label="Method" value={report.method} onChange={(v) => onMetaChange("method", v)} col="col-md-4" />
          <MiniField label="Collected at" type="datetime-local" value={report.collectedAt} onChange={(v) => onMetaChange("collectedAt", v)} col="col-md-4" />
          <MiniField label="Received at" type="datetime-local" value={report.receivedAt} onChange={(v) => onMetaChange("receivedAt", v)} col="col-md-4" />
          <MiniField label="Reported at" type="datetime-local" value={report.reportedAt} onChange={(v) => onMetaChange("reportedAt", v)} col="col-md-4" />
          <MiniField label="Technician" value={report.technicianName} onChange={(v) => onMetaChange("technicianName", v)} col="col-md-4" />
          <MiniField label="Authorised by" value={report.pathologistName} onChange={(v) => onMetaChange("pathologistName", v)} col="col-md-4" />
        </div>
      </SectionCard>

      <SectionCard title="Complete Blood Count" description="Enter only the parameters that were tested. Unused rows may remain blank." icon={FlaskConical}>
        <div className="table-responsive blood-report-table-wrap">
          <table className="table align-middle blood-report-table">
            <thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference range</th><th>Flag</th></tr></thead>
            <tbody>
              {report.rows.map((row, index) => (
                <tr key={row.key}>
                  <td><input className="form-control form-control-sm" value={row.test} onChange={(e) => onRowChange(index, "test", e.target.value)} /></td>
                  <td><input className="form-control form-control-sm" value={row.result} onChange={(e) => onRowChange(index, "result", e.target.value)} /></td>
                  <td><input className="form-control form-control-sm" value={row.unit} onChange={(e) => onRowChange(index, "unit", e.target.value)} /></td>
                  <td><input className="form-control form-control-sm" value={row.range} onChange={(e) => onRowChange(index, "range", e.target.value)} /></td>
                  <td><span className={`badge blood-flag-${String(row.flag || "NORMAL").toLowerCase()}`}>{row.flag ? formatEnum(row.flag) : "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/*  NEW: Serum Biochemistry section */}
      <SectionCard
        title="Serum Biochemistry"
        description="LFT, KFT, electrolytes and other biochemistry. Reference intervals vary with analyser and laboratory — verify against your SOP."
        icon={Beaker}
      >
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="biochem-enabled"
            checked={biochem.enabled}
            onChange={(e) => onToggleBiochem(e.target.checked)}
          />
          <label className="form-check-label fw-semibold" htmlFor="biochem-enabled">
            Include serum biochemistry in this report
          </label>
        </div>

        {biochem.enabled && (
          <>
            <div className="row g-3 mb-3">
              <MiniField label="Report date" type="date" value={biochem.reportDate || ""} onChange={(v) => onBiochemMetaChange("reportDate", v)} col="col-md-3" />
              <MiniField label="Sample ID" value={biochem.sampleId || ""} onChange={(v) => onBiochemMetaChange("sampleId", v)} col="col-md-3" />
              <MiniField label="Specimen" value={biochem.specimen || ""} onChange={(v) => onBiochemMetaChange("specimen", v)} col="col-md-3" placeholder="Serum / Plasma" />
              <MiniField label="Analyser" value={biochem.analyser || ""} onChange={(v) => onBiochemMetaChange("analyser", v)} col="col-md-3" placeholder="e.g. ERBA XL-640" />
            </div>

            {BIOCHEMISTRY_PANELS.map((panel) => {
              const panelRows = (biochem.rows || [])
                .map((row, index) => ({ ...row, index }))
                .filter((row) => row.panel === panel.id);

              if (!panelRows.length) return null;

              return (
                <div key={panel.id} className="biochem-panel mb-4">
                  <h6 className="biochem-panel-heading">{panel.label}</h6>
                  <div className="table-responsive blood-report-table-wrap">
                    <table className="table align-middle blood-report-table">
                      <thead><tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Reference range</th><th>Flag</th></tr></thead>
                      <tbody>
                        {panelRows.map((row) => (
                          <tr key={row.key}>
                            <td>
                              <input className="form-control form-control-sm" value={row.test} onChange={(e) => onBiochemRowChange(row.index, "test", e.target.value)} />
                            </td>
                            <td>
                              <input className="form-control form-control-sm" value={row.result} onChange={(e) => onBiochemRowChange(row.index, "result", e.target.value)} />
                            </td>
                            <td>
                              <input className="form-control form-control-sm" value={row.unit} onChange={(e) => onBiochemRowChange(row.index, "unit", e.target.value)} />
                            </td>
                            <td>
                              <input className="form-control form-control-sm" value={row.range} onChange={(e) => onBiochemRowChange(row.index, "range", e.target.value)} />
                            </td>
                            <td>
                              <span className={`badge blood-flag-${String(row.flag || "NORMAL").toLowerCase()}`}>
                                {row.flag ? formatEnum(row.flag) : "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            <div className="alert alert-light border small mb-0">
              <strong>Note:</strong> Reference values are species-specific (Dog / Cat). Change rows if your analyser reports a different interval. Ranges marked <em>Lab-specific</em> or <em>Calculate*</em> need manual flagging.
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Microscopy and Interpretation" icon={Beaker}>
        <div className="row g-3">
          <MiniTextarea label="Peripheral blood smear findings" value={report.smearFindings} onChange={(v) => onMetaChange("smearFindings", v)} col="col-md-6" />
          <MiniTextarea label="Clinical interpretation" value={report.interpretation} onChange={(v) => onMetaChange("interpretation", v)} col="col-md-6" />
          <MiniTextarea label="Remarks" value={report.remarks} onChange={(v) => onMetaChange("remarks", v)} col="col-12" />
        </div>
      </SectionCard>
    </div>
  );
}

function RepeatableSection({ title, description, icon, items, template, collectionKey, onAdd, onRemove, renderItem, emptyLabel = "No entries added." }) {
  return <SectionCard title={title} description={description} icon={icon}><div className="d-flex flex-column gap-3">{items.length === 0 && <div className="prescription-empty">{emptyLabel}</div>}{items.map((item, index) => <div className="prescription-repeat-card" key={`${collectionKey}-${index}`}><div className="prescription-repeat-header"><strong>{title.replace(/s$/, "")} {index + 1}</strong><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onRemove(collectionKey, index)}><Trash2 size={15} /></button></div>{renderItem(item, index)}</div>)}<button type="button" className="btn btn-outline-primary align-self-start d-flex align-items-center gap-2" onClick={() => onAdd(collectionKey, template)}><Plus size={17} /> Add {title.replace(/s$/, "")}</button></div></SectionCard>;
}

function MedicineFields({ item, index, onChange }) {
  return <div className="row g-3"><MiniField label="Medicine name" value={item.medicineName} onChange={(v) => onChange("medicines", index, "medicineName", v)} col="col-md-4" /><MiniField label="Strength" value={item.strength} onChange={(v) => onChange("medicines", index, "strength", v)} col="col-md-2" placeholder="250 mg" /><MiniField label="Dose" value={item.dosage} onChange={(v) => onChange("medicines", index, "dosage", v)} col="col-md-2" placeholder="1 tablet" /><MiniSelect label="Route" value={item.route} onChange={(v) => onChange("medicines", index, "route", v)} col="col-md-2" options={["ORAL", "IV", "IM", "SC", "TOPICAL", "OTIC", "OPHTHALMIC", "INHALATION", "OTHER"]} /><MiniField label="Quantity" value={item.quantity} onChange={(v) => onChange("medicines", index, "quantity", v)} col="col-md-2" /><MiniField label="Frequency" value={item.frequency} onChange={(v) => onChange("medicines", index, "frequency", v)} col="col-md-3" placeholder="Twice daily" /><MiniField label="Duration" value={item.duration} onChange={(v) => onChange("medicines", index, "duration", v)} col="col-md-3" placeholder="7 days" /><MiniField label="Instructions" value={item.instructions} onChange={(v) => onChange("medicines", index, "instructions", v)} col="col-md-6" placeholder="After food" /></div>;
}

function LabFields({ item, index, onChange }) { return <div className="row g-3"><MiniField label="Test / panel" value={item.testName} onChange={(v) => onChange("laboratoryTests", index, "testName", v)} col="col-md-4" /><MiniField label="Specimen" value={item.specimen} onChange={(v) => onChange("laboratoryTests", index, "specimen", v)} col="col-md-3" /><MiniSelect label="Priority" value={item.priority} onChange={(v) => onChange("laboratoryTests", index, "priority", v)} col="col-md-2" options={["ROUTINE", "URGENT", "STAT"]} /><MiniField label="Instructions" value={item.instructions} onChange={(v) => onChange("laboratoryTests", index, "instructions", v)} col="col-md-3" /></div>; }

function ImagingTab({ items, onAdd, onRemove, onChange }) {
  const [resultIndex, setResultIndex] = useState(null);

  function openResult(index) {
    setResultIndex(index);
  }

  function closeResult() {
    setResultIndex(null);
  }

  function updateResult(index, field, value) {
    const current = items[index]?.result || emptyImaging.result;
    onChange("imagingRequests", index, "result", {
      ...current,
      [field]: value,
    });
  }

  function addResult() {
    const index = items.length;
    onAdd("imagingRequests", emptyImaging);
    setResultIndex(index);
  }

  return (
    <>
      <SectionCard
        title="Imaging"
        description="Add an imaging request and record the clinical result when the study is completed."
        icon={Image}
      >
        <div className="imaging-toolbar">
          <div>
            <strong>Imaging studies</strong>
            <p className="mb-0 text-secondary small">Requests and completed imaging results are kept together in the clinical record.</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => onAdd("imagingRequests", emptyImaging)}>
              <Plus size={16} /> Add Imaging Request
            </button>
            <button type="button" className="btn btn-primary d-flex align-items-center gap-2" onClick={addResult}>
              <FileText size={16} /> Add Result
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="prescription-empty mt-3">
            <Image size={28} className="mb-2 text-primary" />
            <div className="fw-semibold">No imaging studies added</div>
            <div className="small">Add an imaging request first, or use Add Result to start a result entry.</div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3 mt-3">
            {items.map((item, index) => (
              <div className="prescription-repeat-card imaging-record-card" key={`imaging-${index}`}>
                <div className="prescription-repeat-header">
                  <div>
                    <strong>Imaging {index + 1}</strong>
                    <div className="small text-secondary">{formatEnum(item.type)}{item.bodyPart ? ` · ${item.bodyPart}` : ""}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={() => openResult(index)}>
                      <FileText size={14} /> {item.result?.findings || item.result?.impression ? "Edit Result" : "Add Result"}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onRemove("imagingRequests", index)} aria-label={`Remove imaging ${index + 1}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <ImagingFields item={item} index={index} onChange={onChange} />
                {(item.result?.findings || item.result?.impression) && (
                  <div className="imaging-result-preview mt-3">
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                      <span className="badge rounded-pill bg-success-subtle text-success-emphasis">Result recorded</span>
                      {item.result?.resultDate && <small className="text-secondary">{item.result.resultDate}</small>}
                    </div>
                    {item.result?.findings && <div><strong>Findings:</strong> {item.result.findings}</div>}
                    {item.result?.impression && <div className="mt-1"><strong>Impression:</strong> {item.result.impression}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {resultIndex !== null && items[resultIndex] && (
        <div className="imaging-result-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeResult(); }}>
          <div className="imaging-result-modal" role="dialog" aria-modal="true" aria-labelledby="imaging-result-title">
            <div className="imaging-result-modal-header">
              <div>
                <span className="small text-primary fw-semibold">IMAGING RESULT</span>
                <h5 id="imaging-result-title" className="mb-0 mt-1">Add imaging result</h5>
                <p className="mb-0 small text-secondary">{formatEnum(items[resultIndex].type)}{items[resultIndex].bodyPart ? ` · ${items[resultIndex].bodyPart}` : ""}</p>
              </div>
              <button type="button" className="btn btn-light border rounded-circle imaging-modal-close" onClick={closeResult} aria-label="Close result form"><X size={18} /></button>
            </div>

            <div className="row g-3">
              <MiniSelect label="Result status" value={items[resultIndex].result?.status || "DRAFT"} onChange={(v) => updateResult(resultIndex, "status", v)} col="col-md-4" options={["DRAFT", "PRELIMINARY", "FINAL"]} />
              <MiniField label="Result date" type="date" value={items[resultIndex].result?.resultDate || ""} onChange={(v) => updateResult(resultIndex, "resultDate", v)} col="col-md-4" />
              <MiniField label="Performed / reported by" value={items[resultIndex].result?.performedBy || ""} onChange={(v) => updateResult(resultIndex, "performedBy", v)} col="col-md-4" placeholder="Veterinarian / radiologist" />
              <MiniTextarea label="Findings" value={items[resultIndex].result?.findings || ""} onChange={(v) => updateResult(resultIndex, "findings", v)} col="col-12" required />
              <MiniTextarea label="Impression / diagnosis" value={items[resultIndex].result?.impression || ""} onChange={(v) => updateResult(resultIndex, "impression", v)} col="col-12" />
              <MiniTextarea label="Recommendations" value={items[resultIndex].result?.recommendations || ""} onChange={(v) => updateResult(resultIndex, "recommendations", v)} col="col-12" />
            </div>

            <div className="imaging-result-modal-footer">
              <button type="button" className="btn btn-light border" onClick={closeResult}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={closeResult}>Save Result</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ImagingFields({ item, index, onChange }) {
  return <div className="row g-3"><MiniSelect label="Imaging type" value={item.type} onChange={(v) => onChange("imagingRequests", index, "type", v)} col="col-md-2" options={["X_RAY", "ULTRASOUND", "CT", "MRI", "ENDOSCOPY", "OTHER"]} /><MiniField label="Body part" value={item.bodyPart} onChange={(v) => onChange("imagingRequests", index, "bodyPart", v)} col="col-md-3" /><MiniField label="Views / protocol" value={item.views} onChange={(v) => onChange("imagingRequests", index, "views", v)} col="col-md-2" /><MiniSelect label="Priority" value={item.priority} onChange={(v) => onChange("imagingRequests", index, "priority", v)} col="col-md-2" options={["ROUTINE", "URGENT", "STAT"]} /><MiniField label="Clinical history / question" value={item.clinicalHistory} onChange={(v) => onChange("imagingRequests", index, "clinicalHistory", v)} col="col-md-3" /></div>;
}

function VaccinationFields({ item, index, onChange }) { return <div className="row g-3"><MiniField label="Vaccine" value={item.vaccineName} onChange={(v) => onChange("vaccinations", index, "vaccineName", v)} col="col-md-3" /><MiniField label="Dose" value={item.dose} onChange={(v) => onChange("vaccinations", index, "dose", v)} col="col-md-2" /><MiniSelect label="Route" value={item.route} onChange={(v) => onChange("vaccinations", index, "route", v)} col="col-md-2" options={["SUBCUTANEOUS", "INTRAMUSCULAR", "INTRANASAL", "ORAL", "OTHER"]} /><MiniField label="Batch no." value={item.batchNo} onChange={(v) => onChange("vaccinations", index, "batchNo", v)} col="col-md-2" /><MiniField label="Manufacturer" value={item.manufacturer} onChange={(v) => onChange("vaccinations", index, "manufacturer", v)} col="col-md-3" /><MiniField label="Administered date" type="date" value={item.administeredDate} onChange={(v) => onChange("vaccinations", index, "administeredDate", v)} col="col-md-3" /><MiniField label="Next due date" type="date" value={item.nextDueDate} onChange={(v) => onChange("vaccinations", index, "nextDueDate", v)} col="col-md-3" /><MiniField label="Notes" value={item.notes} onChange={(v) => onChange("vaccinations", index, "notes", v)} col="col-md-6" /></div>; }

function PrintablePrescription({ clinic, appointment, formData, patientName, ownerName, doctorName, prescriptionId }) {
  const pet = appointment?.pet;
  const blood = formData.bloodReport;

  const printableMedicines = formData.medicines.filter((item) =>
    String(item.medicineName || "").trim(),
  );

  const hasBloodData =
    blood.rows.some((row) => String(row.result || "").trim()) ||
    (blood.biochemistry?.enabled &&
      blood.biochemistry.rows?.some((row) => String(row.result || "").trim())) ||
    [
      blood.sampleId,
      blood.analyser,
      blood.technicianName,
      blood.pathologistName,
      blood.smearFindings,
      blood.interpretation,
      blood.remarks,
    ].some((value) => String(value || "").trim());

  return (
    <article className="print-prescription">
      <header className="print-letterhead">
        <div className="print-logo"><Stethoscope size={30} /></div>
        <div className="print-clinic-main"><h1>{clinic.name}</h1><p>{clinic.subtitle}</p><small>{clinic.address}</small></div>
        <div className="print-clinic-contact"><div>{clinic.phone}</div><div>{clinic.email}</div><div>{clinic.registration}</div></div>
      </header>
      <div className="print-title-row"><div><h2>Veterinary Prescription & Clinical Report</h2><span>Prescription No.: {prescriptionId || appointment?.appointmentNo || "Draft"}</span></div><div className="print-rx">℞</div></div>
      <section className="print-info-grid">
        <PrintInfo label="Patient" value={patientName} /><PrintInfo label="Species" value={pet?.species?.name} /><PrintInfo label="Breed" value={pet?.breed?.name || pet?.breed} /><PrintInfo label="Sex" value={pet?.gender || pet?.sex} /><PrintInfo label="Age" value={pet?.age ? `${pet.age} years` : calculateAge(pet?.dateOfBirth)} /><PrintInfo label="Owner" value={ownerName} /><PrintInfo label="Phone" value={appointment?.owner?.phone} /><PrintInfo label="Visit date" value={formatDate(appointment?.scheduledAt)} /><PrintInfo label="Veterinarian" value={doctorName} /><PrintInfo label="Appointment No." value={appointment?.appointmentNo} />
      </section>
      <PrintSection title="Clinical Summary"><PrintLine label="Chief complaint" value={formData.chiefComplaint} /><PrintLine label="History" value={formData.history} /><PrintLine label="Allergies" value={formData.allergies} /><div className="print-vitals"><PrintInfo label="Weight" value={`${formData.weightKg} kg`} /><PrintInfo label="Temperature" value={`${formData.temperatureF} °F`} /><PrintInfo label="Pulse" value={`${formData.pulseBpm} bpm`} /><PrintInfo label="Respiration" value={`${formData.respirationRate}/min`} /><PrintInfo label="Hydration" value={formData.hydrationStatus} /><PrintInfo label="BCS" value={`${formData.bodyConditionScore}/9`} /></div><PrintLine label="Physical examination" value={formData.physicalExamination} /></PrintSection>
      <PrintSection title="Assessment"><PrintLine label="Investigation" value={formData.investigation === "OTHER" ? formData.investigationOther : formData.investigation} /><PrintLine label="Diagnosis" value={formData.diagnosis} /><PrintLine label="Treatment plan" value={(formData.treatmentPlans || []).map((item) => `${item.date}: ${item.plan}`).join(" | ") || formData.treatmentPlan} /></PrintSection>
      {printableMedicines.length > 0 && (
        <PrintSection title="Prescription">
          <table className="print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Medicine</th>
                <th>Strength</th>
                <th>Dose / Route</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Qty</th>
                <th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {printableMedicines.map((medicine, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{medicine.medicineName}</td>
                  <td>{medicine.strength || "—"}</td>
                  <td>
                    {medicine.dosage} / {formatEnum(medicine.route)}
                  </td>
                  <td>{medicine.frequency}</td>
                  <td>{medicine.duration || "—"}</td>
                  <td>{medicine.quantity || "—"}</td>
                  <td>{medicine.instructions || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintSection>
      )}
      {hasBloodData && (
        <PrintSection title="Complete Blood Count">
          <div className="print-report-meta">
            <PrintInfo label="Report date" value={blood.reportDate} />
            <PrintInfo label="Sample ID" value={blood.sampleId} />
            <PrintInfo label="Specimen" value={blood.specimen} />
            <PrintInfo label="Analyser" value={blood.analyser} />
          </div>

          <table className="print-table compact">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference range</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              {blood.rows
                .filter((row) => String(row.result || "").trim())
                .map((row) => (
                  <tr key={row.key}>
                    <td>{row.test}</td>
                    <td className="fw-bold">{row.result}</td>
                    <td>{row.unit}</td>
                    <td>{row.range}</td>
                    <td
                      className={`print-flag print-flag-${String(row.flag || "").toLowerCase()}`}
                    >
                      {row.flag}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {blood.smearFindings && (
            <PrintLine
              label="Smear findings"
              value={blood.smearFindings}
            />
          )}

          {blood.interpretation && (
            <PrintLine
              label="Interpretation"
              value={blood.interpretation}
            />
          )}

          {blood.remarks && (
            <PrintLine
              label="Remarks"
              value={blood.remarks}
            />
          )}
        </PrintSection>
      )}

      {/* 🔥 NEW: Printed Serum Biochemistry */}
      {blood.biochemistry?.enabled &&
        blood.biochemistry.rows?.some((row) => String(row.result || "").trim()) && (
          <PrintSection title="Serum Biochemistry">
            <div className="print-report-meta">
              <PrintInfo label="Report date" value={blood.biochemistry.reportDate} />
              <PrintInfo label="Sample ID" value={blood.biochemistry.sampleId} />
              <PrintInfo label="Specimen" value={blood.biochemistry.specimen} />
              <PrintInfo label="Analyser" value={blood.biochemistry.analyser} />
            </div>

            {BIOCHEMISTRY_PANELS.map((panel) => {
              const rows = blood.biochemistry.rows
                .filter((row) => row.panel === panel.id && String(row.result || "").trim());

              if (!rows.length) return null;

              return (
                <div key={panel.id} className="print-biochem-panel">
                  <h4 className="print-biochem-panel-heading">{panel.label}</h4>
                  <table className="print-table compact">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Result</th>
                        <th>Unit</th>
                        <th>Reference range</th>
                        <th>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.test}</td>
                          <td className="fw-bold">{row.result}</td>
                          <td>{row.unit}</td>
                          <td>{row.range}</td>
                          <td className={`print-flag print-flag-${String(row.flag || "").toLowerCase()}`}>
                            {row.flag || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </PrintSection>
        )}

      {formData.laboratoryTests.length > 0 && <PrintSection title="Additional Laboratory Requests"><SimpleList items={formData.laboratoryTests.map(x => `${x.testName} — ${x.specimen} — ${formatEnum(x.priority)} — ${x.instructions}`)} /></PrintSection>}
      {formData.imagingRequests.length > 0 && <PrintSection title="Imaging Requests"><SimpleList items={formData.imagingRequests.map(x => { const result = x.result || {}; return `${formatEnum(x.type)}: ${x.bodyPart || ""}, ${x.views || ""}; ${formatEnum(x.priority)}. ${x.clinicalHistory || ""}${result.findings || result.impression ? ` Result — Findings: ${result.findings || "—"}; Impression: ${result.impression || "—"}.` : ""}`; })} /></PrintSection>}
      {formData.vaccinations.length > 0 && <PrintSection title="Vaccination Record"><SimpleList items={formData.vaccinations.map(x => `${x.vaccineName}, ${x.dose}, ${formatEnum(x.route)}, Batch ${x.batchNo}, ${x.manufacturer}, administered ${x.administeredDate}, next due ${x.nextDueDate}. ${x.notes}`)} /></PrintSection>}
      <PrintSection title="Advice and Follow-up"><PrintLine label="Home-care advice" value={formData.advice} /><PrintLine label="Follow-up" value={`${formData.followUpDate} — ${formData.followUpNotes}`} /><PrintLine label="Other reports / instructions" value={formData.otherReports} /></PrintSection>
      <section className="print-signatures"><div><div className="signature-line" /><strong>{blood.technicianName}</strong><small>Laboratory Technician</small></div><div><div className="signature-line" /><strong>{blood.pathologistName}</strong><small>Report Authorised By</small></div><div><div className="signature-line" /><strong>{doctorName}</strong><small>Veterinarian Signature & Stamp</small></div></section>
      <footer className="print-footer"><span>Emergency contact: {clinic.phone}</span><span>Computer-generated clinical document</span><span>Page <span className="page-number" /></span></footer>
    </article>
  );
}

function SectionCard({ title, description, icon: Icon = Bone, children }) { return <section className="prescription-section-card"><div className="prescription-section-heading"><div className="prescription-section-icon"><Icon size={20} /></div><div><h5>{title}</h5>{description && <p>{description}</p>}</div></div>{children}</section>; }

function Field({ label, col = "col-12", textarea, required, ...props }) { const Component = textarea ? "textarea" : "input"; return <div className={col}><label className="form-label fw-semibold small">{label}{required && <span className="text-danger ms-1">*</span>}</label><Component className="form-control" required={required} rows={props.rows || (textarea ? 3 : undefined)} {...props} /></div>; }

function MiniField({ label, value, onChange, col, type = "text", required, ...props }) { return <div className={col}><label className="form-label small fw-semibold">{label}{required && <span className="text-danger ms-1">*</span>}</label><input className="form-control" required={required} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} {...props} /></div>; }

function MiniTextarea({ label, value, onChange, col, required }) { return <div className={col}><label className="form-label small fw-semibold">{label}{required && <span className="text-danger ms-1">*</span>}</label><textarea className="form-control" rows="4" required={required} value={value || ""} onChange={(e) => onChange(e.target.value)} /></div>; }

function MiniSelect({ label, value, onChange, col, options, required }) { return <div className={col}><label className="form-label small fw-semibold">{label}{required && <span className="text-danger ms-1">*</span>}</label><select className="form-select" required={required} value={value} onChange={(e) => onChange(e.target.value)}>{options.map(o => <option key={o} value={o}>{formatEnum(o)}</option>)}</select></div>; }

function Info({ label, value }) { return <div><small>{label}</small><strong>{value || "—"}</strong></div> }

function PrintInfo({ label, value }) { return <div className="print-info"><small>{label}</small><strong>{value || "—"}</strong></div> }

function PrintLine({ label, value }) { return <div className="print-line"><strong>{label}:</strong><span>{value || "—"}</span></div> }

function PrintSection({ title, children }) { return <section className="print-section"><h3>{title}</h3>{children}</section> }

function SimpleList({ items }) { return <ol className="print-list">{items.map((x, i) => <li key={i}>{x}</li>)}</ol> }

function calculateAge(value) { if (!value) return "—"; const birth = new Date(value); const now = new Date(); const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth(); return months < 12 ? `${Math.max(months, 0)} months` : `${Math.floor(months / 12)} years ${months % 12} months`; }

function formatDate(value) { if (!value) return "—"; return new Date(value).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

function getUserName(user) { return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—"; }

function formatEnum(value) { return String(value || "").toLowerCase().split("_").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" "); }

export default PrescriptionForm;