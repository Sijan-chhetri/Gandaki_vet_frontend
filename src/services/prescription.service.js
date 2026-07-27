import apiRequest from "./api";

const prescriptionService = {
  getByAppointment: (appointmentId) =>
    apiRequest(`/prescriptions/appointment/${appointmentId}`, {
      method: "GET",
    }),

  create: (payload) =>
    apiRequest("/prescriptions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id, payload) =>
    apiRequest(`/prescriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};

export default prescriptionService;
