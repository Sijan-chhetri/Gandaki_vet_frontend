import { FlaskConical, Printer, Save } from "lucide-react";

export const RDT_TESTS = [
  { test: "CANINE_PARVOVIRUS", label: "Canine Parvovirus", group: "DOG" },
  { test: "CANINE_CORONAVIRUS", label: "Canine Coronavirus", group: "DOG" },
  { test: "CANINE_DISTEMPER", label: "Canine Distemper", group: "DOG" },
  { test: "FELINE_LEUKEMIA", label: "Feline Leukemia Virus (FeLV)", group: "CAT" },
  { test: "FELINE_IMMUNODEFICIENCY", label: "Feline Immunodeficiency Virus (FIV)", group: "CAT" },
  { test: "FELINE_PARVOVIRUS", label: "Feline Parvovirus (FPV)", group: "CAT" },
];

const RESULT_LABELS = {
  NOT_TESTED: "Not tested",
  POSITIVE: "Positive",
  NEGATIVE: "Negative",
  INVALID: "Invalid",
  INCONCLUSIVE: "Inconclusive",
};

function localToday() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function createEmptyRdtReport() {
  return {
    sampleDate: localToday(),
    specimen: "",
    kitName: "",
    kitBatchNumber: "",
    performedBy: "",
    reviewedBy: "",
    notes: "",
    results: RDT_TESTS.map(({ test }) => ({ test, result: "NOT_TESTED", remarks: "" })),
  };
}

export function normalizeRdtReport(value) {
  const defaults = createEmptyRdtReport();
  if (!value) return defaults;
  const mapped = new Map((value.results || []).map((row) => [row.test, row]));
  return {
    ...defaults,
    ...value,
    sampleDate: value.sampleDate || "",
    specimen: value.specimen || "",
    kitName: value.kitName || "",
    kitBatchNumber: value.kitBatchNumber || "",
    performedBy: value.performedBy || "",
    reviewedBy: value.reviewedBy || "",
    notes: value.notes || "",
    results: RDT_TESTS.map(({ test }) => ({
      test,
      result: mapped.get(test)?.result || "NOT_TESTED",
      remarks: mapped.get(test)?.remarks || "",
    })),
  };
}

export function hasRdtResult(report) {
  return !!report?.results?.some((item) => item.result && item.result !== "NOT_TESTED");
}

export function rdtRequestPayload(report) {
  return {
    sampleDate: report.sampleDate || null,
    specimen: report.specimen?.trim() || null,
    kitName: report.kitName?.trim() || null,
    kitBatchNumber: report.kitBatchNumber?.trim() || null,
    performedBy: report.performedBy?.trim() || null,
    reviewedBy: report.reviewedBy?.trim() || null,
    notes: report.notes?.trim() || null,
    results: RDT_TESTS.map(({ test }) => {
      const item = report.results.find((row) => row.test === test);
      return { test, result: item?.result || "NOT_TESTED", remarks: item?.remarks?.trim() || null };
    }),
  };
}

export function RdtTab({ report, onFieldChange, onResultChange, onSave, onPrint, saving, saved, dirty, loading, error, success }) {
  const hasResults = hasRdtResult(report);
  const positive = report.results.filter((row) => row.result === "POSITIVE").length;
  const negative = report.results.filter((row) => row.result === "NEGATIVE").length;
  const invalid = report.results.filter((row) => row.result === "INVALID" || row.result === "INCONCLUSIVE").length;

  return (
    <section className="rdt-section">
      <div className="rdt-header">
        <div className="d-flex align-items-start gap-3">
          <div className="rdt-icon"><FlaskConical size={21} /></div>
          <div>
            <h5 className="mb-1 fw-bold">Rapid Diagnostic Test (RDT)</h5>
            <p className="mb-0 text-secondary small">Enter rapid test findings for canine and feline samples. All results are saved to this appointment, independently of the prescription.</p>
          </div>
        </div>
        <div className="rdt-actions">
          <button type="button" className="btn btn-outline-secondary d-flex gap-2 align-items-center" onClick={onPrint} disabled={loading || saving || !saved || dirty} title={dirty ? "Save changes before printing" : "Print saved RDT report"}>
            <Printer size={16} /> Print RDT
          </button>
          <button type="button" className="btn btn-primary d-flex gap-2 align-items-center" onClick={onSave} disabled={loading || saving || !hasResults}>
            <Save size={16} /> {saving ? "Saving..." : "Save RDT"}
          </button>
        </div>
      </div>
      {loading && <div className="alert alert-light border mt-3">Loading existing rapid test results...</div>}
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {success && <div className="alert alert-success mt-3">{success}</div>}
      {dirty && saved && <div className="alert alert-warning mt-3 py-2">Unsaved changes: save the RDT again before printing the updated results.</div>}

      <div className="row g-3 rdt-fields">
        <div className="col-md-3"><label className="form-label fw-semibold small">Sample date</label><input className="form-control" type="date" value={report.sampleDate || ""} onChange={(event) => onFieldChange("sampleDate", event.target.value)} disabled={saving} /></div>
        <div className="col-md-3"><label className="form-label fw-semibold small">Specimen</label><input className="form-control" value={report.specimen || ""} onChange={(event) => onFieldChange("specimen", event.target.value)} placeholder="Faeces, serum, whole blood..." disabled={saving} /></div>
        <div className="col-md-3"><label className="form-label fw-semibold small">Test kit / manufacturer</label><input className="form-control" value={report.kitName || ""} onChange={(event) => onFieldChange("kitName", event.target.value)} placeholder="Rapid kit name" disabled={saving} /></div>
        <div className="col-md-3"><label className="form-label fw-semibold small">Kit batch / lot no.</label><input className="form-control" value={report.kitBatchNumber || ""} onChange={(event) => onFieldChange("kitBatchNumber", event.target.value)} placeholder="Batch number" disabled={saving} /></div>
      </div>

      <div className="rdt-stats">
        <span>Positive: <strong>{positive}</strong></span>
        <span>Negative: <strong>{negative}</strong></span>
        <span>Invalid / Inconclusive: <strong>{invalid}</strong></span>
      </div>

      {[{ key: "DOG", title: "Canine rapid tests" }, { key: "CAT", title: "Feline rapid tests" }].map((group) => (
        <div key={group.key} className="rdt-test-group">
          <h6 className="rdt-group-title">{group.title}</h6>
          <div className="table-responsive">
            <table className="table rdt-table align-middle mb-0">
              <thead><tr><th style={{ width: "43%" }}>Test name</th><th style={{ width: "24%" }}>Result</th><th>Remarks (optional)</th></tr></thead>
              <tbody>
                {RDT_TESTS.filter((test) => test.group === group.key).map((item) => {
                  const row = report.results.find((x) => x.test === item.test) || { result: "NOT_TESTED", remarks: "" };
                  return (
                    <tr key={item.test}>
                      <td className="fw-semibold">{item.label}</td>
                      <td>
                        <select className={`form-select form-select-sm rdt-result rdt-${row.result.toLowerCase()}`} value={row.result} onChange={(event) => onResultChange(item.test, "result", event.target.value)} disabled={saving} aria-label={`${item.label} result`}>
                          <option value="NOT_TESTED">Not tested</option>
                          <option value="POSITIVE">Positive</option>
                          <option value="NEGATIVE">Negative</option>
                          <option value="INVALID">Invalid</option>
                          <option value="INCONCLUSIVE">Inconclusive</option>
                        </select>
                      </td>
                      <td><input className="form-control form-control-sm" value={row.remarks} onChange={(event) => onResultChange(item.test, "remarks", event.target.value)} placeholder="Optional finding" disabled={saving} maxLength={1000} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="row g-3 mt-1">
        <div className="col-md-6"><label className="form-label fw-semibold small">Performed by</label><input className="form-control" value={report.performedBy} onChange={(event) => onFieldChange("performedBy", event.target.value)} disabled={saving} /></div>
        <div className="col-md-6"><label className="form-label fw-semibold small">Reviewed / authorised by</label><input className="form-control" value={report.reviewedBy} onChange={(event) => onFieldChange("reviewedBy", event.target.value)} disabled={saving} /></div>
        <div className="col-12"><label className="form-label fw-semibold small">Report interpretation / notes</label><textarea className="form-control" rows={3} value={report.notes} onChange={(event) => onFieldChange("notes", event.target.value)} placeholder="Add clinical interpretation, limitations, or confirmatory testing notes..." disabled={saving} maxLength={2000} /></div>
      </div>
      <div className="alert alert-light border mt-3 mb-0 small">Rapid test findings must be interpreted with the animal's clinical signs and kit instructions. An invalid or inconclusive result is not a negative result.</div>
    </section>
  );
}

export function RdtPrintSection({ report }) {
  if (!hasRdtResult(report)) return null;
  return (
    <section className="print-section rdt-print-section">
      <h3>Rapid Diagnostic Test (RDT)</h3>
      <div className="rdt-print-meta">
        <span><strong>Sample date:</strong> {report.sampleDate || "—"}</span>
        <span><strong>Specimen:</strong> {report.specimen || "—"}</span>
        {report.kitName && <span><strong>Test kit:</strong> {report.kitName}</span>}
      </div>
      <table className="print-table compact"><thead><tr><th>Test</th><th>Result</th><th>Remarks</th></tr></thead><tbody>
        {RDT_TESTS.filter(({ test }) => report.results.some((row) => row.test === test && row.result !== "NOT_TESTED")).map(({ test, label }) => {
          const row = report.results.find((x) => x.test === test);
          return <tr key={test}><td>{label}</td><td><strong>{RESULT_LABELS[row.result]}</strong></td><td>{row.remarks || "—"}</td></tr>;
        })}
      </tbody></table>
      {report.notes && <p className="mt-2"><strong>RDT interpretation:</strong> {report.notes}</p>}
    </section>
  );
}

export function PrintableRdtReport({ report, appointment, clinic, ownerName, patientName, doctorName }) {
  if (!hasRdtResult(report)) return null;
  const pet = appointment?.pet;
  const species = pet?.species?.name || appointment?.walkInPetSpecies || "—";
  const breed = pet?.breed?.name || pet?.breed || appointment?.walkInPetBreed || "—";
  const sex = pet?.gender || pet?.sex || appointment?.walkInPetGender || "—";
  const age = pet?.approximateAge || appointment?.walkInPetAge || "—";
  const ownerPhone = appointment?.owner?.phone || appointment?.walkInOwnerPhone || "—";
  const ownerAddress = appointment?.owner?.address || appointment?.walkInOwnerAddress || "—";

  return (
    <article className="print-rdt-report">
      <header className="print-rdt-letterhead">
        <h1>{clinic.name}</h1>
        <p>{clinic.address}</p>
        {clinic.phone && <small>Contact: {clinic.phone}</small>}
      </header>
      <h2>RAPID DIAGNOSTIC TEST REPORT</h2>
      <div className="print-rdt-patient-grid">
        <span><strong>Owner's Name:</strong> {ownerName}</span><span><strong>Pet's Name:</strong> {patientName}</span>
        <span><strong>Address:</strong> {ownerAddress}</span><span><strong>Contact no.:</strong> {ownerPhone}</span>
        <span><strong>Species:</strong> {species}</span><span><strong>Breed:</strong> {breed}</span>
        <span><strong>Age:</strong> {age}</span><span><strong>Sex:</strong> {sex}</span>
      </div>
      <div className="print-rdt-sample">
        <span><strong>Sample date:</strong> {report.sampleDate || "—"}</span>
        <span><strong>Specimen:</strong> {report.specimen || "—"}</span>
        {report.kitName && <span><strong>Test kit:</strong> {report.kitName}</span>}
        {report.kitBatchNumber && <span><strong>Batch number:</strong> {report.kitBatchNumber}</span>}
      </div>
      <h3>Test Result</h3>
      <table className="print-rdt-table">
        <thead><tr><th>Test Name</th><th>Result</th><th>Remarks</th></tr></thead>
        <tbody>
          {RDT_TESTS.map(({ test, label }) => {
            const row = report.results.find((x) => x.test === test);
            const result = row?.result || "NOT_TESTED";
            return <tr key={test}><td>{label}</td><td><strong>{RESULT_LABELS[result]}</strong></td><td>{row?.remarks || "—"}</td></tr>;
          })}
        </tbody>
      </table>
      {report.notes && <div className="print-rdt-notes"><strong>Interpretation / Remarks:</strong><p>{report.notes}</p></div>}
      <div className="print-rdt-signatures">
        <div><div className="print-rdt-sign-line" /><strong>{report.performedBy || ""}</strong><small>Performed By</small></div>
        <div><div className="print-rdt-sign-line" /><strong>{report.reviewedBy || doctorName || ""}</strong><small>Veterinarian / Report Authorised By</small></div>
      </div>
      <p className="print-rdt-disclaimer">Rapid diagnostic results require clinical correlation and appropriate confirmatory testing when indicated.</p>
    </article>
  );
}
