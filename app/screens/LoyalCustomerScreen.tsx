// LoyalCustomerScreen.tsx (đã chỉnh sửa)
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert,
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
  Modal,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { FloatingAction } from "react-native-floating-action";
import { useFocusEffect } from "@react-navigation/native";
import { Query } from "appwrite";
import { TextStyle } from "react-native";

// Định nghĩa kiểu dữ liệu cho khách hàng (giữ nguyên)
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

interface LoyalCustomerProps {
  navigation: any;
}

const LoyalCustomerScreen: React.FC<LoyalCustomerProps> = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Lấy danh sách khách hàng
  const fetchCustomers = useCallback(async () => {
    try {
      setRefreshing(true);
      const customersData = await getAllItem(COLLECTION_IDS.customers);
      setCustomers(customersData);
      setFilteredCustomers(customersData);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setRefreshing(false);
    }
  }, [getAllItem]);

  // Filter customers based on search text
  useEffect(() => {
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
  }, [searchText, customers]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCustomers();
      return () => {};
    }, [])
  );

  const onRefresh = useCallback(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Sửa lại hàm này để điều hướng sang màn hình chi tiết
  const handleSelectCustomer = (customer: Customer) => {
    // Chuyển hướng sang màn hình chi tiết khách hàng
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
              {item.points} {t("points")}
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
          style={styles.searchInput as TextStyle}
        />
      </View>

      {filteredCustomers.length > 0 ? (
        <List
          data={filteredCustomers}
          renderItem={renderCustomerItem}
          style={styles.list as ViewStyle}
          contentContainerStyle={styles.listContent as ViewStyle}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer as ViewStyle}>
          <Icon
            name="people-outline"
            fill="#E0E0E0"
            style={styles.emptyIcon as ImageStyle}
          />
          <Text appearance="hint" style={styles.emptyText as TextStyle}>
            {t("no_customers_found")}
          </Text>
          <Button
            appearance="ghost"
            status="primary"
            onPress={() => navigation.navigate("AddCustomerScreen")}
            style={styles.emptyActionButton as ViewStyle}
          >
            {t("add_customer")}
          </Button>
        </View>
      )}

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

// Giữ lại các styles cần thiết cho màn hình danh sách
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
});

export default LoyalCustomerScreen;
