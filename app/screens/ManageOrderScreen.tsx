import { Dimensions, StyleSheet, View, ViewStyle } from "react-native";

import React, { useEffect, useState } from "react";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Layout,
  Icon,
  Card,
  Datepicker,
  DatepickerProps,
  I18nConfig,
  NativeDateService,
  Modal,
  Spinner,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useStorage, useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { OrderList, OrderScrollbar } from "../components/order";
import { i18nCalendar as i18n } from "../i18/i18n.config";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

// Định nghĩa kiểu cho params của các màn hình
type RootStackParamList = {
  ManageOrderScreen: undefined; // thêm các route khác nếu cần
};

// Định nghĩa kiểu cho props navigation và route
type ManageOrderScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ManageOrderScreen"
>;
type ManageOrderScreenRouteProp = RouteProp<
  RootStackParamList,
  "ManageOrderScreen"
>;

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ParamListBase } from "@react-navigation/native";

type ManageOrderScreenProps = NativeStackScreenProps<ParamListBase>;

const ManageOrderScreen = ({ route, navigation }: ManageOrderScreenProps) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [orderStatus, setOrderStatus] = useState("all");

  const [orderDate, setOrderDate] = useState(new Date());

  return (
    <Layout style={styles.mainLayout as ViewStyle}>
      <OrderScrollbar
        selectedFilter={orderStatus}
        setSelectedFilter={setOrderStatus}
      />
      <Datepicker
        style={{
          marginLeft: 10,
          marginRight: 10,
          marginBottom: 5,
          width: Dimensions.get("window").width - 20,
        }}
        // label={t("order_date")}
        date={orderDate}
        max={new Date()}
        onSelect={(nextDate) => setOrderDate(nextDate)}
        accessoryRight={(props) => <Icon {...props} name="calendar" />}
        dateService={
          new NativeDateService("vn", {
            i18n,
            startDayOfWeek: 0,
          })
        }
      />
      <OrderList status={orderStatus} date={orderDate}></OrderList>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  mainLayout: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    // flexDirection: "row",
    // flexWrap: "wrap",
    // paddingHorizontal: 20,
    // margin:10,
  },
  buttonContainer: {
    width: "45%",
    margin: 10,
  },
  bottomBtn: {
    justifyContent: "space-between",
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    backgroundColor: "color-primary-900",
    margin: 15,
    width: Dimensions.get("window").width - 30,
    height: 60,
    borderRadius: 5,
  },

  btnType: {
    display: "flex",
    flexDirection: "row",
  },
});

export default ManageOrderScreen;
