import {
  Dimensions,
  ScrollView,
  View,
  Pressable,
  TouchableHighlight,
  Alert,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";

import React, { useCallback, useEffect, useState } from "react";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Layout,
  Icon,
  TopNavigation,
  TopNavigationAction,
  Divider,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useRecoilCallback,
} from "recoil";
import * as RootNavigation from "../../navigator/RootNavigation";
import ProductList from "../../components/product/ProductList";
import { CategoryScrollbar } from "../../components/category";
import {
  allCategoryAtom,
  allProductsAtom,
  productIdsAtom,
  productAtomFamily,
} from "../../states";
import { currentOrderAtom } from "../../states/orderState";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useDatabases, COLLECTION_IDS } from "../../hook/AppWrite";
import { useFocusEffect } from "@react-navigation/native";

// Định nghĩa interfaces cho các order item
interface OrderItem {
  price: number;
  count: number;
  $id: string;
  name: string;
}
type RootStackParamList = {
  CreateOrderScreen: { method: string; shouldRefresh?: boolean };
  ReviewOrderScreen: undefined;
  // Thêm các route khác nếu cần
};

// Định nghĩa kiểu cho props
type CreateOrderScreenProps = {
  route: RouteProp<RootStackParamList, "CreateOrderScreen">;
  navigation: StackNavigationProp<RootStackParamList>;
};

// Định nghĩa kiểu cho product
interface Product {
  $id: string;
  name: string;
  photo: string;
  photoUrl: string;
  price: number;
  cost: number;
  category: string;
  count: number;
  description: string;
}
interface Order {
  $id: string;
  note: string;
  table: string;
  location?: string;
  discount: number;
  subtract: number;
  total: number;
  date: Date;
  order: OrderItem[];
}

const { width } = Dimensions.get("window");

const CheckoutButton = ({ order }: { order: Order }): React.ReactElement => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [totalPrice, setTotalPrice] = useState<number>(0);

  useEffect(() => {
    const sum = order.order.reduce((acc, item) => {
      if (item.price && item.count) {
        return acc + item.price * item.count;
      }
      return acc;
    }, 0);

    setTotalPrice(sum);
  }, [order.order]);

  return (
    <View style={styles.bottomBtnContainer as ViewStyle}>
      <Button
        style={styles.checkoutButton as ViewStyle}
        status="primary"
        size="large"
        accessoryLeft={(props) => (
          <Icon {...props} name="shopping-cart-outline" />
        )}
        accessoryRight={() => (
          <View style={styles.priceContainer as ViewStyle}>
            <Text
              style={styles.priceText as TextStyle}
              category="s1"
              appearance="alternative"
            >
              {Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
                maximumFractionDigits: 0,
              }).format(totalPrice)}
            </Text>
            <Icon
              name="arrow-forward"
              fill="white"
              style={styles.arrowIcon as ImageStyle}
            />
          </View>
        )}
        onPress={() => {
          if (order.order.length > 0) {
            RootNavigation.navigate("ReviewOrderScreen");
          } else {
            Alert.alert(
              t(""),
              t("order_empty"),
              [{ text: t("ok"), style: "default" }],
              { cancelable: true }
            );
          }
        }}
      >
        {t("checkout")}
      </Button>
    </View>
  );
};

const BackIcon = (props: any) => <Icon {...props} name="arrow-back" />;

const CreateOrderScreen = ({ route, navigation }: CreateOrderScreenProps) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { getAllItem } = useDatabases();

  const productData = useRecoilValue<Product[]>(allProductsAtom);
  const resetOrder = useResetRecoilState(currentOrderAtom);
  const [order, setOrder] = useRecoilState<Order>(currentOrderAtom);

  // Reset Product List
  const resetProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        for (const product of productData) {
          set(productAtomFamily(product.$id), product);
        }
      },
    [productData]
  );

  // Tạo một hàm refresh sử dụng useRecoilCallback
  const refreshProducts = useRecoilCallback(
    ({ set }) =>
      async () => {
        try {
          console.log("Refreshing products from database in CreateOrderScreen");
          const productData = await getAllItem(COLLECTION_IDS.products);

          // Cập nhật atom allProductsAtom trực tiếp
          set(allProductsAtom, productData);

          console.log("Products refreshed with", productData.length, "items");
        } catch (error) {
          console.error("Error refreshing products:", error);
        }
      },
    [getAllItem]
  );

  // Sử dụng useEffect để gọi hàm refresh khi có shouldRefresh
  useEffect(() => {
    if (route.params?.shouldRefresh) {
      console.log("Should refresh flag detected, refreshing products...");
      refreshProducts();
    }
  }, [route.params?.shouldRefresh, refreshProducts]);

  useEffect(() => {
    if (
      route.params &&
      route.params.method &&
      route.params.method === "create"
    ) {
      resetProductList();
      resetOrder();
    }
    return () => {
      // cleanup
    };
  }, [route.params, resetProductList, resetOrder]);

  // Thêm useFocusEffect để refresh sản phẩm khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      console.log("CreateOrderScreen focused");
      return () => {
        // Cleanup nếu cần
      };
    }, [])
  );

  const navigateBack = () => {
    navigation.goBack();
  };

  const BackAction = () => (
    <TopNavigationAction icon={BackIcon} onPress={navigateBack} />
  );

  return (
    <Layout style={styles.container as ViewStyle}>
      <View style={styles.categoryContainer as ViewStyle}>
        <CategoryScrollbar
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      </View>

      <View style={styles.productListContainer as ViewStyle}>
        <ProductList
          screen="order"
          editable={false}
          category={selectedCategory}
        />
      </View>

      {/* Cart Summary */}
      {order.order.length > 0 && (
        <View style={styles.cartSummaryContainer as ViewStyle}>
          <View style={styles.cartSummary as ViewStyle}>
            <Icon
              name="shopping-cart"
              fill="#3366FF"
              style={styles.cartIcon as ImageStyle}
            />
            <Text category="s1">
              {order.order.length} {t("items_selected")}
            </Text>
          </View>
        </View>
      )}

      <CheckoutButton order={order} />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  },

  // Category container
  categoryContainer: {
    backgroundColor: "background-basic-color-1",
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
    zIndex: 10,
  },

  // Product list container
  productListContainer: {
    flex: 1,
    paddingBottom: 80,
  },

  // Cart summary
  cartSummaryContainer: {
    position: "absolute",
    top: 130, // Adjust based on your header + category selector height
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99,
  },
  cartSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "color-primary-100",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },

  // Checkout button
  bottomBtnContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "background-basic-color-1",
    borderTopWidth: 1,
    borderTopColor: "border-basic-color-3",
  },
  checkoutButton: {
    borderRadius: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceText: {
    color: "white",
    fontWeight: "bold",
    marginRight: 8,
  },
  arrowIcon: {
    width: 20,
    height: 20,
  },
});

export default CreateOrderScreen;
