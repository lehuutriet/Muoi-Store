import React, { useEffect, useState, useCallback } from "react";
import {
  Dimensions,
  View,
  RefreshControl,
  ActivityIndicator,
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
  useTheme,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { FloatingAction } from "react-native-floating-action";
import { useFocusEffect } from "@react-navigation/native";
import { Query } from "appwrite";

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

const SUPPLIERS_PER_PAGE = 10;
const SEARCH_LIMIT = 100; // Tải nhiều hơn khi tìm kiếm

const SupplierScreen: React.FC<SupplierScreenProps> = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const { getAllItem } = useDatabases();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // State cho pagination và tìm kiếm
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null);

  // Lấy danh sách nhà cung cấp với phân trang
  const fetchData = useCallback(
    async (isInitial = false, forceReload = false) => {
      try {
        // Nếu đang tìm kiếm, đã tải dữ liệu rồi và không phải force reload, thì không tải lại
        if (searchQuery && initialLoaded && !forceReload) {
          return;
        }

        if (isInitial) {
          setLoading(true);
          if (forceReload) {
            setSuppliers([]);
            setFilteredSuppliers([]);
            setLastCreatedAt(null);
          }
        } else {
          setLoadingMore(true);
        }

        // Tạo queries
        const queries = [
          Query.orderDesc("$createdAt"),
          Query.limit(searchQuery ? SEARCH_LIMIT : SUPPLIERS_PER_PAGE),
        ];

        // Thêm điều kiện phân trang nếu không phải lần đầu và không đang tìm kiếm
        if (lastCreatedAt && !isInitial && !searchQuery) {
          queries.push(Query.lessThan("$createdAt", lastCreatedAt));
        }

        console.log(
          "Đang tải nhà cung cấp với queries:",
          JSON.stringify(queries)
        );

        const newSuppliers = await getAllItem(
          COLLECTION_IDS.suppliers,
          queries
        );

        console.log(`Đã tải ${newSuppliers.length} nhà cung cấp`);

        // Cập nhật state
        if (newSuppliers.length > 0) {
          // Lưu thông tin về nhà cung cấp cuối cùng để phân trang tiếp theo
          const newLastCreatedAt =
            newSuppliers[newSuppliers.length - 1].$createdAt;
          setLastCreatedAt(newLastCreatedAt);

          // Kiểm tra xem còn nhà cung cấp để tải không
          setHasMore(
            !searchQuery && newSuppliers.length === SUPPLIERS_PER_PAGE
          );

          // Cập nhật danh sách nhà cung cấp
          if (isInitial) {
            setSuppliers(newSuppliers);

            // Nếu đang tìm kiếm, lọc dữ liệu trên client
            if (searchQuery) {
              const filtered = newSuppliers.filter(
                (supplier) =>
                  supplier.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  supplier.phone.includes(searchQuery) ||
                  (supplier.email &&
                    supplier.email
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()))
              );
              setFilteredSuppliers(filtered);
            } else {
              setFilteredSuppliers(newSuppliers);
            }

            // Đánh dấu đã tải dữ liệu ban đầu
            setInitialLoaded(true);
          } else {
            // Loại bỏ các nhà cung cấp trùng lặp trước khi thêm vào danh sách
            const existingIds = new Set(suppliers.map((s) => s.$id));
            const uniqueNewSuppliers = newSuppliers.filter(
              (s) => !existingIds.has(s.$id)
            );

            const updatedSuppliers = [...suppliers, ...uniqueNewSuppliers];
            setSuppliers(updatedSuppliers);

            // Nếu đang tìm kiếm, lọc lại dữ liệu
            if (searchQuery) {
              const filtered = updatedSuppliers.filter(
                (supplier) =>
                  supplier.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  supplier.phone.includes(searchQuery) ||
                  (supplier.email &&
                    supplier.email
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()))
              );
              setFilteredSuppliers(filtered);
            } else {
              setFilteredSuppliers(updatedSuppliers);
            }
          }
        } else {
          // Không có nhà cung cấp mới, đã tải hết
          setHasMore(false);
        }
      } catch (error) {
        console.error("Lỗi khi tải nhà cung cấp:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [getAllItem, lastCreatedAt, suppliers, searchQuery, initialLoaded]
  );

  // Xử lý khi kéo xuống refresh - luôn tải lại dữ liệu mới
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true, true);
  }, [fetchData]);

  // Xử lý khi kéo xuống cuối danh sách
  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !searchQuery) {
      console.log("Đang tải thêm nhà cung cấp...");
      fetchData(false);
    }
  };

  // Xử lý khi thay đổi từ khóa tìm kiếm
  useEffect(() => {
    if (suppliers.length > 0) {
      if (searchQuery) {
        setIsSearchMode(true);
        const filtered = suppliers.filter(
          (supplier) =>
            supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            supplier.phone.includes(searchQuery) ||
            (supplier.email &&
              supplier.email.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setFilteredSuppliers(filtered);
      } else {
        setIsSearchMode(false);
        setFilteredSuppliers(suppliers);
      }
    }

    // Tải lại dữ liệu khi searchQuery thay đổi, nhưng chỉ nếu đã có delay
    const timeoutId = setTimeout(() => {
      if (searchQuery !== "") {
        fetchData(true, true); // Force reload khi tìm kiếm để tải đủ dữ liệu
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Chỉ tải dữ liệu lần đầu tiên màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      if (!initialLoaded) {
        // Chỉ tải nếu chưa từng tải
        fetchData(true, false);
      }
      return () => {};
    }, [initialLoaded, fetchData])
  );

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

  // Render footer cho list - hiển thị loading khi tải thêm
  const renderFooter = () => {
    if (!hasMore && filteredSuppliers.length > 0) {
      return (
        <View style={styles.footerContainer as ViewStyle}>
          <Text appearance="hint">{t("no_more_suppliers")}</Text>
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
  const renderEmptyList = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer as ViewStyle}>
        <Icon
          name="people-outline"
          fill={theme["color-basic-400"]}
          style={styles.emptyIcon}
        />
        <Text appearance="hint" category="s1">
          {searchQuery ? t("no_matching_suppliers") : t("no_suppliers_found")}
        </Text>
        {!searchQuery && (
          <Button
            appearance="ghost"
            status="primary"
            style={styles.emptyButton as ViewStyle}
            onPress={() => navigation.navigate("AddSupplierScreen")}
          >
            {t("add_supplier")}
          </Button>
        )}
      </View>
    );
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      {/* Thanh tìm kiếm */}
      <Layout style={styles.searchContainer as ViewStyle}>
        <Input
          placeholder={t("search_suppliers")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          accessoryRight={
            searchQuery
              ? (props) => (
                  <Icon
                    {...props}
                    name="close-outline"
                    fill="#8F9BB3"
                    onPress={() => setSearchQuery("")}
                  />
                )
              : undefined
          }
          style={styles.searchInput as TextStyle}
          size="medium"
        />
      </Layout>

      {/* Hiển thị trạng thái tìm kiếm */}
      {isSearchMode && (
        <View style={styles.searchStatusContainer as ViewStyle}>
          <Text appearance="hint">
            {filteredSuppliers.length} {t("suppliers_found")}
          </Text>
        </View>
      )}

      <List
        data={filteredSuppliers}
        renderItem={renderItem}
        style={styles.list as ViewStyle}
        contentContainerStyle={[
          styles.listContent as ViewStyle,
          filteredSuppliers.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme["color-primary-500"]]}
          />
        }
        ListEmptyComponent={renderEmptyList}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
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
  searchStatusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "background-basic-color-1",
    borderBottomWidth: 1,
    borderBottomColor: "border-basic-color-3",
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
  // Thêm styles cho footer
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

export default SupplierScreen;
