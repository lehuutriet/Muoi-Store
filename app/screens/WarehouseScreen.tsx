import React, { useEffect, useState, useCallback } from "react";
import {
  Dimensions,
  ScrollView,
  View,
  ViewStyle,
  RefreshControl,
  Alert,
  TextStyle,
  ImageStyle,
} from "react-native";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Layout,
  Card,
  Icon,
  List,
  Input,
  Divider,
  TopNavigation,
  useTheme,
  Avatar,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { useRecoilValue } from "recoil";
import { allCategoryAtom, allProductsAtom } from "../states";
import { FloatingAction } from "react-native-floating-action";
import { useFocusEffect } from "@react-navigation/native";

// Trong file exportWarehouseReport.ts
import {
  exportDetailedWarehouseReport,
  exportFormattedExcelReport,
  exportWarehouseReport,
} from "../utils/exportWarehouseReport";

// Thêm hàm xuất Excel đẹp
export { exportFormattedExcelReport };
interface WarehouseItem {
  $id: string;
  productName: string;
  quantity: number;
  minStock?: number;
  price?: number;
  transactionDate: string;
}

interface ProductStock {
  productName: string;
  currentStock: number;
  minStock: number;
  price: number;
  transactions: WarehouseItem[];
}

interface WarehouseScreenProps {
  navigation: any;
}

const WarehouseScreen: React.FC<WarehouseScreenProps> = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = Dimensions.get("window");

  const allProducts = useRecoilValue<any[]>(allProductsAtom);
  const [productStocks, setProductStocks] = useState<ProductStock[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStocks, setFilteredStocks] = useState<ProductStock[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stockFilter, setStockFilter] = useState("all"); // 'all', 'low', 'out'

  // Tìm tên danh mục từ ID
  const categories = useRecoilValue(allCategoryAtom);
  const { getAllItem } = useDatabases();

  // Thống kê tổng quan
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [totalStockValue, setTotalStockValue] = useState(0);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      // Lấy tất cả dữ liệu từ collection warehouse
      const warehouseData = await getAllItem(COLLECTION_IDS.warehouse);
      setWarehouseItems(warehouseData);

      // Tính toán số lượng tồn kho cho mỗi sản phẩm
      const stockMap = new Map<string, ProductStock>();

      warehouseData.forEach((item: WarehouseItem) => {
        // Đảm bảo có productName
        if (!item.productName) return;

        // Sử dụng productName làm key để nhóm sản phẩm
        const stockKey = item.productName;

        // Nếu sản phẩm chưa có trong map, thêm vào
        if (!stockMap.has(stockKey)) {
          stockMap.set(stockKey, {
            productName: item.productName,
            currentStock: 0,
            minStock: item.minStock || 0,
            price: item.price || 0,
            transactions: [],
          });
        }

        // Cập nhật stock hiện tại - tất cả đều coi như nhập kho
        const stock = stockMap.get(stockKey)!;
        stock.currentStock += item.quantity;

        // Cập nhật minStock nếu có
        if (item.minStock && item.minStock > 0) {
          stock.minStock = item.minStock;
        }

        // Cập nhật giá nếu có
        if (item.price && item.price > 0) {
          stock.price = item.price;
        }

        // Thêm giao dịch vào danh sách
        stock.transactions.push(item);
      });

      // Chuyển map thành mảng
      let stocks = Array.from(stockMap.values());

      // Cập nhật thống kê
      setTotalProducts(stocks.length);
      setLowStockCount(
        stocks.filter((s) => s.currentStock <= s.minStock && s.currentStock > 0)
          .length
      );
      setOutOfStockCount(stocks.filter((s) => s.currentStock === 0).length);

      // Tính tổng giá trị kho
      const totalValue = stocks.reduce((sum, stock) => {
        return sum + stock.price * stock.currentStock;
      }, 0);
      setTotalStockValue(totalValue);

      setProductStocks(stocks);
      setFilteredStocks(stocks);
      setRefreshing(false);
    } catch (error) {
      console.error("Error fetching warehouse data:", error);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      return () => {};
    }, [])
  );
  const handleExportReport = async () => {
    try {
      // Hiển thị dialog để chọn kiểu báo cáo
      Alert.alert(t("export_report"), t("choose_report_type"), [
        {
          text: t("excel_formatted"), // Tùy chọn mới
          onPress: async () => {
            const success = await exportFormattedExcelReport(productStocks, t);
            if (!success) {
              Alert.alert("", t("export_error"));
            }
          },
        },
        {
          text: t("simple_csv"),
          onPress: async () => {
            const success = await exportWarehouseReport(productStocks, t);
            if (!success) {
              Alert.alert("", t("export_error"));
            }
          },
        },
        {
          text: t("detailed_html"),
          onPress: async () => {
            const success = await exportDetailedWarehouseReport(
              productStocks,
              t
            );
            if (!success) {
              Alert.alert("", t("export_error"));
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
  // Lọc sản phẩm theo tìm kiếm và filter
  useEffect(() => {
    let filtered = productStocks;

    // Áp dụng tìm kiếm
    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.productName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Áp dụng bộ lọc trạng thái
    if (stockFilter === "low") {
      filtered = filtered.filter(
        (item) => item.currentStock <= item.minStock && item.currentStock > 0
      );
    } else if (stockFilter === "out") {
      filtered = filtered.filter((item) => item.currentStock === 0);
    }

    setFilteredStocks(filtered);
  }, [searchQuery, stockFilter, productStocks]);

  const onRefresh = useCallback(() => {
    fetchData();
  }, []);

  const renderStockStatus = (
    currentStock: number = 0,
    minStock: number = 0
  ) => {
    if (currentStock === 0) {
      return (
        <View style={styles.stockStatus as ViewStyle}>
          <Icon
            name="alert-triangle"
            fill="#FF3D71"
            style={styles.icon as ViewStyle}
          />
          <Text status="danger" category="c1">
            {t("out_of_stock")}
          </Text>
        </View>
      );
    } else if (currentStock <= minStock) {
      return (
        <View style={styles.stockStatus as ViewStyle}>
          <Icon
            name="alert-circle"
            fill="#FFAA00"
            style={styles.icon as ViewStyle}
          />
          <Text status="warning" category="c1">
            {t("low_stock")}
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.stockStatus as ViewStyle}>
          <Icon
            name="checkmark-circle-2"
            fill="#00E096"
            style={styles.icon as ViewStyle}
          />
          <Text status="success" category="c1">
            {t("in_stock")}
          </Text>
        </View>
      );
    }
  };

  const actions = [
    {
      text: t("add_new_inventory"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "AddInventory",
      position: 1,
    },
    {
      text: t("export_report"),
      icon: require("../../assets/icons/file-text-outline.png"),
      name: "ExportReport",
      position: 3,
    },
  ];

  const renderItem = ({ item }: { item: ProductStock }) => (
    <Card
      style={styles.card as ViewStyle}
      onPress={() =>
        navigation.navigate("UpdateStockScreen", {
          item: {
            $id: item.productName,
            name: item.productName,
            currentStock: item.currentStock,
            minStock: item.minStock,
            price: item.price,
          },
        })
      }
    >
      <View style={styles.productRow as ViewStyle}>
        <View style={styles.productInfo as ViewStyle}>
          <Text category="s1" style={styles.productName as TextStyle}>
            {item.productName}
          </Text>
          <View style={styles.priceContainer as ViewStyle}>
            <Icon
              name="pricetags-outline"
              fill={theme["color-basic-600"]}
              style={styles.priceIcon}
            />
            <Text appearance="hint" category="c1">
              {Intl.NumberFormat("vi-VN").format(item.price)} {t("currency")}
            </Text>
          </View>
        </View>
        <View style={styles.stockInfo as ViewStyle}>
          <View style={styles.stockNumbers as ViewStyle}>
            <Text category="s2">{item.currentStock}</Text>
            <Text appearance="hint" category="c2">
              / {item.minStock}
            </Text>
          </View>
          {renderStockStatus(item.currentStock, item.minStock)}
        </View>
      </View>

      <View style={styles.progressBarContainer as ViewStyle}>
        <View
          style={[
            styles.progressBar as ViewStyle,
            item.currentStock === 0
              ? (styles.redProgress as ViewStyle)
              : item.currentStock <= item.minStock
                ? (styles.yellowProgress as ViewStyle)
                : (styles.greenProgress as ViewStyle),
            {
              width: `${Math.min((item.currentStock / Math.max(item.minStock * 2, 1)) * 100, 100)}%`,
            } as ViewStyle,
          ]}
        />
      </View>

      <View style={styles.itemFooter as ViewStyle}>
        <Text category="c2" appearance="hint">
          {t("total_value")}:{" "}
          {Intl.NumberFormat("vi-VN").format(item.currentStock * item.price)}{" "}
          {t("currency")}
        </Text>
      </View>
    </Card>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer as ViewStyle}>
      <Icon
        name="cube-outline"
        fill={theme["color-basic-400"]}
        style={styles.emptyIcon}
      />
      <Text appearance="hint" category="s1">
        {t("no_products_found")}
      </Text>
      <Button
        appearance="ghost"
        status="primary"
        style={styles.emptyButton as ViewStyle}
        onPress={() => navigation.navigate("CreateWarehouseEntryScreen")}
      >
        {t("add_new_product")}
      </Button>
    </View>
  );

  const toggleStockFilter = (filter: string) => {
    setStockFilter(filter);
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      {/* Thanh tìm kiếm */}
      <Layout style={styles.searchContainer as ViewStyle}>
        <Input
          placeholder={t("search_products")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          style={styles.searchInput as TextStyle}
          size="medium"
          clearButtonMode="while-editing"
        />
      </Layout>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScrollView as ViewStyle}
        contentContainerStyle={styles.statsContainer as ViewStyle}
      >
        <View
          style={[
            styles.statCard as ViewStyle,
            styles.totalProductsCard as ViewStyle,
          ]}
        >
          <View style={styles.statContent as ViewStyle}>
            <Text category="h6">{totalProducts}</Text>
            <Text category="c2">{t("total_products")}</Text>
          </View>
          <Icon
            name="cube-outline"
            fill="#3366FF"
            style={styles.statIcon as ImageStyle}
          />
        </View>

        <View
          style={[
            styles.statCard as ViewStyle,
            styles.lowStockCard as ViewStyle,
          ]}
        >
          <View style={styles.statContent as ViewStyle}>
            <Text category="h6">{lowStockCount}</Text>
            <Text category="c2">{t("low_stock_items")}</Text>
          </View>
          <Icon
            name="alert-circle-outline"
            fill="#FFAA00"
            style={styles.statIcon as ImageStyle}
          />
        </View>

        <View
          style={[
            styles.statCard as ViewStyle,
            styles.outOfStockCard as ViewStyle,
          ]}
        >
          <View style={styles.statContent as ViewStyle}>
            <Text category="h6">{outOfStockCount}</Text>
            <Text category="c2">{t("out_of_stock_items")}</Text>
          </View>
          <Icon
            name="alert-triangle-outline"
            fill="#FF3D71"
            style={styles.statIcon as ImageStyle}
          />
        </View>

        <View
          style={[
            styles.statCard as ViewStyle,
            styles.totalValueCard as ViewStyle,
          ]}
        >
          <View style={styles.statContent as ViewStyle}>
            <Text category="h6">
              {Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(totalStockValue)}
            </Text>
            <Text category="c2">{t("inventory_value")}</Text>
          </View>
          <Icon
            name="credit-card-outline"
            fill="#00E096"
            style={styles.statIcon as ImageStyle}
          />
        </View>
      </ScrollView>
      {/* Bộ lọc */}
      <View style={styles.filterContainer as ViewStyle}>
        <Button
          size="small"
          appearance={stockFilter === "all" ? "filled" : "outline"}
          status="basic"
          onPress={() => toggleStockFilter("all")}
          style={styles.filterButton as ViewStyle}
        >
          {t("all")}
        </Button>
        <Button
          size="small"
          appearance={stockFilter === "low" ? "filled" : "outline"}
          status="basic"
          onPress={() => toggleStockFilter("low")}
          style={styles.filterButton as ViewStyle}
        >
          {t("low_stock")}
        </Button>
        <Button
          size="small"
          appearance={stockFilter === "out" ? "filled" : "outline"}
          status="basic"
          onPress={() => toggleStockFilter("out")}
          style={styles.filterButton as ViewStyle}
        >
          {t("out_of_stock")}
        </Button>
      </View>
      <List
        data={filteredStocks}
        renderItem={renderItem}
        style={styles.list as ViewStyle}
        contentContainerStyle={styles.listContent as ViewStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyList}
      />

      <FloatingAction
        actions={actions}
        color="#4169E1"
        onPressItem={(name) => {
          if (name === "AddInventory") {
            navigation.navigate("CreateWarehouseEntryScreen");
          } else if (name === "Search") {
            // Focus vào ô tìm kiếm
            const searchInput = document.querySelector("input");
            if (searchInput) searchInput.focus();
          } else if (name === "ExportReport") {
            handleExportReport();
          }
        }}
        overlayColor="rgba(68, 68, 68, 0.7)"
        showBackground={false}
        distanceToEdge={16}
        buttonSize={56}
      />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "background-basic-color-1",
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
  },
  searchInput: {
    borderRadius: 24,
    backgroundColor: "background-basic-color-1",
  },

  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "background-basic-color-1",
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
  },
  filterButton: {
    marginRight: 8,
    borderRadius: 16,
  },
  list: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "color-primary-500",
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  stockInfo: {
    alignItems: "flex-end",
  },
  stockNumbers: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  stockStatus: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "background-basic-color-2",
  },
  icon: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "color-basic-300",
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 8,
    width: "100%",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  greenProgress: {
    backgroundColor: "color-success-500",
  },
  yellowProgress: {
    backgroundColor: "color-warning-500",
  },
  redProgress: {
    backgroundColor: "color-danger-500",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyButton: {
    marginTop: 16,
  },
  // Trong styleSheet
  statsScrollView: {
    maxHeight: 120,
    backgroundColor: "background-basic-color-1",
    paddingBottom: 12,
  } as ViewStyle,

  statsContainer: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  } as ViewStyle,

  statCard: {
    width: 130,
    height: 90,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,

    position: "relative",
  } as ViewStyle,

  statContent: {
    flex: 1,
    justifyContent: "center",
  } as ViewStyle,

  statIcon: {
    width: 24,
    height: 24,
    position: "absolute",
    bottom: 8,
    right: 8,
    opacity: 0.3,
  } as ImageStyle,

  totalProductsCard: {
    backgroundColor: "rgba(51, 102, 255, 0.15)",
  } as ViewStyle,

  lowStockCard: {
    backgroundColor: "rgba(255, 170, 0, 0.15)",
  } as ViewStyle,

  outOfStockCard: {
    backgroundColor: "rgba(255, 61, 113, 0.15)",
  } as ViewStyle,

  totalValueCard: {
    backgroundColor: "rgba(0, 224, 150, 0.15)",
  } as ViewStyle,
});

export default WarehouseScreen;
