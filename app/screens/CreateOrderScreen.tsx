import {
  Dimensions,
  ScrollView,
  View,
  Pressable,
  TouchableHighlight,
  Alert,
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
  currentOrderAtom,
  allProductsAtom,
  productIdsAtom,
  productAtomFamily,
} from "../states";

const CheckoutButton = (): React.ReactElement => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [order, setOrder] = useRecoilState(currentOrderAtom);
  const [totalPrice, setTotalPrice] = useState(0);

  // const calculateTotalPrice = useCallback(() => {
  //   const sum = order.order.reduce((acc, item) => {
  //     if (item.price && item.count) {
  //       return acc + item.price * item.count;
  //     }
  //     return acc;
  //   }, 0);
  //   console.log("setTotalPrice::", sum, order.order);
  //   setTotalPrice(sum);
  // }, []);

  useEffect(() => {
    const sum = order.order.reduce((acc, item) => {
      if (item.price && item.count) {
        return acc + item.price * item.count;
      }
      return acc;
    }, 0);
    console.log("setTotalPrice::", sum, order.order.length);
    setTotalPrice(sum);
    // calculateTotalPrice();
  }, [order.order]);
  return (
    <Layout level="1" style={styles.bottomBtn}>
      <View style={styles.btnType}>
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

const CreateOrderScreen = ({ route, navigation }) => {
  // console.log("CreateOrderScreen called::", route.params);
  // navigation.setOptions({ title: route.params.title });
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const productData = useRecoilValue(allProductsAtom);
  const resetOrder = useResetRecoilState(currentOrderAtom);

  // Reset Product List
  const resetProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        for (const product of productData) {
          set(productAtomFamily(product.$id), product);
        }
      },
    []
  );

  useEffect(() => {
    if (route.params.method && route.params.method === "create") {
      resetProductList();
      console.log("CreateOrderScreen called::", route.params);
      // reset product list when new order is selected
      resetOrder();
    }
    // if (route.params.method === "edit") {

    // }
    return () => {
      // resetProductList();
    };
  }, []);

  return (
    <Layout level="1" style={styles.container}>
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

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    // flexDirection: "row",
    // flexWrap: "wrap",
    // paddingHorizontal: 20,
    // margin:10,
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
