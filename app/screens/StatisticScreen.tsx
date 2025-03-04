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
  location?: string;
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

interface Product {
  $id: string;
  name: string;
  price: number;
  cost?: number;
  category?: string;
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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [profitData, setProfitData] = useState<LineChartData[]>([]);

  // Khoảng thời gian thống kê: ngày, tuần, tháng
  const timeFrames = ["day", "week", "month"];
  const [timeFrame, setTimeFrame] = useState(timeFrames[0]);
  // Dữ liệu doanh thu theo khung giờ
  const [morningRevenue, setMorningRevenue] = useState(0); // 6h-12h
  const [noonRevenue, setNoonRevenue] = useState(0); // 12h-18h
  const [eveningRevenue, setEveningRevenue] = useState(0); // 18h-22h

  // Dữ liệu doanh thu theo khu vực
  const [dineInRevenue, setDineInRevenue] = useState(0);
  const [takeAwayRevenue, setTakeAwayRevenue] = useState(0);
  const [deliveryRevenue, setDeliveryRevenue] = useState(0);

  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [maxOrderValue, setMaxOrderValue] = useState(0);
  const [minOrderValue, setMinOrderValue] = useState(0);
  // Thêm doanh thu năm
  const [yearlyRevenue, setYearlyRevenue] = useState(0);
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
        const day = today.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startDate.setDate(today.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeFrame === "month") {
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

      // Thêm truy vấn cho doanh thu năm
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);
      const yearQuery = [
        Query.equal("status", ["cash", "transfer"]),
        Query.greaterThan("$createdAt", yearStart.toISOString()),
      ];

      // Lấy dữ liệu từ database
      const productData = await getAllItem(COLLECTION_IDS.products);
      setAllProducts(productData);

      const paidOrdersData = await getAllItem(COLLECTION_IDS.orders, paidQuery);
      const unpaidOrdersData = await getAllItem(
        COLLECTION_IDS.orders,
        unpaidQuery
      );
      const todayOrdersData = await getAllItem(
        COLLECTION_IDS.orders,
        todayQuery
      );
      const yearOrdersData = await getAllItem(COLLECTION_IDS.orders, yearQuery);

      // Tính tổng doanh thu
      let total = 0;
      paidOrdersData.forEach((order: Order) => {
        total += Number(order.total) || 0;
      });

      // Tính giá trị trung bình, cao nhất, thấp nhất - ĐẶT SAU KHI ĐÃ CÓ paidOrdersData và total
      if (paidOrdersData.length > 0) {
        // Giá trị trung bình
        const avgValue = Math.round(total / paidOrdersData.length);
        setAvgOrderValue(avgValue);

        // Tìm giá trị cao nhất và thấp nhất
        let max = 0;
        let min = Number.MAX_VALUE;

        paidOrdersData.forEach((order: Order) => {
          const orderValue = Number(order.total) || 0;
          if (orderValue > max) max = orderValue;
          if (orderValue < min) min = orderValue;
        });

        setMaxOrderValue(max);
        setMinOrderValue(min > 0 && min < Number.MAX_VALUE ? min : 0);
      } else {
        setAvgOrderValue(0);
        setMaxOrderValue(0);
        setMinOrderValue(0);
      }

      // Tính doanh thu hôm nay
      let todayTotal = 0;
      todayOrdersData.forEach((order: Order) => {
        todayTotal += Number(order.total) || 0;
      });

      // Tính doanh thu theo khung giờ
      let morning = 0;
      let noon = 0;
      let evening = 0;

      // Tính doanh thu theo khu vực (giả sử có trường location trong đơn hàng)
      let dineIn = 0;
      let takeAway = 0;
      let delivery = 0;

      // Tính doanh thu năm
      let yearTotal = 0;
      yearOrdersData.forEach((order: Order) => {
        yearTotal += Number(order.total) || 0;
      });

      paidOrdersData.forEach((order: Order) => {
        const orderDate = new Date(order.$createdAt);
        const hour = orderDate.getHours();

        // Phân loại theo khung giờ
        if (hour >= 6 && hour < 12) {
          morning += Number(order.total) || 0;
        } else if (hour >= 12 && hour < 18) {
          noon += Number(order.total) || 0;
        } else if (hour >= 18 && hour < 22) {
          evening += Number(order.total) || 0;
        }

        // Phân loại theo khu vực
        const location = order.location || "dine-in"; // Mặc định là tại quán
        if (location === "dine-in") {
          dineIn += Number(order.total) || 0;
        } else if (location === "take-away") {
          takeAway += Number(order.total) || 0;
        } else if (location === "delivery") {
          delivery += Number(order.total) || 0;
        }
      });

      // Cập nhật state
      setTotalRevenue(total);
      setDailyRevenue(todayTotal);
      setPaidOrders(paidOrdersData.length);
      setUnpaidOrders(unpaidOrdersData.length);
      setTotalOrders(paidOrdersData.length + unpaidOrdersData.length);
      setMorningRevenue(morning);
      setNoonRevenue(noon);
      setEveningRevenue(evening);
      setDineInRevenue(dineIn);
      setTakeAwayRevenue(takeAway);
      setDeliveryRevenue(delivery);
      setYearlyRevenue(yearTotal);

      // Tạo dữ liệu cho biểu đồ doanh thu
      const revenueByDate = processRevenueByDate(paidOrdersData, timeFrame);
      setRevenueData(revenueByDate);

      // Tạo dữ liệu top sản phẩm bán chạy
      const topProductsData = processTopProducts(paidOrdersData);
      setTopProducts(topProductsData);

      // Tạo dữ liệu về thời điểm bán hàng cao điểm
      const hourlyDataChart = processHourlyData(paidOrdersData);
      setHourlyData(hourlyDataChart);

      // Tính chi phí và lợi nhuận từ các đơn hàng đã thanh toán
      let totalCost = 0;
      let profit = 0;

      paidOrdersData.forEach((order: Order) => {
        if (order.order && Array.isArray(order.order)) {
          order.order.forEach((itemString) => {
            try {
              const item: OrderItem =
                typeof itemString === "string"
                  ? JSON.parse(itemString)
                  : (itemString as unknown as OrderItem);

              // Lấy thông tin chi phí từ sản phẩm
              const product = productData.find((p) => p.$id === item.$id);
              const cost = product?.cost || 0;

              // Tính chi phí và lợi nhuận
              const itemCost = cost * (item.count || 1);
              const itemRevenue = (item.price || 0) * (item.count || 1);
              const itemProfit = itemRevenue - itemCost;

              totalCost += itemCost;
              profit += itemProfit;
            } catch (e) {
              console.error("Lỗi khi xử lý item trong đơn hàng:", e);
            }
          });
        }
      });

      // Cập nhật state lợi nhuận
      setTotalProfit(profit);

      // Cập nhật biểu đồ lợi nhuận
      const profitDataChart = processRevenueByDate(
        paidOrdersData,
        timeFrame,
        productData
      );
      setProfitData(profitDataChart);
    } catch (error) {
      console.error("Lỗi tải thống kê:", error);
    } finally {
      setLoading(false);
    }
  };
  // Hàm xử lý dữ liệu doanh thu theo ngày/tuần/tháng
  const processRevenueByDate = (
    orders: Order[],
    timeFrame: string,
    products: Product[] = []
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
          <Card
            style={
              [styles.mainStatCard, styles.profitCard] as StyleProp<ViewStyle>
            }
          >
            <Text category="label" style={styles.statLabel as TextStyle}>
              {t("total_profit")}
            </Text>
            <Text category="h4" style={styles.statValue as TextStyle}>
              {Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(totalProfit)}
            </Text>
          </Card>
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

          {/* Thêm card giá trị đơn hàng */}
          <View style={styles.orderDetails as ViewStyle}>
            <Card style={styles.orderCard as ViewStyle}>
              <Text category="label">{t("avg_order_value")}</Text>
              <Text category="h6">
                {Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(avgOrderValue)}
              </Text>
            </Card>

            <View style={styles.orderDetailsRow as ViewStyle}>
              <Card
                style={
                  [
                    styles.orderDetailCard,
                    styles.maxCard,
                  ] as StyleProp<ViewStyle>
                }
              >
                <View style={styles.orderDetailContent as ViewStyle}>
                  <Text category="label">{t("max_order")}</Text>
                  <Text category="s1">
                    {Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(maxOrderValue)}
                  </Text>
                </View>
              </Card>

              <Card
                style={
                  [
                    styles.orderDetailCard,
                    styles.minCard,
                  ] as StyleProp<ViewStyle>
                }
              >
                <View style={styles.orderDetailContent as ViewStyle}>
                  <Text category="label">{t("min_order")}</Text>
                  <Text category="s1">
                    {Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(minOrderValue)}
                  </Text>
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
                  height={220}
                  initialSpacing={20} // Tăng khoảng cách lề trái
                  endSpacing={20} // Thêm khoảng cách lề phải
                  hideDataPoints={false}
                  color={theme["color-primary-500"]}
                  thickness={2}
                  startFillColor={theme["color-primary-100"]}
                  endFillColor={theme["color-primary-100"]}
                  startOpacity={0.4}
                  endOpacity={0.1}
                  data={revenueData}
                  width={Math.max(width - 80, revenueData.length * 80)}
                  spacing={40}
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
          {/* Thêm vào trong scrollView sau các thống kê hiện tại */}

          {/* Card Doanh thu theo khung giờ */}
          <Card style={styles.chartCard as ViewStyle}>
            <Text category="h6" style={styles.chartTitle as TextStyle}>
              {t("revenue_by_time_segment")}
            </Text>
            <View style={styles.timeSegmentStats as ViewStyle}>
              <View style={styles.timeSegment as ViewStyle}>
                <Text category="label">{t("morning")} (6h-12h)</Text>
                <Text category="s1">
                  {Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(morningRevenue)}
                </Text>
              </View>
              <View style={styles.timeSegment as ViewStyle}>
                <Text category="label">{t("noon")} (12h-18h)</Text>
                <Text category="s1">
                  {Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(noonRevenue)}
                </Text>
              </View>
              <View style={styles.timeSegment as ViewStyle}>
                <Text category="label">{t("evening")} (18h-22h)</Text>
                <Text category="s1">
                  {Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(eveningRevenue)}
                </Text>
              </View>
            </View>
            {/* Thêm biểu đồ cột cho doanh thu theo khung giờ */}
            <View style={styles.chartContainer as ViewStyle}>
              <BarChart
                data={[
                  {
                    value: morningRevenue,
                    label: t("morning"),
                    frontColor: theme["color-info-500"],
                  },
                  {
                    value: noonRevenue,
                    label: t("noon"),
                    frontColor: theme["color-warning-500"],
                  },
                  {
                    value: eveningRevenue,
                    label: t("evening"),
                    frontColor: theme["color-danger-500"],
                  },
                ]}
                width={width - 80}
                height={200}
                spacing={50}
                barWidth={40}
                noOfSections={5}
                barBorderRadius={4}
                yAxisTextStyle={{ color: theme["text-hint-color"] }}
                showVerticalLines
                verticalLinesColor={theme["color-basic-400"]}
                formatYLabel={(value: any) => `${Math.round(value / 1000)}k`}
              />
            </View>
          </Card>

          {/* Card Doanh thu theo khu vực */}
          <Card style={styles.chartCard as ViewStyle}>
            <Text category="h6" style={styles.chartTitle as TextStyle}>
              {t("revenue_by_location")}
            </Text>
            {dineInRevenue > 0 || takeAwayRevenue > 0 || deliveryRevenue > 0 ? (
              <View style={styles.pieChartContainer as ViewStyle}>
                <PieChart
                  data={[
                    {
                      value: dineInRevenue,
                      text: t("dine_in"),
                      color: theme["color-primary-500"],
                    },
                    {
                      value: takeAwayRevenue,
                      text: t("take_away"),
                      color: theme["color-success-500"],
                    },
                    {
                      value: deliveryRevenue,
                      text: t("delivery"),
                      color: theme["color-info-500"],
                    },
                  ]}
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
                          {t("location")}
                        </Text>
                      </View>
                    );
                  }}
                />
                <View style={styles.legendContainer as ViewStyle}>
                  <View style={styles.legendItem as ViewStyle}>
                    <View
                      style={[
                        styles.legendColor as ViewStyle,
                        { backgroundColor: theme["color-primary-500"] },
                      ]}
                    />
                    <Text style={styles.legendText as TextStyle}>
                      {t("dine_in")}:{" "}
                      {Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(dineInRevenue)}
                    </Text>
                  </View>
                  <View style={styles.legendItem as ViewStyle}>
                    <View
                      style={[
                        styles.legendColor as ViewStyle,
                        { backgroundColor: theme["color-success-500"] },
                      ]}
                    />
                    <Text style={styles.legendText as TextStyle}>
                      {t("take_away")}:{" "}
                      {Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(takeAwayRevenue)}
                    </Text>
                  </View>
                  <View style={styles.legendItem as ViewStyle}>
                    <View
                      style={[
                        styles.legendColor as ViewStyle,
                        { backgroundColor: theme["color-info-500"] },
                      ]}
                    />
                    <Text style={styles.legendText as TextStyle}>
                      {t("delivery")}:{" "}
                      {Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(deliveryRevenue)}
                    </Text>
                  </View>
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
  profitCard: {
    backgroundColor: "color-success-100",
  },
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
  orderDetails: {
    marginVertical: 16,
  },
  orderCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "color-info-100",
  },
  maxCard: {
    backgroundColor: "color-primary-100",
  },
  minCard: {
    backgroundColor: "color-basic-200",
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
  yearlyCard: {
    backgroundColor: "color-info-100",
    marginTop: 16,
  },
  timeSegmentStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    padding: 8,
  },
  timeSegment: {
    alignItems: "center",
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "background-basic-color-2",
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
