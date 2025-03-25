// EditSupplierScreen.tsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  ViewStyle,
  TextStyle,
} from "react-native";
import {
  Layout,
  Text,
  Input,
  Button,
  TopNavigation,
  TopNavigationAction,
  Icon,
  Divider,
  Spinner,
  Card,
  List,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../../hook/AppWrite";
import { Query } from "appwrite";

const BackIcon = (props: any) => <Icon {...props} name="arrow-back" />;

// Định nghĩa các interface
interface Transaction {
  $id: string;
  date: string;
  description: string;
  amount: number;
  invoiceNumber: string;
}

interface editsupplierProps {
  navigation: any;
  route: any;
}

const EditSupplierScreen: React.FC<editsupplierProps> = ({
  navigation,
  route,
}) => {
  const { t } = useTranslation();
  const { updateItem, deleteItem, getAllItem } = useDatabases();
  const { supplier } = route.params;

  const [name, setName] = useState(supplier.name || "");
  const [phone, setPhone] = useState(supplier.phone || "");
  const [email, setEmail] = useState(supplier.email || "");
  const [address, setAddress] = useState(supplier.address || "");
  const [contactPerson, setContactPerson] = useState(
    supplier.contactPerson || ""
  );
  const [notes, setNotes] = useState(supplier.notes || "");
  // Định nghĩa kiểu cho transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // Thêm state để quản lý hiển thị form chỉnh sửa
  const [showEditForm, setShowEditForm] = useState(false);

  const navigateBack = () => {
    navigation.goBack();
  };

  const BackAction = () => (
    <TopNavigationAction icon={BackIcon} onPress={navigateBack} />
  );

  // Lấy lịch sử giao dịch với nhà cung cấp này
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);
        const data = await getAllItem(COLLECTION_IDS.supplierTransactions, [
          Query.equal("supplierId", supplier.$id),
        ]);
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [supplier.$id]);

  const handleUpdateSupplier = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("", t("name_phone_required"));
      return;
    }

    setLoading(true);

    try {
      const supplierData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        contactPerson: contactPerson.trim() || null,
        notes: notes.trim() || null,
      };

      await updateItem(COLLECTION_IDS.suppliers, supplier.$id, supplierData);

      Alert.alert("", t("supplier_updated_successfully"), [
        {
          text: t("ok"),
          onPress: () => {
            setShowEditForm(false); // Ẩn form sau khi cập nhật thành công
          },
        },
      ]);
    } catch (error) {
      console.error("Error updating supplier:", error);
      Alert.alert("", t("error_updating_supplier"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = () => {
    Alert.alert(t("confirm_delete"), t("delete_supplier_confirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await deleteItem(COLLECTION_IDS.suppliers, supplier.$id);
            Alert.alert("", t("supplier_deleted_successfully"));
            navigation.goBack();
          } catch (error) {
            console.error("Error deleting supplier:", error);
            Alert.alert("", t("error_deleting_supplier"));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // Định nghĩa kiểu cho item trong renderTransactionItem
  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <Card style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View>
          <Text category="s1">{new Date(item.date).toLocaleDateString()}</Text>
          <Text category="p2">{item.description || t("stock_entry")}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text category="s1">
            {Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(item.amount)}
          </Text>
          <Text category="c1">
            {t("invoice")}: {item.invoiceNumber || "-"}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <Layout style={{ flex: 1 }}>
      <TopNavigation
        title={t("supplier_details")}
        alignment="center"
        accessoryLeft={BackAction}
      />
      <Divider />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hiển thị thông tin nhà cung cấp */}
        {!showEditForm && (
          <Card style={{ marginBottom: 16 }}>
            <Text category="h6" style={{ marginBottom: 16 }}>
              {supplier.name}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Icon
                name="phone-outline"
                style={{ width: 20, height: 20, marginRight: 8 }}
                fill="#8F9BB3"
              />
              <Text>{supplier.phone}</Text>
            </View>

            {supplier.email && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Icon
                  name="email-outline"
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  fill="#8F9BB3"
                />
                <Text>{supplier.email}</Text>
              </View>
            )}

            {supplier.address && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Icon
                  name="pin-outline"
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  fill="#8F9BB3"
                />
                <Text>{supplier.address}</Text>
              </View>
            )}

            {supplier.contactPerson && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Icon
                  name="person-outline"
                  style={{ width: 20, height: 20, marginRight: 8 }}
                  fill="#8F9BB3"
                />
                <Text>{supplier.contactPerson}</Text>
              </View>
            )}

            {supplier.notes && (
              <View style={{ marginTop: 8 }}>
                <Text category="s1" style={{ marginBottom: 4 }}>
                  {t("notes")}
                </Text>
                <Text appearance="hint">{supplier.notes}</Text>
              </View>
            )}

            {/* Nút chỉnh sửa */}
            <Button
              style={{ marginTop: 16 }}
              onPress={() => setShowEditForm(true)}
              accessoryLeft={(props) => (
                <Icon {...props} name="edit-2-outline" />
              )}
            >
              {t("edit_supplier")}
            </Button>
          </Card>
        )}

        {/* Form chỉnh sửa thông tin */}
        {showEditForm && (
          <View style={{ marginBottom: 24 }}>
            <Text category="h6" style={{ marginBottom: 16 }}>
              {t("edit_supplier_info")}
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text category="s1" style={{ marginBottom: 8 }}>
                {t("supplier_name")} *
              </Text>
              <Input
                placeholder={t("enter_supplier_name")}
                value={name}
                onChangeText={setName}
                size="large"
                status="primary"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text category="s1" style={{ marginBottom: 8 }}>
                {t("phone")} *
              </Text>
              <Input
                placeholder={t("enter_phone")}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                size="large"
                status="primary"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text category="s1" style={{ marginBottom: 8 }}>
                {t("email")}
              </Text>
              <Input
                placeholder={t("enter_email")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                size="large"
                status="primary"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text category="s1" style={{ marginBottom: 8 }}>
                {t("address")}
              </Text>
              <Input
                placeholder={t("enter_address")}
                value={address}
                onChangeText={setAddress}
                multiline={true}
                textStyle={{ minHeight: 60 }}
                size="large"
                status="primary"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text category="s1" style={{ marginBottom: 8 }}>
                {t("contact_person")}
              </Text>
              <Input
                placeholder={t("enter_contact_person")}
                value={contactPerson}
                onChangeText={setContactPerson}
                size="large"
                status="primary"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text category="s1" style={{ marginBottom: 8 }}>
                {t("notes")}
              </Text>
              <Input
                placeholder={t("enter_notes")}
                value={notes}
                onChangeText={setNotes}
                multiline={true}
                textStyle={{ minHeight: 80 }}
                size="large"
                status="primary"
              />
            </View>

            <View style={{ flexDirection: "row" }}>
              <Button
                style={{ flex: 1, marginRight: 8 }}
                appearance="outline"
                status="basic"
                onPress={() => setShowEditForm(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                style={{ flex: 2, marginLeft: 8 }}
                status="primary"
                onPress={handleUpdateSupplier}
                disabled={loading}
                accessoryLeft={
                  loading ? (props) => <Spinner size="small" /> : undefined
                }
              >
                {loading ? t("updating") : t("update_supplier")}
              </Button>
            </View>
          </View>
        )}

        {/* Transaction history section */}
        <Text category="h6" style={{ marginTop: 16, marginBottom: 8 }}>
          {t("transaction_history")}
        </Text>

        {transactionsLoading ? (
          <View style={{ padding: 16, alignItems: "center" }}>
            <Spinner size="medium" />
          </View>
        ) : transactions.length > 0 ? (
          transactions.map((transaction, index) =>
            renderTransactionItem({ item: transaction })
          )
        ) : (
          <Text appearance="hint" style={{ textAlign: "center", padding: 16 }}>
            {t("no_transactions")}
          </Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer buttons - chỉ hiển thị khi không trong chế độ chỉnh sửa */}
      {!showEditForm && (
        <View
          style={{
            flexDirection: "row",
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: "#E8E8E8",
          }}
        >
          <Button
            style={{ flex: 1 }}
            appearance="outline"
            status="danger"
            onPress={handleDeleteSupplier}
          >
            {t("delete")}
          </Button>
        </View>
      )}
    </Layout>
  );
};

export default EditSupplierScreen;
