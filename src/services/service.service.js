import apiRequest from "./api";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

const serviceService = {
  getServices(params = {}) {
    return apiRequest(`/services${buildQuery(params)}`);
  },

  getServiceStats() {
    return apiRequest("/services/stats");
  },

  getServiceById(id) {
    return apiRequest(`/services/${id}`);
  },

  createService(payload) {
    return apiRequest("/services", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateService(id, payload) {
    return apiRequest(`/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateServiceStatus(id, isActive) {
    return apiRequest(`/services/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  },

  deleteService(id) {
    return apiRequest(`/services/${id}`, {
      method: "DELETE",
    });
  },
};

export default serviceService;