import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";
import {
  useAccounts,
  useDatabases,
  COLLECTION_IDS,
  DATA_ATOM,
} from "../hook/AppWrite";
import { Query } from "appwrite";
import { useRecoilState, useRecoilCallback } from "recoil";
import * as RootNavigation from "./RootNavigation";
import { userAtom } from "../states";
import StackScreen from "./StackScreen";
import { NavigationContainer } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// Định nghĩa kiểu cho DataAtom
interface DataAtom {
  [key: string]: {
    all: any;
    ids: any;
    idData: (id: string) => any;
  };
}

// Định nghĩa kiểu cho params của stack
type RootStackParamList = {
  Main: {
    pushToken: string;
    onLoggedOut: () => void;
  };
};

type DrawerProps = {
  route: RouteProp<RootStackParamList, "Main">;
  navigation: StackNavigationProp<RootStackParamList, "Main">;
};

// Component Drawer chung cho cả Android và iOS
const Drawer = ({ route, navigation }: DrawerProps) => {
  const { pushToken, onLoggedOut } = route.params;
  const [userInfo, setUserInfo] = useRecoilState(userAtom);
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();
  const { logout, getUserPrefs, updateUserPrefs } = useAccounts();

  // Hàm loadDatabases giống nhau cho cả 2 platform
  const loadDatabases = useRecoilCallback(
    ({ set }) =>
      async (collection: keyof typeof COLLECTION_IDS, queries: any[] = []) => {
        const allData = await getAllItem(collection, queries);
        const atomData = DATA_ATOM[collection] as DataAtom[string];
        set(atomData.all, allData);
        const ids: string[] = [];
        for (const data of allData) {
          ids.push(data.$id);
          set(atomData.idData(data.$id), data);
        }
        set(atomData.ids, ids);
      },
    []
  );

  useEffect(() => {
    async function initData() {
      let userPrefs = await getUserPrefs();
      userPrefs.PUSH_TOKEN = pushToken || "";
      setUserInfo({
        ...userInfo,
        id: userPrefs.id || "",
        STORE_NAME: userPrefs.STORE_NAME || "",
        WIFI: userPrefs.WIFI || "",
        PUSH_TOKEN: pushToken || "",
      });
      updateUserPrefs(userPrefs);
      loadDatabases(COLLECTION_IDS.categories as keyof typeof COLLECTION_IDS);
      loadDatabases(COLLECTION_IDS.tables as keyof typeof COLLECTION_IDS, [
        Query.orderAsc("name"),
      ]);
      loadDatabases(COLLECTION_IDS.products as keyof typeof COLLECTION_IDS);
    }
    initData();
  }, []);

  // Render StackScreen trực tiếp với onLoggedOut
  return <StackScreen onLoggedOut={onLoggedOut} />;
};

export default Drawer;
