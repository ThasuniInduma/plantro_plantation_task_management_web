import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AppContext = createContext();

// ✅ ADD THESE TWO LINES
export const api = axios.create({
  baseURL: 'http://localhost:8081',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AppContextProvider = ({ children }) => {
  const backendUrl = 'http://localhost:8081';

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!(localStorage.getItem("token") && localStorage.getItem("user"));
  });

  const [userData, setUserData] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const getUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("token being sent:", token);
      if (!token) {
        setUserData(null);
        setIsLoggedIn(false);
        return;
      }

      const { data } = await api.get('/api/auth/user');

      console.log("getUserData response:", data);

      if (data.success) {
        setUserData(data.user);
        setIsLoggedIn(true);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        setUserData(null);
        setIsLoggedIn(false);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setUserData(null);
        setIsLoggedIn(false);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
  };

  useEffect(() => {
    getUserData();
  }, []);

  return (
    <AppContext.Provider value={{
      backendUrl,
      isLoggedIn,
      setIsLoggedIn,
      userData,
      getUserData,
      setUserData,
      api,
    }}>
      {children}
    </AppContext.Provider>
  );
};