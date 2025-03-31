// LoyalCustomerScreen.tsx (đã sửa để giữ kết quả tìm kiếm khi quay lại)
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  ViewStyle,
  ImageStyle,
} from "react-native";
import {
  Layout,
  Text,
  Card,
  Icon,
  Input,
  Button,
  List,
  Avatar,
  StyleService,
  useStyleSheet,
  useTheme,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { FloatingAction } from "react-native-floating-action";
import { useFocusEffect } from "@react-navigation/native";
import { Query } from "appwrite";
import { TextStyle } from "react-native";

// Định nghĩa kiểu dữ liệu cho khách hàng
interface Customer {
  $id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  totalSpent: number;
  lastVisit?: string;
  joinDate: string;
  notes?: string;
}

const { width } = Dimensions.get("window");
const CUSTOMERS_PER_PAGE = 10;
const SEARCH_LIMIT = 100; // Tải nhiều khách hàng hơn khi tìm kiếm

interface LoyalCustomerProps {
  navigation: any;
}

const LoyalCustomerScreen: React.FC<LoyalCustomerProps> = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Thêm state để kiểm soát lần đầu load hay đã từng load rồi
  const [initialLoaded, setInitialLoaded] = useState(false);

  // State cho infinite scroll
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null);

  // Lấy danh sách khách hàng với phân trang
  const fetchCustomers = useCallback(
    async (isInitial = false, forceReload = false) => {
      try {
        // Nếu đang tìm kiếm, đã tải dữ liệu rồi và không phải force reload, thì không tải lại
        if (searchText && initialLoaded && !forceReload) {
          return;
        }

        if (isInitial) {
          setLoading(true);
          if (forceReload) {
            setCustomers([]);
            setFilteredCustomers([]);
            setLastCreatedAt(null);
          }
        } else {
          setLoadingMore(true);
        }

        // Tạo queries
        const queries = [
          Query.orderDesc("$createdAt"),
          Query.limit(searchText ? SEARCH_LIMIT : CUSTOMERS_PER_PAGE),
        ];

        // Thêm điều kiện phân trang nếu không phải lần đầu và không đang tìm kiếm
        if (lastCreatedAt && !isInitial && !searchText) {
          queries.push(Query.lessThan("$createdAt", lastCreatedAt));
        }

        console.log(
          "Đang tải khách hàng với queries:",
          JSON.stringify(queries)
        );

        const newCustomers = await getAllItem(
          COLLECTION_IDS.customers,
          queries
        );

        console.log(`Đã tải ${newCustomers.length} khách hàng`);

        // Cập nhật state
        if (newCustomers.length > 0) {
          // Lưu thông tin về khách hàng cuối cùng để phân trang tiếp theo
          const newLastCreatedAt =
            newCustomers[newCustomers.length - 1].$createdAt;
          setLastCreatedAt(newLastCreatedAt);

          // Kiểm tra xem còn khách hàng để tải không
          setHasMore(!searchText && newCustomers.length === CUSTOMERS_PER_PAGE);

          // Cập nhật danh sách khách hàng
          if (isInitial) {
            setCustomers(newCustomers);

            // Nếu đang tìm kiếm, lọc dữ liệu trên client
            if (searchText) {
              const filtered = newCustomers.filter(
                (customer) =>
                  customer.name
                    .toLowerCase()
                    .includes(searchText.toLowerCase()) ||
                  customer.phone.includes(searchText)
              );
              setFilteredCustomers(filtered);
            } else {
              setFilteredCustomers(newCustomers);
            }

            // Đánh dấu đã tải dữ liệu ban đầu
            setInitialLoaded(true);
          } else {
            // Loại bỏ các khách hàng trùng lặp trước khi thêm vào danh sách
            const existingIds = new Set(customers.map((c) => c.$id));
            const uniqueNewCustomers = newCustomers.filter(
              (c) => !existingIds.has(c.$id)
            );

            const updatedCustomers = [...customers, ...uniqueNewCustomers];
            setCustomers(updatedCustomers);

            // Nếu đang tìm kiếm, lọc lại dữ liệu
            if (searchText) {
              const filtered = updatedCustomers.filter(
                (customer) =>
                  customer.name
                    .toLowerCase()
                    .includes(searchText.toLowerCase()) ||
                  customer.phone.includes(searchText)
              );
              setFilteredCustomers(filtered);
            } else {
              setFilteredCustomers(updatedCustomers);
            }
          }
        } else {
          // Không có khách hàng mới, đã tải hết
          setHasMore(false);
        }
      } catch (error) {
        console.error("Lỗi khi tải khách hàng:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [getAllItem, lastCreatedAt, customers, searchText, initialLoaded]
  );

  // Xử lý khi kéo xuống refresh - luôn tải lại dữ liệu mới
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers(true, true).finally(() => setRefreshing(false));
  }, [fetchCustomers]);

  // Xử lý khi kéo xuống cuối danh sách
  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !searchText) {
      console.log("Đang tải thêm khách hàng...");
      fetchCustomers(false);
    }
  };

  // Cập nhật kết quả tìm kiếm mỗi khi searchText thay đổi
  useEffect(() => {
    if (customers.length > 0) {
      if (searchText) {
        const filtered = customers.filter(
          (customer) =>
            customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
            customer.phone.includes(searchText)
        );
        setFilteredCustomers(filtered);
      } else {
        setFilteredCustomers(customers);
      }
    }

    // Tải lại dữ liệu khi searchText thay đổi, nhưng chỉ nếu đã có delay
    const timeoutId = setTimeout(() => {
      if (searchText !== "") {
        fetchCustomers(true, true); // Force reload khi tìm kiếm để tải đủ dữ liệu
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // Chỉ tải dữ liệu lần đầu tiên màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      if (!initialLoaded) {
        // Chỉ tải nếu chưa từng tải
        fetchCustomers(true, false);
      }
      return () => {};
    }, [initialLoaded, fetchCustomers])
  );

  // Xử lý khi chọn khách hàng
  const handleSelectCustomer = (customer: Customer) => {
    navigation.navigate("CustomerDetailScreen", {
      customer: customer,
    });
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <Card
      style={styles.customerListItem as ViewStyle}
      onPress={() => handleSelectCustomer(item)}
    >
      <View style={styles.customerListItemContent as ViewStyle}>
        <View style={styles.customerAvatarContainer as ViewStyle}>
          <Avatar
            style={styles.avatar as ImageStyle}
            source={require("../../assets/avatar-placeholder.png")}
          />
        </View>
        <View style={styles.customerDetails as ViewStyle}>
          <Text category="s1" style={styles.customerName as TextStyle}>
            {item.name}
          </Text>
          <Text category="p2" appearance="hint">
            {item.phone}
          </Text>
          <View style={styles.pointsDisplay as ViewStyle}>
            <Icon
              name="award-outline"
              fill="#FFD700"
              style={styles.pointsIcon as ImageStyle}
            />
            <Text category="c1" status="warning">
              {item.points || 0} {t("points")}
            </Text>
          </View>
        </View>
        <Icon
          name="chevron-right-outline"
          fill="#BDBDBD"
          style={styles.chevronIcon as ImageStyle}
        />
      </View>
    </Card>
  );

  // Render footer cho list - hiển thị loading khi tải thêm
  const renderFooter = () => {
    if (!hasMore && filteredCustomers.length > 0) {
      return (
        <View style={styles.footerContainer as ViewStyle}>
          <Text appearance="hint">{t("no_more_customers")}</Text>
        </View>
      );
    }

    if (loadingMore) {
      return (
        <View style={styles.footerContainer as ViewStyle}>
          <ActivityIndicator size="small" color={theme["color-primary-500"]} />
          <Text style={styles.footerText as TextStyle}>
            {t("loading_more")}
          </Text>
        </View>
      );
    }

    return null;
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer as ViewStyle}>
        <Icon
          name="people-outline"
          fill="#E0E0E0"
          style={styles.emptyIcon as ImageStyle}
        />
        <Text appearance="hint" style={styles.emptyText as TextStyle}>
          {searchText ? t("no_matching_customers") : t("no_customers_found")}
        </Text>
        {!searchText && (
          <Button
            appearance="ghost"
            status="primary"
            onPress={() => navigation.navigate("AddCustomerScreen")}
            style={styles.emptyActionButton as ViewStyle}
          >
            {t("add_customer")}
          </Button>
        )}
      </View>
    );
  };

  const actions = [
    {
      text: t("add_customer"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "AddCustomer",
      position: 1,
    },
  ];

  return (
    <Layout style={styles.container as ViewStyle}>
      <View style={styles.searchContainer as ViewStyle}>
        <Input
          placeholder={t("search_customers")}
          value={searchText}
          onChangeText={setSearchText}
          accessoryLeft={(props) => (
            <Icon {...props} name="search-outline" fill="#4169E1" />
          )}
          accessoryRight={
            searchText
              ? (props) => (
                  <Icon
                    {...props}
                    name="close-outline"
                    fill="#8F9BB3"
                    onPress={() => setSearchText("")}
                  />
                )
              : undefined
          }
          style={styles.searchInput as TextStyle}
        />
      </View>

      <List
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        style={styles.list as ViewStyle}
        contentContainerStyle={[
          styles.listContent as ViewStyle,
          filteredCustomers.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme["color-primary-500"]]}
          />
        }
      />

      <FloatingAction
        actions={actions}
        color="#4169E1"
        showBackground={true}
        distanceToEdge={16}
        overlayColor="rgba(0, 0, 0, 0.6)"
        onPressItem={(name) => {
          if (name === "AddCustomer") {
            navigation.navigate("AddCustomerScreen");
          }
        }}
      />
    </Layout>
  );
};

// Giữ nguyên styles
const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "background-basic-color-1",
    borderBottomWidth: 1,
    borderBottomColor: "background-basic-color-3",
  },
  searchInput: {
    borderRadius: 24,
    backgroundColor: "background-basic-color-1",
    borderColor: "background-basic-color-3",
  },
  list: {
    backgroundColor: "transparent",
  },
  listContent: {
    padding: 8,
    paddingBottom: 80,
  },
  customerListItem: {
    marginBottom: 8,
    marginHorizontal: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  customerListItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  customerAvatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  pointsDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  pointsIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
  },
  chevronIcon: {
    width: 20,
    height: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 16,
  },
  emptyActionButton: {
    marginTop: 8,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: "text-hint-color",
  },
});

export default LoyalCustomerScreen;
