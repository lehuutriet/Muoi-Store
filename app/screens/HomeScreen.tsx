import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  View,
  Dimensions,
  ViewStyle,
  TextStyle,
  ScrollView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Layout, Text, Card, Icon } from "@ui-kitten/components";
import { FloatingAction } from "react-native-floating-action";
import { StyleService, useStyleSheet } from "@ui-kitten/components";
import { useRecoilValue } from "recoil";
import React, { useEffect, useState } from "react";
import { allProductsAtom } from "../states";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { TouchableOpacity } from "react-native-gesture-handler";

interface Product {
  $id: string;
  name: string;
  photo?: string;
  photoUrl?: string;
  price: number;
  cost?: number;
  category?: string;
  stock?: number;
  minStock?: number;
  description?: string;
}

type RootStackParamList = {
  CreateOrderScreen: {
    title: string;
    method: string;
  };
  CreateProductScreen: {
    title: string;
    method: string;
  };
  ManageOrderScreen: undefined;
  ManageProductScreen: undefined;
  ManageTableScreen: undefined;
  WarehouseScreen: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const allProducts = useRecoilValue<Product[]>(allProductsAtom);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    const productsWithLowStock = allProducts.filter(
      (product) =>
        product.stock !== undefined &&
        product.minStock !== undefined &&
        product.stock <= product.minStock
    );
    setLowStockProducts(productsWithLowStock);
  }, [allProducts]);

  const allCategoryAtom = [
    {
      title: t("create_order"),
      id: "create_order",
      icon: "calendar-outline",
      screenName: "CreateOrderScreen",
      method: "create",
    },
    {
      title: t("manage_order"),
      id: "manage_order",
      icon: "checkmark-square-outline",
      screenName: "ManageOrderScreen",
      method: "manage",
    },
    {
      title: t("manage_product"),
      id: "manage_product",
      icon: "layout-outline",
      screenName: "ManageProductScreen",
      method: "manage",
    },
    {
      title: t("manage_table"),
      id: "manage_table",
      icon: "monitor-outline",
      screenName: "ManageTableScreen",
      method: "manage",
    },
    {
      title: t("warehouse_management"),
      id: "warehouse",
      icon: "archive-outline",
      screenName: "WarehouseScreen",
      method: "manage",
    },
  ];

  const actions = [
    {
      text: t("create_order"),
      icon: require("../../assets/icons/calendar-outline.png"),
      name: "CreateOrderScreen",
      position: 1,
    },
    {
      text: t("create_product"),
      icon: require("../../assets/icons/file-add-outline.png"),
      name: "CreateProductScreen",
      position: 2,
    },
  ];

  const renderCategoryCard = (item: any, index: number) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100)}
      style={styles.cardWrapper as ViewStyle}
    >
      <TouchableOpacity
        onPress={() => navigation.navigate(item.screenName)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={getGradientColors(index)}
          style={styles.card as ViewStyle}
        >
          <View style={styles.cardContent as ViewStyle}>
            <View style={styles.iconContainer as ViewStyle}>
              <Icon
                style={styles.cardIcon}
                fill="#FFFFFF"
                name={item.icon}
                width={32}
                height={32}
              />
            </View>
            <Text category="h6" style={styles.cardTitle as TextStyle}>
              {item.title}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const getGradientColors = (index: number): readonly [string, string] => {
    const gradients: readonly [string, string][] = [
      ["#FF6B6B", "#FF8E8E"],
      ["#4ECDC4", "#45B7AF"],
      ["#6C5CE7", "#8C7AE6"],
      ["#FDA7DF", "#D980FA"],
      ["#A8E6CF", "#88D7B5"],
    ];
    return gradients[index % gradients.length];
  };

  return (
    <Layout style={styles.rootContainer as ViewStyle}>
      <LinearGradient
        colors={["#f8f9fa", "#e9ecef"]}
        style={styles.gradient as ViewStyle}
      >
        <ScrollView
          style={styles.scrollView as ViewStyle}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container as ViewStyle}>
            <View style={styles.cardsContainer as ViewStyle}>
              {allCategoryAtom.map((item, index) =>
                renderCategoryCard(item, index)
              )}
            </View>

            {lowStockProducts.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(300)}
                style={styles.alertContainer as ViewStyle}
              >
                <LinearGradient
                  colors={["#FFF3E0", "#FFE0B2"]}
                  style={styles.alertCard as ViewStyle}
                >
                  <View style={styles.alertHeader as ViewStyle}>
                    <Icon
                      name="alert-triangle-outline"
                      fill="#FF9800"
                      width={24}
                      height={24}
                    />
                    <Text
                      category="h6"
                      status="warning"
                      style={styles.alertTitle as TextStyle}
                    >
                      {t("stock_alerts")} ({lowStockProducts.length})
                    </Text>
                  </View>
                  <ScrollView
                    style={styles.alertScroll as ViewStyle}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {lowStockProducts.map((product) => (
                      <TouchableOpacity
                        key={product.$id}
                        onPress={() => navigation.navigate("WarehouseScreen")}
                      >
                        <LinearGradient
                          colors={["#FFFFFF", "#F5F5F5"]}
                          style={styles.alertItem as ViewStyle}
                        >
                          <Text
                            category="s1"
                            style={styles.productName as TextStyle}
                          >
                            {product.name}
                          </Text>
                          <View style={styles.stockInfo as ViewStyle}>
                            <Text
                              category="c1"
                              style={[
                                styles.stockStatus as TextStyle,
                                (product.stock ?? 0) === 0
                                  ? (styles.outOfStock as TextStyle)
                                  : (styles.lowStock as TextStyle),
                              ]}
                            >
                              {(product.stock ?? 0) === 0
                                ? t("out_of_stock")
                                : t("low_stock")}
                            </Text>
                            <Text
                              category="c1"
                              style={styles.stockCount as TextStyle}
                            >
                              {t("stock")}: {product.stock ?? 0}
                            </Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  ``
                </LinearGradient>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>

      <FloatingAction
        actions={actions}
        color="#6C5CE7"
        overlayColor="rgba(68, 68, 68, 0.7)"
        buttonSize={65}
        distanceToEdge={20}
        shadow={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  rootContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  container: {
    flex: 1,
    padding: 16,
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: "48%",
    marginBottom: 16,
    height: 140,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(10px)",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardIcon: {
    marginBottom: 12,
    transform: [{ scale: 1.2 }],
  },
  cardTitle: {
    textAlign: "center",
    fontWeight: "600",
    color: "#2E3A59",
    flexWrap: "wrap",
    width: "100%",
  },
  alertCard: {
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(10px)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  alertTitle: {
    marginBottom: 12,
    fontWeight: "600",
  },
  alertScroll: {
    flexGrow: 0,
    marginTop: 8,
  },
  alertItem: {
    width: 160,
    marginRight: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(10px)",
  },
  headerContainer: {
    padding: 20,
    paddingTop: 40,
  },

  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
    alignSelf: "center", // Thêm dòng này
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  productName: {
    fontWeight: "600",
    marginBottom: 8,
  },
  stockInfo: {
    flexDirection: "column",
    gap: 4,
  },
  stockStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "600",
  },
  outOfStock: {
    backgroundColor: "#FFE0E0",
    color: "#FF4D4D",
  },
  lowStock: {
    backgroundColor: "#FFF3E0",
    color: "#FF9800",
  },
  stockCount: {
    color: "#666666",
  },
  alertContainer: {
    marginHorizontal: 15,
  },
});

export default HomeScreen;
