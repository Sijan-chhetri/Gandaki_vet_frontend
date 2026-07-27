import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Clock3,
  Edit3,
  LoaderCircle,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  WalletCards,
} from "lucide-react";

import serviceService from "../../services/service.service";

const emptyForm = {
  code: "",
  name: "",
  durationMin: "30",
  price: "0",
  isActive: true,
};

function Services() {
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    averagePrice: 0,
    averageDurationMin: 0,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [servicesResult, statsResult] = await Promise.all([
        serviceService.getServices({
          page: 1,
          limit: 100,
          search,
          isActive: status,
          sortBy: "name",
        }),
        serviceService.getServiceStats(),
      ]);

      setServices(servicesResult?.data || []);
      setStats((previous) => ({
        ...previous,
        ...(statsResult?.data || {}),
      }));
    } catch (requestError) {
      setError(requestError.message || "Unable to load services.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 250);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFieldErrors({});
    setShowForm(true);
  }

  function openEdit(service) {
    setEditing(service);
    setForm({
      code: service.code,
      name: service.name,
      durationMin: String(service.durationMin),
      price: String(service.price),
      isActive: service.isActive,
    });
    setFormError("");
    setFieldErrors({});
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError("");
      setFieldErrors({});

      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        durationMin: Number(form.durationMin),
        price: Number(form.price),
        isActive: form.isActive,
      };

      if (editing) {
        await serviceService.updateService(editing.id, payload);
      } else {
        await serviceService.createService(payload);
      }

      setShowForm(false);
      await loadData();
    } catch (requestError) {
      setFormError(requestError.message || "Unable to save service.");
      setFieldErrors(requestError.errors || {});
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(service) {
    try {
      setError("");
      await serviceService.updateServiceStatus(
        service.id,
        !service.isActive,
      );
      await loadData();
    } catch (requestError) {
      setError(requestError.message || "Unable to change service status.");
    }
  }

  async function removeService(service) {
    const confirmed = window.confirm(
      `Delete ${service.name}? Services with appointment history will be deactivated instead.`,
    );

    if (!confirmed) return;

    try {
      setError("");
      await serviceService.deleteService(service.id);
      await loadData();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete service.");
    }
  }

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Clinic Services</h3>
          <p className="text-secondary mb-0">
            Manage appointment services, prices and default durations.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={openCreate}
        >
          <Plus size={18} />
          Add Service
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        <SummaryCard title="Total" value={stats.total} icon={Stethoscope} />
        <SummaryCard title="Active" value={stats.active} icon={Activity} />
        <SummaryCard
          title="Average Duration"
          value={`${stats.averageDurationMin || 0} min`}
          icon={Clock3}
        />
        <SummaryCard
          title="Average Price"
          value={`Rs. ${Number(stats.averagePrice || 0).toLocaleString()}`}
          icon={WalletCards}
        />
      </div>

      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2 mb-4">
            <div className="col-md">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={18} />
                </span>
                <input
                  className="form-control border-start-0"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code or service name"
                />
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Service</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Appointments</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <LoaderCircle className="service-spin text-primary" />
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-secondary">
                      No services found.
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id}>
                      <td className="fw-semibold">{service.code}</td>
                      <td>{service.name}</td>
                      <td>{service.durationMin} min</td>
                      <td>Rs. {Number(service.price).toLocaleString()}</td>
                      <td>{service.appointmentCount || 0}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            service.isActive
                              ? "btn-success"
                              : "btn-outline-secondary"
                          }`}
                          onClick={() => toggleStatus(service)}
                        >
                          {service.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            onClick={() => openEdit(service)}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeService(service)}
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
        </div>
      </section>

      {showForm && (
        <ServiceModal
          editing={Boolean(editing)}
          form={form}
          formError={formError}
          fieldErrors={fieldErrors}
          saving={saving}
          onChange={handleChange}
          onClose={() => !saving && setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}

      <style>{`
        .service-spin { animation: service-spin 0.8s linear infinite; }
        @keyframes service-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <small className="text-secondary">{title}</small>
            <h4 className="fw-bold mt-2 mb-0">{value}</h4>
          </div>
          <div className="bg-primary-subtle text-primary rounded-3 p-3">
            <Icon size={21} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceModal({
  editing,
  form,
  formError,
  fieldErrors,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <>
      <div className="modal show d-block" style={{ zIndex: 1060 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 rounded-4 shadow">
            <form onSubmit={onSubmit}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editing ? "Edit Service" : "Add Service"}
                </h5>
                <button type="button" className="btn-close" onClick={onClose} />
              </div>

              <div className="modal-body">
                {formError && <div className="alert alert-danger">{formError}</div>}

                <div className="row g-3">
                  <Field
                    label="Code"
                    name="code"
                    value={form.code}
                    onChange={onChange}
                    error={fieldErrors.code}
                    col="col-md-4"
                    required
                  />
                  <Field
                    label="Service name"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    error={fieldErrors.name}
                    col="col-md-8"
                    required
                  />
                  <Field
                    label="Duration (minutes)"
                    name="durationMin"
                    type="number"
                    min="5"
                    max="480"
                    step="5"
                    value={form.durationMin}
                    onChange={onChange}
                    error={fieldErrors.durationMin}
                    col="col-md-6"
                    required
                  />
                  <Field
                    label="Price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={onChange}
                    error={fieldErrors.price}
                    col="col-md-6"
                    required
                  />

                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="isActive"
                        checked={form.isActive}
                        onChange={onChange}
                        id="service-active"
                      />
                      <label className="form-check-label" htmlFor="service-active">
                        Active service
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light border" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" style={{ zIndex: 1055 }} />
    </>
  );
}

function Field({ label, error, col, ...props }) {
  return (
    <div className={col}>
      <label className="form-label">{label}</label>
      <input className={`form-control ${error ? "is-invalid" : ""}`} {...props} />
      {error && (
        <div className="invalid-feedback">
          {Array.isArray(error) ? error[0] : error}
        </div>
      )}
    </div>
  );
}

export default Services;
