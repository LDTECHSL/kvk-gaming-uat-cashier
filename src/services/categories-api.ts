import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const CATEGORIES_API_URL = `${API_URL}gaming-m/gaming-categories/`;

const getToken = () => {
  const cashier = localStorage.getItem("cashier")
    ? JSON.parse(localStorage.getItem("cashier") as string)
    : null;

  return cashier ? cashier.token : null;
};

export const getCategories = async () => {
  try {
    const response = await axios.get(`${CATEGORIES_API_URL}`, {
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};