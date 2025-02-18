import React, { useState, useEffect } from "react";
// import * as Print from "expo-print";
// import * as Sharing from "expo-sharing";

import {
  ScrollView,
  StyleSheet,
  // Text,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
  ListRenderItemInfo,
  ImageBackground,
  Alert,
} from "react-native";
import {
  StyleService,
  useStyleSheet,
  Layout,
  Input,
  Icon,
  useTheme,
  Select,
  SelectItem,
  IndexPath,
  Text,
  Button,
  Card,
  List,
  Divider,
  Calendar,
  Datepicker,
  NativeDateService,
  Modal,
  Spinner,
} from "@ui-kitten/components";
import { WaitingModal } from "../components/common";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";
import { useTranslation } from "react-i18next";
import { i18nCalendar as i18n } from "../i18/i18n.config";
import { useRecoilState, useRecoilValue } from "recoil";
import { allTablesAtom, currentOrderAtom, userAtom } from "../states";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import * as RootNavigation from "../navigator/RootNavigation";

const vndMask = createNumberMask({
  // prefix: ['đ'],
  delimiter: ",",
  separator: ",",
  precision: 3,
});

const ReviewOrderScreen = ({ route, navigation }) => {
  console.log("ReviewOrderScreen params::");
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { createItem, updateItem } = useDatabases();
  const [waiting, setWaiting] = useState(false);

  const [order, setOrder] = useRecoilState(currentOrderAtom);
  const userInfo = useRecoilValue(userAtom);
  const [totalPrice, setTotalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [tables, setTables] = useRecoilState(allTablesAtom);
  const [selectedTableIndex, setSelectedTableIndex] = React.useState<IndexPath>(
    new IndexPath(0)
  );

  useEffect(() => {
    console.log("userInfo::", userInfo);

    if (order && order.$id) {
      setOrder({ ...order, $id: order.$id });
      let index = tables.findIndex((table) => table.name === order.table);
      index = index >= 0 ? index + 1 : 0;
      setSelectedTableIndex(new IndexPath(index));
    }
  }, []);

  useEffect(() => {
    if (order && order.order && order.order.length > 0) {
      let sum = order.order.reduce((acc, item) => {
        if (item.price && item.count) {
          return acc + item.price * item.count;
        }
        return acc;
      }, 0);
      console.log("setTotalPrice::", sum);
      setTotalPrice(sum);
      // minus subtract
      sum = order.subtract > 0 ? sum - order.subtract : sum;
      // minus discount
      sum =
        order.discount > 0
          ? sum - Math.round((sum * order.discount) / 100)
          : sum;
      setFinalPrice(sum);
    }
  }, [order]);

  const updateOrderList = (newItem, method) => {
    const item = JSON.parse(JSON.stringify(newItem)) as typeof newItem;
    const index = order.order.findIndex((item) => item.$id === newItem.$id);
    let newOrder = [...order.order];
    if (index >= 0) {
      newOrder = order.order.map((obj) => {
        if (obj.$id === newItem.$id) {
          return {
            ...obj,
            count:
              method === "add"
                ? obj.count + 1
                : method === "sub"
                ? obj.count - 1
                : obj.count,
          };
        }
        return obj;
      });
    } else {
      item.count = method === "add" ? 1 : method === "sub" ? -1 : 0;
      newOrder.push(item);
    }
    newOrder = newOrder.filter((item) => item.count > 0);
    setOrder({ ...order, order: newOrder });
    console.log("updateOrderList::", item, order, method);
  };
  // const generateHTML = () => {
  //   const itemsHTML = products
  //     .map(
  //       (product) => `
  //     <tr>
  //       <td>${product.name}</td>
  //       <td>${product.quantity}</td>
  //       <td>${product.price.toFixed(2)}</td>
  //       <td>${(product.price * product.quantity).toFixed(2)}</td>
  //     </tr>
  //   `
  //     )
  //     .join("");

  //   const total = products.reduce(
  //     (sum, product) => sum + product.price * product.quantity,
  //     0
  //   );

  //   const text =
  //     "[C]<img>https://via.placeholder.com/300.jpg</img>\n" +
  //     "[L]\n" +
  //     "[C]<u><font size='big'>ORDER N°045</font></u>\n" +
  //     "[L]\n" +
  //     "[C]================================\n" +
  //     "[L]\n" +
  //     "[L]<b>BEAUTIFUL SHIRT</b>[R]9.99e\n" +
  //     "[L]  + Size : S\n" +
  //     "[L]\n" +
  //     "[L]<b>AWESOME HAT</b>[R]24.99e\n" +
  //     "[L]  + Size : 57/58\n" +
  //     "[L]\n" +
  //     "[C]--------------------------------\n" +
  //     "[R]TOTAL PRICE :[R]34.98e\n" +
  //     "[R]TAX :[R]4.23e\n" +
  //     "[L]\n" +
  //     "[C]================================\n" +
  //     "[L]\n" +
  //     "[L]<font size='tall'>Customer :</font>\n" +
  //     "[L]Raymond DUPONT\n" +
  //     "[L]Đây là một tô bún bò huế \n" +
  //     "[L]31547 PERPETES\n" +
  //     "[L]Tel : +33801201456\n" +
  //     "[L]\n" +
  //     "[C]<barcode type='ean13' height='10'>831254784551</barcode>\n" +
  //     "[C]<qrcode size='20'>http://www.developpeur-web.dantsu.com/</qrcode>\n" +
  //     "[L]\n" +
  //     "[L]\n" +
  //     "[L]\n" +
  //     "[L]\n" +
  //     "[L]\n";

  //   return text;

  //   // return `
  //   //   <html>
  //   //     <head>
  //   //       <style>
  //   //         table {
  //   //           width: 100%;
  //   //           border-collapse: collapse;
  //   //         }
  //   //         th, td {
  //   //           border: 1px solid black;
  //   //           padding: 8px;
  //   //           text-align: left;
  //   //         }
  //   //         th {
  //   //           background-color: #f2f2f2;
  //   //         }
  //   //       </style>
  //   //     </head>
  //   //     <body>
  //   //       <h2>Order Review</h2>
  //   //       <table>
  //   //         <thead>
  //   //           <tr>
  //   //             <th>Product</th>
  //   //             <th>Quantity</th>
  //   //             <th>Price</th>
  //   //             <th>Total</th>
  //   //           </tr>
  //   //         </thead>
  //   //         <tbody>
  //   //           ${itemsHTML}
  //   //           <tr>
  //   //             <td colspan="3">Grand Total</td>
  //   //             <td>${total.toFixed(2)}</td>
  //   //           </tr>
  //   //         </tbody>
  //   //       </table>
  //   //     </body>
  //   //   </html>
  //   // `;
  // };

  // const handlePrint = async () => {
  //   const html = generateHTML();
  //   const pdf = await Print.printToFileAsync({ html });

  //   if (!(await Sharing.isAvailableAsync())) {
  //     alert("Sharing is not available on this device");
  //     return;
  //   }

  //   await Sharing.shareAsync(pdf.uri);
  // };

  //   const renderItem = (info): React.ReactElement => (
  //     <Card
  //       style={styles.item}
  //       status="basic"
  //       // header={(headerProps) => renderItemHeader(headerProps, info)}
  //       // footer={renderItemFooter}
  //       onPress={() => {
  //         console.log("item pressed::", info.item);
  //       }}
  //     >
  //   <View style={styles.productCard}>
  //     <ImageBackground
  //       style={styles.cardImg}
  //       source={require("../../assets/icons/food-default.png")}
  //       resizeMode="contain"
  //     ></ImageBackground>

  //     <View style={styles.cardInfo}>
  //       <View style={{ paddingLeft: 10 }}>
  //         <Text> mi vit tiem</Text>

  //       <View
  //         style={{
  //           display: "flex",
  //           flexDirection: "row",
  //           alignItems: "center",
  //         }}
  //       >
  //         <Button
  //           style={styles.countBtn}
  //           accessoryRight={() => (
  //             <Icon style={styles.countIcon} fill="red" name="minus-circle" />
  //           )}
  //         ></Button>
  //         <Text style={{ textAlign: "center" }}> 3</Text>
  //         <Button
  //           style={styles.countBtn}
  //           accessoryRight={() => (
  //             <Icon style={styles.countIcon} fill="green" name="plus-circle" />
  //           )}
  //         ></Button>
  //       </View>
  //       </View>
  //     </View>
  //   </View>

  // );

  const showAlertConfirm = (tilte: string, message: string) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: t("cash"),
          onPress: () => {
            return saveOrder("cash");
          },
          style: "default",
        },
        {
          text: t("transfer"),
          onPress: () => {
            return saveOrder("transfer");
          },
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

  const saveOrder = async (orderStatus = "unpaid") => {
    if (order) {
      setWaiting(true);
      const data = {
        userId: userInfo.id,
        pushToken: userInfo.PUSH_TOKEN,
        order: JSON.stringify(order.order),
        status: orderStatus,
        note: order.note,
        table:
          tables.length > 0 && selectedTableIndex.row > 0
            ? tables[selectedTableIndex.row - 1].name
            : null,
        subtract: order.subtract,
        discount: order.discount,
        $createdAt: order.date.toISOString(),
        date: order.date.toLocaleString("en-GB"),
        total: finalPrice,
      };
      console.log("saveOrder called::", order.$id, data);
      const result = order.$id
        ? await updateItem(COLLECTION_IDS.orders, order.$id, data)
        : await createItem(COLLECTION_IDS.orders, data);
      result && result.$id ? setOrder({ ...order, $id: result.$id }) : null;
      setWaiting(false);
      navigation.navigate("ReceiptScreen", { receiptData: result });
    }
  };

  const orderList = (item): React.ReactElement => (
    <Card
      key={item.$id}
      style={styles.cardItem}
      // status="basic"
      // header={(headerProps) => renderItemHeader(headerProps, info)}
      // footer={renderItemFooter}
      onPress={() => {
        console.log("item pressed::", item);
      }}
    >
      <View style={styles.productCard}>
        <ImageBackground
          style={styles.cardImg}
          imageStyle={{ borderRadius: 8 }}
          source={
            item.photoUrl
              ? { uri: item.photoUrl }
              : require("../../assets/icons/food-default.png")
          }
          resizeMode="contain"
        ></ImageBackground>

        <View style={styles.cardInfo}>
          <View style={{ paddingLeft: 10 }}>
            <Text style={{ paddingBottom: 10 }}> {item.name}</Text>
            <View
              style={{
                display: "flex",
                padding: 0,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderColor: "gray",
                borderWidth: 0.5,
                borderRadius: 5,
                height: 25,
                width: 90,
              }}
            >
              <Button
                appearance="ghost"
                style={styles.countBtn}
                size="tiny"
                accessoryRight={() => (
                  <Icon
                    style={styles.countIcon}
                    fill="red"
                    name="minus-outline"
                  />
                )}
                onPress={() => updateOrderList(item, "sub")}
              ></Button>
              <Text style={{ textAlign: "center" }}>{item.count}</Text>
              <Button
                appearance="ghost"
                style={styles.countBtn}
                size="tiny"
                accessoryRight={() => (
                  <Icon
                    style={styles.countIcon}
                    fill="green"
                    name="plus-outline"
                  />
                )}
                onPress={() => updateOrderList(item, "add")}
              ></Button>
            </View>
          </View>

          <Text style={{ height: 20 }}>
            {Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "VND",
            }).format(item.count * item.price)}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <Layout level="1" style={styles.container}>
      <ScrollView>
        <View style={{ padding: 2 }}>
          {order && order.order && order.order.length > 0 ? (
            order.order.map((item) => orderList(item))
          ) : (
            <></>
          )}
        </View>
        <View
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row-reverse",
          }}
        >
          <Button
            style={{ width: 100, margin: 10, borderWidth: 0 }}
            size="tiny"
            appearance="outline"
            status="primary"
            onPress={() =>
              RootNavigation.navigate("CreateOrderScreen", { method: "update" })
            }
          >
            {t("add_product")}
          </Button>
        </View>
        <Divider style={{ height: 5 }} />

        <View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: Dimensions.get("window").width - 10,
              // alignItems:"center"
              padding: 10,
            }}
          >
            <Text> {t("total_price")}</Text>
            <Text>
              {Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "VND",
              }).format(totalPrice)}
            </Text>
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: Dimensions.get("window").width - 10,
              // alignItems:"center"
              padding: 10,
            }}
          >
            <Text> {t("subtract")}</Text>
            <Input
              {...useMaskedInputProps({
                value: order.subtract.toString(),
                onChangeText: (masked, unmasked) =>
                  setOrder({ ...order, subtract: parseInt(unmasked) }),
                mask: vndMask,
              })}
              size="small"
              style={{ width: 100 }}
              textAlign="right"
              placeholder={Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "VND",
              }).format(0)}
              keyboardType="numeric"
            />
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: Dimensions.get("window").width - 10,
              // alignItems:"center"
              padding: 10,
            }}
          >
            <Text> {t("discount") + " (%)"}</Text>
            <Input
              placeholderTextColor={order.discount === null ? "red" : "gray"}
              value={order.discount ? order.discount.toString() : null}
              size="small"
              style={{ width: 100 }}
              textAlign="right"
              placeholder="0 - 100"
              keyboardType="numeric"
              // caption={() => (
              //   <Text
              //     status="danger"
              //     style={{
              //       fontSize: 13,
              //       width: "100%",
              //       backgroundColor: "pink",
              //       textAlign: "right",
              //     }}
              //   >
              //     *0-100
              //   </Text>
              // )}
              onChangeText={(nextValue) =>
                parseInt(nextValue) >= 0 && parseInt(nextValue) <= 100
                  ? setOrder({ ...order, discount: parseInt(nextValue) })
                  : setOrder({ ...order, discount: null })
              }
            />
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              width: Dimensions.get("window").width - 10,
              // alignItems:"center"
              padding: 10,
            }}
          >
            <Text style={{ fontWeight: "bold" }}> {t("final_price")}</Text>
            <Text status="primary" style={{ fontWeight: "bold" }}>
              {Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "VND",
              }).format(finalPrice)}
            </Text>
          </View>
        </View>

        <Divider style={{ height: 5 }} />
        <View>
          <Select
            style={[styles.input, { padding: 10 }]}
            label={t("choose_table")}
            placeholder={t("no_table_found")}
            value={
              tables.length > 0
                ? selectedTableIndex.row > 0
                  ? tables[selectedTableIndex.row - 1].name
                  : t("choose_table")
                : null
            }
            selectedIndex={selectedTableIndex}
            onSelect={(index: IndexPath) => setSelectedTableIndex(index)}
          >
            {tables.length > 0 ? (
              [{ name: t("choose_table"), $id: "0" }]
                .concat(tables)
                .map((table) => (
                  <SelectItem title={table.name} key={table.$id} />
                ))
            ) : (
              <></>
            )}
          </Select>
          <Input
            label={t("order_note")}
            style={[styles.input, { padding: 10 }]}
            value={order.note}
            placeholder={t("order_note")}
            onChangeText={(nextValue) =>
              setOrder({ ...order, note: nextValue })
            }
          />

          <Datepicker
            style={[styles.input, { padding: 10 }]}
            label={t("order_date")}
            date={order.date}
            max={new Date()}
            onSelect={(nextDate) => setOrder({ ...order, date: nextDate })}
            accessoryRight={(props) => <Icon {...props} name="calendar" />}
            dateService={
              new NativeDateService("vn", {
                i18n,
                startDayOfWeek: 0,
              })
            }
          />
        </View>
      </ScrollView>
      <Layout level="1" style={styles.buttons}>
        <Button
          style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
          appearance="outline"
          status="primary"
          onPress={() => saveOrder()}
        >
          {t("save_order")}
        </Button>
        <Button
          style={{ flex: 1, marginLeft: 5 }}
          onPress={() => showAlertConfirm(t("payment"), t("payment_msg"))}
        >
          {t("payment")}
        </Button>
      </Layout>
      <WaitingModal waiting={waiting} />
    </Layout>

    // <View style={styles.container}>
    //   <ScrollView>

    //     {products.map((product) => (
    //       <View key={product.id} style={styles.item}>
    //         <Text style={styles.itemName}>{product.name}</Text>
    //         <Text style={styles.itemQuantity}>{product.quantity}</Text>
    //         <Text style={styles.itemPrice}>
    //           {(product.price * product.quantity).toFixed(2)}
    //         </Text>
    //       </View>
    //     ))}

    //   </ScrollView>
    // </View>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    paddingBottom: 100,
  },
  cardItem: {
    marginTop: 3,
    // marginBottom: 3,
  },
  productCard: {
    display: "flex",
    flexDirection: "row",
  },
  cardInfo: {
    // padding: 10,
    // backgroundColor: "pink",
    // display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: Dimensions.get("window").width - 120,
  },
  cardImg: {
    aspectRatio: 1,
    width: 60,
    height: 60,
  },
  countBtn: {
    borderRadius: 5,
    height: 25,
  },
  countIcon: {
    width: 15,
    height: 15,
  },
  input: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "white",
    borderRadius: 0,
    // padding: 10
    // flex: 1,
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    padding: 10,
    paddingBottom: 30,
  },

  // itemName: {
  //   fontSize: 16,
  // },
  // itemQuantity: {
  //   fontSize: 16,
  // },
  // itemPrice: {
  //   fontSize: 16,
  // },
  // closeText: {
  //   textAlign: "center",
  //   fontSize: 16,
  //   color: "blue",
  //   padding: 16,
  // },
});

export default ReviewOrderScreen;
