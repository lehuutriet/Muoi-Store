import React, { useEffect, useState, useRef, useCallback } from "react";
// import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { useRecoilState } from "recoil";
import { ScrollView, View, Dimensions, Alert } from "react-native";
import {
  StyleService,
  useStyleSheet,
  Layout,
  Icon,
  useTheme,
  Text,
  Button,
  Divider,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useAccounts } from "../hook/AppWrite";
import QRCode from "react-native-qrcode-svg";
import { useBLE } from "../hook/BLEContext";
import {} from "../utils";
import { default as EscPosEncoder } from "@waymen/esc-pos-encoder";
import ViewShot, { captureRef } from "react-native-view-shot";
import { userAtom } from "../states";
import { Buffer } from "buffer";
// import ReactNativeBlobUtil from "react-native-blob-util";

const ReceiptScreen = ({ route, navigation }) => {
  const viewShotRef = useRef(null);
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { printContent } = useBLE();
  const [mediaPermissionResponse, requestMediaPermission] =
    MediaLibrary.usePermissions();
  const [data, setReceiptData] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [userInfo, setUserInfo] = useRecoilState(userAtom);

  useEffect(() => {
    // Use `setOptions` to update the button that we previously specified
    // Now the button includes an `onPress` handler to update the count
    navigation.setOptions({
      title: t("receipt_detail"),
      headerRight: () => (
        <View style={styles.headerRight}>
          <Button
            size="small"
            style={styles.menuIcon}
            accessoryLeft={(props) => (
              <Icon
                {...props}
                fill={theme["color-primary-900"]}
                name="download"
              />
            )}
            appearance="outline"
            onPress={() => saveReceipt()}
          />
          <Button
            style={[styles.menuIcon]}
            size="small"
            accessoryLeft={(props) => (
              <Icon {...props} fill={theme["color-primary-900"]} name="share" />
            )}
            appearance="outline"
            onPress={() => shareReceipt()}
          />
        </View>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    async function initData() {
      if (route.params && route.params.receiptData) {
        console.log("ReceiptScreen params::", route.params.receiptData);
        let receiptData = route.params.receiptData;
        receiptData.order = JSON.parse(receiptData.order);
        receiptData.subtract =
          receiptData.subtract >= 0 ? receiptData.subtract : 0;
        receiptData.discount =
          receiptData.discount >= 0 ? receiptData.discount : 0;
        setReceiptData(receiptData);
        let sum = receiptData.order.reduce((acc, item) => {
          if (item.price && item.count) {
            return acc + item.price * item.count;
          }
          return acc;
        }, 0);
        console.log("setTotalPrice::", sum);
        setTotalPrice(sum);
        // minus subtract
        sum = receiptData.subtract > 0 ? sum - receiptData.subtract : sum;
        // minus discount
        sum =
          receiptData.discount > 0
            ? sum - Math.round((sum * receiptData.discount) / 100)
            : sum;
        setFinalPrice(sum);
      }
    }
    initData();
  }, []);

  const showAlert = (tilte, message) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: "Ok",
          // onPress: () => Alert.alert('Cancel Pressed'),
          style: "cancel",
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

  const saveReceipt = async () => {
    // Save file to photo library
    const permission = await requestMediaPermission();
    console.log("permissionResponse::", permission);
    if (permission && permission.granted) {
      const receuptUri = await captureRef(viewShotRef, {
        width: 58,
        format: "jpg",
        quality: 0.5,
        result: "tmpfile",
      });
      console.log("receuptUri::", receuptUri);

      MediaLibrary.saveToLibraryAsync(receuptUri);
      showAlert("", t("save_receipt_success"));
    } else {
      showAlert("", t("permission_media_error"));
    }
  };

  const shareReceipt = async () => {
    const shareAvailable = await Sharing.isAvailableAsync();
    console.log("shareAvailable::", shareAvailable);
    if (shareAvailable) {
      const receuptUri = await captureRef(viewShotRef, {
        width: 58,
        format: "jpg",
        quality: 1,
        result: "tmpfile",
      });
      console.log("receuptUri::", receuptUri);
      Sharing.shareAsync(receuptUri);
    }
  };

  const printReceipt = async () => {
    try {
      let encoder = new EscPosEncoder();
      const printStatus = await printContent(
        Buffer.from(encoder.newline().encode()).toString("base64")
      );
      if (printStatus) {
        const headerBuffer = encoder
          .initialize()
          .codepage("tcvn")
          .size(0)
          .align("center")
          .bold(true)
          .line(data.status === "unpaid" ? t("receipt_temp") : t("receipt"))
          .bold(false)
          .line(userInfo.STORE_NAME)
          .line(data.date)
          .line(
            (data.table ? t("table_num") + ": " + data.table : "") +
              " - " +
              (data.$id
                ? t("order_id") + ": " + data.$id.slice(data.$id.length - 4)
                : "")
          )
          .line("--------------------------------")
          .table(
            [
              { width: 8, marginRight: 2, align: "left" },
              { width: 8, align: "center" },
              { width: 1, align: "right" },
              { width: 10, marginLeft: 1, align: "right" },
            ],
            [
              /* Row one, with two columns */
              [t("product"), t("price"), t("quantity"), t("price_sum")],
            ]
          )
          .line("--------------------------------")
          .encode();
        await printContent(Buffer.from(headerBuffer).toString("base64"));
        for await (const [index, item] of data.order.entries()) {
          const buffer = encoder
            .codepage("tcvn")
            .table(
              [
                { width: 10, marginRight: 1, align: "left" },
                { width: 8, marginRight: 1, align: "right" },
                { width: 2, align: "right" },
                { width: 8, marginLeft: 2, align: "right" },
              ],
              [
                [
                  `${index + 1}. ${item.name}`,
                  Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "VND",
                  })
                    .format(item.price)
                    .slice(1),
                  `${item.count}`,
                  Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "VND",
                  })
                    .format(item.price * item.count)
                    .slice(1),
                ],
              ]
            )
            .encode();
          await printContent(Buffer.from(buffer).toString("base64"));
        }

        const footerBuffer = encoder
          .codepage("tcvn")
          .line("--------------------------------")
          .bold(true)
          .table(
            [
              { width: 16, align: "left" },
              { width: 16, align: "right" },
            ],
            [
              [
                t("total_price"),
                Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                })
                  .format(totalPrice)
                  .slice(1),
              ],
            ]
          )
          .bold(false)
          .table(
            [
              { width: 16, align: "left" },
              { width: 16, align: "right" },
            ],
            [
              [t("subtract"), data.subtract.toString()],
              [`${t("discount")} %`, data.discount.toString()],
            ]
          )
          .bold(true)
          .table(
            [
              { width: 16, align: "left" },
              { width: 16, align: "right" },
            ],
            [
              [
                t("final_price"),
                Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                })
                  .format(finalPrice)
                  .slice(1),
              ],
            ]
          )
          .bold(false)
          .line("--------------------------------")
          .table(
            [
              { width: 16, align: "left" },
              { width: 16, align: "right" },
            ],
            [[t("status"), data.status === "unpaid" ? t("unpaid") : t("paid")]]
          )
          .line("--------------------------------")
          .align("center")
          // .line(t("payment_method"))
          .line(userInfo.WIFI ? `${t("wifi")}: ${userInfo.WIFI}` : "")
          .line("--------------------------------")
          // .qrcode('https://nielsleenheer.com')
          .newline()
          .encode();

        await printContent(Buffer.from(footerBuffer).toString("base64"));
      }
    } catch (error) {
      console.log("error printing receipt::", error);
    }
  };

  return (
    <Layout level="1" style={styles.container}>
      <ScrollView>
        {data ? (
          <ViewShot
            ref={viewShotRef}
            style={{
              paddingLeft: 16,
              paddingRight: 16,
              paddingBottom: 16,
              backgroundColor: "white",
            }}
          >
            <View>
              <View
                style={{
                  padding: 10,
                }}
              >
                <Text
                  style={{
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: 18,
                  }}
                >
                  {data.status === "unpaid" ? t("receipt") : t("receipt_temp")}
                </Text>
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 15,
                  }}
                >
                  {userInfo.STORE_NAME}
                </Text>
                <Text style={{ textAlign: "center", fontSize: 12 }}>
                  {data.date ? data.date : ""}
                </Text>
                <Text style={{ textAlign: "center", fontSize: 12 }}>
                  {(data.table ? t("table_num") + ": " + data.table : "") +
                    " - " +
                    (data.$id
                      ? t("order_id") +
                        ": " +
                        data.$id.slice(data.$id.length - 4)
                      : "")}
                </Text>
              </View>
            </View>
            <Divider
              style={{
                borderStyle: "dashed",
                borderTopWidth: 2,
                backgroundColor: "transparent",
                borderColor: theme["color-basic-700"],
              }}
            ></Divider>
            <View
              style={{
                display: "flex",
                width: "100%",
                flexDirection: "row",
                paddingTop: 10,
                paddingBottom: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text style={{ flex: 3 }}> {t("product")}</Text>
              <Text style={{ flex: 2, textAlign: "center" }}>
                {" "}
                {t("price_single")}
              </Text>
              <Text style={{ flex: 1, textAlign: "center" }}>
                {t("quantity")}
              </Text>
              <Text style={{ flex: 2, textAlign: "right" }}>
                {t("price_sum")}
              </Text>
            </View>
            <Divider
              style={{ height: 1, backgroundColor: theme["color-basic-700"] }}
            ></Divider>
            <View
              style={{
                paddingTop: 10,
                paddingBottom: 10,
              }}
            >
              {data.order && data.order.length > 0 ? (
                data.order.map((item, index) => (
                  <View
                    key={item.$id}
                    style={{
                      display: "flex",
                      width: "100%",
                      flexDirection: "row",
                      // width: Dimensions.get("window").width - 32,
                      // alignItems:"center",
                    }}
                  >
                    <Text style={{ flex: 3 }}>
                      {index + 1}. {item.name}
                    </Text>
                    <Text style={{ flex: 2, textAlign: "center" }}>
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "VND",
                      }).format(item.price)}
                    </Text>
                    <Text style={{ flex: 1, textAlign: "center" }}>
                      x{item.count}
                    </Text>
                    <Text style={{ flex: 2, textAlign: "right" }}>
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "VND",
                      }).format(item.count * item.price)}
                    </Text>
                  </View>
                ))
              ) : (
                <></>
              )}
            </View>
            <Divider
              style={{
                borderStyle: "dashed",
                borderTopWidth: 2,
                backgroundColor: "transparent",
                borderColor: theme["color-basic-700"],
              }}
            ></Divider>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text style={{ fontWeight: "bold" }}>{t("total_price")} </Text>
              <Text style={{ fontWeight: "bold" }}>
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                }).format(totalPrice)}{" "}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text>{t("subtract")} </Text>
              <Text>
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                }).format(data.subtract ? data.subtract : 0)}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text>{t("discount") + " " + data.discount + "%"}</Text>
              <Text>
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                }).format(
                  Math.round(
                    ((totalPrice - data.subtract) * data.discount) / 100
                  )
                )}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text style={{ fontWeight: "bold" }}>{t("final_price")}</Text>
              <Text style={{ fontWeight: "bold" }}>
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "VND",
                }).format(finalPrice)}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                paddingBottom: 10,
                // width: Dimensions.get("window").width - 32,
                // alignItems:"center",
              }}
            >
              <Text>{t("status")}</Text>
              <Text>{data.status === "unpaid" ? t("unpaid") : t("paid")}</Text>
            </View>
            <Divider
              style={{
                borderStyle: "dashed",
                borderTopWidth: 2,
                backgroundColor: "transparent",
                borderColor: theme["color-basic-700"],
              }}
            ></Divider>
            <View
              style={{
                padding: 20,
              }}
            >
              <Text style={{ textAlign: "center" }}>{t("payment_method")}</Text>
              {userInfo.WIFI && (
                <Text style={{ textAlign: "center" }}>{`${t("wifi")}: ${
                  userInfo.WIFI
                }`}</Text>
              )}
            </View>
            <Divider
              style={{
                borderStyle: "dashed",
                borderTopWidth: 2,
                backgroundColor: "transparent",
                borderColor: theme["color-basic-700"],
              }}
            ></Divider>
            <View
              style={{
                display: "flex",
                alignItems: "center",
                paddingTop: 20,
              }}
            >
              <QRCode
                size={150}
                value={data.$id}
                // logo={{uri: base64Logo}}
                // logoSize={20}
                logoBackgroundColor="transparent"
              />
            </View>
          </ViewShot>
        ) : (
          <></>
        )}
      </ScrollView>
      <Layout level="1" style={styles.buttons}>
        {/* <Icon
          style={{ width: 20, height: 20 }}
          fill="white"
          name="printer-outline"
        /> */}
        <Button
          style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
          appearance="outline"
          status="primary"
          onPress={() => printReceipt()}
          accessoryLeft={() => (
            <Icon
              style={styles.icon}
              fill={theme["color-primary-500"]}
              name="printer"
            />
          )}
        >
          {t("print_receipt")}
        </Button>
        <Button
          style={{ flex: 1, marginLeft: 5 }}
          onPress={() => {
            navigation.reset({
              index: 1,
              routes: [
                { name: "TabNavigator" },
                { name: "CreateOrderScreen", params: { method: "create" } },
              ],
            });
          }}
        >
          {t("create_new_order")}
        </Button>
      </Layout>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    paddingBottom: 100,
  },
  productCard: {
    display: "flex",
    flexDirection: "row",
  },
  cardInfo: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    width: Dimensions.get("window").width - 100,
    alignItems: "center",
  },
  cardImg: {
    aspectRatio: 1,
    margin: 20,
    width: 45,
    height: 45,
  },
  headerRight: {
    display: "flex",
    flexDirection: "row",
  },
  menuIcon: {
    backgroundColor: "transparent",
    borderWidth: 0,
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

  countBtn: { backgroundColor: "transparent", borderWidth: 0 },
  countIcon: {
    width: 20,
    height: 20,
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    padding: 10,
    paddingBottom: 30,
  },
  icon: {
    width: 20,
    height: 20,
  },
});

export default ReceiptScreen;
