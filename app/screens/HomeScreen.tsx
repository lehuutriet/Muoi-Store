import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  View,
  Dimensions,
  ViewStyle,
  TextStyle,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  ImageStyle,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  Layout,
  Text,
  Card,
  Icon,
  Button,
  Avatar,
  Divider,
  Spinner,
} from "@ui-kitten/components";
import { FloatingAction } from "react-native-floating-action";
import { StyleService, useStyleSheet } from "@ui-kitten/components";
import { useRecoilValue, useRecoilState } from "recoil";
import React, { useEffect, useState, useCallback, useContext } from "react";
import { allProductsAtom, userAtom, orderScreenRefreshAtom } from "../states";
import { LinearGradient } from "expo-linear-gradient";
import { Query } from "appwrite";
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";

import { useFocusEffect } from "@react-navigation/native";
import { DrawerContext } from "../contexts/AppContext";

const { width } = Dimensions.get("window");
import { useRecoilCallback } from "recoil";
import { productIdsAtom, productAtomFamily } from "../states";
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
interface Order {
  $id: string;
  status: string;
  date: string;
  total: number;
  customerName?: string;
  customerPhone?: string;
  table?: string;
  note?: string;
  // Thêm các trường khác nếu cần
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
  StatisticScreen: undefined;
  RecipeScreen: undefined;
  LoyalCustomerScreen: undefined;
  CouponScreen: undefined;
  PromotionScreen: undefined;
  SupplierScreen: undefined;
  CalendarScreen: undefined;
  ReviewOrderScreen: {
    orderInfo: Order;
  };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type HomeScreenProps = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const allProducts = useRecoilValue<Product[]>(allProductsAtom);
  const userInfo = useRecoilValue(userAtom);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("");
  const animatedValue = useSharedValue(0);
  const [needsRefresh, setNeedsRefresh] = useRecoilState(
    orderScreenRefreshAtom
  );

  const { toggleDrawer } = useContext(DrawerContext);
  const { getAllItem } = useDatabases();

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Lấy đơn hàng gần đây
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        setIsLoadingOrders(true);
        const currentDate = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(currentDate.getDate() - 7);

        // Sử dụng Query từ Appwrite để lọc theo ngày và sắp xếp theo thời gian mới nhất
        const orders = await getAllItem(COLLECTION_IDS.orders, [
          Query.greaterThan("date", sevenDaysAgo.toISOString()),
          Query.orderDesc("$createdAt"),
        ]);

        // Chỉ lấy 5 đơn hàng mới nhất
        setRecentOrders(orders.slice(0, 5));
      } catch (error) {
        console.error("Error fetching recent orders:", error);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchRecentOrders();
  }, []);

  // Animation for cards
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: withSpring(animatedValue.value) }],
    };
  });

  useEffect(() => {
    animatedValue.value = 0;
    const timer = setTimeout(() => {
      animatedValue.value = -10;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) {
      setGreeting(t("good_morning"));
    } else if (hours < 18) {
      setGreeting(t("good_afternoon"));
    } else {
      setGreeting(t("good_evening"));
    }
  }, [t]);

  useEffect(() => {
    const productsWithLowStock = allProducts.filter(
      (product) =>
        product.stock !== undefined &&
        product.minStock !== undefined &&
        product.stock <= product.minStock
    );
    setLowStockProducts(productsWithLowStock);
  }, [allProducts]);

  const fetchTodayData = useCallback(async () => {
    try {
      // Lấy ngày hiện tại với thời gian 00:00:00
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayStart = today.toISOString();
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // Lấy tất cả đơn hàng hôm nay
      const todayOrdersData = await getAllItem(COLLECTION_IDS.orders, [
        Query.greaterThanEqual("$createdAt", todayStart),
        Query.lessThanEqual("$createdAt", todayEnd.toISOString()),
      ]);

      // Tính doanh thu ngày hôm nay (chỉ từ các đơn đã thanh toán)
      let revenue = 0;
      let completedOrders = 0;

      todayOrdersData.forEach((order: any) => {
        if (order.status === "cash" || order.status === "transfer") {
          revenue += Number(order.total) || 0;
          completedOrders++;
        }
      });

      setTodayRevenue(revenue);
      setTodayOrders(todayOrdersData.length);
    } catch (error) {
      console.error("Error fetching today's data:", error);
    }
  }, [getAllItem]);

  useFocusEffect(
    React.useCallback(() => {
      fetchTodayData();
      return () => {};
    }, [fetchTodayData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTodayData();
    setRefreshing(false);
  }, [fetchTodayData]);

  const featureButtons: Array<{
    title: string;
    icon: string;
    color: [string, string];
    onPress: () => void;
  }> = [
    {
      title: t("create_order"),
      icon: "shopping-cart-outline",
      color: ["#FF6B6B", "#FF8E8E"],
      onPress: () => {
        setNeedsRefresh(true); // Đặt flag thành true
        navigation.navigate("CreateOrderScreen", {
          title: t("create_order"),
          method: "create",
        });
      },
    },
    {
      title: t("manage_order"),
      icon: "list-outline",
      color: ["#4ECDC4", "#45B7AF"] as const,
      onPress: () => navigation.navigate("ManageOrderScreen"),
    },
    {
      title: t("manage_product"),
      icon: "cube-outline",
      color: ["#6C5CE7", "#8C7AE6"] as const,
      onPress: () => navigation.navigate("ManageProductScreen"),
    },
    {
      title: t("manage_table"),
      icon: "grid-outline",
      color: ["#FDA7DF", "#D980FA"] as const,
      onPress: () => navigation.navigate("ManageTableScreen"),
    },
    {
      title: t("warehouse"),
      icon: "archive-outline",
      color: ["#A8E6CF", "#88D7B5"] as const,
      onPress: () => navigation.navigate("WarehouseScreen"),
    },
    {
      title: t("statistic"),
      icon: "pie-chart-outline",
      color: ["#FFC75F", "#F9B248"] as const,
      onPress: () => navigation.navigate("StatisticScreen"),
    },
    {
      title: t("recipes"),
      icon: "book-outline",
      color: ["#9C8BE0", "#7E57C2"] as [string, string],
      onPress: () => navigation.navigate("RecipeScreen"),
    },
    {
      title: t("loyal_customers"),
      icon: "people-outline",
      color: ["#B06AB3", "#4568DC"] as const,
      onPress: () => navigation.navigate("LoyalCustomerScreen"),
    },
    {
      title: t("coupons"),
      icon: "pricetags-outline",
      color: ["#E91E63", "#D81B60"] as const,
      onPress: () => navigation.navigate("CouponScreen"),
    },
    {
      title: t("promotions"),
      icon: "gift-outline",
      color: ["#00BCD4", "#00ACC1"] as const,
      onPress: () => navigation.navigate("PromotionScreen"),
    },
    {
      title: t("suppliers"),
      icon: "people-outline",
      color: ["#00BCD4", "#00ACC1"],
      onPress: () => navigation.navigate("SupplierScreen"),
    },
    {
      title: t("calendar"),
      icon: "calendar-outline",
      color: ["#3366FF", "#2541B2"] as const,
      onPress: () => navigation.navigate("CalendarScreen"),
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

  return (
    <Layout style={styles.rootContainer as ViewStyle}>
      <LinearGradient
        colors={["#f8f9fa", "#e9ecef", "#f5f5f5"]}
        style={styles.gradient as ViewStyle}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <ScrollView
          style={styles.scrollView as ViewStyle}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header Section with Greeting */}
          <Animated.View
            entering={FadeIn.duration(800)}
            style={styles.headerContainer as ViewStyle}
          >
            <LinearGradient
              colors={["#6C5CE7", "#A363FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerGradient as ViewStyle}
            >
              <View style={styles.headerContent as ViewStyle}>
                <View>
                  <Text category="s1" style={styles.greetingText as TextStyle}>
                    {greeting}
                  </Text>
                  <Text category="h4" style={styles.storeNameText as TextStyle}>
                    {userInfo.STORE_NAME || t("shop_name")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleDrawer}
                  style={styles.avatarContainer as ViewStyle}
                >
                  <Avatar
                    size="large"
                    source={require("../../assets/images/iconshop.png")}
                    style={styles.avatarImage as ImageStyle}
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Quick Stats Cards */}
          <View style={styles.statsContainer as ViewStyle}>
            <Animated.View
              entering={FadeInDown.delay(200).duration(500)}
              style={[styles.statCardContainer as ViewStyle, animatedStyle]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.statCardWrapper as ViewStyle}
                onPress={() => navigation.navigate("StatisticScreen")}
              >
                <LinearGradient
                  colors={["#2B32B2", "#1488CC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.statCardGradient as ViewStyle}
                >
                  <View style={styles.statIconContainer as ViewStyle}>
                    <Icon
                      name="trending-up-outline"
                      fill="#FFFFFF"
                      style={styles.statIcon as ViewStyle}
                    />
                  </View>
                  <View style={styles.statTextContainer as ViewStyle}>
                    <Text
                      category="c1"
                      style={styles.statLabelModern as TextStyle}
                    >
                      {t("today_revenue1")}
                    </Text>
                    <Text
                      category="h6"
                      style={styles.statValueModern as TextStyle}
                    >
                      {new Intl.NumberFormat("vi-VN", {
                        maximumFractionDigits: 0,
                      }).format(todayRevenue) + "đ"}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(300).duration(500)}
              style={[styles.statCardContainer as ViewStyle, animatedStyle]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.statCardWrapper as ViewStyle}
                onPress={() => navigation.navigate("ManageOrderScreen")}
              >
                <LinearGradient
                  colors={["#FF416C", "#FF4B2B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.statCardGradient as ViewStyle}
                >
                  <View style={styles.statIconContainer as ViewStyle}>
                    <Icon
                      name="shopping-bag-outline"
                      fill="#FFFFFF"
                      style={styles.statIcon as ViewStyle}
                    />
                  </View>
                  <View style={styles.statTextContainer as ViewStyle}>
                    <Text
                      category="c1"
                      style={styles.statLabelModern as TextStyle}
                    >
                      {t("today_orders1")}
                    </Text>
                    <Text
                      category="h6"
                      style={styles.statValueModern as TextStyle}
                    >
                      {todayOrders}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Main Features Grid */}
          <Animated.View
            entering={FadeInDown.delay(400)}
            style={styles.featuresContainer as ViewStyle}
          >
            <View style={styles.sectionTitleContainer as ViewStyle}>
              <Text category="h6" style={styles.sectionTitle as TextStyle}>
                {t("features")}
              </Text>
            </View>

            <View style={styles.featuresGrid as ViewStyle}>
              {featureButtons.map((feature, index) => (
                <Animated.View
                  key={index}
                  entering={FadeInRight.delay(200 + index * 50).duration(400)}
                  style={styles.featureButtonContainer as ViewStyle}
                >
                  <TouchableOpacity
                    style={styles.featureButton as ViewStyle}
                    onPress={feature.onPress}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={feature.color}
                      style={styles.featureGradient as ViewStyle}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Icon
                        name={feature.icon}
                        fill="white"
                        style={styles.featureIcon as ViewStyle}
                      />
                    </LinearGradient>
                    <Text category="s2" style={styles.featureText as TextStyle}>
                      {feature.title}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Recent Orders Section */}
          <Animated.View
            entering={FadeInDown.delay(500)}
            style={styles.recentOrdersContainer as ViewStyle}
          >
            <View style={styles.sectionTitleContainer as ViewStyle}>
              <Text category="h6" style={styles.sectionTitle as TextStyle}>
                {t("recent_orders")}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("ManageOrderScreen")}
              >
                <Text category="s1" style={styles.viewAllText as TextStyle}>
                  {t("view_orders")}
                </Text>
              </TouchableOpacity>
            </View>

            {isLoadingOrders ? (
              <View style={styles.loadingContainer as ViewStyle}>
                <Spinner size="medium" />
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recentOrdersScroll as ViewStyle}
              >
                {recentOrders.length > 0 ? (
                  recentOrders.map((order, index) => (
                    <Animated.View
                      key={order.$id}
                      entering={FadeInRight.delay(600 + index * 100)}
                      style={styles.orderCardContainer as ViewStyle}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          const orderInfo = order; // Hoặc chuyển đổi định dạng nếu cần
                          navigation.navigate("ReviewOrderScreen", {
                            orderInfo,
                          });
                        }}
                      >
                        <Card style={styles.orderCard as ViewStyle}>
                          <View style={styles.orderCardHeader as ViewStyle}>
                            <Text
                              category="s1"
                              style={styles.orderIdText as TextStyle}
                              numberOfLines={1}
                            >
                              #{order.$id.substring(0, 8)}
                            </Text>
                            <View
                              style={
                                [
                                  styles.orderStatusBadge as ViewStyle,
                                  order.status === "unpaid"
                                    ? styles.statusPending
                                    : styles.statusCompleted,
                                ] as ViewStyle[]
                              }
                            >
                              <Text
                                category="c1"
                                style={styles.orderStatusText as TextStyle}
                              >
                                {order.status === "unpaid"
                                  ? t("pending")
                                  : t("completed")}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.orderInfoRow as ViewStyle}>
                            <Icon
                              name="calendar-outline"
                              fill="#6C5CE7"
                              style={styles.orderInfoIcon as ImageStyle}
                            />
                            <Text
                              category="c1"
                              style={styles.orderInfoText as TextStyle}
                            >
                              {new Date(order.date).toLocaleDateString()}
                            </Text>
                          </View>

                          <View style={styles.orderInfoRow as ViewStyle}>
                            <Icon
                              name="credit-card-outline"
                              fill="#6C5CE7"
                              style={styles.orderInfoIcon as ImageStyle}
                            />
                            <Text
                              category="c1"
                              style={styles.orderInfoText as TextStyle}
                            >
                              {order.status === "cash"
                                ? t("cash")
                                : order.status === "transfer"
                                  ? t("transfer")
                                  : t("unpaid")}
                            </Text>
                          </View>

                          <View style={styles.orderTotalRow as ViewStyle}>
                            <Text
                              category="s2"
                              style={styles.orderTotalLabel as TextStyle}
                            >
                              {t("total")}:
                            </Text>
                            <Text
                              category="s1"
                              style={styles.orderTotalValue as TextStyle}
                            >
                              {new Intl.NumberFormat("vi-VN", {
                                maximumFractionDigits: 0,
                              }).format(order.total) + "đ"}
                            </Text>
                          </View>
                        </Card>
                      </TouchableOpacity>
                    </Animated.View>
                  ))
                ) : (
                  <View style={styles.emptyContainer as ViewStyle}>
                    <Icon
                      name="shopping-bag-outline"
                      fill="#d3d3d3"
                      style={styles.emptyIcon as ImageStyle}
                    />
                    <Text appearance="hint">{t("no_recent_orders")}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </Animated.View>

          {/* Bottom padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </LinearGradient>

      {/* Floating Action Button */}
      <FloatingAction
        actions={actions}
        color="#6C5CE7"
        overlayColor="rgba(68, 68, 68, 0.7)"
        buttonSize={65}
        distanceToEdge={20}
        onPressItem={(name) => {
          if (name === "CreateOrderScreen") {
            setNeedsRefresh(true); // Đặt flag thành true
            navigation.navigate(name, {
              title: t("create_order"),
              method: "create",
            });
          } else if (name === "CreateProductScreen") {
            navigation.navigate(name, {
              title: t("create_product"),
              method: "create",
            });
          }
        }}
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

  // Header styles
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 5,
  },
  headerGradient: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 15,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    color: "white",
    marginBottom: 4,
    opacity: 0.9,
  },
  storeNameText: {
    fontWeight: "bold",
    color: "white",
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 30,
    padding: 2,
  },
  avatarImage: {
    borderRadius: 28,
  },

  // Stats cards
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCardContainer: {
    width: (width - 40) / 2,
  },
  statCardWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  statCardGradient: {
    padding: 16,
    height: 100,
    flexDirection: "row",
    alignItems: "center",
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statLabelModern: {
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    marginBottom: 5,
  },
  statValueModern: {
    color: "white",
    fontWeight: "bold",
  },

  // Legacy styles - keeping for compatibility
  statCard: {
    width: "100%",
    borderRadius: 12,
    padding: 1,
    height: 130,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    textAlign: "center",
    fontWeight: "bold",
    flexWrap: "wrap",
  },
  revenueCard: {
    backgroundColor: "#E3F2FD",
  },
  ordersCard: {
    backgroundColor: "#FFF3E0",
  },
  statCardContent: {
    alignItems: "center",
  },
  statIcon: {
    width: 28,
    height: 28,
    marginBottom: 8,
  },
  statLabel: {
    color: "text-hint-color",
    textAlign: "center",
    marginBottom: 4,
  },

  // Features section
  featuresContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 0,
    fontWeight: "600",
  },
  viewAllText: {
    color: "color-primary-500",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureButtonContainer: {
    width: (width - 48) / 4,
    marginBottom: 16,
  },
  featureButton: {
    alignItems: "center",
  },
  featureGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  featureIcon: {
    width: 26,
    height: 26,
  },
  featureText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },

  // Recent orders
  recentOrdersContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  recentOrdersScroll: {
    paddingVertical: 8,
  },
  orderCardContainer: {
    width: 220,
    marginRight: 16,
  },
  orderCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    padding: 12,
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderIdText: {
    fontWeight: "bold",
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: "rgba(255, 193, 7, 0.2)",
  },
  statusCompleted: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "text-basic-color",
  },
  orderInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  orderInfoIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  orderInfoText: {
    color: "text-hint-color",
  },
  orderTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "background-basic-color-3",
  },
  orderTotalLabel: {
    color: "text-hint-color",
  },
  orderTotalValue: {
    fontWeight: "bold",
    color: "color-primary-500",
  },

  // Legacy styles for alerts section
  alertsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "background-basic-color-1",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  alertsTitle: {
    fontWeight: "600",
  },
  alertsScroll: {
    marginBottom: 8,
  },
  alertCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: "background-basic-color-1",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "color-basic-transparent-200",
    overflow: "hidden",
  },
  alertCardContent: {
    padding: 12,
  },
  alertImageContainer: {
    height: 70,
    marginBottom: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  alertImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  alertImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "color-basic-transparent-100",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  alertProductName: {
    marginBottom: 4,
    fontWeight: "600",
  },
  alertStockInfo: {
    flexDirection: "column",
  },
  alertStatusText: {
    borderRadius: 4,
    fontWeight: "600",
    marginBottom: 4,
    fontSize: 10,
  },
  alertStockText: {
    color: "text-hint-color",
  },
  viewAllButton: {
    alignSelf: "flex-end",
  },

  // Action button styles
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonModern: {
    shadowColor: "#6C5CE7",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  loadingContainer: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  emptyContainer: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    width: width - 32,
    borderRadius: 8,
    backgroundColor: "background-basic-color-1",
    marginHorizontal: 16,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
});

export default HomeScreen;
