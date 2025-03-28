import React, { useEffect, useCallback } from "react";
import {
  View,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  Alert,
  ScrollView,
  ViewStyle,
  ImageStyle,
} from "react-native";
import {
  Button,
  Card,
  List,
  Text,
  Icon,
  useStyleSheet,
  useTheme,
  StyleService,
  Layout,
} from "@ui-kitten/components";
import { useRecoilState, useRecoilValue, useRecoilCallback } from "recoil";
import {
  productIdsAtom,
  productAtomFamily,
  productAtomFamilySelector,
  currentOrderAtom,
  allProductsAtom,
} from "../../states";
import * as RootNavigation from "../../navigator/RootNavigation";
import { useTranslation } from "react-i18next";
import { useStorage, useDatabases, COLLECTION_IDS } from "../../hook/AppWrite";

// Định nghĩa interface cho Product
interface Product {
  $id: string;
  name: string;
  photoUrl?: string;
  price: number;
  category?: string;
  count: number;
}

// Định nghĩa interface cho OrderItem
interface OrderItem {
  $id: string;
  name: string;
  photoUrl?: string;
  price: number;
  count: number;
}

// Định nghĩa interface cho Order
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
  couponCode?: string;
  promotionDiscount?: number;
}

// Props cho ProductCard
interface ProductCardProps {
  productId: string;
}

interface ProductListProps {
  screen: string;
  editable: boolean;
  category?: string;
}

const ProductList: React.FC<ProductListProps> = ({
  screen,
  editable,
  category = "all",
}): React.ReactElement => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem, createItem, updateItem, deleteItem } = useDatabases();
  const [productIDs, setProductIDs] = useRecoilState<string[]>(productIdsAtom);
  const [order, setOrder] = useRecoilState<Order>(currentOrderAtom);

  // Refresh Product List
  const refreshProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        const productData = await getAllItem(COLLECTION_IDS.products);
        set(allProductsAtom, productData);
        const ids: string[] = [];
        for (const product of productData) {
          ids.push(product.$id);
          set(productAtomFamily(product.$id), product);
        }
        set(productIdsAtom, ids);
      },
    []
  );

  // Update Order List
  const updateOrderList = useCallback(
    (newItem: Product) => {
      // Tạo bản sao sâu của đối tượng để tránh các vấn đề với readonly props
      const item = JSON.parse(JSON.stringify(newItem)) as typeof newItem;
      const index = order.order.findIndex(
        (orderItem) => orderItem.$id === item.$id
      );
      let newOrder = [...order.order];

      if (index >= 0) {
        // Thay thế đối tượng tại index thay vì cập nhật trực tiếp
        newOrder[index] = { ...newOrder[index], count: item.count };
      } else {
        newOrder.push(item as OrderItem);
      }

      // Lọc các mục có count > 0
      newOrder = newOrder.filter((orderItem) => orderItem.count > 0);

      // Cập nhật state order
      setOrder({ ...order, order: newOrder });
    },
    [order, setOrder]
  );

  const showAlertConfirm = (tilte: string, message: string, itemID: string) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: t("no"),
          style: "cancel",
        },
        {
          text: t("yes"),
          onPress: () => onDelete(itemID),
          style: "default",
        },
      ],
      {
        cancelable: true,
      }
    );

  const onDelete = async (itemID: string) => {
    console.log("deleteConfirm::", itemID);
    await deleteItem(COLLECTION_IDS.products, itemID);
    refreshProductList();
  };

  const ProductCard: React.FC<ProductCardProps> = ({ productId }) => {
    const [product, setProduct] = useRecoilState<Product>(
      productAtomFamilySelector(productId)
    );

    const updateCount = (method: "add" | "sub") => {
      const math = method === "add" ? 1 : method === "sub" ? -1 : 0;
      let count = product.count >= 0 ? product.count + math : 0;
      count = count > 0 ? count : 0;
      const updatedItem = { ...product, count: count };
      setProduct(updatedItem);

      if (screen === "order") {
        updateOrderList(updatedItem);
      }
    };

    return (
      <>
        {category === "all" || product.category === category ? (
          <Card
            style={styles.cardItem as ViewStyle}
            onPress={() =>
              screen === "manage" && editable
                ? RootNavigation.navigate("CreateProductScreen", {
                    title: t("update_product"),
                    method: "edit",
                    item: product,
                  })
                : null
            }
          >
            <View style={styles.productCard as ViewStyle}>
              <ImageBackground
                style={styles.cardImg as ViewStyle}
                imageStyle={{ borderRadius: 8 }}
                source={
                  product.photoUrl
                    ? { uri: product.photoUrl }
                    : require("../../../assets/icons/food-default.png")
                }
                resizeMode="cover"
              ></ImageBackground>

              <View style={styles.cardInfo as ViewStyle}>
                <View style={{ paddingLeft: 10 }}>
                  <Text style={{ paddingBottom: 15 }}> {product.name}</Text>
                  <Text status="primary">
                    {Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "VND",
                    }).format(product.price)}
                  </Text>
                </View>

                {screen === "manage" && editable ? (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        backgroundColor: "transparent",
                        borderWidth: 0,
                        paddingRight: 20,
                      }}
                      onPress={() =>
                        RootNavigation.navigate("CreateProductScreen", {
                          title: t("update_product"),
                          method: "edit",
                          item: product,
                        })
                      }
                    >
                      <Icon
                        style={styles.countIcon as ImageStyle}
                        fill={theme["color-basic-600"]}
                        name="edit"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: "transparent", borderWidth: 0 }}
                      onPress={() =>
                        showAlertConfirm(
                          "",
                          t("delete_product_confirm"),
                          product.$id
                        )
                      }
                    >
                      <Icon
                        style={styles.countIcon as ImageStyle}
                        fill={theme["color-danger-400"]}
                        name="trash-2"
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Button
                      appearance="ghost"
                      onPress={() => updateCount("sub")}
                      accessoryRight={() => (
                        <Icon
                          style={styles.countIcon as ImageStyle}
                          fill="red"
                          name="minus-circle"
                        />
                      )}
                    ></Button>
                    <Text style={{ textAlign: "center" }}>{product.count}</Text>
                    <Button
                      appearance="ghost"
                      onPress={() => updateCount("add")}
                      accessoryRight={() => (
                        <Icon
                          style={styles.countIcon as ImageStyle}
                          fill="green"
                          name="plus-circle"
                        />
                      )}
                    ></Button>
                  </View>
                )}
              </View>
            </View>
          </Card>
        ) : (
          <></>
        )}
      </>
    );
  };

  return (
    <ScrollView style={styles.container as ViewStyle}>
      {productIDs.map((id) => (
        <ProductCard key={id} productId={id} />
      ))}
      <Layout style={{ paddingBottom: 100 }}></Layout>
    </ScrollView>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    width: "100%",
  },
  cardItem: {
    marginBottom: 3,
  },
  productCard: {
    display: "flex",
    flexDirection: "row",
  },
  cardInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: Dimensions.get("window").width - 120,
  },
  cardImg: {
    aspectRatio: 1,
    width: 60,
    height: 60,
  },
  countIcon: {
    width: 20,
    height: 20,
  },
});

export default ProductList;
