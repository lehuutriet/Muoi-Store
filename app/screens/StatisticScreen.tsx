import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Text,
  Card,
  Spinner,
  Divider,
  TabBar,
  Tab,
  StyleService,
  useStyleSheet,
  useTheme,
} from "@ui-kitten/components";
import {
  ScrollView,
  View,
  Dimensions,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { Query } from "appwrite";

const StatisticScreen = () => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Dữ liệu thống kê
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [paidOrders, setPaidOrders] = useState(0);
  const [unpaidOrders, setUnpaidOrders] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState(0);

  // Khoảng thời gian thống kê: ngày, tuần, tháng
  const timeFrames = ["day", "week", "month"];
  const [timeFrame, setTimeFrame] = useState(timeFrames[0]);

  useEffect(() => {
    setTimeFrame(timeFrames[selectedIndex]);
  }, [selectedIndex]);

  useEffect(() => {
    loadStatistics();
  }, [timeFrame]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      // Lấy ngày hiện tại và thiết lập khoảng thời gian
      const today = new Date();
      let startDate = new Date();

      // Thiết lập thời gian bắt đầu dựa trên timeFrame
      if (timeFrame === "day") {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeFrame === "week") {
        startDate.setDate(today.getDate() - 7);
      } else if (timeFrame === "month") {
        startDate.setMonth(today.getMonth() - 1);
      }

      const startDateStr = startDate.toISOString();

      // Truy vấn các đơn hàng đã thanh toán
      const paidQuery = [
        Query.equal("status", ["cash", "transfer"]),
        Query.greaterThan("$createdAt", startDateStr),
      ];

      // Truy vấn đơn hàng chưa thanh toán
      const unpaidQuery = [
        Query.equal("status", "unpaid"),
        Query.greaterThan("$createdAt", startDateStr),
      ];

      // Truy vấn đơn hàng hôm nay
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayQuery = [
        Query.equal("status", ["cash", "transfer"]),
        Query.greaterThan("$createdAt", todayStart.toISOString()),
      ];

      // Lấy dữ liệu từ database
      const paidOrdersData = await getAllItem(COLLECTION_IDS.orders, paidQuery);
      const unpaidOrdersData = await getAllItem(
        COLLECTION_IDS.orders,
        unpaidQuery
      );
      const todayOrdersData = await getAllItem(
        COLLECTION_IDS.orders,
        todayQuery
      );

      // Tính tổng doanh thu
      let total = 0;
      paidOrdersData.forEach((order) => {
        total += Number(order.total) || 0;
      });

      // Tính doanh thu hôm nay
      let todayTotal = 0;
      todayOrdersData.forEach((order) => {
        todayTotal += Number(order.total) || 0;
      });

      // Cập nhật state
      setTotalRevenue(total);
      setDailyRevenue(todayTotal);
      setPaidOrders(paidOrdersData.length);
      setUnpaidOrders(unpaidOrdersData.length);
      setTotalOrders(paidOrdersData.length + unpaidOrdersData.length);
    } catch (error) {
      console.error("Lỗi tải thống kê:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTabs = () => (
    <TabBar
      selectedIndex={selectedIndex}
      onSelect={(index) => setSelectedIndex(index)}
    >
      <Tab title={t("day")} />
      <Tab title={t("week")} />
      <Tab title={t("month")} />
    </TabBar>
  );

  if (loading) {
    return (
      <Layout style={styles.loadingContainer as ViewStyle}>
        <Spinner size="large" />
        <Text category="s1" style={{ marginTop: 20 }}>
          {t("loading")}
        </Text>
      </Layout>
    );
  }

  return (
    <Layout style={styles.mainLayout as ViewStyle}>
      {renderTabs()}

      <ScrollView style={styles.scrollContainer as ViewStyle}>
        {/* Thống kê tổng quan */}
        <View style={styles.statsContainer as ViewStyle}>
          <Card style={styles.statCard as ViewStyle}>
            <Text category="h5">
              {Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(totalRevenue)}
            </Text>
            <Text category="s1">{t("total_revenue")}</Text>
          </Card>

          <Card style={styles.statCard as ViewStyle}>
            <Text category="h5">
              {Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(dailyRevenue)}
            </Text>
            <Text category="s1">{t("today_revenue")}</Text>
          </Card>

          <Card style={styles.statCard as ViewStyle}>
            <Text category="h5">{totalOrders}</Text>
            <Text category="s1">{t("total_orders")}</Text>
          </Card>

          <View style={styles.orderStatsRow as ViewStyle}>
            <Card style={styles.smallStatCard as ViewStyle}>
              <Text category="h6">{paidOrders}</Text>
              <Text category="c1">{t("paid_orders")}</Text>
            </Card>

            <Card style={styles.smallStatCard as ViewStyle}>
              <Text category="h6">{unpaidOrders}</Text>
              <Text category="c1">{t("unpaid_orders")}</Text>
            </Card>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  mainLayout: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    marginTop: 16,
  },
  statCard: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  orderStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  smallStatCard: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
});

export default StatisticScreen;
