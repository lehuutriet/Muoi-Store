import React from "react";
import { Account, Teams, Graphql, Client, Databases } from "appwrite";

interface AppwriteContextType {
  client: Client;
  graphql: Graphql;
  account: Account;
  databases: Databases;
  teams: Teams;
  storage: Storage;
}
export const ThemeContext = React.createContext({
  theme: "light",
  toggleTheme: () => {},
});

export const DrawerContext = React.createContext({
  open: false,
  toggleDrawer: () => {},
});

export const AppwriteContext = React.createContext<AppwriteContextType | null>(
  null
);
