import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const backendUrl = 'http://localhost:8081';

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);

  axios.defaults.withCredentials = true;

  const getUserData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/auth/user`);
      if (data.success) {
        setUserData(data.user);
        setIsLoggedIn(true);
      } else {
        setUserData(null);
        setIsLoggedIn(false);
      }
    } catch (err) {
      // Only log real errors, ignore initial 401
      if (err.response?.status !== 401) console.error(err);
      setUserData(null);
      setIsLoggedIn(false);
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
    }}>
      {children}
    </AppContext.Provider>
  );
};
