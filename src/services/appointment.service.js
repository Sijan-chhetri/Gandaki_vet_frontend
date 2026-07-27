import apiRequest from "./api";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

const appointmentService = {
  getAppointments(params = {}) {
    return apiRequest(
      `/appointments${buildQuery(params)}`,
    );
  },

  getAppointmentStats() {
    return apiRequest("/appointments/stats");
  },

  getAppointmentById(id) {
    return apiRequest(`/appointments/${id}`);
  },

  createAppointment(payload) {
    return apiRequest("/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAppointment(id, payload) {
    return apiRequest(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  rescheduleAppointment(id, payload) {
    return apiRequest(
      `/appointments/${id}/reschedule`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  updateAppointmentStatus(id, status) {
    return apiRequest(
      `/appointments/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
  },

  cancelAppointment(id, cancellationReason) {
    return apiRequest(
      `/appointments/${id}/cancel`,
      {
        method: "PATCH",
        body: JSON.stringify({
          cancellationReason,
        }),
      },
    );
  },

  deleteAppointment(id) {
    return apiRequest(`/appointments/${id}`, {
      method: "DELETE",
    });
  },
};

export default appointmentService;