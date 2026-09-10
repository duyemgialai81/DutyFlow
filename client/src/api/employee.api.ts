import { apiClient } from "./http";
import type { Department, Employee } from "../types/duty";

export const employeeApi = {
  list: () => apiClient.get<Employee[]>("/api/employees").then((r) => r.data),
  departments: () => apiClient.get<Department[]>("/api/departments").then((r) => r.data),
};
