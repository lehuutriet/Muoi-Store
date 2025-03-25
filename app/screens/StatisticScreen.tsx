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
  Datepicker,
  Button,
  Icon,
  Divider,
  Modal,
} from "@ui-kitten/components";
import {
  ScrollView,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
  Dimensions,
  Alert,
} from "react-native";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { Query } from "appwrite";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart, BarChart, PieChart } from "react-native-gifted-charts";
import { exportToCSV } from "../utils/exportStatistics";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  exportFormattedReturnReport,
  exportFormattedStatsReport,
} from "../utils/exportWarehouseReport";
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
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showCustomDateFilter, setShowCustomDateFilter] = useState(false);

  // Thêm các state này vào phần state khai báo
  const [returnOrders, setReturnOrders] = useState<any[]>([]);
  const [totalReturnValue, setTotalReturnValue] = useState(0);
  const [returnReasons, setReturnReasons] = useState<PieChartData[]>([]);

  // Thêm "custom" vào timeFrames
  const timeFrames = ["general", "returns"]; // Chỉ giữ lại thống kê chung và trả hàng
  const [timeFrame, setTimeFrame] = useState(timeFrames[0]);

  // Thêm state mới cho bộ lọc ngày thống kê chung
  const [dateFilterVisible, setDateFilterVisible] = useState(false);
  const [dateRangeText, setDateRangeText] = useState("");
  const [periodType, setPeriodType] = useState("day"); // Thêm state để lưu loại khoảng thời gian (ngày/tuần/tháng)

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
  // Thêm state mới cho tab trả hàng
  const [returnStartDate, setReturnStartDate] = useState(new Date());
  const [returnEndDate, setReturnEndDate] = useState(new Date());
  const [returnDateFilterVisible, setReturnDateFilterVisible] = useState(false);
  const [returnDateRangeText, setReturnDateRangeText] = useState("");
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
      let startDateQuery = new Date();
      let endDateQuery = new Date(today);
      endDateQuery.setHours(23, 59, 59, 999);

      // Thiết lập thời gian bắt đầu dựa trên timeFrame
      if (periodType === "day" || timeFrame === "day") {
        startDateQuery.setHours(0, 0, 0, 0);
      } else if (periodType === "week" || timeFrame === "week") {
        const day = today.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startDateQuery.setDate(today.getDate() - diff);
        startDateQuery.setHours(0, 0, 0, 0);
      } else if (periodType === "month" || timeFrame === "month") {
        startDateQuery.setDate(1);
        startDateQuery.setHours(0, 0, 0, 0);
      } else if (periodType === "custom" || timeFrame === "custom") {
        // Sử dụng ngày bắt đầu và kết thúc đã chọn
        startDateQuery = new Date(startDate);
        startDateQuery.setHours(0, 0, 0, 0);

        // Đặt ngày kết thúc thành cuối ngày đã chọn
        endDateQuery = new Date(endDate);
        endDateQuery.setHours(23, 59, 59, 999);
      }

      const startDateStr = startDateQuery.toISOString();
      const endDateStr = endDateQuery.toISOString();

      // Truy vấn các đơn hàng đã thanh toán
      const paidQuery = [
        Query.equal("status", ["cash", "transfer"]),
        Query.notEqual("status", "returned"), // Loại bỏ đơn hàng đã hoàn trả
        Query.greaterThanEqual("$createdAt", startDateStr),
        Query.lessThanEqual("$createdAt", endDateStr),
      ];

      // Truy vấn đơn hàng chưa thanh toán
      const unpaidQuery = [
        Query.equal("status", "unpaid"),
        Query.greaterThanEqual("$createdAt", startDateStr),
        Query.lessThanEqual("$createdAt", endDateStr),
      ];

      // Truy vấn đơn hàng hôm nay
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const todayQuery = [
        Query.equal("status", ["cash", "transfer"]),
        Query.greaterThanEqual("$createdAt", todayStart.toISOString()),
        Query.lessThanEqual("$createdAt", todayEnd.toISOString()),
      ];

      // Thêm truy vấn cho doanh thu năm
      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);
      const yearEnd = new Date();
      yearEnd.setHours(23, 59, 59, 999);
      const yearQuery = [
        Query.equal("status", ["cash", "transfer"]),
        Query.greaterThanEqual("$createdAt", yearStart.toISOString()),
        Query.lessThanEqual("$createdAt", yearEnd.toISOString()),
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

      // Lấy dữ liệu đơn hàng đã hoàn trả
      if (timeFrame === "returns" || selectedIndex === 4) {
        const returnStartDateQuery = new Date(returnStartDate);
        returnStartDateQuery.setHours(0, 0, 0, 0);

        const returnEndDateQuery = new Date(returnEndDate);
        returnEndDateQuery.setHours(23, 59, 59, 999);
        const returnedQuery = [
          Query.equal("status", "returned"),
          Query.greaterThanEqual(
            "$createdAt",
            returnStartDateQuery.toISOString()
          ),
          Query.lessThanEqual("$createdAt", returnEndDateQuery.toISOString()),
        ];
        try {
          // Nếu collection returns tồn tại:
          const returnedOrdersData = await getAllItem(
            COLLECTION_IDS.returns,
            returnedQuery
          );
          setReturnOrders(returnedOrdersData);

          // Tính tổng giá trị hoàn trả
          let totalReturned = 0;
          returnedOrdersData.forEach((order: any) => {
            // Kiểm tra các trường có thể chứa giá trị
            const returnAmount = Number(
              order.totalReturnAmount || order.total || 0
            );
            totalReturned += returnAmount;
            console.log("Order return value:", order.$id, returnAmount); // Log để debug
          });
          setTotalReturnValue(totalReturned);

          // Xử lý dữ liệu lý do hoàn trả
          const reasonsMap = new Map<string, number>();
          returnedOrdersData.forEach((order: any) => {
            const reason = order.returnReason || t("unknown_reason");
            if (reasonsMap.has(reason)) {
              reasonsMap.set(reason, (reasonsMap.get(reason) || 0) + 1);
            } else {
              reasonsMap.set(reason, 1);
            }
          });

          // Tạo dữ liệu cho biểu đồ lý do hoàn trả
          const reasonColors = [
            "#FF6B6B",
            "#4ECDC4",
            "#6C5CE7",
            "#FDA7DF",
            "#A8E6CF",
          ];
          const reasonsData = [...reasonsMap.entries()].map(
            ([reason, count], index) => ({
              value: count,
              text:
                reason.length > 20 ? reason.substring(0, 20) + "..." : reason,
              color: reasonColors[index % reasonColors.length],
            })
          );
          setReturnReasons(reasonsData);
        } catch (err) {
          console.error("Lỗi khi lấy dữ liệu đơn hàng hoàn trả:", err);
          setReturnOrders([]);
          setReturnReasons([]);
          setTotalReturnValue(0);
        }
      }

      // Tính tổng doanh thu
      let total = 0;
      paidOrdersData.forEach((order: Order) => {
        total += Number(order.total) || 0;
      });

      // Tính giá trị trung bình, cao nhất, thấp nhất
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
  const updateReturnDateRangeText = () => {
    setReturnDateRangeText(
      `${returnStartDate.toLocaleDateString("vi-VN")} - ${returnEndDate.toLocaleDateString("vi-VN")}`
    );
  };
  const applyReturnDateFilter = () => {
    setReturnDateFilterVisible(false);
    updateReturnDateRangeText();
    loadStatistics();
  };
  useEffect(() => {
    updateReturnDateRangeText();
  }, []);
  const handleExportCSV = async () => {
    try {
      // Hiển thị dialog để chọn kiểu báo cáo
      Alert.alert(t("export_report"), t("choose_report_type"), [
        {
          text: t("excel_formatted"), // Thêm tùy chọn mới với định dạng đẹp
          onPress: async () => {
            // Định dạng dữ liệu tùy theo tab đang chọn
            if (selectedIndex === 1) {
              // Tab trả hàng
              const returnStatisticsData = {
                isReturnReport: true,
                reportType: t("returns_report"),
                timeFrame: "returns",
                totalReturns: returnOrders.length,
                totalReturnValue: totalReturnValue,
                returnReasons: returnReasons,
                returnedOrders: returnOrders.map((order) => ({
                  $id: order.$id,
                  returnDate: order.returnDate || order.$createdAt,
                  returnReason: order.returnReason || t("unknown_reason"),
                  totalReturnAmount:
                    order.totalReturnAmount || order.total || 0,
                })),
              };

              // Gọi hàm xuất báo cáo với định dạng đẹp cho báo cáo trả hàng
              await exportFormattedReturnReport(returnStatisticsData, t);
            } else {
              // Tab thống kê thông thường
              const statisticsData = {
                reportType:
                  timeFrame === "day"
                    ? t("daily_report")
                    : timeFrame === "week"
                      ? t("weekly_report")
                      : timeFrame === "month"
                        ? t("monthly_report")
                        : t("custom_report"),
                timeFrame,
                revenueByDate: revenueByDateFormatted,
                period:
                  timeFrame === "custom"
                    ? `${t("period")}: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                    : `${t("period")}: ${timeFrame}`,
                totalRevenue,
                totalProfit,
                totalOrders,
                paidOrders,
                unpaidOrders,
                avgOrderValue,
                maxOrderValue,
                minOrderValue,
                morningRevenue,
                noonRevenue,
                eveningRevenue,
                dineInRevenue,
                takeAwayRevenue,
                deliveryRevenue,
                topProducts,
                startDate,
                endDate,
                peakSellingTimes: hourlyData,
              };

              // Gọi hàm xuất báo cáo với định dạng đẹp cho báo cáo thống kê
              await exportFormattedStatsReport(statisticsData, t);
            }
          },
        },
        {
          text: t("csv_format"), // Tùy chọn CSV tiêu chuẩn
          onPress: async () => {
            if (selectedIndex === 1) {
              // Định dạng dữ liệu cho báo cáo trả hàng
              const returnStatisticsData = {
                isReturnReport: true,
                reportType: t("returns_report"),
                timeFrame: "returns",
                totalReturns: returnOrders.length,
                totalReturnValue: totalReturnValue,
                returnReasons: returnReasons,
                returnedOrders: returnOrders.map((order) => ({
                  $id: order.$id,
                  returnDate: order.returnDate || order.$createdAt,
                  returnReason: order.returnReason || t("unknown_reason"),
                  totalReturnAmount:
                    order.totalReturnAmount || order.total || 0,
                })),
              };

              // Gọi hàm xuất CSV với dữ liệu báo cáo trả hàng
              const success = await exportToCSV(returnStatisticsData, t);
              if (!success) {
                console.error("Xuất báo cáo trả hàng thất bại");
              }
            } else {
              // Định dạng dữ liệu cho báo cáo doanh thu và đơn hàng thông thường
              const statisticsData = {
                reportType:
                  timeFrame === "day"
                    ? t("daily_report")
                    : timeFrame === "week"
                      ? t("weekly_report")
                      : timeFrame === "month"
                        ? t("monthly_report")
                        : t("custom_report"),
                timeFrame,
                revenueByDate: revenueByDateFormatted,
                period:
                  timeFrame === "custom"
                    ? `${t("period")}: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                    : `${t("period")}: ${timeFrame}`,
                totalRevenue,
                totalProfit,
                totalOrders,
                paidOrders,
                unpaidOrders,
                avgOrderValue,
                maxOrderValue,
                minOrderValue,
                morningRevenue,
                noonRevenue,
                eveningRevenue,
                dineInRevenue,
                takeAwayRevenue,
                deliveryRevenue,
                topProducts,
                startDate,
                endDate,
                peakSellingTimes: hourlyData,
              };

              // Gọi hàm xuất CSV với dữ liệu báo cáo thông thường
              const success = await exportToCSV(statisticsData, t);
              if (!success) {
                console.error("Xuất báo cáo doanh thu thất bại");
              }
            }
          },
        },
        {
          text: t("cancel"),
          style: "cancel",
        },
      ]);
    } catch (error) {
      console.error("Lỗi khi xuất báo cáo:", error);
      Alert.alert("", t("export_error"));
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
        // Hiển thị ngày trong tuần với ngày tháng năm đầy đủ
        const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        return `${weekdays[d.getDay()]}`;
      } else {
        // Hiển thị ngày tháng năm đầy đủ
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

  const revenueByDateFormatted = revenueData.map((item) => ({
    label: item.label.includes("/")
      ? `${item.label}/${new Date().getFullYear()}`
      : item.label,
    value: item.value,
  }));

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
  const updateDateRangeText = () => {
    if (periodType === "day") {
      setDateRangeText(t("today"));
    } else if (periodType === "week") {
      setDateRangeText(t("this_week"));
    } else if (periodType === "month") {
      setDateRangeText(t("this_month"));
    } else if (periodType === "custom") {
      setDateRangeText(
        `${startDate.toLocaleDateString("vi-VN")} - ${endDate.toLocaleDateString("vi-VN")}`
      );
    }
  };
  // Trong useEffect khởi tạo
  useEffect(() => {
    // Thiết lập giá trị mặc định là "ngày"
    setPeriodType("day");
    setTimeFrame("day");
    setDateRangeText(t("today"));

    // Khởi tạo cho tab trả hàng
    updateReturnDateRangeText();

    // Gọi loadStatistics để tải dữ liệu ban đầu
    loadStatistics();
  }, []);
  return (
    <Layout style={styles.mainLayout as ViewStyle}>
      <View style={styles.header as ViewStyle}>
        <TabBar
          style={styles.tabBar as ViewStyle}
          selectedIndex={selectedIndex}
          onSelect={(index) => setSelectedIndex(index)}
        >
          <Tab title={t("statistics")} />
          <Tab title={t("returns")} />
        </TabBar>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between", // Đảm bảo nút nằm ở hai đầu
            paddingVertical: 8,
            paddingHorizontal: 4, // Thêm đệm ngang
          }}
        >
          {selectedIndex === 0 ? (
            <Button
              size="small"
              appearance="outline"
              status="primary"
              accessoryLeft={(props) => (
                <Icon {...props} name="calendar-outline" />
              )}
              onPress={() => setDateFilterVisible(true)}
            >
              {dateRangeText || t("today")}
            </Button>
          ) : (
            <Button
              size="small"
              appearance="outline"
              status="primary"
              accessoryLeft={(props) => (
                <Icon {...props} name="calendar-outline" />
              )}
              onPress={() => setReturnDateFilterVisible(true)}
            >
              {returnDateRangeText}
            </Button>
          )}
          <Button
            size="small"
            status="primary"
            accessoryLeft={(props) => (
              <Icon {...props} name="file-text-outline" />
            )}
            onPress={handleExportCSV}
          >
            {t("export_csv")}
          </Button>
        </View>

        {/* Bộ lọc ngày cho tab trả hàng */}
        {selectedIndex === 1 && (
          <View style={styles.filterContainer as ViewStyle}>
            {returnDateRangeText && (
              <Text category="s1" style={styles.dateRangeText as TextStyle}>
                {returnDateRangeText}
              </Text>
            )}
          </View>
        )}

        {/* Modal lọc ngày cho tab trả hàng */}
        <Modal
          visible={returnDateFilterVisible}
          backdropStyle={styles.backdrop as ViewStyle}
          onBackdropPress={() => setReturnDateFilterVisible(false)}
          style={styles.modalContainer as ViewStyle}
        >
          <Card disabled style={styles.datePickerModal as ViewStyle}>
            <Text category="h6" style={styles.modalHeader as TextStyle}>
              {t("filter_by_date")}
            </Text>

            <View style={styles.datePickerRow as ViewStyle}>
              <Text category="label">{t("start_date")}:</Text>
              <Datepicker
                date={returnStartDate}
                onSelect={(nextDate) => setReturnStartDate(nextDate)}
                max={returnEndDate}
                style={styles.datePicker as ViewStyle}
                size="small"
              />
            </View>

            <View style={styles.datePickerRow as ViewStyle}>
              <Text category="label">{t("end_date")}:</Text>
              <Datepicker
                date={returnEndDate}
                onSelect={(nextDate) => setReturnEndDate(nextDate)}
                min={returnStartDate}
                max={new Date()}
                style={styles.datePicker as ViewStyle}
                size="small"
              />
            </View>

            <View style={styles.modalButtonContainer as ViewStyle}>
              <Button
                size="small"
                appearance="outline"
                status="basic"
                style={styles.modalButton as ViewStyle}
                onPress={() => setReturnDateFilterVisible(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                size="small"
                status="primary"
                style={styles.modalButton as ViewStyle}
                onPress={applyReturnDateFilter}
              >
                {t("apply")}
              </Button>
            </View>
          </Card>
        </Modal>
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
          {selectedIndex === 1 ? (
            <Card style={styles.reportCard as ViewStyle}>
              <Text category="h5" style={styles.reportTitle as TextStyle}>
                {t("returns_report")}
              </Text>

              {/* Thẻ tổng quan cải tiến */}
              <View style={styles.statsOverview as ViewStyle}>
                <View style={styles.statCard as ViewStyle}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: "#FEE7E7" } as any,
                    ]}
                  >
                    <Icon
                      name="close-circle"
                      fill="#FF3D71"
                      style={{ width: 28, height: 28 }}
                    />
                  </View>
                  <Text category="s2" style={styles.statLabel as TextStyle}>
                    {t("total_returns")}
                  </Text>
                  <Text category="h4" style={{ color: "#FF3D71" }}>
                    {returnOrders.length}
                  </Text>
                </View>

                <View style={styles.statCard as ViewStyle}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: "#FFF4DB" } as any,
                    ]}
                  >
                    <Icon
                      name="credit-card"
                      fill="#FFAA00"
                      style={{ width: 28, height: 28 }}
                    />
                  </View>
                  <Text category="s2" style={styles.statLabel as TextStyle}>
                    {t("total_return_value")}
                  </Text>
                  <Text category="h4" style={{ color: "#FFAA00" }}>
                    {totalReturnValue.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
              </View>

              {/* Danh sách đơn hàng đã hoàn trả */}
              <View style={styles.sectionHeader as ViewStyle}>
                <Icon
                  name="list"
                  fill={theme["color-primary-500"]}
                  style={{ width: 20, height: 20, marginRight: 8 }}
                />
                <Text category="h6" style={styles.sectionTitle as TextStyle}>
                  {t("returned_orders")}
                </Text>
              </View>

              {returnOrders.length > 0 ? (
                <ScrollView
                  style={styles.orderList as ViewStyle}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 16 }}
                >
                  {returnOrders.map((order, index) => (
                    <View key={index} style={styles.orderCard as ViewStyle}>
                      <View style={styles.orderCardHeader as ViewStyle}>
                        <View style={styles.orderIdWrapper as ViewStyle}>
                          <Icon
                            name="shopping-bag"
                            fill="#3366FF"
                            style={{ width: 16, height: 16, marginRight: 6 }}
                          />
                          <Text
                            category="s1"
                            style={styles.orderIdText as TextStyle}
                          >
                            {order.$id.slice(-4)}
                          </Text>
                        </View>
                        <View style={styles.amountBadge as ViewStyle}>
                          <Text style={styles.amountText as TextStyle}>
                            {order.totalReturnAmount.toLocaleString("vi-VN")}đ
                          </Text>
                        </View>
                      </View>

                      <Divider style={{ marginVertical: 10 }} />

                      <View style={styles.orderDetails as ViewStyle}>
                        <View style={styles.detailRow as ViewStyle}>
                          <Icon
                            name="calendar"
                            fill="#8F9BB3"
                            style={{ width: 14, height: 14, marginRight: 8 }}
                          />
                          <Text appearance="hint" style={{ fontSize: 13 }}>
                            {new Date(order.returnDate).toLocaleDateString(
                              "vi-VN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </Text>
                        </View>

                        <View
                          style={[styles.detailRow, { marginTop: 8 }] as any}
                        >
                          <Icon
                            name="alert-triangle"
                            fill="#FFAA00"
                            style={{ width: 14, height: 14, marginRight: 8 }}
                          />
                          <Text style={{ fontSize: 13, flex: 1 }}>
                            <Text style={{ fontWeight: "bold" }}>
                              {t("reason")}:{" "}
                            </Text>
                            {order.returnReason}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyState as ViewStyle}>
                  <Icon
                    name="inbox"
                    fill="#DDE1E6"
                    style={{ width: 60, height: 60, marginBottom: 16 }}
                  />
                  <Text category="s1" appearance="hint">
                    {t("no_returned_orders")}
                  </Text>
                </View>
              )}
            </Card>
          ) : (
            // Hiển thị thống kê thông thường cho các tab khác
            <>
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
                  <Text
                    category="h4"
                    style={
                      {
                        ...styles.statValue,
                        textAlign: "center",
                        width: "100%",
                      } as StyleProp<TextStyle>
                    }
                  >
                    {Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(totalRevenue)}
                  </Text>
                </Card>

                <Card
                  style={
                    [
                      styles.mainStatCard,
                      styles.todayCard,
                    ] as StyleProp<ViewStyle>
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
                  [
                    styles.mainStatCard,
                    styles.profitCard,
                  ] as StyleProp<ViewStyle>
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
                      initialSpacing={20}
                      endSpacing={20}
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
                      formatYLabel={(value: any) =>
                        `${Math.round(value / 1000)}k`
                      }
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
                        <View
                          key={index}
                          style={styles.legendItem as ViewStyle}
                        >
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
                    formatYLabel={(value: any) =>
                      `${Math.round(value / 1000)}k`
                    }
                  />
                </View>
              </Card>

              {/* Card Doanh thu theo khu vực */}
              <Card style={styles.chartCard as ViewStyle}>
                <Text category="h6" style={styles.chartTitle as TextStyle}>
                  {t("revenue_by_location")}
                </Text>
                {dineInRevenue > 0 ||
                takeAwayRevenue > 0 ||
                deliveryRevenue > 0 ? (
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
            </>
          )}
        </ScrollView>
      )}
      <Modal
        visible={dateFilterVisible}
        backdropStyle={styles.backdrop as ViewStyle}
        onBackdropPress={() => setDateFilterVisible(false)}
        style={styles.modalContainer as ViewStyle}
      >
        <Card disabled style={styles.datePickerModal as ViewStyle}>
          <Text category="h6" style={styles.modalHeader as TextStyle}>
            {t("filter_by_date")}
          </Text>

          {/* Thêm phần chọn loại khoảng thời gian */}
          <View style={styles.periodTypeContainer as ViewStyle}>
            <Button
              size="tiny"
              appearance={periodType === "day" ? "filled" : "outline"}
              onPress={() => setPeriodType("day")}
              style={styles.periodButton as ViewStyle}
            >
              {t("day")}
            </Button>
            <Button
              size="tiny"
              appearance={periodType === "week" ? "filled" : "outline"}
              onPress={() => setPeriodType("week")}
              style={styles.periodButton as ViewStyle}
            >
              {t("week")}
            </Button>
            <Button
              size="tiny"
              appearance={periodType === "month" ? "filled" : "outline"}
              onPress={() => setPeriodType("month")}
              style={styles.periodButton as ViewStyle}
            >
              {t("month")}
            </Button>
            <Button
              size="tiny"
              appearance={periodType === "custom" ? "filled" : "outline"}
              onPress={() => setPeriodType("custom")}
              style={styles.periodButton as ViewStyle}
            >
              {t("custom")}
            </Button>
          </View>

          {/* Hiển thị bộ chọn ngày chỉ khi chọn "custom" */}
          {periodType === "custom" && (
            <>
              <View style={styles.datePickerRow as ViewStyle}>
                <Text category="label">{t("start_date")}:</Text>
                <Datepicker
                  date={startDate}
                  onSelect={(nextDate) => setStartDate(nextDate)}
                  max={endDate}
                  style={styles.datePicker as ViewStyle}
                  size="small"
                />
              </View>

              <View style={styles.datePickerRow as ViewStyle}>
                <Text category="label">{t("end_date")}:</Text>
                <Datepicker
                  date={endDate}
                  onSelect={(nextDate) => setEndDate(nextDate)}
                  min={startDate}
                  max={new Date()}
                  style={styles.datePicker as ViewStyle}
                  size="small"
                />
              </View>
            </>
          )}

          <View style={styles.modalButtonContainer as ViewStyle}>
            <Button
              size="small"
              appearance="outline"
              status="basic"
              style={styles.modalButton as ViewStyle}
              onPress={() => setDateFilterVisible(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              size="small"
              status="primary"
              style={styles.modalButton as ViewStyle}
              onPress={() => {
                setTimeFrame(periodType);
                setDateFilterVisible(false);
                updateDateRangeText();
                loadStatistics();
              }}
            >
              {t("apply")}
            </Button>
          </View>
        </Card>
      </Modal>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  statsContainer: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
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

  statValue: {
    color: "text-basic-color",
    fontSize: 18,
    textAlign: "center", // Thêm thuộc tính này
    width: "100%", // Đảm bảo text chiếm toàn bộ chiều rộng của container
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
  headerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    marginBottom: 8,
  } as ViewStyle,
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
  customDateContainer: {
    padding: 16,
    backgroundColor: "background-basic-color-2",
    borderRadius: 8,
    marginTop: 8,
  } as ViewStyle,
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  } as ViewStyle,
  datePicker: {
    flex: 1,
    marginLeft: 8,
  } as ViewStyle,
  applyButton: {
    marginTop: 8,
  } as ViewStyle,

  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    margin: 4,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "background-basic-color-1",
    shadowColor: "color-basic-transparent-300",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
  },
  summaryLabel: {
    color: "text-hint-color",
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: "bold",
  },

  orderListContainer: {
    maxHeight: 400,
  },
  returnOrderCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "color-danger-500",
    backgroundColor: "background-basic-color-1",
    shadowColor: "color-basic-transparent-200",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  orderId: {
    fontWeight: "bold",
  },
  orderAmount: {
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "color-danger-100",
  },

  orderDivider: {
    backgroundColor: "color-basic-300",
  },

  orderDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  orderDate: {
    fontSize: 12,
  },
  reasonContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reasonText: {
    flex: 1,
    flexWrap: "wrap",
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 48,
    height: 48,
    marginBottom: 16,
    opacity: 0.5,
  },

  // Nâng cấp các styles hiện tại
  noDataText: {
    textAlign: "center",
    padding: 20,
    color: "text-hint-color",
    fontStyle: "italic",
  },
  reportCard: {
    borderRadius: 16,
    marginVertical: 8,
    overflow: "hidden",
    padding: 0,
  },
  reportTitle: {
    textAlign: "center",
    fontWeight: "bold",
    paddingVertical: 16,
    backgroundColor: "color-primary-100",
    color: "color-primary-700",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  statsOverview: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: "background-basic-color-1",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    margin: 4,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: {
    color: "text-hint-color",
    marginBottom: 4,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "background-basic-color-2",
  },
  sectionTitle: {
    fontWeight: "600",
  },
  orderList: {
    padding: 12,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "color-primary-100",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  orderIdText: {
    color: "color-primary-700",
    fontWeight: "bold",
  },
  amountBadge: {
    backgroundColor: "color-danger-100",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amountText: {
    color: "color-danger-700",
    fontWeight: "600",
    fontSize: 13,
  },
  orderDetails: {
    paddingHorizontal: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "background-basic-color-1",
  },
  // Thêm vào styleSheet
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // thêm dòng này
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
    width: "100%", // thêm dòng này
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 360,
  },
  modalCard: {
    padding: 16,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  reportHeader: {
    padding: 16,
    backgroundColor: "color-primary-100",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 8,
  },
  actionButton: {
    minWidth: 120,
  },
  dateRangeText: {
    textAlign: "center",

    marginTop: 8,
    paddingVertical: 4,
    backgroundColor: "background-basic-color-2",
    borderRadius: 16,
    paddingHorizontal: 12,
    alignSelf: "center",
    color: "text-basic-color",
    fontWeight: "bold",
  },
  datePickerModal: {
    padding: 16,
    width: width - 40,
    borderRadius: 8,
  },
  modalHeader: {
    textAlign: "center",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  periodTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingHorizontal: 2, // Giảm đệm ngang
    minWidth: 50, // Đảm bảo nút có kích thước tối thiểu
    height: 50,
  },
});

export default StatisticScreen;
