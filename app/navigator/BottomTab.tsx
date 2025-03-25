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
import WarehouseScreen from "../screens/WarehouseScreen";
import ManageOrderScreen from "../screens/ManageOrderScreen";
const { Navigator, Screen } = createBottomTabNavigator();
interface BottomTabBarProps {
  navigation: any;
  state: any;
}
const BottomTabBar: React.FC<BottomTabBarProps> = ({ navigation, state }) => {
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
        title={`${t("orders")}`}
        icon={(props): IconElement => <Icon {...props} name="shopping-cart" />}
      />
      <BottomNavigationTab
        title={`${t("warehouse")}`}
        icon={(props): IconElement => <Icon {...props} name="archive" />}
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
interface TabNavigatorProps {
  onLoggedOut?: () => void;
}
const TabNavigator: React.FC<TabNavigatorProps> = ({ onLoggedOut }) => {
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
        })}
      />
      <Screen
        name={`${t("orders")}`}
        component={ManageOrderScreen}
        options={({ navigation }) => ({
          title: `${t("manage_order")}`,
          headerTitleAlign: "left",
          unmountOnBlur: true,
        })}
      />
      <Screen
        name={`${t("warehouse")}`}
        component={WarehouseScreen}
        options={({ navigation }) => ({
          title: `${t("warehouse")}`,
          headerTitleAlign: "left",
          unmountOnBlur: true,
        })}
      />
      <Screen
        name={`${t("statistic")}`}
        component={StatisticScreen}
        options={({ navigation }) => ({
          title: `${t("statistic")}`,
          headerTitleAlign: "left",
          unmountOnBlur: true,
        })}
      />
      <Screen
        name={`${t("setting")}`}
        options={({ navigation }) => ({
          title: `${t("setting")}`,
          headerTitleAlign: "left",
        })}
      >
        {(props) => <SettingScreen {...props} onLoggedOut={onLoggedOut} />}
      </Screen>
    </Navigator>
  );
};

export default TabNavigator;
