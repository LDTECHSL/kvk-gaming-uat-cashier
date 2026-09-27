import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const GAMING_API_URL = `${API_URL}gaming-m/gaming-stations/`;

const getToken = () => {
  const cashier = localStorage.getItem("cashier")
    ? JSON.parse(localStorage.getItem("cashier") as string)
    : null;

  return cashier ? cashier.token : null;
};

export const createGamingStation = async (stationData: any) => {
    try {
        const response = await axios.post(`${GAMING_API_URL}`, stationData, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getGamingStationsByCategory = async (categoryId: string) => {
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
};

export const updateGamingStation = async (stationData: any) => {
    try {
        const response = await axios.put(`${GAMING_API_URL}`, stationData, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteGamingStation = async (stationId: string) => {
    try {
        const response = await axios.delete(`${GAMING_API_URL}${stationId}`, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};