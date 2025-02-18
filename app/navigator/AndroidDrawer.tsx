import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ImageBackground,
  // Button,
  DrawerLayoutAndroid,
  Text,
  StyleSheet,
  View,
  // ViewProps,
} from "react-native";
import {
  Button,
  Icon,
  Divider,
  StyleService,
  useStyleSheet,
  useTheme,
  Layout,
} from "@ui-kitten/components";
import {
  useAccounts,
  useDatabases,
  useStorage,
  COLLECTION_IDS,
  DATA_ATOM,
} from "../hook/AppWrite";
import { Query } from "appwrite";
import { useRecoilState, useRecoilCallback, useResetRecoilState } from "recoil";

import * as RootNavigation from "./RootNavigation";

import MenuGroups from "./Menu";

import { userAtom } from "../states";
import StackScreen from "./StackScreen";

const AndroidDrawer = ({ pushToken, onLoggedOut }) => {
  const [userInfo, setUserInfo] = useRecoilState(userAtom);

  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();
  const { logout, getUserPrefs, updateUserPrefs } = useAccounts();
  const drawer = useRef<DrawerLayoutAndroid>(null);
  // Execute navigation when menuItem is pressed
  const onNavigate = (screenName: string, method: string) => {
    drawer.current?.closeDrawer();
    RootNavigation.navigate(screenName, { method: method });
  };
  const openDrawer = () => {
    drawer.current?.openDrawer();
  };
  // import logout function for logout button

  const loadDatabases = useRecoilCallback(
    ({ set }) =>
      async (collection: any, queries: any = []) => {
        const allData = await getAllItem(collection, queries);
        set(DATA_ATOM[collection].all, allData);
        const ids = [];
        for (const data of allData) {
          ids.push(data.$id);
          const idData = DATA_ATOM[collection].idData;
          set(idData(data.$id), data);
        }
        set(DATA_ATOM[collection].ids, ids);
      },
    []
  );

  useEffect(() => {
    async function initData() {
      let userPrefs = await getUserPrefs();
      userPrefs.PUSH_TOKEN = pushToken || "";
      setUserInfo({
        ...userInfo,
        STORE_NAME: userPrefs.STORE_NAME || "",
        WIFI: userPrefs.WIFI || "",
        PUSH_TOKEN: pushToken || "",
      });
      updateUserPrefs(userPrefs);
      loadDatabases(COLLECTION_IDS.categories);
      loadDatabases(COLLECTION_IDS.tables, [Query.orderAsc("name")]);
      loadDatabases(COLLECTION_IDS.products);
    }
    initData();
  }, []);

  const DrawerView = () => (
    <Layout level="2" style={styles.container}>
      <View
        style={{
          height: 100,
          display: "flex",
          flexDirection: "column-reverse",
        }}
      >
        <View style={styles.containerChild}>
          <ImageBackground
            style={styles.drawerHeaderIcon}
            source={require("../../assets/images/iconshop.png")}
            resizeMode="contain"
          ></ImageBackground>
          <Text style={styles.drawerTitle}>{userInfo.STORE_NAME}</Text>
        </View>
      </View>

      <Divider />
      <MenuGroups onNavigate={onNavigate} />
      <Divider style={{ height: 10 }} />
      <Layout level="3" style={styles.logout}>
        <Button
          style={styles.logoutBtn}
          status="warning"
          accessoryLeft={() => (
            <Icon
              style={styles.logoutIcon}
              fill="white"
              name="log-out-outline"
            />
          )}
          onPress={() => logout() && onLoggedOut()}
        >
          {t("logout")}
        </Button>
      </Layout>
    </Layout>
  );

  return (
    <DrawerLayoutAndroid
      ref={drawer}
      drawerWidth={200}
      drawerPosition="left"
      renderNavigationView={DrawerView}
    >
      <StackScreen openDrawer={openDrawer} />
    </DrawerLayoutAndroid>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  containerChild: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
  },

  paragraph: {
    padding: 16,
    fontSize: 15,
    textAlign: "center",
  },
  drawerHeaderIcon: {
    width: 45,
    height: 45,
    justifyContent: "flex-end",
    lineHeight: 45,
  },
  drawerTitle: {
    fontSize: 15,
    // lineHeight: 45,
    fontWeight: "bold",
    textAlign: "center",
    color: "color-primary-900",
    paddingLeft: 10,
  },
  headerRight: {
    display: "flex",
    flexDirection: "row",
  },
  menuIcon: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  logout: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutBtn: {
    width: "80%",
  },
  logoutIcon: {
    width: 20,
    height: 20,
  },
});

export default AndroidDrawer;
