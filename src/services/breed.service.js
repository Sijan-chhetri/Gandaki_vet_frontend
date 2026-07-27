import apiRequest from "./api.js";

function queryString(params = {}) {
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

  const value = query.toString();

  return value ? `?${value}` : "";
}

const breedService = {
  async getBreeds(speciesId = "") {
    return apiRequest(
      `/pets/breeds${queryString({
        speciesId,
      })}`,
    );
  },

  async createBreed(payload) {
    return apiRequest("/pets/breeds", {
      method: "POST",
      body: JSON.stringify({
        speciesId: payload?.speciesId?.trim(),
        name: payload?.name?.trim(),
      }),
    });
  },

  async updateBreed(breedId, payload) {
    return apiRequest(
      `/pets/breeds/${breedId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...(payload?.speciesId !== undefined
            ? {
                speciesId:
                  payload.speciesId?.trim(),
              }
            : {}),
          ...(payload?.name !== undefined
            ? {
                name: payload.name?.trim(),
              }
            : {}),
        }),
      },
    );
  },

  async deleteBreed(breedId) {
    return apiRequest(
      `/pets/breeds/${breedId}`,
      {
        method: "DELETE",
      },
    );
  },
};

export default breedService;