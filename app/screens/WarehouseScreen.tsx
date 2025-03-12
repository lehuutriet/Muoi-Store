import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, View, ViewStyle } from "react-native";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Layout,
  Card,
  Icon,
  List,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { CategoryScrollbar } from "../components/category";
import { useRecoilValue } from "recoil";
import { allCategoryAtom, allProductsAtom } from "../states";
import { FloatingAction } from "react-native-floating-action";
import { useFocusEffect } from "@react-navigation/native";
// Định nghĩa kiểu dữ liệu tổng hợp kho hàng theo sản phẩm
// Interface mới cho WarehouseItem phù hợp với CreateWarehouseEntryScreen
interface WarehouseItem {
  $id: string;
  productName: string; // Tên sản phẩm
  quantity: number; // Số lượng
  minStock?: number; // Số lượng tối thiểu
  price?: number; // Giá nhập
  transactionDate: string; // Ngày giao dịch
}

// Interface mới cho ProductStock
interface ProductStock {
  productName: string; // Tên sản phẩm làm định danh
  currentStock: number; // Số lượng hiện tại
  minStock: number; // Số lượng tối thiểu
  price: number; // Giá nhập
  transactions: WarehouseItem[]; // Lịch sử giao dịch
}

interface WarehouseScreenProps {
  navigation: any;
}

const WarehouseScreen: React.FC<WarehouseScreenProps> = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();

  const allProducts = useRecoilValue<any[]>(allProductsAtom);
  const [productStocks, setProductStocks] = useState<ProductStock[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);

  // Tìm tên danh mục từ ID
  const categories = useRecoilValue(allCategoryAtom);
  const { getAllItem } = useDatabases();

  // Fetch dữ liệu từ collection warehouse

  const fetchData = async () => {
    try {
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

      setProductStocks(stocks);
    } catch (error) {
      console.error("Error fetching warehouse data:", error);
    }
  };
  useEffect(() => {
    fetchData();
  }, []); // Bỏ dependencies không cần thiết
  // Trong component
  useFocusEffect(
    React.useCallback(() => {
      // Gọi fetchData khi màn hình được focus
      fetchData();
      return () => {};
    }, [])
  );
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
          <Text status="danger">{t("out_of_stock")}</Text>
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
          <Text status="warning">{t("low_stock")}</Text>
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
          <Text status="success">{t("in_stock")}</Text>
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
          <Text category="h6">{item.productName}</Text>
          {item.price > 0 && (
            <Text appearance="hint">
              {t("import_price")}:{" "}
              {Intl.NumberFormat("vi-VN").format(item.price)} {t("currency")}
            </Text>
          )}
        </View>
        <View style={styles.stockInfo as ViewStyle}>
          <Text>
            {t("stock")}: {item.currentStock}
          </Text>
          <Text appearance="hint">
            {t("min_stock")}: {item.minStock}
          </Text>
          {renderStockStatus(item.currentStock, item.minStock)}
        </View>
      </View>
    </Card>
  );

  return (
    <Layout style={styles.container as ViewStyle}>
      <List
        data={productStocks}
        renderItem={renderItem}
        style={styles.list as ViewStyle}
        contentContainerStyle={styles.listContent as ViewStyle}
      />

      <FloatingAction
        actions={actions}
        color="#4169E1"
        onPressItem={(name) => {
          if (name === "AddInventory") {
            // Điều hướng đến một màn hình mới để chọn sản phẩm và thêm vào kho
            navigation.navigate("CreateWarehouseEntryScreen");
          }
        }}
        overlayColor="rgba(68, 68, 68, 0.7)"
        showBackground={false}
        distanceToEdge={16}
      />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  stockInfo: {
    alignItems: "flex-end",
  },
  stockStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  icon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
});

export default WarehouseScreen;
