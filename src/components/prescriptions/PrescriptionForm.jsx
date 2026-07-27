import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import appointmentService from "../../services/appointment.service";
import prescriptionService from "../../services/prescription.service";
import "./PrescriptionForm.css";

const CLINIC = {
  name: "Pokhara Pet House",
  subtitle: "Veterinary Clinic & Pet Care Centre",
  address: "Pokhara, Kaski, Nepal",
  phone: "+977-XXXXXXXXXX",
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
  rows: CBC_TEMPLATE.map((row) => ({ ...row, result: "", flag: "NORMAL" })),
  smearFindings: "",
  interpretation: "",
  remarks: "",
});

const initialForm = {
  chiefComplaint: "",
  history: "",
  allergies: "",
  weightKg: "",
  temperatureC: "",
  pulseBpm: "",
  respirationRate: "",
  hydrationStatus: "",
  bodyConditionScore: "",
  physicalExamination: "",
  diagnosis: "",
  differentialDiagnosis: "",
  treatmentPlan: "",
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

  const [activeTab, setActiveTab] = useState("general");
  const [appointment, setAppointment] = useState(location.state?.appointment || null);
  const [prescriptionId, setPrescriptionId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const patientName = appointment?.pet?.name || "Patient";
  const ownerName = useMemo(
    () =>
      [appointment?.owner?.firstName, appointment?.owner?.lastName]
        .filter(Boolean)
        .join(" ") || "—",
    [appointment],
  );
  const doctorName = getUserName(appointment?.veterinarian);

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const [appointmentResult, prescriptionResult] = await Promise.allSettled([
          appointment
            ? Promise.resolve({ data: appointment })
            : appointmentService.getAppointmentById(appointmentId),
          prescriptionService.getByAppointment(appointmentId),
        ]);

        if (appointmentResult.status === "fulfilled") {
          setAppointment(appointmentResult.value?.data || appointmentResult.value);
        } else {
          throw appointmentResult.reason;
        }

        if (prescriptionResult.status === "fulfilled") {
          const existing = prescriptionResult.value?.data || prescriptionResult.value;
          if (existing?.id) {
            setPrescriptionId(existing.id);
            setFormData((previous) => ({
              ...previous,
              ...existing,
              medicines: existing.medicines?.length
                ? existing.medicines
                : [{ ...emptyMedicine }],
              bloodReport: existing.bloodReport
                ? {
                  ...createBloodReport(),
                  ...existing.bloodReport,
                  rows: existing.bloodReport.rows?.length
                    ? existing.bloodReport.rows
                    : createBloodReport().rows,
                }
                : createBloodReport(),
              laboratoryTests: existing.laboratoryTests || [],
              imagingRequests: existing.imagingRequests || [],
              vaccinations: existing.vaccinations || [],
            }));
          }
        }
      } catch (requestError) {
        setError(requestError?.message || "Unable to load prescription details.");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [appointmentId]);

  function updateField(event) {
    const { name, value } = event.target;
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
        rows: previous.bloodReport.rows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, [field]: value } : row,
        ),
      },
    }));
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

  async function savePrescription() {
    if (!validate()) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        appointmentId,
        petId: appointment?.petId || appointment?.pet?.id,
        ownerId: appointment?.ownerId || appointment?.owner?.id,
        veterinarianId: appointment?.veterinarianId || appointment?.veterinarian?.id,
        ...formData,
        weightKg: formData.weightKg ? Number(formData.weightKg) : null,
        temperatureC: formData.temperatureC
          ? Number(formData.temperatureC)
          : null,
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
      };

      const result = prescriptionId
        ? await prescriptionService.update(prescriptionId, payload)
        : await prescriptionService.create(payload);

      const saved = result?.data || result;
      setPrescriptionId(saved?.id || prescriptionId);
      setSuccess("Prescription and blood report saved successfully.");
    } catch (requestError) {
      setError(requestError?.message || "Unable to save prescription.");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
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
          <button type="button" className="btn btn-light border d-flex align-items-center gap-2" onClick={handlePrint}>
            <Printer size={17} /> Print / PDF
          </button>
          <button type="button" className="btn btn-primary d-flex align-items-center gap-2" onClick={savePrescription} disabled={saving}>
            {saving ? <LoaderCircle size={17} className="prescription-spin" /> : <Save size={17} />}
            Save Prescription
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger d-flex align-items-center gap-2 screen-only"><AlertCircle size={18} />{error}</div>}
      {success && <div className="alert alert-success d-flex align-items-center gap-2 screen-only"><CheckCircle2 size={18} />{success}</div>}

      <section className="prescription-patient-card screen-only">
        <Info label="Patient" value={patientName} />
        <Info label="Species" value={appointment?.pet?.species?.name} />
        <Info label="Breed" value={appointment?.pet?.breed?.name || appointment?.pet?.breed} />
        <Info label="Sex" value={appointment?.pet?.gender || appointment?.pet?.sex} />
        <Info label="Owner" value={ownerName} />
        <Info label="Phone" value={appointment?.owner?.phone} />
        <Info label="Visit" value={formatDate(appointment?.scheduledAt)} />
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
          {activeTab === "general" && <GeneralTab formData={formData} onChange={updateField} />}
          {activeTab === "medicines" && (
            <RepeatableSection title="Medicines" description="Add medicines when prescribed. Medicine name, dose and frequency are required only for entered medicines." icon={Pill} items={formData.medicines} template={emptyMedicine} collectionKey="medicines" onAdd={addArrayItem} onRemove={removeArrayItem} renderItem={(item, index) => <MedicineFields item={item} index={index} onChange={updateArrayItem} />} />
          )}
          {activeTab === "blood" && <BloodReportTab report={formData.bloodReport} onMetaChange={updateBloodMeta} onRowChange={updateBloodRow} />}
          {activeTab === "laboratory" && (
            <RepeatableSection title="Laboratory Requests" description="Add requested investigations when applicable." icon={FlaskConical} items={formData.laboratoryTests} template={emptyLab} collectionKey="laboratoryTests" onAdd={addArrayItem} onRemove={removeArrayItem} emptyLabel="No additional laboratory tests added." renderItem={(item, index) => <LabFields item={item} index={index} onChange={updateArrayItem} />} />
          )}
          {activeTab === "imaging" && (
            <RepeatableSection title="Imaging Requests" description="Add imaging requests when applicable." icon={Image} items={formData.imagingRequests} template={emptyImaging} collectionKey="imagingRequests" onAdd={addArrayItem} onRemove={removeArrayItem} emptyLabel="No imaging requests added." renderItem={(item, index) => <ImagingFields item={item} index={index} onChange={updateArrayItem} />} />
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
    </div>
  );
}

function GeneralTab({ formData, onChange }) {
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
          <Field label="Temperature (°C)" name="temperatureC" type="number" min="0" step="0.1" value={formData.temperatureC} onChange={onChange} col="col-6 col-lg-2" />
          <Field label="Pulse (bpm)" name="pulseBpm" type="number" min="0" value={formData.pulseBpm} onChange={onChange} col="col-6 col-lg-2" />
          <Field label="Respiration/min" name="respirationRate" type="number" min="0" value={formData.respirationRate} onChange={onChange} col="col-6 col-lg-2" />
          <Field label="Hydration" name="hydrationStatus" value={formData.hydrationStatus} onChange={onChange} col="col-6 col-lg-2" placeholder="Normal / 5%..." />
          <Field label="BCS (1–9)" name="bodyConditionScore" type="number" min="1" max="9" value={formData.bodyConditionScore} onChange={onChange} col="col-6 col-lg-2" />
          <Field label="Physical examination" name="physicalExamination" value={formData.physicalExamination} onChange={onChange} col="col-12" textarea rows="4" />
        </div>
      </SectionCard>
      <SectionCard title="Assessment and Plan" icon={Beaker}>
        <div className="row g-3">
          <Field required label="Diagnosis" name="diagnosis" value={formData.diagnosis} onChange={onChange} col="col-md-6" textarea />
          <Field label="Differential diagnosis" name="differentialDiagnosis" value={formData.differentialDiagnosis} onChange={onChange} col="col-md-6" textarea />
          <Field label="Treatment plan" name="treatmentPlan" value={formData.treatmentPlan} onChange={onChange} col="col-md-6" textarea />
          <Field label="Advice / home care" name="advice" value={formData.advice} onChange={onChange} col="col-md-6" textarea />
          <Field label="Follow-up date" name="followUpDate" type="date" value={formData.followUpDate} onChange={onChange} col="col-md-3" />
          <Field label="Follow-up notes" name="followUpNotes" value={formData.followUpNotes} onChange={onChange} col="col-md-9" />
        </div>
      </SectionCard>
    </div>
  );
}

function BloodReportTab({ report, onMetaChange, onRowChange }) {
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
                  <td><select className={`form-select form-select-sm blood-flag-${row.flag.toLowerCase()}`} value={row.flag} onChange={(e) => onRowChange(index, "flag", e.target.value)}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
function ImagingFields({ item, index, onChange }) { return <div className="row g-3"><MiniSelect label="Imaging type" value={item.type} onChange={(v) => onChange("imagingRequests", index, "type", v)} col="col-md-2" options={["X_RAY", "ULTRASOUND", "CT", "MRI", "ENDOSCOPY", "OTHER"]} /><MiniField label="Body part" value={item.bodyPart} onChange={(v) => onChange("imagingRequests", index, "bodyPart", v)} col="col-md-3" /><MiniField label="Views / protocol" value={item.views} onChange={(v) => onChange("imagingRequests", index, "views", v)} col="col-md-2" /><MiniSelect label="Priority" value={item.priority} onChange={(v) => onChange("imagingRequests", index, "priority", v)} col="col-md-2" options={["ROUTINE", "URGENT", "STAT"]} /><MiniField label="Clinical history / question" value={item.clinicalHistory} onChange={(v) => onChange("imagingRequests", index, "clinicalHistory", v)} col="col-md-3" /></div>; }
function VaccinationFields({ item, index, onChange }) { return <div className="row g-3"><MiniField label="Vaccine" value={item.vaccineName} onChange={(v) => onChange("vaccinations", index, "vaccineName", v)} col="col-md-3" /><MiniField label="Dose" value={item.dose} onChange={(v) => onChange("vaccinations", index, "dose", v)} col="col-md-2" /><MiniSelect label="Route" value={item.route} onChange={(v) => onChange("vaccinations", index, "route", v)} col="col-md-2" options={["SUBCUTANEOUS", "INTRAMUSCULAR", "INTRANASAL", "ORAL", "OTHER"]} /><MiniField label="Batch no." value={item.batchNo} onChange={(v) => onChange("vaccinations", index, "batchNo", v)} col="col-md-2" /><MiniField label="Manufacturer" value={item.manufacturer} onChange={(v) => onChange("vaccinations", index, "manufacturer", v)} col="col-md-3" /><MiniField label="Administered date" type="date" value={item.administeredDate} onChange={(v) => onChange("vaccinations", index, "administeredDate", v)} col="col-md-3" /><MiniField label="Next due date" type="date" value={item.nextDueDate} onChange={(v) => onChange("vaccinations", index, "nextDueDate", v)} col="col-md-3" /><MiniField label="Notes" value={item.notes} onChange={(v) => onChange("vaccinations", index, "notes", v)} col="col-md-6" /></div>; }

function PrintablePrescription({ clinic, appointment, formData, patientName, ownerName, doctorName, prescriptionId }) {
  const pet = appointment?.pet;
  const blood = formData.bloodReport;

  const printableMedicines = formData.medicines.filter((item) =>
    String(item.medicineName || "").trim(),
  );

  const hasBloodData =
    blood.rows.some((row) => String(row.result || "").trim()) ||
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
      <PrintSection title="Clinical Summary"><PrintLine label="Chief complaint" value={formData.chiefComplaint} /><PrintLine label="History" value={formData.history} /><PrintLine label="Allergies" value={formData.allergies} /><div className="print-vitals"><PrintInfo label="Weight" value={`${formData.weightKg} kg`} /><PrintInfo label="Temperature" value={`${formData.temperatureC} °C`} /><PrintInfo label="Pulse" value={`${formData.pulseBpm} bpm`} /><PrintInfo label="Respiration" value={`${formData.respirationRate}/min`} /><PrintInfo label="Hydration" value={formData.hydrationStatus} /><PrintInfo label="BCS" value={`${formData.bodyConditionScore}/9`} /></div><PrintLine label="Physical examination" value={formData.physicalExamination} /></PrintSection>
      <PrintSection title="Assessment"><PrintLine label="Diagnosis" value={formData.diagnosis} /><PrintLine label="Differential diagnosis" value={formData.differentialDiagnosis} /><PrintLine label="Treatment plan" value={formData.treatmentPlan} /></PrintSection>
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
                      className={`print-flag print-flag-${row.flag.toLowerCase()}`}
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
      {formData.laboratoryTests.length > 0 && <PrintSection title="Additional Laboratory Requests"><SimpleList items={formData.laboratoryTests.map(x => `${x.testName} — ${x.specimen} — ${formatEnum(x.priority)} — ${x.instructions}`)} /></PrintSection>}
      {formData.imagingRequests.length > 0 && <PrintSection title="Imaging Requests"><SimpleList items={formData.imagingRequests.map(x => `${formatEnum(x.type)}: ${x.bodyPart}, ${x.views}; ${formatEnum(x.priority)}. ${x.clinicalHistory}`)} /></PrintSection>}
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
