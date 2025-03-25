import React, { useEffect, useState, useCallback } from "react";
import {
  Dimensions,
  ScrollView,
  View,
  RefreshControl,
  Alert,
  ViewStyle,
  TextStyle,
} from "react-native";
import {
  Text,
  Button,
  StyleService,
  useStyleSheet,
  Layout,
  Card,
  Icon,
  List,
  Input,
  Divider,
  TopNavigation,
  useTheme,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { FloatingAction } from "react-native-floating-action";
import { useFocusEffect } from "@react-navigation/native";

interface Supplier {
  $id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
}

interface SupplierScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

const SupplierScreen: React.FC<SupplierScreenProps> = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const supplierData = await getAllItem(COLLECTION_IDS.suppliers);
      setSuppliers(supplierData);
      setFilteredSuppliers(supplierData);
      setRefreshing(false);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {};
    }, [])
  );

  // Lọc nhà cung cấp theo tìm kiếm
  useEffect(() => {
    if (searchQuery) {
      const filtered = suppliers.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.phone.includes(searchQuery) ||
          (item.email &&
            item.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    fetchData();
  }, []);

  const actions = [
    {
      text: t("add_supplier"),
      icon: require("../../assets/icons/plus-outline.png"),
      name: "AddSupplier",
      position: 1,
    },
  ];

  const renderItem = ({ item }: { item: Supplier }) => (
    <Card
      style={styles.card as ViewStyle}
      onPress={() =>
        navigation.navigate("EditSupplierScreen", { supplier: item })
      }
    >
      <View style={styles.supplierRow as ViewStyle}>
        <View style={styles.supplierInfo as ViewStyle}>
          <Text category="s1" style={styles.supplierName as TextStyle}>
            {item.name}
          </Text>
          <View style={styles.contactContainer as ViewStyle}>
            <Icon
              name="phone-outline"
              fill={theme["color-basic-600"]}
              style={styles.contactIcon}
            />
            <Text appearance="hint" category="c1">
              {item.phone}
            </Text>
          </View>
          {item.email && (
            <View style={styles.contactContainer as ViewStyle}>
              <Icon
                name="email-outline"
                fill={theme["color-basic-600"]}
                style={styles.contactIcon}
              />
              <Text appearance="hint" category="c1">
                {item.email}
              </Text>
            </View>
          )}
        </View>
        <Icon
          name="arrow-ios-forward"
          fill={theme["color-basic-400"]}
          style={styles.arrowIcon}
        />
      </View>
    </Card>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer as ViewStyle}>
      <Icon
        name="people-outline"
        fill={theme["color-basic-400"]}
        style={styles.emptyIcon}
      />
      <Text appearance="hint" category="s1">
        {t("no_suppliers_found")}
      </Text>
      <Button
        appearance="ghost"
        status="primary"
        style={styles.emptyButton as ViewStyle}
        onPress={() => navigation.navigate("AddSupplierScreen")}
      >
        {t("add_supplier")}
      </Button>
    </View>
  );

  return (
    <Layout style={styles.container as ViewStyle}>
      {/* Thanh tìm kiếm */}
      <Layout style={styles.searchContainer as ViewStyle}>
        <Input
          placeholder={t("search_suppliers")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          style={styles.searchInput as TextStyle}
          size="medium"
        />
      </Layout>

      <List
        data={filteredSuppliers}
        renderItem={renderItem}
        style={styles.list as ViewStyle}
        contentContainerStyle={styles.listContent as ViewStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyList}
      />

      <FloatingAction
        actions={actions}
        color="#4169E1"
        onPressItem={(name) => {
          if (name === "AddSupplier") {
            navigation.navigate("AddSupplierScreen");
          }
        }}
        overlayColor="rgba(68, 68, 68, 0.7)"
        showBackground={false}
        distanceToEdge={16}
        buttonSize={56}
      />
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "background-basic-color-1",
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
  },
  searchInput: {
    borderRadius: 24,
    backgroundColor: "background-basic-color-1",
  },
  list: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  listContent: {
    padding: 12,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "color-primary-500",
  },
  supplierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  contactContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  contactIcon: {
    width: 12,
    height: 12,
    marginRight: 4,
  },
  arrowIcon: {
    width: 24,
    height: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyButton: {
    marginTop: 16,
  },
});

export default SupplierScreen;
