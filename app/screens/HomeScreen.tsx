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
} from "@ui-kitten/components";
import { FloatingAction } from "react-native-floating-action";
import { StyleService, useStyleSheet } from "@ui-kitten/components";
import { useRecoilValue } from "recoil";
import React, { useEffect, useState, useCallback, useContext } from "react";
import { allProductsAtom, userAtom } from "../states";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeIn,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { Query } from "appwrite";
import { useFocusEffect } from "@react-navigation/native";
import { DrawerContext } from "../contexts/AppContext";

const { width } = Dimensions.get("window");

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
  StatisticScreen: undefined;
  RecipeScreen: undefined;
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
  const [unpaidOrders, setUnpaidOrders] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState("");
  const animatedValue = useSharedValue(0);
  const { getAllItem } = useDatabases();
  const { toggleDrawer } = useContext(DrawerContext);
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

      // Lấy đơn hàng chưa thanh toán
      const unpaidOrdersData = await getAllItem(COLLECTION_IDS.orders, [
        Query.equal("status", "unpaid"),
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
      setUnpaidOrders(unpaidOrdersData.length);
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

  const featureButtons = [
    {
      title: t("create_order"),
      icon: "shopping-cart-outline",
      color: ["#FF6B6B", "#FF8E8E"] as const,
      onPress: () =>
        navigation.navigate("CreateOrderScreen", {
          title: t("create_order"),
          method: "create",
        }),
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
      color: ["#9C8BE0", "#7E57C2"],
      onPress: () => navigation.navigate("RecipeScreen"),
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
        colors={["#f8f9fa", "#e9ecef"] as const}
        style={styles.gradient as ViewStyle}
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
            <View style={styles.headerContent as ViewStyle}>
              <View>
                <Text category="s1" style={styles.greetingText as TextStyle}>
                  {greeting}
                </Text>
                <Text category="h4" style={styles.storeNameText as TextStyle}>
                  {userInfo.STORE_NAME || t("shop_name")}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Quick Stats Cards */}
          <Animated.View
            entering={FadeInDown.delay(200)}
            style={[styles.statsContainer as ViewStyle, animatedStyle]}
          >
            <Card style={[styles.statCard, styles.revenueCard] as ViewStyle[]}>
              <View style={styles.statCardContent as ViewStyle}>
                <Icon
                  name="trending-up-outline"
                  fill="#2F80ED"
                  style={styles.statIcon as ViewStyle}
                />
                <View>
                  <Text category="c1" style={styles.statLabel as TextStyle}>
                    {t("today_revenue1")}
                  </Text>
                  <Text
                    category="h6"
                    style={
                      [
                        styles.statValue,
                        { fontSize: 14 },
                      ] as unknown as TextStyle
                    }
                    numberOfLines={2}
                  >
                    {new Intl.NumberFormat("vi-VN", {
                      maximumFractionDigits: 0,
                    }).format(todayRevenue) + "đ"}
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={[styles.statCard, styles.ordersCard] as ViewStyle[]}>
              <View style={styles.statCardContent as ViewStyle}>
                <Icon
                  name="shopping-bag-outline"
                  fill="#FF9800"
                  style={styles.statIcon as ViewStyle}
                />
                <View>
                  <Text category="c1" style={styles.statLabel as TextStyle}>
                    {t("today_orders1")}
                  </Text>
                  <Text category="h6" style={styles.statValue as TextStyle}>
                    {todayOrders}
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={[styles.statCard, styles.unpaidCard] as ViewStyle[]}>
              <View style={styles.statCardContent as ViewStyle}>
                <Icon
                  name="alert-triangle-outline"
                  fill="#F2994A"
                  style={styles.statIcon as ViewStyle}
                />
                <View>
                  <Text category="c1" style={styles.statLabel as TextStyle}>
                    {t("unpaid_orders1")}
                  </Text>
                  <Text category="h6" style={styles.statValue as TextStyle}>
                    {unpaidOrders}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Main Features Grid */}
          <Animated.View
            entering={FadeInDown.delay(300)}
            style={styles.featuresContainer as ViewStyle}
          >
            <Text category="h6" style={styles.sectionTitle as TextStyle}>
              {t("features")}
            </Text>
            <View style={styles.featuresGrid as ViewStyle}>
              {featureButtons.map((feature, index) => (
                <TouchableOpacity
                  key={index}
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
              ))}
            </View>
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
  headerContainer: {
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    color: "text-hint-color",
    marginBottom: 4,
  },
  storeNameText: {
    fontWeight: "bold",
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 35) / 3,
    borderRadius: 12,
    padding: 1,
    height: 130, // Tăng chiều cao của card
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
    flexWrap: "wrap", // Cho phép text được wrap xuống dòng
  },
  revenueCard: {
    backgroundColor: "#E3F2FD",
  },
  ordersCard: {
    backgroundColor: "#FFF3E0",
  },
  unpaidCard: {
    backgroundColor: "#FBE9E7",
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

  featuresContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: "600",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureButton: {
    width: (width - 48) / 3,
    alignItems: "center",
    marginBottom: 16,
  },
  featureGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    width: 28,
    height: 28,
  },
  featureText: {
    textAlign: "center",
    fontSize: 12,
  },
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
});

export default HomeScreen;
