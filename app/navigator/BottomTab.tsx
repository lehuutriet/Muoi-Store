import React from "react";
import { useTranslation } from "react-i18next";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  // Button,
  BottomNavigation,
  BottomNavigationTab,
  Icon,
  IconElement,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";

// import { StyleSheet } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import StatisticScreen from "../screens/StatisticScreen";
import SettingScreen from "../screens/SettingScreen";
const { Navigator, Screen } = createBottomTabNavigator();

const BottomTabBar = ({ navigation, state }) => {
  const { t } = useTranslation();
  return (
    <BottomNavigation
      selectedIndex={state.index}
      onSelect={(index) => navigation.navigate(state.routeNames[index])}
    >
      <BottomNavigationTab
        title={`${t("home")}`}
        icon={(props): IconElement => <Icon {...props} name="home" />}
      />
      <BottomNavigationTab
        title={`${t("statistic")}`}
        icon={(props): IconElement => <Icon {...props} name="pie-chart-2" />}
      />
      <BottomNavigationTab
        title={`${t("setting")}`}
        icon={(props): IconElement => <Icon {...props} name="settings" />}
      />
    </BottomNavigation>
  );
};

const TabNavigator = () => {
  const { t } = useTranslation();
  return (
    <Navigator tabBar={(props) => <BottomTabBar {...props} />}>
      <Screen
        name={`${t("home")}`}
        component={HomeScreen}
        options={({ navigation }) => ({
          title: `${t("home")}`,
          headerShown: false,
          headerTitleAlign: "left",
          // headerLeft: () => (
          //   <Button
          //     // title="Open drawer"
          //     style={styles.menuIcon}
          //     accessoryLeft={(props) => <Icon {...props} name="menu-2" />}
          //     onPress={() => props.drawer.current?.openDrawer()}
          //     appearance="outline"
          //   />
          // ),
        })}
      />
      <Screen
        name={`${t("statistic")}`}
        component={StatisticScreen}
        options={({ navigation }) => ({
          title: `${t("statistic")}`,
          headerTitleAlign: "left",
          // headerShown: false,
          // headerLeft: () => (
          //   <Button
          //     // title="Open drawer"
          //     style={styles.menuIcon}
          //     accessoryLeft={(props) => <Icon {...props} name="menu-2" />}
          //     onPress={() => props.drawer.current?.openDrawer()}
          //     appearance="outline"
          //   />
          // ),
        })}
      />
      <Screen
        name={`${t("setting")}`}
        component={SettingScreen}
        options={({ navigation }) => ({
          title: `${t("setting")}`,
          headerTitleAlign: "left",
          // headerShown: false
          // headerLeft: () => (
          //   <Button
          //     // title="Open drawer"
          //     style={styles.menuIcon}
          //     accessoryLeft={(props) => <Icon {...props} name="menu-2" />}
          //     appearance="outline"
          //     // onPress={() => props.drawer.current?.openDrawer()}
          //   />
          // ),
        })}
      />
    </Navigator>
  );
};

export default TabNavigator;
