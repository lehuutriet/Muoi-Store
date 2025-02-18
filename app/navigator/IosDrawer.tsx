import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ImageBackground, Text, View, useWindowDimensions } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
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
  COLLECTION_IDS,
  DATA_ATOM,
} from "../hook/AppWrite";
import { Query } from "appwrite";
import { useRecoilState, useRecoilCallback } from "recoil";
import * as RootNavigation from "./RootNavigation";
import MenuGroups from "./Menu";
import { userAtom } from "../states";
import StackScreen from "./StackScreen";

const DrawerNavigator = createDrawerNavigator();

const IosDrawer = ({ pushToken, onLoggedOut }) => {
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 768;
  const [userInfo, setUserInfo] = useRecoilState(userAtom);
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const drawer = useRef(null);
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();
  const { logout, getUserPrefs, updateUserPrefs } = useAccounts();

  const openDrawer = () => {
    drawer.current?.toggleDrawer();
  };

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

  const DrawerView = ({ navigation, state }) => {
    drawer.current = navigation;

    const onNavigate = (screenName: string, method: string) => {
      drawer.current?.closeDrawer();
      RootNavigation.navigate(screenName, { method: method });
    };

    return (
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
            />
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
  };

  return (
    <DrawerNavigator.Navigator
      drawerContent={(props) => <DrawerView {...props} />}
      screenOptions={{
        drawerType: "front",
        drawerStyle: isLargeScreen ? { width: 300 } : { width: "50%" },
        headerTitle: userInfo.STORE_NAME,
        headerShown: false,
      }}
    >
      <DrawerNavigator.Screen name="Store">
        {(props) => <StackScreen openDrawer={openDrawer} {...props} />}
      </DrawerNavigator.Screen>
    </DrawerNavigator.Navigator>
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

export default IosDrawer;
