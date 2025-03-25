import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Icon,
  Divider,
  StyleService,
  useStyleSheet,
  useTheme,
  Avatar,
  Text,
} from "@ui-kitten/components";
import { useRecoilState } from "recoil";
import { userAtom } from "../states";
import {
  ImageStyle,
  Platform,
  ViewStyle,
  View,
  TouchableOpacity,
} from "react-native";
import UpdateStockScreen from "../../app/functions/edit/UpdateStockScreen";
import PrinterScreen from "../screens/PrinterScreen";
import StaffCheckoutScreen from "../screens/StaffCheckoutScreen";
import WarehouseScreen from "../screens/WarehouseScreen";
import ReportScreen from "../screens/ReportScreen";
import ChatScreen from "../screens/ChatScreen";
import ReviewOrderScreen from "../screens/ReviewOrderScreen";
import ReceiptScreen from "../screens/ReceiptScreen";
import PasswordScreen from "../screens/PasswordScreen";
import CreateOrderScreen from "../functions/add/CreateOrderScreen";
import ManageOrderScreen from "../screens/ManageOrderScreen";
import CreateProductScreen from "../functions/add/CreateProductScreen";
import ManageProductScreen from "../screens/ManageProductScreen";
import ManageTableScreen from "../screens/ManageTableScreen";
import CreateWarehouseEntryScreen from "../functions/add/CreateWarehouseEntryScreen";
import TabNavigator from "../navigator/BottomTab";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StatisticScreen from "../screens/StatisticScreen";
import { DrawerContext } from "../contexts/AppContext";
import RecipeScreen from "../screens/RecipeScreen";
import CreateRecipeScreen from "../functions/add/CreateRecipeScreen";
import EditRecipeScreen from "../functions/edit/EditRecipeScreen";
import LoyalCustomerScreen from "../screens/LoyalCustomerScreen";
import AddCustomerScreen from "../functions/add/AddCustomerScreen";
import EditCustomerScreen from "../functions/edit/EditCustomerScreen";
import CouponScreen from "../screens/CouponScreen";
import PromotionScreen from "../screens/PromotionScreen";
import SupplierScreen from "@/app/screens/SupplierScreen";
import AddSupplierScreen from "../functions/add/AddSupplierScreen";
import EditSupplierScreen from "../functions/edit/EditSupplierScreen";
import CalendarScreen from "../screens/CalendarScreen";
import LanguageScreen from "../screens/LanguageScreen";
// Định nghĩa các tham số cho navigation
type RootStackParamList = {
  TabNavigator: undefined;
  CreateProductScreen: { title: string; method: string; item?: any };
  ManageProductScreen: undefined;
  ManageTableScreen: undefined;
  ManageOrderScreen: undefined;
  CreateOrderScreen: { title: string; method: string };
  ReviewOrderScreen: { orderInfo?: any; onGoBack?: () => void };
  ReceiptScreen: { receiptData: any };
  PrinterScreen: undefined;
  PasswordScreen: undefined;
  StaffCheckoutScreen: undefined;
  WarehouseScreen: undefined;
  ReportScreen: undefined;
  ChatScreen: undefined;
  UpdateStockScreen: {
    item: {
      $id?: string;
      name: string;
      currentStock?: number;
      minStock?: number;
      price?: number;
    };
  };
  StatisticScreen: undefined;
  CreateWarehouseEntryScreen: undefined;
  StockTransferScreen: undefined;
  CreateRecipeScreen: undefined;
  RecipeScreen: undefined;
  EditRecipeScreen: { recipe: any };
  LoyalCustomerScreen: undefined;
  AddCustomerScreen: undefined;
  EditCustomerScreen: undefined;
  CouponScreen: undefined;
  PromotionScreen: undefined;
  SupplierScreen: undefined;
  AddSupplierScreen: undefined;
  EditSupplierScreen: {
    supplier: {
      $id: string;
      name: string;
      phone: string;
      email?: string;
      address?: string;
      contactPerson?: string;
      notes?: string;
    };
  };
  CalendarScreen: undefined;
  LanguageScreen: undefined;
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
  const { toggleDrawer } = useContext(DrawerContext);

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
        // Mặc định các màn hình khác dùng nút menu tiêu chuẩn
        headerLeft: ({ canGoBack }) => {
          return canGoBack ? undefined : (
            <Button
              style={styles.menuIcon as ViewStyle}
              appearance="ghost"
              accessoryLeft={(props) => (
                <Icon
                  {...props}
                  name="menu-outline"
                  fill={theme["color-primary-600"]}
                />
              )}
              onPress={toggleDrawer}
            />
          );
        },
      }}
    >
      <Stack.Screen
        name="TabNavigator"
        options={{
          title: "",
          gestureDirection: "horizontal",
          headerLeft: () => (
            <TouchableOpacity
              style={styles.headerLeftContainer as ViewStyle}
              onPress={toggleDrawer}
            >
              <Avatar
                size="medium"
                style={styles.avatarImage as ImageStyle}
                source={require("../../assets/images/iconshop.png")}
              />
              <View style={styles.headerTextContainer as ViewStyle}>
                <Text category="h6"> {t("shop_name")}</Text>
              </View>
            </TouchableOpacity>
          ),
          headerTitle: () => null,
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
        name="StatisticScreen"
        component={StatisticScreen}
        options={{ title: t("statistics") }}
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
        name="CreateWarehouseEntryScreen"
        component={CreateWarehouseEntryScreen}
        options={{
          title: t("add_inventory"),
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
        name="EditRecipeScreen"
        component={EditRecipeScreen}
        options={{
          title: t("edit_recipe"),
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          title: t("chat"),
        }}
      />
      <Stack.Screen
        name="UpdateStockScreen"
        component={UpdateStockScreen}
        options={{
          title: t("update_stock"),
        }}
      />
      <Stack.Screen
        name="RecipeScreen"
        component={RecipeScreen}
        options={{
          title: t("recipes"),
        }}
      />
      <Stack.Screen
        name="CreateRecipeScreen"
        component={CreateRecipeScreen}
        options={{
          title: t("create_recipe"),
        }}
      />
      <Stack.Screen
        name="LoyalCustomerScreen"
        component={LoyalCustomerScreen}
        options={{
          title: t("loyal_customers"),
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="AddCustomerScreen"
        component={AddCustomerScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditCustomerScreen"
        component={EditCustomerScreen}
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="CouponScreen"
        component={CouponScreen}
        options={{ title: t("coupons_promotions") }}
      />
      <Stack.Screen
        name="PromotionScreen"
        component={PromotionScreen}
        options={{ title: t("promotions") }}
      />
      <Stack.Screen
        name="SupplierScreen"
        component={SupplierScreen}
        options={{
          title: t("suppliers"),
        }}
      />
      <Stack.Screen
        name="AddSupplierScreen"
        component={AddSupplierScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditSupplierScreen"
        component={EditSupplierScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CalendarScreen"
        component={CalendarScreen}
        options={{
          title: t("calendar"),
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="LanguageScreen"
        component={LanguageScreen}
        options={{
          title: t("language"),
        }}
      />
    </Stack.Navigator>
  );
};

interface StyleProps {
  menuIcon: ViewStyle;
  avatarImage: ImageStyle;
  headerLeftContainer: ViewStyle;
  headerTextContainer: ViewStyle;
  settingsRow: ViewStyle;
}

const styleSheet = StyleService.create<StyleProps>({
  menuIcon: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "color-primary-300",
  },
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingVertical: 8,
  },
  headerTextContainer: {
    marginLeft: 10,
    justifyContent: "center",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default StackScreen;
