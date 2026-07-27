import apiRequest from "./api";

const dashboardService = {
  getDashboard: async ({
    period = "monthly",
    date,
  } = {}) => {
    const searchParams =
      new URLSearchParams();

    searchParams.set(
      "period",
      period === "yearly"
        ? "yearly"
        : "monthly",
    );

    if (date) {
      searchParams.set("date", date);
    }

    return apiRequest(
      `/dashboard?${searchParams.toString()}`,
      {
        method: "GET",
      },
    );
  },
};

export default dashboardService;