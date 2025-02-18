import React, { useEffect, useCallback } from "react";
import {
  View,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  Alert,
  ScrollView,
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
// import { useDatabases } from "../../hooks/AppWrite";
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

const ProductList = ({
  screen,
  editable,
  category = "all",
}): React.ReactElement => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem, createItem, updateItem, deleteItem } = useDatabases();
  const [productIDs, setProductIDs] = useRecoilState(productIdsAtom);
  // const order = useRecoilValue(currentOrderAtom);

  // Refresh Product List
  const refreshProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        const productData = await getAllItem(COLLECTION_IDS.products);
        set(allProductsAtom, productData);
        const ids = [];
        for (const product of productData) {
          ids.push(product.$id);
          set(productAtomFamily(product.$id), product);
        }
        set(productIdsAtom, ids);
      },
    []
  );
  // Update Order List
  // const updateOrderList = useCallback((newItem) => {
  //   const item = JSON.parse(JSON.stringify(newItem)) as typeof newItem;
  //   const index = order.order.findIndex((item) => item.$id === newItem.$id);
  //   let newOrder = [...order.order];
  //   if (index >= 0) {
  //     newOrder[index].count = item.count;
  //   } else {
  //     newOrder.push(item);
  //   }
  //   newOrder = newOrder.filter((item) => item.count > 0);
  //   setOrder({ ...order, order: newOrder });
  //   console.log("updateOrderList::", item, order);
  // }, []);

  const showAlertConfirm = (tilte: string, message: string, itemID: string) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: t("no"),
          // onPress: () => false,
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
        // onDismiss: () =>
        //   Alert.alert(
        //     'This alert was dismissed by tapping outside of the alert dialog.',
        //   ),
      }
    );

  const onDelete = async (itemID: string) => {
    console.log("deleteConfirm::", itemID);
    await deleteItem(COLLECTION_IDS.products, itemID);
    refreshProductList();
  };

  const ProductCard = ({ productId }) => {
    const [product, setProduct] = useRecoilState(
      productAtomFamilySelector(productId)
    );
    const updateCount = (method) => {
      const math = method === "add" ? 1 : method === "sub" ? -1 : 0;
      let count = product.count >= 0 ? product.count + math : 0;
      count = count > 0 ? count : 0;
      const updatedItem = { ...product, count: count };
      setProduct(updatedItem);
    };
    // console.log("ProductCard rendered::", productId);

    return (
      <>
        {category === "all" || product.category === category ? (
          <Card
            style={styles.cardItem}
            // status="basic"
            // header={(headerProps) => renderItemHeader(headerProps, info)}
            // footer={renderItemFooter}

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
            <View style={styles.productCard}>
              <ImageBackground
                style={styles.cardImg}
                imageStyle={{ borderRadius: 8 }}
                source={
                  product.photoUrl
                    ? { uri: product.photoUrl }
                    : require("../../../assets/icons/food-default.png")
                }
                resizeMode="cover"
              ></ImageBackground>

              <View style={styles.cardInfo}>
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
                        style={styles.countIcon}
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
                        style={styles.countIcon}
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
                          style={styles.countIcon}
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
                          style={styles.countIcon}
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
    <ScrollView style={styles.container}>
      {productIDs.map((id) => (
        <ProductCard key={id} productId={id} />
      ))}
      <Layout style={{ paddingBottom: 100 }}></Layout>
    </ScrollView>
    // <List
    //   style={styles.container}
    //   contentContainerStyle={styles.contentContainer}
    //   data={products.filter((product) => {
    //     if (category === "all") {
    //       return true;
    //     } else {
    //       return product.category === category;
    //     }
    //   })}
    //   renderItem={renderItem}
    //   // numColumns={1}
    // />
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
    // padding: 10,
    width: 60,
    height: 60,
  },
  countIcon: {
    width: 20,
    height: 20,
  },
});

export default ProductList;
