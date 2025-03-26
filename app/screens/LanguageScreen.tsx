import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Text,
  Button,
  Card,
  StyleService,
  useStyleSheet,
  Icon,
  Divider,
} from "@ui-kitten/components";
import {
  View,
  ScrollView,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { changeLanguage } from "../i18/i18n.config";
import { LinearGradient } from "expo-linear-gradient";

interface LanguageScreenProps {
  navigation: any;
}

const LanguageScreen: React.FC<LanguageScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const styles = useStyleSheet(themedStyles);
  const [selectedLanguage, setSelectedLanguage] = useState(
    i18n.language || "vi"
  );

  useEffect(() => {
    const getCurrentLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem("language");
        if (storedLang) {
          setSelectedLanguage(storedLang);
        }
      } catch (error) {
        console.error("Error getting language:", error);
      }
    };

    getCurrentLanguage();
  }, []);

  const handleLanguageChange = async (lang: string) => {
    try {
      setSelectedLanguage(lang);
      await AsyncStorage.setItem("language", lang);
      await i18n.changeLanguage(lang);
      console.log("Đã chuyển sang ngôn ngữ:", lang);
      Alert.alert(t("language_changed"), t("language_changed_successfully"), [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Lỗi khi thay đổi ngôn ngữ:", error);
      Alert.alert(t("error"), t("language_change_failed"), [{ text: "OK" }]);
    }
  };

  const languages = [
    {
      code: "vi",
      name: "Tiếng Việt",
      flag: require("../../assets/images/vietnam-flag.png"),
      localName: "Tiếng Việt",
    },
    {
      code: "en",
      name: "English",
      flag: require("../../assets/images/usa-flag.png"),
      localName: "English",
    },
  ];

  return (
    <Layout style={styles.container as ViewStyle}>
      <StatusBar backgroundColor="#6C5CE7" barStyle="light-content" />

      <LinearGradient
        colors={["#6C5CE7", "#8A72FF"]}
        style={styles.header as ViewStyle}
      >
        <Text category="h4" style={styles.headerTitle as TextStyle}>
          {t("select_language")}
        </Text>
        <Text category="s1" style={styles.headerSubtitle as TextStyle}>
          {t("choose_your_preferred_language")}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content as ViewStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.languagesContainer as ViewStyle}>
          {languages.map((language) => (
            // Đổi sang Button với appearance="outline" để dễ nhấn hơn
            <Button
              key={language.code}
              appearance="outline"
              status={selectedLanguage === language.code ? "primary" : "basic"}
              style={[
                styles.languageButton as ViewStyle,
                selectedLanguage === language.code &&
                  (styles.selectedButton as ViewStyle),
              ]}
              onPress={() => handleLanguageChange(language.code)}
              accessoryLeft={(props) => (
                <Image
                  source={language.flag}
                  style={styles.buttonFlagImage as any}
                />
              )}
            >
              {(evaProps) => (
                <View style={styles.buttonTextContainer as ViewStyle}>
                  <Text
                    {...evaProps}
                    category="h6"
                    style={styles.buttonLanguageName as TextStyle}
                  >
                    {language.name}
                  </Text>
                  <Text
                    category="s2"
                    style={styles.buttonLanguageLocalName as TextStyle}
                  >
                    {language.localName}
                  </Text>
                </View>
              )}
            </Button>
          ))}
        </View>

        <Text category="c1" style={styles.noteText as TextStyle}>
          {t("language_will_be_applied_immediately")}
        </Text>
      </ScrollView>

      <View style={styles.footer as ViewStyle}>
        <Button
          style={styles.confirmButton as ViewStyle}
          size="large"
          onPress={() => navigation.goBack()}
        >
          {t("confirm")}
        </Button>
      </View>
    </Layout>
  );
};

const themedStyles = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  languagesContainer: {
    marginTop: 20,
  },
  languageButton: {
    marginBottom: 16,
    borderRadius: 12,
    height: 80,
    justifyContent: "flex-start",
    borderWidth: 1,
    paddingLeft: 16,
    backgroundColor: "background-basic-color-1",
  },
  selectedButton: {
    borderWidth: 2,
    borderColor: "#6C5CE7",
  },
  buttonFlagImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  buttonTextContainer: {
    alignItems: "flex-start",
  },
  buttonLanguageName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  buttonLanguageLocalName: {
    color: "text-hint-color",
  },
  noteText: {
    textAlign: "center",
    marginTop: 24,
    color: "text-hint-color",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "background-basic-color-1",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "border-basic-color-3",
  },
  confirmButton: {
    borderRadius: 8,
  },
});

export default LanguageScreen;
