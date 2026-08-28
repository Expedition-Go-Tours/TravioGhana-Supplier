import api from "@/lib/axios";

export async function fetchSupplierAnalytics() {
  const response = await api.get("/suppliers/dashboard", { skipGlobalErrorHandler: true });
  return response.data?.data || null;
}

export async function fetchMonthlyRevenue(months = 12) {
  const response = await api.get("/suppliers/monthly-revenue", {
    params: { months },
    skipGlobalErrorHandler: true,
  });
  return response.data?.data?.months || [];
}
