import apiRequest from "./api.js";

function queryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}

function requireId(id, label = "ID") {
  if (!id) throw new Error(`${label} is required`);
}

export function getVaccinations(params = {}) {
  return apiRequest(`/vaccinations${queryString(params)}`);
}

export function getVaccinationStats(params = {}) {
  return apiRequest(`/vaccinations/stats${queryString(params)}`);
}

export function getUpcomingVaccinations(params = {}) {
  return apiRequest(`/vaccinations/upcoming${queryString(params)}`);
}

export function getPetVaccinations(petId, params = {}) {
  requireId(petId, "Pet ID");
  return apiRequest(`/vaccinations/pet/${petId}${queryString(params)}`);
}

export function getVaccinationById(id) {
  requireId(id, "Vaccination ID");
  return apiRequest(`/vaccinations/${id}`);
}

export function createVaccination(payload) {
  return apiRequest("/vaccinations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateVaccination(id, payload) {
  requireId(id, "Vaccination ID");
  return apiRequest(`/vaccinations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function administerVaccination(id, payload) {
  requireId(id, "Vaccination ID");
  return apiRequest(`/vaccinations/${id}/administer`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function markVaccinationMissed(id, payload = {}) {
  requireId(id, "Vaccination ID");
  return apiRequest(`/vaccinations/${id}/missed`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function cancelVaccination(id, payload = {}) {
  requireId(id, "Vaccination ID");
  return apiRequest(`/vaccinations/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteVaccination(id) {
  requireId(id, "Vaccination ID");
  return apiRequest(`/vaccinations/${id}`, {
    method: "DELETE",
  });
}

export function getPets(params = {}) {
  return apiRequest(`/pets${queryString(params)}`);
}

export function getVaccineInventory(params = {}) {
  return apiRequest(
    `/inventory/items${queryString({
      ...params,
      type: "VACCINE",
      isActive: true,
    })}`,
  );
}

export function getVeterinarians(params = {}) {
  return apiRequest(
    `/users${queryString({
      ...params,
      role: "VETERINARIAN",
      isActive: true,
    })}`,
  );
}

export function sendAllVaccinationReminders() {
  return apiRequest("/sms/vaccination-reminders", {
    method: "POST",
  });
}

export function sendOwnerVaccinationReminder(ownerId) {
  requireId(ownerId, "Owner ID");

  return apiRequest(`/sms/vaccination-reminders/${ownerId}`, {
    method: "POST",
  });
}

const vaccinationService = {
  getVaccinations,
  getStats: getVaccinationStats,
  getUpcoming: getUpcomingVaccinations,
  getPetHistory: getPetVaccinations,
  getVaccination: getVaccinationById,
  create: createVaccination,
  update: updateVaccination,
  administer: administerVaccination,
  markMissed: markVaccinationMissed,
  cancel: cancelVaccination,
  delete: deleteVaccination,
  getPets,
  getVaccineInventory,
  getVeterinarians,
  sendAllReminders: sendAllVaccinationReminders,
  sendOwnerReminder: sendOwnerVaccinationReminder,
};

export default vaccinationService;
