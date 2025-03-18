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
          onPress={handleUpdateCustomer}
          disabled={loading}
          style={styles.button as ViewStyle}
        >
          {loading ? t("updating") : t("update_customer")}
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

export default EditCustomerScreen;
