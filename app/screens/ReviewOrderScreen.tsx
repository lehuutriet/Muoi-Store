import React, { useState, useEffect } from "react";

import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
  ListRenderItemInfo,
  ImageBackground,
  Alert,
  ImageStyle,
  ViewStyle,
  TextStyle,
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
  ListItem,
  Avatar,
} from "@ui-kitten/components";
import { WaitingModal } from "../components/common";
import { createNumberMask, useMaskedInputProps } from "react-native-mask-input";
import { useTranslation } from "react-i18next";
import { i18nCalendar as i18n } from "../i18/i18n.config";
import { useRecoilCallback, useRecoilState, useRecoilValue } from "recoil";
import {
  allProductsAtom,
  allTablesAtom,
  currentOrderAtom,
  productAtomFamily,
  userAtom,
} from "../states";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import * as RootNavigation from "../navigator/RootNavigation";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Query } from "appwrite";

const vndMask = createNumberMask({
  delimiter: ",",
  separator: ",",
  precision: 3,
});

const { width, height } = Dimensions.get("window");

interface Table {
  $id: string;
  name: string;
}

interface OrderItem {
  $id: string;
  name: string;
  photoUrl?: string;
  price: number;
  count: number;
}

interface Customer {
  $id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  totalSpent: number;

  lastVisit?: string;
  joinDate?: string;
  notes?: string;
}

type RootStackParamList = {
  ReviewOrderScreen: { orderInfo?: any };
  ReceiptScreen: { receiptData: any };
  CreateOrderScreen: { method: string };
  AddCustomerScreen: { onCustomerCreated: (customer: any) => void };
};
type ReviewOrderScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ReviewOrderScreen"
>;

const ReviewOrderScreen: React.FC<ReviewOrderScreenProps> = ({
  route,
  navigation,
}) => {
  console.log("ReviewOrderScreen params::");
  const styles = useStyleSheet(styleSheet);

  const { t } = useTranslation();
  const { createItem, updateItem, getSingleItem, getAllItem } = useDatabases();
  const [waiting, setWaiting] = useState(false);

  const [order, setOrder] = useRecoilState(currentOrderAtom);
  const userInfo = useRecoilValue(userAtom);
  const [totalPrice, setTotalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [tables, setTables] = useRecoilState<Table[]>(allTablesAtom);
  const [selectedTableIndex, setSelectedTableIndex] = React.useState<IndexPath>(
    new IndexPath(0)
  );

  // State cho khách hàng
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const [searchQuery, setSearchQuery] = useState("");
  // Trong ReviewOrderScreen, thêm vào hoặc sửa đoạn code hiện tại
  const [customerModalVisible, setCustomerModalVisible] = useState(false);

  // Thêm useEffect để tải lại danh sách khách hàng khi mở modal
  useEffect(() => {
    if (customerModalVisible) {
      // Tải lại danh sách khách hàng mỗi khi modal mở
      const loadCustomers = async () => {
        try {
          const customersData = await getAllItem(COLLECTION_IDS.customers);
          setCustomers(customersData || []);
          setFilteredCustomers(customersData || []);
        } catch (error) {
          console.error("Error loading customers:", error);
        }
      };

      loadCustomers();
    }
  }, [customerModalVisible]);
  // State cho vị trí đơn hàng
  const [selectedLocationIndex, setSelectedLocationIndex] =
    React.useState<IndexPath>(new IndexPath(0));

  // Khởi tạo từ order
  useEffect(() => {
    console.log("userInfo::", userInfo);

    if (order && order.$id) {
      setOrder({ ...order, $id: order.$id });
      let tableIndex = tables.findIndex((table) => table.name === order.table);
      tableIndex = tableIndex >= 0 ? tableIndex + 1 : 0;
      setSelectedTableIndex(new IndexPath(tableIndex));

      // Khởi tạo vị trí
      const locationTypes = ["dine-in", "take-away", "delivery"];
      const locationIndex = locationTypes.indexOf(order.location || "dine-in");
      setSelectedLocationIndex(
        new IndexPath(locationIndex >= 0 ? locationIndex : 0)
      );
    }
  }, []);

  // Tải danh sách khách hàng
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customersData = await getAllItem(COLLECTION_IDS.customers);
        setCustomers(customersData || []);
        setFilteredCustomers(customersData || []);
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };

    loadCustomers();
  }, []);

  // Kiểm tra nếu có customer ID từ order
  useEffect(() => {
    const checkCustomer = async () => {
      if (order && order.customer && !selectedCustomer) {
        try {
          const customerData = await getSingleItem(
            COLLECTION_IDS.customers,
            order.customer
          );
          if (customerData) {
            setSelectedCustomer(customerData);
          }
        } catch (error) {
          console.error("Lỗi khi tải thông tin khách hàng:", error);
        }
      }
    };

    checkCustomer();
  }, [order]);

  // Lọc khách hàng theo từ khóa tìm kiếm
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  // Thêm hàm xử lý khi chọn khách hàng
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerModalVisible(false);
    setSearchQuery("");

    // Cập nhật thông tin khách hàng vào đơn hàng
    setOrder({
      ...order,
      customer: customer.$id,
      customerName: customer.name,
      customerPhone: customer.phone,
    });
  };

  // Tính toán giá đơn hàng
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

  const updateOrderList = (newItem: OrderItem, method: "add" | "sub") => {
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

  const showAlertConfirm = (tilte: string, message: string) =>
    Alert.alert(
      tilte,
      message,
      [
        {
          text: t("cash"),
          onPress: () => {
            saveOrder("cash");
          },
          style: "default",
        },
        {
          text: t("transfer"),
          onPress: () => {
            saveOrder("transfer");
          },
          style: "default",
        },
      ],
      {
        cancelable: true,
      }
    );

  const refreshProductList = useRecoilCallback(
    ({ set }) =>
      async () => {
        try {
          const productData = await getAllItem(COLLECTION_IDS.products);

          // Cập nhật atom chứa tất cả sản phẩm
          set(allProductsAtom, productData);

          // Cập nhật từng sản phẩm trong atom family
          for (const product of productData) {
            set(productAtomFamily(product.$id), product);
          }
        } catch (error) {
          console.error("Error refreshing product list:", error);
        }
      },
    []
  );

  const extractIngredientsFromRecipe = (recipe: any) => {
    try {
      if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
        return [];
      }

      return recipe.ingredients
        .map((ingredientStr: any) => {
          const parts = ingredientStr.split(":");
          if (parts.length < 3) return null;

          const [productId, name, quantityStr] = parts;
          return {
            productId,
            name,
            quantity: parseInt(quantityStr) || 0,
          };
        })
        .filter((ingredient: any) => ingredient !== null);
    } catch (error) {
      console.error("Lỗi khi trích xuất nguyên liệu:", error);
      return [];
    }
  };

  const saveOrder = async (orderStatus = "unpaid") => {
    console.log("saveOrder được gọi với status:", orderStatus);

    if (order) {
      try {
        setWaiting(true);
        console.log("Current order:", order);

        // Chuyển đổi mỗi item trong order thành chuỗi và tạo mảng chuỗi
        const orderStringArray = order.order.map((item) => {
          // Chỉ lấy các thông tin cần thiết để giảm kích thước
          const simpleItem = {
            $id: item.$id,
            name: item.name,
            price: item.price,
            count: item.count,
          };
          return JSON.stringify(simpleItem);
        });

        const data = {
          userId: userInfo.id,
          pushToken: userInfo.PUSH_TOKEN,
          order: orderStringArray,
          status: orderStatus,
          note: order.note,
          table:
            tables.length > 0 && selectedTableIndex.row > 0
              ? tables[selectedTableIndex.row - 1].name
              : null,
          subtract: order.subtract,
          location: order.location || "dine-in",
          discount: order.discount,
          date: order.date.toISOString(),
          total: finalPrice,
          customer: selectedCustomer ? selectedCustomer.$id : null,
          customerName: selectedCustomer ? selectedCustomer.name : null,
          customerPhone: selectedCustomer ? selectedCustomer.phone : null,
        };

        console.log("Data sẽ lưu:", data);

        let result;

        if (order.$id) {
          console.log("Cập nhật đơn hàng với ID:", order.$id);
          result = await updateItem(COLLECTION_IDS.orders, order.$id, data);
        } else {
          console.log("Tạo đơn hàng mới");
          result = await createItem(COLLECTION_IDS.orders, data);
        }

        // Nếu đơn hàng là paid (đã thanh toán), cập nhật số lượng tồn kho và điểm khách hàng
        if (orderStatus === "cash" || orderStatus === "transfer") {
          // 1. Cập nhật điểm và chi tiêu cho khách hàng

          if (selectedCustomer) {
            try {
              // Tính điểm thưởng (ví dụ: cứ 10,000đ được 1 điểm)
              const pointsEarned = Math.floor(finalPrice / 10000);

              // Cập nhật thông tin khách hàng - thêm finalPrice vào totalSpent
              await updateItem(COLLECTION_IDS.customers, selectedCustomer.$id, {
                totalSpent: (selectedCustomer.totalSpent || 0) + finalPrice,
                points: (selectedCustomer.points || 0) + pointsEarned,
                lastVisit: new Date().toISOString(),
              });

              console.log(
                `Đã cập nhật điểm và tổng chi tiêu cho khách hàng: ${selectedCustomer.name}, thêm ${finalPrice} vào tổng chi tiêu`
              );

              // Hiển thị thông báo điểm cho người dùng sau khi hoàn thành
              if (pointsEarned > 0) {
                setTimeout(() => {
                  Alert.alert(
                    t("points_earned"),
                    t("points_earned_message")
                      .replace("{points}", pointsEarned.toString())
                      .replace("{customer}", selectedCustomer.name)
                  );
                }, 500);
              }
            } catch (error) {
              console.error("Lỗi khi cập nhật điểm khách hàng:", error);
            }
          }
          // 2. Duyệt qua từng sản phẩm trong đơn hàng để cập nhật tồn kho
          for (const item of order.order) {
            // Lấy thông tin sản phẩm
            const product = await getSingleItem(
              COLLECTION_IDS.products,
              item.$id
            );

            if (product) {
              // Cập nhật số lượng tồn kho của sản phẩm
              const currentStock = product.stock || 0;
              const newStock = Math.max(0, currentStock - item.count);
              await updateItem(COLLECTION_IDS.products, item.$id, {
                stock: newStock,
              });

              // Trừ nguyên liệu từ kho hàng dựa trên công thức
              const recipes = await getAllItem(COLLECTION_IDS.recipes);

              // Lọc các công thức phù hợp
              const matchingRecipes = recipes.filter((recipe) => {
                // Kiểm tra nếu output là mảng
                if (Array.isArray(recipe.output)) {
                  return recipe.output.some((outputStr: any) =>
                    outputStr.startsWith(`${item.$id}:`)
                  );
                }
                // Nếu output là chuỗi duy nhất
                else if (typeof recipe.output === "string") {
                  return recipe.output.startsWith(`${item.$id}:`);
                }
                return false;
              });

              if (matchingRecipes.length > 0) {
                const recipe = matchingRecipes[0];

                // Trích xuất thông tin nguyên liệu
                const ingredients = extractIngredientsFromRecipe(recipe);

                // Tạo bút toán xuất kho cho từng nguyên liệu
                for (const ingredient of ingredients) {
                  // Tính số lượng nguyên liệu cần trừ dựa trên số lượng sản phẩm bán
                  const ingredientQuantity = ingredient.quantity * item.count;

                  // Tạo bút toán xuất kho
                  await createItem(COLLECTION_IDS.warehouse, {
                    productName: ingredient.name,
                    quantity: -ingredientQuantity, // Số âm để thể hiện xuất kho
                    transactionDate: new Date().toISOString(),
                    note: `Sử dụng cho đơn hàng: ${result.$id}`,
                  });
                }
              }
            }
          }
        }
        await refreshProductList();
        console.log("Kết quả lưu đơn hàng:", result);

        if (result && result.$id) {
          console.log("Điều hướng đến ReceiptScreen");
          navigation.navigate("ReceiptScreen", { receiptData: result });
        } else {
          console.log("Không nhận được kết quả trả về hợp lệ");
        }
      } catch (error) {
        console.error("Lỗi trong saveOrder:", error);
        Alert.alert(t("error"), t("save_order_error"));
      } finally {
        setWaiting(false);
      }
    } else {
      console.log("Order không tồn tại hoặc không hợp lệ");
    }
  };

  const orderList = (item: OrderItem): React.ReactElement => (
    <Card
      key={item.$id}
      style={styles.cardItem as ViewStyle}
      onPress={() => {
        console.log("item pressed::", item);
      }}
    >
      <View style={styles.productCard as ViewStyle}>
        <ImageBackground
          style={styles.cardImg as ViewStyle}
          imageStyle={{ borderRadius: 8 }}
          source={
            item.photoUrl
              ? { uri: item.photoUrl }
              : require("../../assets/icons/food-default.png")
          }
          resizeMode="contain"
        ></ImageBackground>

        <View style={styles.cardInfo as ViewStyle}>
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
                style={styles.countBtn as ViewStyle}
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
                style={styles.countBtn as ViewStyle}
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

  // Thêm modal chọn khách hàng
  const renderCustomerModal = () => (
    <Modal
      visible={customerModalVisible}
      backdropStyle={styles.backdrop as ViewStyle}
      onBackdropPress={() => {
        setCustomerModalVisible(false);
        setSearchQuery("");
      }}
    >
      <Card style={styles.modalCard as ViewStyle}>
        <Text category="h6" style={styles.modalTitle as TextStyle}>
          {t("select_customer")}
        </Text>

        <Input
          placeholder={t("search_customers")}
          style={styles.modalInput as TextStyle}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          onChangeText={setSearchQuery}
          value={searchQuery}
        />

        <ScrollView style={styles.customerList as ViewStyle}>
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <ListItem
                key={customer.$id}
                title={customer.name}
                description={`${customer.phone} • ${t("points")}: ${customer.points}`}
                onPress={() => handleSelectCustomer(customer)}
                accessoryLeft={(props) => (
                  <Avatar
                    {...props}
                    size="small"
                    source={require("../../assets/avatar-placeholder.png")}
                  />
                )}
              />
            ))
          ) : (
            <View style={styles.emptyCustomers as ViewStyle}>
              <Icon
                name="people-outline"
                fill="#ddd"
                style={styles.emptyIcon}
              />
              <Text appearance="hint">{t("no_customers_found")}</Text>
            </View>
          )}
        </ScrollView>

        <Divider style={styles.divider as ViewStyle} />

        <Button
          status="primary"
          appearance="outline"
          accessoryLeft={(props) => (
            <Icon {...props} name="person-add-outline" />
          )}
          onPress={() => {
            setCustomerModalVisible(false);
            setSearchQuery("");
            navigation.navigate("AddCustomerScreen", {
              onCustomerCreated: (newCustomer) => {
                setSelectedCustomer(newCustomer);
                setOrder({
                  ...order,
                  customer: newCustomer.$id,
                  customerName: newCustomer.name,
                  customerPhone: newCustomer.phone,
                });
              },
            });
          }}
        >
          {t("create_new_customer")}
        </Button>

        <Button
          style={styles.cancelButton as ViewStyle}
          status="basic"
          onPress={() => {
            setCustomerModalVisible(false);
            setSearchQuery("");
          }}
        >
          {t("cancel")}
        </Button>
      </Card>
    </Modal>
  );

  return (
    <Layout level="1" style={styles.container as ViewStyle}>
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
              value={order.discount ? order.discount.toString() : ""}
              size="small"
              style={{ width: 100 }}
              textAlign="right"
              placeholder="0 - 100"
              keyboardType="numeric"
              onChangeText={(nextValue) =>
                parseInt(nextValue) >= 0 && parseInt(nextValue) <= 100
                  ? setOrder({ ...order, discount: parseInt(nextValue) })
                  : setOrder({ ...order, discount: 0 })
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
            style={{ padding: 10 } as ViewStyle}
            label={t("choose_table")}
            placeholder={t("no_table_found")}
            value={
              tables.length > 0
                ? selectedTableIndex.row > 0
                  ? tables[selectedTableIndex.row - 1].name
                  : t("choose_table")
                : t("no_table_found") // thay null bằng giá trị string
            }
            selectedIndex={selectedTableIndex}
            onSelect={(index: IndexPath | IndexPath[]) => {
              if (index instanceof IndexPath) {
                setSelectedTableIndex(index);
              }
            }}
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
          {/* Sau phần Select bàn và trước phần nhập ghi chú */}
          <Select
            style={{ padding: 10 } as ViewStyle}
            label={t("order_location")}
            placeholder={t("choose_location")}
            value={
              order.location
                ? order.location === "dine-in"
                  ? t("dine_in")
                  : order.location === "take-away"
                    ? t("take_away")
                    : t("delivery")
                : t("choose_location")
            }
            selectedIndex={selectedLocationIndex}
            onSelect={(index: IndexPath | IndexPath[]) => {
              if (index instanceof IndexPath) {
                setSelectedLocationIndex(index);
                // Lưu loại vị trí vào order state
                const locationTypes = ["dine-in", "take-away", "delivery"];
                const locationType = locationTypes[index.row];
                setOrder({ ...order, location: locationType });
              }
            }}
          >
            <SelectItem title={t("dine_in")} />
            <SelectItem title={t("take_away")} />
            <SelectItem title={t("delivery")} />
          </Select>

          {/* Phần chọn khách hàng */}
          <Card style={styles.section as ViewStyle}>
            <View style={styles.sectionHeader as ViewStyle}>
              <Text category="h6">{t("customer_information")}</Text>
            </View>

            {selectedCustomer ? (
              <View style={styles.customerInfo as ViewStyle}>
                <View>
                  <Text category="s1">{selectedCustomer.name}</Text>
                  <Text appearance="hint">{selectedCustomer.phone}</Text>
                  {selectedCustomer.points > 0 && (
                    <View style={styles.pointsBadge as ViewStyle}>
                      <Icon
                        name="award-outline"
                        fill="#FFD700"
                        style={{ width: 14, height: 14, marginRight: 4 }}
                      />
                      <Text category="c1" status="warning">
                        {t("points")}: {selectedCustomer.points}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Button
                    size="small"
                    appearance="ghost"
                    onPress={() => setCustomerModalVisible(true)}
                  >
                    {t("change")}
                  </Button>
                  <Button
                    size="small"
                    appearance="ghost"
                    status="danger"
                    accessoryLeft={(props) => (
                      <Icon {...props} name="close-outline" />
                    )}
                    onPress={() => {
                      // Xóa khách hàng khỏi đơn hàng
                      setSelectedCustomer(null);
                      setOrder({
                        ...order,
                        customer: "", // Dùng chuỗi rỗng thay vì null
                        customerName: "", // Dùng chuỗi rỗng thay vì null
                        customerPhone: "", // Dùng chuỗi rỗng thay vì null
                      });
                    }}
                  >
                    {t("remove")}
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                style={{ marginTop: 8 }}
                appearance="outline"
                status="primary"
                onPress={() => setCustomerModalVisible(true)}
                accessoryLeft={(props) => (
                  <Icon {...props} name="person-add-outline" />
                )}
              >
                {t("select_customer")}
              </Button>
            )}
          </Card>

          <Input
            label={t("order_note")}
            style={[styles.input as TextStyle, { padding: 10 }]}
            value={order.note}
            placeholder={t("order_note")}
            onChangeText={(nextValue) =>
              setOrder({ ...order, note: nextValue })
            }
          />
          <Datepicker
            style={[styles.input as ViewStyle, { padding: 10 }]}
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
      <Layout level="1" style={styles.buttons as ViewStyle}>
        <Button
          style={{ flex: 1, marginRight: 5, borderWidth: 0 }}
          appearance="outline"
          status="primary"
          onPress={() => saveOrder()}
        >
          {t("save_order")}
        </Button>
        <Button
          style={{
            flex: 1,
            marginLeft: 5,
            borderRadius: 8,
            backgroundColor: "#4caf50", // Màu xanh lá cố định thay vì dùng theme
            borderColor: "#388e3c",
            elevation: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
          }}
          accessoryLeft={(props) => (
            <Icon {...props} fill="white" name="credit-card-outline" />
          )}
          onPress={() => showAlertConfirm(t("payment"), t("payment_msg"))}
        >
          {t("payment")}
        </Button>
      </Layout>
      {renderCustomerModal()}
      <WaitingModal waiting={waiting} />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    paddingBottom: 100,
  },
  cardItem: {
    marginTop: 3,
  },
  productCard: {
    display: "flex",
    flexDirection: "row",
  },
  cardInfo: {
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
  },
  buttons: {
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    padding: 10,
    paddingBottom: 30,
  },
  // Các style cho phần khách hàng
  section: {
    margin: 10,
    borderRadius: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "color-warning-100",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  // Style cho modal
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalCard: {
    width: width - 48,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 12,
  },
  customerList: {
    maxHeight: height * 0.4,
    marginBottom: 16,
  },
  emptyCustomers: {
    alignItems: "center",
    padding: 24,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  cancelButton: {
    marginTop: 8,
  },
});

export default ReviewOrderScreen;
