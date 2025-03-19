import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
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
  Card,
  Spinner,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { ID } from "appwrite";
import { LinearGradient } from "expo-linear-gradient";

const BackIcon = (props: any) => <Icon {...props} name="arrow-back" />;
interface AddCustomerProps {
  navigation: any;
}

const AddCustomerScreen: React.FC<AddCustomerProps> = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const { createItem } = useDatabases();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const navigateBack = () => {
    navigation.goBack();
  };

  const BackAction = () => (
    <TopNavigationAction icon={BackIcon} onPress={navigateBack} />
  );

  const handleAddCustomer = async () => {
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
        points: 0,
        totalSpent: 0,
        joinDate: new Date().toISOString(),
      };

      await createItem(COLLECTION_IDS.customers, customerData);

      Alert.alert("", t("customer_added_successfully"), [
        {
          text: t("ok"),
          onPress: navigateBack,
        },
      ]);
    } catch (error) {
      console.error("Error adding customer:", error);
      Alert.alert("", t("error_adding_customer"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      <TopNavigation
        title={t("add_customer")}
        alignment="center"
        accessoryLeft={BackAction}
      />
      <Divider />

      <ScrollView
        style={styles.scrollView as ViewStyle}
        contentContainerStyle={styles.scrollContent as ViewStyle}
        showsVerticalScrollIndicator={false}
      >
        {/* Header section */}
        <LinearGradient
          colors={["#6C5CE7", "#4834d4"]}
          style={styles.headerGradient as ViewStyle}
        >
          <View style={styles.headerContent as ViewStyle}>
            <Icon
              name="person-add-outline"
              fill="white"
              style={styles.headerIcon as ViewStyle}
            />
            <Text category="h5" style={styles.headerTitle as TextStyle}>
              {t("add_new_customer")}
            </Text>
            <Text category="c1" style={styles.headerSubtitle as TextStyle}>
              {t("add_customer_information") || t("fill_customer_details")}
            </Text>
          </View>
        </LinearGradient>

        {/* Form card */}
        <Card style={styles.formCard as ViewStyle}>
          <View style={styles.formSection as ViewStyle}>
            <View style={styles.sectionHeader as ViewStyle}>
              <Icon
                name="person-outline"
                fill="#6C5CE7"
                style={styles.sectionIcon as ViewStyle}
              />
              <Text category="h6" style={styles.sectionTitle as TextStyle}>
                {t("personal_information")}
              </Text>
            </View>

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
                status="primary"
                size="large"
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
                status="primary"
                size="large"
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
                status="primary"
                size="large"
              />
            </View>
          </View>

          <Divider style={styles.divider as ViewStyle} />

          <View style={styles.formSection as ViewStyle}>
            <View style={styles.sectionHeader as ViewStyle}>
              <Icon
                name="file-text-outline"
                fill="#6C5CE7"
                style={styles.sectionIcon as ViewStyle}
              />
              <Text category="h6" style={styles.sectionTitle as TextStyle}>
                {t("additional_information")}
              </Text>
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
                status="primary"
                accessoryLeft={(props) => (
                  <Icon {...props} name="edit-2-outline" />
                )}
              />
            </View>
          </View>

          <View style={styles.infoContainer as ViewStyle}>
            <Icon
              name="info-outline"
              fill="#8F9BB3"
              style={styles.infoIcon as ViewStyle}
            />
            <Text
              appearance="hint"
              category="c1"
              style={styles.infoText as TextStyle}
            >
              {t("new_customer_starts_with_0_points")}
            </Text>
          </View>
        </Card>

        {/* Action buttons */}
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
            style={styles.addButton as ViewStyle}
            status="primary"
            onPress={handleAddCustomer}
            disabled={loading}
            accessoryLeft={
              loading ? (props) => <Spinner size="small" /> : undefined
            }
          >
            {loading ? t("adding") : t("add_customer")}
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
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: "center",
  },
  headerIcon: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  headerTitle: {
    color: "white",
    fontWeight: "bold",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: "white",
    opacity: 0.8,
    textAlign: "center",
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
  formSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  sectionTitle: {
    color: "text-primary-color",
    fontWeight: "bold",
  },
  divider: {
    marginVertical: 16,
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
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "color-basic-100",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    margin: 16,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
  },
  addButton: {
    flex: 2,
    marginLeft: 8,
    borderRadius: 8,
  },
});

export default AddCustomerScreen;
