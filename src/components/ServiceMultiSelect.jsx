import React, { useState } from "react";
import { Check, Search, X } from "lucide-react";

const MAX_SERVICES = 2;

const ServiceMultiSelect = ({
  selectedServices = [],
  onServicesChange,
  services = [],
  disabled = false,
  error,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const addService = (service) => {
    if (disabled) return;

    if (selectedServices.some((item) => item.id === service.id)) {
      return;
    }

    if (selectedServices.length >= MAX_SERVICES) {
      return;
    }

    onServicesChange([...selectedServices, service]);
    setSearchTerm("");
  };

  const removeService = (serviceId) => {
    if (disabled) return;
    onServicesChange(
      selectedServices.filter((service) => service.id !== serviceId),
    );
  };

  const filteredServices = services.filter((service) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return false;

    return (
      String(service.name || "").toLowerCase().includes(term) ||
      String(service.code || "").toLowerCase().includes(term)
    );
  });

  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + Number(service.durationMin || 0),
    0,
  );

  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + Number(service.price || 0),
    0,
  );

  const limitReached = selectedServices.length >= MAX_SERVICES;

  return (
    <div className="space-y-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-secondary">
          Select up to {MAX_SERVICES} services.
        </small>
        <small className={limitReached ? "text-danger fw-semibold" : "text-secondary"}>
          {selectedServices.length}/{MAX_SERVICES}
        </small>
      </div>

      {selectedServices.length > 0 && (
        <div className="space-y-2">
          {selectedServices.map((service) => (
            <div
              key={service.id}
              className="d-flex align-items-center justify-content-between p-2 bg-light rounded border"
            >
              <div className="min-w-0">
                <div className="fw-semibold text-truncate">
                  {service.name}
                </div>
                <small className="text-secondary">
                  {service.durationMin || 0} min
                  {service.price !== undefined && service.price !== null
                    ? ` • Rs. ${Number(service.price).toLocaleString()}`
                    : ""}
                </small>
              </div>

              <button
                type="button"
                onClick={() => removeService(service.id)}
                className="btn btn-sm btn-outline-danger ms-2"
                disabled={disabled}
                aria-label={`Remove ${service.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <div className="d-flex justify-content-between p-2 bg-primary-subtle rounded mt-2">
            <span>Total duration: {totalDuration} min</span>
            <span className="fw-bold">
              Total: Rs. {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      <div className="position-relative">
        <Search
          className="position-absolute top-50 translate-middle-y ms-2 text-secondary"
          size={18}
        />
        <input
          type="text"
          placeholder={
            limitReached ? "Maximum of 2 services selected" : "Search and add services..."
          }
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className={`form-control ps-5 ${error ? "is-invalid" : ""}`}
          disabled={disabled || limitReached}
        />
      </div>

      {searchTerm && !limitReached && filteredServices.length > 0 && (
        <div
          className="border rounded overflow-auto bg-white shadow-sm"
          style={{ maxHeight: "220px" }}
        >
          {filteredServices.map((service) => {
            const isSelected = selectedServices.some(
              (item) => item.id === service.id,
            );

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => addService(service)}
                disabled={isSelected}
                className={`d-flex justify-content-between align-items-center w-100 p-2 border-0 border-bottom bg-white text-start ${
                  isSelected ? "bg-light text-secondary" : ""
                }`}
                style={{ cursor: isSelected ? "not-allowed" : "pointer" }}
              >
                <span className="d-flex align-items-center gap-2">
                  {isSelected && <Check size={16} />}
                  <span>{service.name}</span>
                </span>
                <span className="text-secondary small">
                  {service.durationMin || 0} min
                  {service.price !== undefined && service.price !== null
                    ? ` • Rs. ${Number(service.price).toLocaleString()}`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {searchTerm && !limitReached && filteredServices.length === 0 && (
        <div className="small text-secondary border rounded p-2">
          No services found.
        </div>
      )}

      {limitReached && (
        <div className="small text-warning-emphasis">
          You can select a maximum of 2 services. Remove one to select another.
        </div>
      )}

      {error && <div className="text-danger small">{error}</div>}
    </div>
  );
};

export default ServiceMultiSelect;