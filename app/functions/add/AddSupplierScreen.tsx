// AddSupplierScreen.tsx
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
  Spinner,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useDatabases, COLLECTION_IDS } from "../../hook/AppWrite";

const BackIcon = (props: any) => <Icon {...props} name="arrow-back" />;
interface addSupplierScreenProps {
  navigation: any;
}
const AddSupplierScreen: React.FC<addSupplierScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const { createItem } = useDatabases();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const navigateBack = () => {
    navigation.goBack();
  };

  const BackAction = () => (
    <TopNavigationAction icon={BackIcon} onPress={navigateBack} />
  );

  const handleCreateSupplier = async () => {
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

      await createItem(COLLECTION_IDS.suppliers, supplierData);

      Alert.alert("", t("supplier_added_successfully"), [
        {
          text: t("ok"),
          onPress: navigateBack,
        },
      ]);
    } catch (error) {
      console.error("Error adding supplier:", error);
      Alert.alert("", t("error_adding_supplier"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ flex: 1 }}>
      <TopNavigation
        title={t("add_supplier")}
        alignment="center"
        accessoryLeft={BackAction}
      />
      <Divider />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: "#E8E8E8",
        }}
      >
        <Button
          style={{ flex: 1, marginRight: 8 }}
          appearance="outline"
          status="basic"
          onPress={navigateBack}
        >
          {t("cancel")}
        </Button>
        <Button
          style={{ flex: 2, marginLeft: 8 }}
          status="primary"
          onPress={handleCreateSupplier}
          disabled={loading}
          accessoryLeft={
            loading ? (props) => <Spinner size="small" /> : undefined
          }
        >
          {loading ? t("adding") : t("add_supplier")}
        </Button>
      </View>
    </Layout>
  );
};

export default AddSupplierScreen;
