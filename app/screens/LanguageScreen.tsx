import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Text,
  Button,
  RadioGroup,
  Radio,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import { View, ScrollView, ViewStyle, TextStyle } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { changeLanguage } from "../i18/i18n.config";

interface LanguageScreenProps {
  navigation: any;
}

const LanguageScreen: React.FC<LanguageScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const styles = useStyleSheet(themedStyles);
  const [selectedIndex, setSelectedIndex] = useState(
    i18n.language === "en" ? 1 : 0
  );

  const handleLanguageChange = async (index: any) => {
    const lang = index === 0 ? "vi" : "en";
    setSelectedIndex(index);
    await changeLanguage(lang);
  };

  return (
    <Layout style={styles.container as ViewStyle}>
      <ScrollView contentContainerStyle={styles.content as any}>
        <Text category="h5" style={styles.title as TextStyle}>
          {t("select_language")}
        </Text>

        <RadioGroup
          selectedIndex={selectedIndex}
          onChange={handleLanguageChange}
          style={styles.radioGroup as ViewStyle}
        >
          <Radio style={styles.radioOption as ViewStyle}>
            <Text>Tiếng Việt</Text>
          </Radio>
          <Radio style={styles.radioOption as ViewStyle}>
            <Text>English</Text>
          </Radio>
        </RadioGroup>

        <Button
          style={styles.button as ViewStyle}
          onPress={() => navigation.goBack()}
        >
          {t("close")}
        </Button>
      </ScrollView>
    </Layout>
  );
};

const themedStyles = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  },
  content: {
    padding: 20,
    justifyContent: "center",
    minHeight: "100%",
  },
  title: {
    textAlign: "center",
    marginBottom: 30,
  },
  radioGroup: {
    marginBottom: 30,
  },
  radioOption: {
    marginVertical: 10,
  },
  button: {
    marginTop: 20,
  },
});

export default LanguageScreen;
