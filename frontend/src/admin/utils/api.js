import { api } from "../../api/client";

export const fetchStats = async () => {
  try {
    const { data } = await api.get("/admin/stats");
    return data;
  } catch (err) {
    console.error("Failed to fetch stats", err);
    return {
      users: 0,
      books: 0,
      trees: 0,
      people: 0,
    };
  }
};

export const fetchRecentActivity = async () => {
  try {
    const { data } = await api.get("/admin/activity");
    return data;
  } catch (err) {
    console.error("Failed to fetch recent activity", err);
    return [];
  }
};
