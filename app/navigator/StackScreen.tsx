import React from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Icon,
  Divider,
  StyleService,
  useStyleSheet,
  useTheme,
} from "@ui-kitten/components";
import { useRecoilState } from "recoil";
import { userAtom } from "../states";
import { Platform, ViewStyle } from "react-native";

import PrinterScreen from "../screens/PrinterScreen";
import StaffCheckoutScreen from "../screens/StaffCheckoutScreen";
import WarehouseScreen from "../screens/WarehouseScreen";
import ReportScreen from "../screens/ReportScreen";
import ChatScreen from "../screens/ChatScreen";
import ReviewOrderScreen from "../screens/ReviewOrderScreen";
import ReceiptScreen from "../screens/ReceiptScreen";
import PasswordScreen from "../screens/PasswordScreen";
import CreateOrderScreen from "../screens/CreateOrderScreen";
import ManageOrderScreen from "../screens/ManageOrderScreen";
import CreateProductScreen from "../screens/CreateProductScreen";
import ManageProductScreen from "../screens/ManageProductScreen";
import ManageTableScreen from "../screens/ManageTableScreen";

import TabNavigator from "./BottomTab";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Định nghĩa các tham số cho navigation
type RootStackParamList = {
  TabNavigator: undefined;
  CreateProductScreen: { title: string; method: string; item?: any };
  ManageProductScreen: undefined;
  ManageTableScreen: undefined;
  ManageOrderScreen: undefined;
  CreateOrderScreen: { title: string; method: string };
  ReviewOrderScreen: { orderInfo?: any };
  ReceiptScreen: { receiptData: any };
  PrinterScreen: undefined;
  PasswordScreen: undefined;
  StaffCheckoutScreen: undefined;
  WarehouseScreen: undefined;
  ReportScreen: undefined;
  ChatScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface StackScreenProps {
  openDrawer?: (() => void) | null;
  onLoggedOut?: () => void;
}

const StackScreen: React.FC<StackScreenProps> = ({
  openDrawer,
  onLoggedOut,
}) => {
  const theme = useTheme();
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [userInfo, setUserInfo] = useRecoilState(userAtom);

  return (
    <Stack.Navigator
      screenOptions={{
        gestureEnabled: true,
        gestureDirection: "horizontal",
        animation: Platform.OS === "android" ? "slide_from_right" : "default",
        presentation: Platform.OS === "android" ? "modal" : "card",
        headerTintColor: theme["color-primary-900"],
        headerBackTitle: "Back",
        animationDuration: 150,
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen
        name="TabNavigator"
        options={{
          title: userInfo.STORE_NAME,
          gestureDirection: "horizontal",
        }}
      >
        {(props) => <TabNavigator {...props} onLoggedOut={onLoggedOut} />}
      </Stack.Screen>

      <Stack.Screen
        name="CreateProductScreen"
        component={CreateProductScreen}
        options={{
          title: t("create_product"),
        }}
      />
      <Stack.Screen
        name="ManageProductScreen"
        component={ManageProductScreen}
        options={{
          title: t("manage_product"),
        }}
      />
      <Stack.Screen
        name="ManageTableScreen"
        component={ManageTableScreen}
        options={{
          title: t("manage_table"),
        }}
      />
      <Stack.Screen
        name="ManageOrderScreen"
        component={ManageOrderScreen}
        options={{
          title: t("manage_order"),
        }}
      />
      <Stack.Screen
        name="CreateOrderScreen"
        component={CreateOrderScreen}
        options={{
          title: t("create_order"),
        }}
      />
      <Stack.Screen
        name="ReviewOrderScreen"
        component={ReviewOrderScreen}
        options={{
          title: t("review_order"),
        }}
      />
      <Stack.Screen
        name="ReceiptScreen"
        component={ReceiptScreen}
        options={{
          title: t("receipt_detail"),
        }}
      />
      <Stack.Screen
        name="PrinterScreen"
        component={PrinterScreen}
        options={{
          title: t("connect_printer"),
        }}
      />
      <Stack.Screen
        name="PasswordScreen"
        component={PasswordScreen}
        options={{
          title: t("password_change"),
        }}
      />
      <Stack.Screen
        name="StaffCheckoutScreen"
        component={StaffCheckoutScreen}
        options={{
          title: "StaffCheckoutScreen",
        }}
      />
      <Stack.Screen
        name="WarehouseScreen"
        component={WarehouseScreen}
        options={{
          title: t("warehouse"),
        }}
      />
      <Stack.Screen
        name="ReportScreen"
        component={ReportScreen}
        options={{
          title: t("report"),
        }}
      />

      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          title: t("chat"),
        }}
      />
    </Stack.Navigator>
  );
};

interface StyleProps {
  menuIcon: ViewStyle;
}

const styleSheet = StyleService.create<StyleProps>({
  menuIcon: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
});

export default StackScreen;
