import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Text,
  Card,
  Spinner,
  TabBar,
  Tab,
  StyleService,
  useStyleSheet,
  useTheme,
} from "@ui-kitten/components";
import {
  ScrollView,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
  Dimensions,
} from "react-native";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { Query } from "appwrite";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart, BarChart, PieChart } from "react-native-gifted-charts";

const { width } = Dimensions.get("window");

// Định nghĩa các interface
interface OrderItem {
  name: string;
  price: number;
  count: number;
  $id: string;
}

interface Order {
  $id: string;
  order: string[];
  status: string;
  $createdAt: string;
  total: number;
}

// Định nghĩa kiểu dữ liệu cho các biểu đồ
interface LineChartData {
  value: number;
  label: string;
}

interface BarChartData {
  value: number;
  label: string;
  frontColor?: string;
}

interface PieChartData {
  value: number;
  text: string;
  color?: string;
}

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

  // Dữ liệu cho biểu đồ
  const [revenueData, setRevenueData] = useState<LineChartData[]>([]);
  const [topProducts, setTopProducts] = useState<PieChartData[]>([]);
  const [hourlyData, setHourlyData] = useState<BarChartData[]>([]);

  // Khoảng thời gian thống kê: ngày, tuần, tháng
  const timeFrames = ["day", "week", "month"];
  const [timeFrame, setTimeFrame] = useState(timeFrames[0]);

  useFocusEffect(
    React.useCallback(() => {
      console.log("StatisticScreen được focus - tải lại dữ liệu");
      loadStatistics();
      return () => {};
    }, [timeFrame])
  );

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
        // Lấy từ đầu tuần (thứ 2) đến hiện tại
        const day = today.getDay();
        const diff = day === 0 ? 6 : day - 1; // Tính số ngày từ thứ hai
        startDate.setDate(today.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeFrame === "month") {
        // Lấy từ đầu tháng đến hiện tại
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
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
      paidOrdersData.forEach((order: Order) => {
        total += Number(order.total) || 0;
      });

      // Tính doanh thu hôm nay
      let todayTotal = 0;
      todayOrdersData.forEach((order: Order) => {
        todayTotal += Number(order.total) || 0;
      });

      // Cập nhật state
      setTotalRevenue(total);
      setDailyRevenue(todayTotal);
      setPaidOrders(paidOrdersData.length);
      setUnpaidOrders(unpaidOrdersData.length);
      setTotalOrders(paidOrdersData.length + unpaidOrdersData.length);

      // Tạo dữ liệu cho biểu đồ doanh thu
      const revenueByDate = processRevenueByDate(paidOrdersData, timeFrame);
      setRevenueData(revenueByDate);

      // Tạo dữ liệu top sản phẩm bán chạy
      const topProductsData = processTopProducts(paidOrdersData);
      setTopProducts(topProductsData);

      // Tạo dữ liệu về thời điểm bán hàng cao điểm
      const hourlyDataChart = processHourlyData(paidOrdersData);
      setHourlyData(hourlyDataChart);
    } catch (error) {
      console.error("Lỗi tải thống kê:", error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý dữ liệu doanh thu theo ngày/tuần/tháng
  const processRevenueByDate = (
    orders: Order[],
    timeFrame: string
  ): LineChartData[] => {
    let dateMap = new Map<string, number>();

    // Định dạng ngày tháng khác nhau dựa vào khoảng thời gian
    const formatDate = (date: string) => {
      const d = new Date(date);
      if (timeFrame === "day") {
        return `${d.getHours()}h`;
      } else if (timeFrame === "week") {
        // Hiển thị ngày trong tuần (thứ 2, thứ 3, etc.)
        const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        return weekdays[d.getDay()];
      } else {
        // Với tháng, hiển thị ngày/tháng
        return `${d.getDate()}/${d.getMonth() + 1}`;
      }
    };

    // Lọc và nhóm dữ liệu theo ngày
    orders.forEach((order) => {
      const date = formatDate(order.$createdAt);
      if (dateMap.has(date)) {
        dateMap.set(date, (dateMap.get(date) || 0) + Number(order.total || 0));
      } else {
        dateMap.set(date, Number(order.total || 0));
      }
    });

    // Chuyển đổi Map thành mảng các điểm dữ liệu
    let sortedEntries: [string, number][];
    if (timeFrame === "day") {
      // Sắp xếp theo giờ
      sortedEntries = [...dateMap.entries()].sort((a, b) => {
        const hourA = parseInt(a[0]);
        const hourB = parseInt(b[0]);
        return hourA - hourB;
      });
    } else {
      // Sắp xếp theo ngày tháng
      sortedEntries = [...dateMap.entries()].sort((a, b) => {
        const [dayA, monthA] = a[0].split("/").map(Number);
        const [dayB, monthB] = b[0].split("/").map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
      });
    }

    // Tạo dữ liệu cho LineChart
    return sortedEntries.map(([key, value]) => ({
      value: value,
      label: key,
    }));
  };

  // Hàm xử lý dữ liệu top sản phẩm bán chạy
  const processTopProducts = (orders: Order[]): PieChartData[] => {
    let productMap = new Map<string, number>();

    // Đếm số lượng sản phẩm
    orders.forEach((order) => {
      if (order.order && Array.isArray(order.order)) {
        order.order.forEach((itemString) => {
          try {
            const item: OrderItem =
              typeof itemString === "string"
                ? JSON.parse(itemString)
                : (itemString as unknown as OrderItem);

            const productName = item.name;
            const count = item.count || 1;

            if (productMap.has(productName)) {
              productMap.set(
                productName,
                (productMap.get(productName) || 0) + count
              );
            } else {
              productMap.set(productName, count);
            }
          } catch (e) {
            console.error("Lỗi khi xử lý item trong đơn hàng:", e);
          }
        });
      }
    });

    // Màu sắc cho biểu đồ tròn
    const colors = [
      "#FF7675",
      "#74B9FF",
      "#55EFC4",
      "#FCA5A5",
      "#A3A1FB",
      "#FFA07A",
      "#00CED1",
      "#F08080",
      "#20B2AA",
      "#FFB6C1",
    ];

    // Sắp xếp và lấy top 5 sản phẩm
    return [...productMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], index) => ({
        value: count,
        text: name,
        color: colors[index % colors.length],
      }));
  };

  // Hàm xử lý dữ liệu về thời điểm bán hàng cao điểm (theo giờ)
  const processHourlyData = (orders: Order[]): BarChartData[] => {
    let hourlyMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, 0);
    }

    orders.forEach((order) => {
      const orderDate = new Date(order.$createdAt);
      const hour = orderDate.getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });

    // Chuyển đổi thành mảng dữ liệu cho biểu đồ
    const result: BarChartData[] = [];

    // Chỉ hiển thị các giờ có hoạt động
    for (let i = 7; i < 24; i++) {
      const count = hourlyMap.get(i) || 0;
      if (count > 0) {
        result.push({
          value: count,
          label: `${i}h`,
          frontColor: theme["color-warning-500"],
        });
      }
    }

    return result;
  };

  return (
    <Layout style={styles.mainLayout as ViewStyle}>
      <View style={styles.header as ViewStyle}>
        <TabBar
          style={styles.tabBar as ViewStyle}
          selectedIndex={selectedIndex}
          onSelect={(index) => setSelectedIndex(index)}
        >
          <Tab title={t("day")} />
          <Tab title={t("week")} />
          <Tab title={t("month")} />
        </TabBar>
      </View>

      {loading ? (
        <View style={styles.loadingContainer as ViewStyle}>
          <Spinner size="large" />
          <Text category="s1" style={styles.loadingText as TextStyle}>
            {t("loading")}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer as ViewStyle}>
          <View style={styles.mainStats as ViewStyle}>
            <Card
              style={
                [
                  styles.mainStatCard,
                  styles.revenueCard,
                ] as StyleProp<ViewStyle>
              }
            >
              <Text category="label" style={styles.statLabel as TextStyle}>
                {t("total_revenue")}
              </Text>
              <Text category="h4" style={styles.statValue as TextStyle}>
                {Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(totalRevenue)}
              </Text>
            </Card>

            <Card
              style={
                [styles.mainStatCard, styles.todayCard] as StyleProp<ViewStyle>
              }
            >
              <Text category="label" style={styles.statLabel as TextStyle}>
                {timeFrame === "day"
                  ? t("today_revenue")
                  : timeFrame === "week"
                  ? t("week_revenue")
                  : t("month_revenue")}
              </Text>
              <Text category="h4" style={styles.statValue as TextStyle}>
                {Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(dailyRevenue)}
              </Text>
            </Card>
          </View>

          <View style={styles.orderStats as ViewStyle}>
            <Card style={styles.totalOrderCard as ViewStyle}>
              <View style={styles.orderCardContent as ViewStyle}>
                <Text category="label">{t("total_orders")}</Text>
                <Text category="h3">{totalOrders}</Text>
              </View>
            </Card>

            <View style={styles.orderDetailsRow as ViewStyle}>
              <Card
                style={
                  [
                    styles.orderDetailCard,
                    styles.paidCard,
                  ] as StyleProp<ViewStyle>
                }
              >
                <View style={styles.orderDetailContent as ViewStyle}>
                  <Text category="label">{t("paid_orders")}</Text>
                  <Text category="h5">{paidOrders}</Text>
                </View>
              </Card>

              <Card
                style={
                  [
                    styles.orderDetailCard,
                    styles.unpaidCard,
                  ] as StyleProp<ViewStyle>
                }
              >
                <View style={styles.orderDetailContent as ViewStyle}>
                  <Text category="label">{t("unpaid_orders")}</Text>
                  <Text category="h5">{unpaidOrders}</Text>
                </View>
              </Card>
            </View>
          </View>

          {/* Biểu đồ doanh thu theo thời gian */}
          <Card style={styles.chartCard as ViewStyle}>
            <Text category="h6" style={styles.chartTitle as TextStyle}>
              {timeFrame === "day"
                ? t("revenue_by_hour")
                : timeFrame === "week"
                ? t("revenue_by_day")
                : t("revenue_by_date")}
            </Text>
            {revenueData.length > 0 ? (
              <View style={styles.chartContainer as ViewStyle}>
                <LineChart
                  data={revenueData}
                  width={width - 80}
                  height={220}
                  hideDataPoints={false}
                  spacing={40}
                  color={theme["color-primary-500"]}
                  thickness={2}
                  startFillColor={theme["color-primary-100"]}
                  endFillColor={theme["color-primary-100"]}
                  startOpacity={0.4}
                  endOpacity={0.1}
                  initialSpacing={10}
                  noOfSections={6}
                  yAxisTextStyle={{ color: theme["text-hint-color"] }}
                  rulesColor={theme["color-basic-400"]}
                  rulesType="solid"
                  yAxisColor={theme["color-basic-500"]}
                  xAxisColor={theme["color-basic-500"]}
                  showVerticalLines
                  verticalLinesColor={theme["color-basic-400"]}
                  dataPointsColor={theme["color-primary-600"]}
                  dataPointsRadius={5}
                  focusEnabled
                  showFractionalValues
                  formatYLabel={(value: any) => `${Math.round(value / 1000)}k`}
                  // Đã xóa pointerLabelComponent vì nó không tồn tại trong API hiện tại
                />
              </View>
            ) : (
              <Text style={styles.noDataText as TextStyle}>
                {t("no_data_available")}
              </Text>
            )}
          </Card>

          {/* Biểu đồ sản phẩm bán chạy */}
          <Card style={styles.chartCard as ViewStyle}>
            <Text category="h6" style={styles.chartTitle as TextStyle}>
              {t("top_selling_products")}
            </Text>
            {topProducts.length > 0 ? (
              <View style={styles.pieChartContainer as ViewStyle}>
                <PieChart
                  data={topProducts}
                  donut
                  textColor={theme["text-basic-color"]}
                  textSize={10}
                  showGradient={true}
                  sectionAutoFocus
                  radius={90}
                  innerRadius={30}
                  innerCircleColor={theme["background-basic-color-1"]}
                  centerLabelComponent={() => {
                    return (
                      <View style={styles.pieCenterLabel as ViewStyle}>
                        <Text style={styles.pieCenterText as TextStyle}>
                          {t("products")}
                        </Text>
                      </View>
                    );
                  }}
                />
                <View style={styles.legendContainer as ViewStyle}>
                  {topProducts.map((item, index) => (
                    <View key={index} style={styles.legendItem as ViewStyle}>
                      <View
                        style={[
                          styles.legendColor as ViewStyle,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text style={styles.legendText as TextStyle}>
                        {item.text.length > 15
                          ? item.text.substring(0, 15) + "..."
                          : item.text}{" "}
                        ({item.value})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.noDataText as TextStyle}>
                {t("no_data_available")}
              </Text>
            )}
          </Card>

          {/* Biểu đồ thời điểm bán hàng cao điểm */}
          <Card style={styles.chartCard as ViewStyle}>
            <Text category="h6" style={styles.chartTitle as TextStyle}>
              {t("peak_selling_times")}
            </Text>
            {hourlyData.length > 0 ? (
              <View style={styles.chartContainer as ViewStyle}>
                <BarChart
                  data={hourlyData}
                  width={width - 80}
                  height={220}
                  spacing={20}
                  barWidth={30}
                  noOfSections={5}
                  barBorderRadius={4}
                  initialSpacing={10}
                  yAxisTextStyle={{ color: theme["text-hint-color"] }}
                  // Xóa xAxisTextStyle
                  showVerticalLines
                  verticalLinesColor={theme["color-basic-400"]}
                  yAxisColor={theme["color-basic-500"]}
                  xAxisColor={theme["color-basic-500"]}
                  rulesColor={theme["color-basic-400"]}
                  rulesType="solid"
                  xAxisLabelTextStyle={{ color: theme["text-hint-color"] }}
                />
              </View>
            ) : (
              <Text style={styles.noDataText as TextStyle}>
                {t("no_data_available")}
              </Text>
            )}
          </Card>
        </ScrollView>
      )}
    </Layout>
  );
};

const styleSheet = StyleService.create({
  mainLayout: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  },
  header: {
    padding: 16,
    backgroundColor: "background-basic-color-1",
  },
  headerTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  tabBar: {
    marginBottom: 8,
    borderRadius: 12,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  mainStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  mainStatCard: {
    flex: 1,
    margin: 4,
    padding: 16,
    borderRadius: 16,
  },
  revenueCard: {
    backgroundColor: "color-primary-100",
  },
  todayCard: {
    backgroundColor: "color-success-100",
  },
  statLabel: {
    marginBottom: 8,
    color: "text-hint-color",
  },
  statValue: {
    color: "text-basic-color",
    fontSize: 18,
  },
  orderStats: {
    marginTop: 8,
  },
  totalOrderCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "color-info-100",
  },
  orderCardContent: {
    padding: 16,
    alignItems: "center",
  },
  orderDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderDetailCard: {
    flex: 1,
    margin: 4,
    borderRadius: 16,
  },
  orderDetailContent: {
    padding: 16,
    alignItems: "center",
  },
  paidCard: {
    backgroundColor: "color-success-100",
  },
  unpaidCard: {
    backgroundColor: "color-warning-100",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
  },
  chartCard: {
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  chartTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  chartContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  noDataText: {
    textAlign: "center",
    padding: 20,
    color: "text-hint-color",
  },
  tooltipContainer: {
    backgroundColor: "background-basic-color-1",
    padding: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipText: {
    fontWeight: "bold",
  },
  tooltipValue: {
    marginTop: 4,
  },
  pieChartContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  pieCenterLabel: {
    justifyContent: "center",
    alignItems: "center",
  },
  pieCenterText: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "bold",
  },
  legendContainer: {
    marginTop: 16,
    padding: 8,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
  },
});

export default StatisticScreen;
