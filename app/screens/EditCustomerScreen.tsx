import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  ImageStyle,
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
  StyleService,
  useStyleSheet,
  Avatar,
  Card,
  Spinner,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { LinearGradient } from "expo-linear-gradient";

const BackIcon = (props: any) => <Icon {...props} name="arrow-back" />;
interface EditCustomerProps {
  navigation: any;
  route: any;
}

const EditCustomerScreen: React.FC<EditCustomerProps> = ({
  navigation,
  route,
}) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const { updateItem } = useDatabases();
  const { customer } = route.params;

  const [name, setName] = useState(customer.name || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [email, setEmail] = useState(customer.email || "");
  const [notes, setNotes] = useState(customer.notes || "");
  const [loading, setLoading] = useState(false);

  const navigateBack = () => {
    navigation.goBack();
  };

  const BackAction = () => (
    <TopNavigationAction icon={BackIcon} onPress={navigateBack} />
  );

  const handleUpdateCustomer = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("", t("name_phone_required"));
      return;
    }

    setLoading(true);

    try {
      const customerData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
      };

      await updateItem(COLLECTION_IDS.customers, customer.$id, customerData);

      Alert.alert("", t("customer_updated_successfully"), [
        {
          text: t("ok"),
          onPress: navigateBack,
        },
      ]);
    } catch (error) {
      console.error("Error updating customer:", error);
      Alert.alert("", t("error_updating_customer"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      <TopNavigation
        title={t("edit_customer")}
        alignment="center"
        accessoryLeft={BackAction}
      />
      <Divider />

      <ScrollView
        style={styles.scrollView as ViewStyle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent as ViewStyle}
      >
        {/* Header Section with Avatar */}
        <LinearGradient
          colors={["#4169E1", "#1E40AF"]}
          style={styles.headerGradient as ViewStyle}
        >
          <Avatar
            source={require("../../assets/avatar-placeholder.png")}
            style={styles.avatar as ImageStyle}
            size="giant"
          />
          <Text style={styles.customerTitle as TextStyle} category="h5">
            {customer.name}
          </Text>
          <View style={styles.pointsBadge as ViewStyle}>
            <Icon
              name="award-outline"
              fill="#FFD700"
              style={styles.pointsIcon as ViewStyle}
            />
            <Text category="c1" style={styles.pointsText as TextStyle}>
              {t("points")}: {customer.points || 0}
            </Text>
          </View>
        </LinearGradient>

        {/* Form Card */}
        <Card style={styles.formCard as ViewStyle}>
          <Text category="h6" style={styles.formTitle as TextStyle}>
            {t("customer_information")}
          </Text>

          <View style={styles.formField as ViewStyle}>
            <Text category="s1" style={styles.label as TextStyle}>
              {t("customer_name")} *
            </Text>
            <Input
              placeholder={t("enter_customer_name")}
              value={name}
              onChangeText={setName}
              style={styles.input as TextStyle}
              accessoryLeft={(props) => (
                <Icon {...props} name="person-outline" />
              )}
              size="large"
              status="primary"
            />
          </View>

          <View style={styles.formField as ViewStyle}>
            <Text category="s1" style={styles.label as TextStyle}>
              {t("phone")} *
            </Text>
            <Input
              placeholder={t("enter_phone")}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input as TextStyle}
              accessoryLeft={(props) => (
                <Icon {...props} name="phone-outline" />
              )}
              size="large"
              status="primary"
            />
          </View>

          <View style={styles.formField as ViewStyle}>
            <Text category="s1" style={styles.label as TextStyle}>
              {t("email")}
            </Text>
            <Input
              placeholder={t("enter_email")}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              style={styles.input as TextStyle}
              accessoryLeft={(props) => (
                <Icon {...props} name="email-outline" />
              )}
              size="large"
              status="primary"
            />
          </View>

          <View style={styles.formField as ViewStyle}>
            <Text category="s1" style={styles.label as TextStyle}>
              {t("notes")}
            </Text>
            <Input
              placeholder={t("enter_notes")}
              value={notes}
              onChangeText={setNotes}
              multiline={true}
              textStyle={{ minHeight: 80 }}
              style={styles.input as TextStyle}
              accessoryLeft={(props) => (
                <Icon {...props} name="edit-2-outline" />
              )}
              status="primary"
            />
          </View>

          <View style={styles.footerInfo as ViewStyle}>
            <Icon
              name="calendar-outline"
              fill="#8F9BB3"
              style={styles.infoIcon as ViewStyle}
            />
            <Text appearance="hint" category="c1">
              {t("joined")}:{" "}
              {customer.joinDate
                ? new Date(customer.joinDate).toLocaleDateString()
                : "-"}
            </Text>
          </View>

          <View style={styles.footerInfo as ViewStyle}>
            <Icon
              name="shopping-bag-outline"
              fill="#8F9BB3"
              style={styles.infoIcon as ViewStyle}
            />
            <Text appearance="hint" category="c1">
              {t("total_spent")}:{" "}
              {Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(customer.totalSpent || 0)}
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonContainer as ViewStyle}>
          <Button
            style={styles.cancelButton as ViewStyle}
            status="basic"
            appearance="outline"
            onPress={navigateBack}
          >
            {t("cancel")}
          </Button>

          <Button
            style={styles.updateButton as ViewStyle}
            onPress={handleUpdateCustomer}
            disabled={loading}
            accessoryLeft={
              loading ? (props) => <Spinner size="small" /> : undefined
            }
          >
            {loading ? t("updating") : t("update_customer")}
          </Button>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-2",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerGradient: {
    paddingVertical: 32,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "white",
  },
  customerTitle: {
    color: "white",
    fontWeight: "bold",
    marginBottom: 8,
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pointsIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  pointsText: {
    color: "white",
    fontWeight: "bold",
  },
  formCard: {
    margin: 16,
    borderRadius: 16,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    marginBottom: 24,
    fontWeight: "bold",
    color: "text-primary-color",
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontWeight: "600",
    color: "text-basic-color",
  },
  input: {
    borderRadius: 8,
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  infoIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    margin: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
  },
  updateButton: {
    flex: 2,
    marginLeft: 8,
    borderRadius: 8,
  },
});

export default EditCustomerScreen;
