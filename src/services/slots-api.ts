import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const SLOTS_API_URL = `${API_URL}gaming-m/gaming-slot-generation/`;

const getToken = () => {
  const cashier = localStorage.getItem("cashier")
    ? JSON.parse(localStorage.getItem("cashier") as string)
    : null;

  return cashier ? cashier.token : null;
};

export const getSlotConfigurationByCategory = async (categoryId: string) => {
  try {
    const response = await axios.get(`${SLOTS_API_URL}configuration-by-category?categoryId=${categoryId}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createSlotConfiguration = async (slotConfigData: any) => {
  try {
    const response = await axios.post(`${SLOTS_API_URL}`, slotConfigData, {
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateSlotConfiguration = async (slotConfigData: any) => {
  try {
    const response = await axios.put(`${SLOTS_API_URL}`, slotConfigData, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getSlotsAvailability = async (stationId: string, categoryId: string, date: string) => {
    try {
        const response = await axios.get(`${SLOTS_API_URL}availability-by-station-category?stationId=${stationId}&categoryId=${categoryId}&date=${date}`, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}