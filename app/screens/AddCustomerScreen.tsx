import React, { useState } from "react";
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
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../hook/AppWrite";
import { ID } from "appwrite";

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

      <ScrollView style={styles.form as ViewStyle}>
        <Text category="s1" style={styles.label as TextStyle}>
          {t("customer_name")} *
        </Text>
        <Input
          placeholder={t("enter_customer_name")}
          value={name}
          onChangeText={setName}
          style={styles.input as TextStyle}
        />

        <Text category="s1" style={styles.label as TextStyle}>
          {t("phone")} *
        </Text>
        <Input
          placeholder={t("enter_phone")}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input as TextStyle}
        />

        <Text category="s1" style={styles.label as TextStyle}>
          {t("email")}
        </Text>
        <Input
          placeholder={t("enter_email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input as TextStyle}
        />

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
        />

        <Button
          onPress={handleAddCustomer}
          disabled={loading}
          style={styles.button as ViewStyle}
        >
          {loading ? t("adding") : t("add_customer")}
        </Button>
      </ScrollView>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
    marginBottom: 48,
  },
});

export default AddCustomerScreen;
