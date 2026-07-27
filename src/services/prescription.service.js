import apiRequest from "./api";

function requireId(value, label) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return encodeURIComponent(value);
}

function createQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : "";
}

const prescriptionService = {
  create(payload) {
    if (!payload?.appointmentId) {
      throw new Error(
        "Appointment ID is required to create a prescription."
      );
    }

    return apiRequest("/prescriptions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    const prescriptionId = requireId(
      id,
      "Prescription ID"
    );

    return apiRequest(
      `/prescriptions/${prescriptionId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  getByAppointment(appointmentId) {
    const id = requireId(
      appointmentId,
      "Appointment ID"
    );

    return apiRequest(
      `/prescriptions/appointment/${id}`,
      {
        method: "GET",
      }
    );
  },

  getById(id) {
    const prescriptionId = requireId(
      id,
      "Prescription ID"
    );

    return apiRequest(
      `/prescriptions/${prescriptionId}`,
      {
        method: "GET",
      }
    );
  },

  getAll(params = {}) {
    return apiRequest(
      `/prescriptions${createQueryString(params)}`,
      {
        method: "GET",
      }
    );
  },

  updateStatus(id, status, endDate = null) {
    const prescriptionId = requireId(
      id,
      "Prescription ID"
    );

    if (!status) {
      throw new Error(
        "Prescription status is required."
      );
    }

    return apiRequest(
      `/prescriptions/${prescriptionId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
          endDate: endDate || null,
        }),
      }
    );
  },

  remove(id) {
    const prescriptionId = requireId(
      id,
      "Prescription ID"
    );

    return apiRequest(
      `/prescriptions/${prescriptionId}`,
      {
        method: "DELETE",
      }
    );
  },
};

export default prescriptionService;