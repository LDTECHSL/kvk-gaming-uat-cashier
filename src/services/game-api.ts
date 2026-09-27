import axios from "axios";
import { getEnv } from "@/env";

const { API_URL } = getEnv();
const GAMES_API_URL = `${API_URL}gaming-m/games/`; 

const getToken = () => {
  const cashier = localStorage.getItem("cashier")
    ? JSON.parse(localStorage.getItem("cashier") as string)
    : null;

  return cashier ? cashier.token : null;
};

export const getGames = async () => {
  try {
    const response = await axios.get(`${GAMES_API_URL}`, {
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createGame = async (gameData: FormData) => {
    try {
        const response = await axios.post(`${GAMES_API_URL}`, gameData, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const updateGame = async (gameData: FormData) => {
    try {
        const response = await axios.put(`${GAMES_API_URL}`, gameData, {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const deleteGame = async (id: string | number) => {
  try {
    const response = await axios.delete(`${GAMES_API_URL}${id}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};