import React from "react";

export const ThemeContext = React.createContext({
  theme: "light",
  toggleTheme: () => {},
});
export const DrawerContext = React.createContext({
  open: false,
  toggleDrawer: () => {},
});
export const AppwriteContext = React.createContext(null);
