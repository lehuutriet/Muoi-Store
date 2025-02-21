import {
  Dimensions,
  ScrollView,
  View,
  Pressable,
  TouchableHighlight,
  Alert,
  ViewStyle,
  TextStyle,
} from "react-native";

import React, { useCallback, useEffect, useState } from "react";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Layout,
  Icon,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useRecoilCallback,
} from "recoil";
import * as RootNavigation from "../navigator/RootNavigation";
import ProductList from "../components/product/ProductList";
import { CategoryScrollbar } from "../components/category";
import {
  allCategoryAtom,
  allProductsAtom,
  productIdsAtom,
  productAtomFamily,
} from "../states";
import { currentOrderAtom } from "../states/orderState";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
// Định nghĩa interfaces cho các order item
interface OrderItem {
  price: number;
  count: number;
  $id: string;
  name: string;
}
type RootStackParamList = {
  CreateOrderScreen: { method: string };
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
  discount: number;
  subtract: number;
  total: number;
  date: Date;
  order: OrderItem[];
}
// Định nghĩa interface cho style
interface OrderStyles {
  container: ViewStyle;
  bottomBtn: ViewStyle;
  btnType: ViewStyle;
}

const CheckoutButton = (): React.ReactElement => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [order, setOrder] = useRecoilState<Order>(currentOrderAtom);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  useEffect(() => {
    const sum = order.order.reduce((acc, item) => {
      if (item.price && item.count) {
        return acc + item.price * item.count;
      }
      return acc;
    }, 0);
    console.log("setTotalPrice::", sum, order.order.length);
    setTotalPrice(sum);
  }, [order.order]);

  return (
    <Layout level="1" style={styles.bottomBtn as ViewStyle}>
      <View style={styles.btnType as ViewStyle}>
        <View
          style={{ paddingLeft: 20, display: "flex", flexDirection: "row" }}
        >
          <Icon
            style={{ width: 20, height: 20 }}
            fill="white"
            name="briefcase-outline"
          />

          <Text appearance="alternative" style={{ paddingLeft: 20 }}>
            {Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "VND",
            }).format(totalPrice)}
          </Text>
        </View>
      </View>
      <View>
        <Text
          onPress={() => {
            if (order.order.length > 0) {
              RootNavigation.navigate("ReviewOrderScreen");
            } else {
              Alert.alert(
                t(""),
                t("order_empty"),
                [
                  {
                    text: t("ok"),
                    style: "default",
                  },
                ],
                {
                  cancelable: true,
                }
              );
            }
          }}
          appearance="alternative"
          style={{ paddingRight: 20, fontWeight: "bold" }}
        >
          {t("continue")}
        </Text>
      </View>
    </Layout>
  );
};

const CreateOrderScreen = ({ route, navigation }: CreateOrderScreenProps) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const productData = useRecoilValue<Product[]>(allProductsAtom);
  const resetOrder = useResetRecoilState(currentOrderAtom);

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

  useEffect(() => {
    if (
      route.params &&
      route.params.method &&
      route.params.method === "create"
    ) {
      resetProductList();
      console.log("CreateOrderScreen called::", route.params);
      // reset product list when new order is selected
      resetOrder();
    }
    // if (route.params.method === "edit") {

    // }
    return () => {
      // cleanup
    };
  }, [route.params, resetProductList, resetOrder]);

  return (
    <Layout level="1" style={styles.container as ViewStyle}>
      <CategoryScrollbar
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />
      <ProductList
        screen="order"
        editable={false}
        category={selectedCategory}
      />
      <CheckoutButton />
    </Layout>
  );
};

const styleSheet = StyleService.create<OrderStyles>({
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBtn: {
    position: "absolute",
    justifyContent: "space-between",
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    backgroundColor: "color-primary-900",
    margin: 15,
    width: Dimensions.get("window").width - 30,
    height: 60,
    bottom: 0,
    borderRadius: 5,
  },
  btnType: {
    display: "flex",
    flexDirection: "row",
  },
});

export default CreateOrderScreen;
