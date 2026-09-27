import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const GAMING_API_URL = `${API_URL}gaming-m/additional-purchases/`;

const getToken = () => {
  const cashier = localStorage.getItem("cashier")
    ? JSON.parse(localStorage.getItem("cashier") as string)
    : null;

  return cashier ? cashier.token : null;
};

export const getAdditionalPurchasesByCategory = async (categoryId: string) => {
    try {
        const response = await axios.get(`${GAMING_API_URL}by-category/${categoryId}`, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}