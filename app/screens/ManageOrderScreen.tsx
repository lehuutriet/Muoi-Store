import {
  Dimensions,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";

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
  NativeDateService,
  Modal,
  Spinner,
  useTheme,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";

import { OrderList, OrderScrollbar } from "../components/order";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ParamListBase } from "@react-navigation/native";

type ManageOrderScreenProps = NativeStackScreenProps<ParamListBase>;

const ManageOrderScreen = ({ route, navigation }: ManageOrderScreenProps) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const theme = useTheme();
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderDate, setOrderDate] = useState(new Date());

  // Hàm format ngày tháng theo định dạng Việt Nam
  const formatDateForDisplay = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <Layout style={styles.mainLayout as ViewStyle}>
      <OrderScrollbar
        selectedFilter={orderStatus}
        setSelectedFilter={setOrderStatus}
      />

      <View style={styles.calendarContainer as ViewStyle}>
        <Datepicker
          date={orderDate}
          onSelect={(nextDate) => setOrderDate(nextDate)}
          min={new Date(2020, 0, 1)}
          max={new Date(2030, 11, 31)}
          size="large"
        />

        <View style={styles.selectedDateContainer as ViewStyle}>
          <Icon
            name="calendar-outline"
            fill={theme["color-primary-500"]}
            style={styles.calendarIcon as ViewStyle}
          />
          <Text category="s1" style={styles.selectedDateText as TextStyle}>
            {t("showing_orders_for")}: {formatDateForDisplay(orderDate)}
          </Text>
        </View>
      </View>

      <OrderList status={orderStatus} date={orderDate}></OrderList>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  mainLayout: {
    flex: 1,
    width: "100%",
    backgroundColor: "background-basic-color-1",
  },
  calendarContainer: {
    backgroundColor: "background-basic-color-1",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
  },
  selectedDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 8,
    backgroundColor: "color-primary-100",
    borderRadius: 8,
  },
  calendarIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  selectedDateText: {
    color: "color-primary-700",
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
