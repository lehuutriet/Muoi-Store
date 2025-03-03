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
  ListProps,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { CategoryScrollbar } from "../components/category";
import { useRecoilValue } from "recoil";
import { allProductsAtom } from "../states";

// Định nghĩa kiểu Product
interface Product {
  $id: string;
  name: string;
  photo?: string;
  photoUrl?: string;
  price: number;
  cost?: number;
  category?: string;
  categoryName?: string;
  stock?: number;
  minStock?: number;
  description?: string;
}

interface WarehouseScreenProps {
  navigation: any;
}

const WarehouseScreen: React.FC<WarehouseScreenProps> = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const allProducts = useRecoilValue<Product[]>(allProductsAtom);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Lọc sản phẩm theo danh mục được chọn
    if (selectedCategory === "all") {
      setProducts(allProducts);
    } else {
      setProducts(
        allProducts.filter((product) => product.category === selectedCategory)
      );
    }
  }, [selectedCategory, allProducts]);

  const renderStockStatus = (stock: number = 0, minStock: number = 0) => {
    if (stock === 0) {
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
    } else if (stock <= minStock) {
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

  const renderItem = ({ item }: { item: Product }) => (
    <Card style={styles.card as ViewStyle}>
      <View style={styles.productRow as ViewStyle}>
        <View style={styles.productInfo as ViewStyle}>
          <Text category="h6">{item.name}</Text>
          <Text appearance="hint">
            {t("category")}: {item.categoryName || "-"}
          </Text>
        </View>
        <View style={styles.stockInfo as ViewStyle}>
          <Text>
            {t("stock")}: {item.stock ?? 0}
          </Text>
          <Text appearance="hint">
            {t("min_stock")}: {item.minStock ?? 0}
          </Text>
          {renderStockStatus(item.stock ?? 0, item.minStock ?? 0)}
        </View>
      </View>
      <Button
        size="small"
        appearance="ghost"
        status="basic"
        onPress={() =>
          navigation.navigate("UpdateStockScreen", {
            item: item,
          })
        }
      >
        {t("update_stock")}
      </Button>
    </Card>
  );

  return (
    <Layout style={styles.container as ViewStyle}>
      <CategoryScrollbar
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <List
        data={products}
        renderItem={renderItem}
        style={styles.list as ViewStyle}
        contentContainerStyle={styles.listContent as ViewStyle}
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
