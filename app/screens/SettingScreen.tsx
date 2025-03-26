import React from "react";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Text,
  Button,
  Icon,
  IconElement,
  StyleService,
  useStyleSheet,
  Avatar,
  Divider,
  Card,
} from "@ui-kitten/components";
import {
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
  TouchableOpacity,
  Image,
  StatusBar,
  ImageStyle,
} from "react-native";
import * as RootNavigation from "../navigator/RootNavigation";
import { useAccounts } from "../hook/AppWrite";
import { useRecoilValue } from "recoil";
import { userAtom } from "../states";
import { LinearGradient } from "expo-linear-gradient";

interface SettingItemProps {
  icon: string;
  title: string;
  description?: string;
  onPress: () => void;
  status?: string;
}

interface SettingScreenProps {
  onLoggedOut?: () => void;
}

const SettingScreen: React.FC<SettingScreenProps> = ({ onLoggedOut }) => {
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const { logout } = useAccounts();
  const userInfo = useRecoilValue(userAtom);

  const SettingItem = ({
    icon,
    title,
    description,
    onPress,
    status = "basic",
  }: SettingItemProps) => (
    <TouchableOpacity
      style={styles.settingItemContainer as ViewStyle}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemContent as ViewStyle}>
        <View
          style={[
            styles.iconContainer as ViewStyle,
            status === "danger"
              ? (styles.dangerIconContainer as ViewStyle)
              : {},
          ]}
        >
          <Icon
            style={styles.itemIcon as ViewStyle}
            name={icon}
            fill={status === "danger" ? "#FF4D4F" : "#6C5CE7"}
          />
        </View>
        <View style={styles.textContainer as ViewStyle}>
          <Text
            category="s1"
            style={[
              styles.itemTitle as TextStyle,
              status === "danger" ? (styles.dangerText as TextStyle) : {},
            ]}
          >
            {title}
          </Text>
          {description && (
            <Text category="c1" style={styles.itemDescription as TextStyle}>
              {description}
            </Text>
          )}
        </View>
        <Icon
          style={styles.arrowIcon as ViewStyle}
          name="chevron-right-outline"
          fill={status === "danger" ? "#FF4D4F" : "#8F9BB3"}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <Layout style={styles.container as ViewStyle}>
      <StatusBar backgroundColor="#F7F9FC" barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView as ViewStyle}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Profile Summary */}
        <LinearGradient
          colors={["#6C5CE7", "#8A72FF"]}
          style={styles.headerGradient as ViewStyle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.profileSection as ViewStyle}>
            <Avatar
              size="giant"
              style={styles.avatar as ImageStyle}
              source={require("../../assets/images/iconshop.png")}
            />
            <View style={styles.profileInfo as ViewStyle}>
              <Text category="h5" style={styles.profileName as TextStyle}>
                {t("shop_name")}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.settingsContainer as ViewStyle}>
          {/* Account Settings */}
          <View style={styles.section as ViewStyle}>
            <Text category="h6" style={styles.sectionTitle as TextStyle}>
              {t("account_settings")}
            </Text>
            <Card style={styles.sectionCard as ViewStyle}>
              <SettingItem
                icon="person-outline"
                title={t("profile_settings")}
                description={t("manage_your_account_information")}
                onPress={() => RootNavigation.navigate("ProfileScreen")}
              />
              <Divider style={styles.itemDivider as ViewStyle} />
              <SettingItem
                icon="shield-outline"
                title={t("password_change")}
                description={t("update_your_password_for_security")}
                onPress={() => RootNavigation.navigate("PasswordScreen")}
              />
            </Card>
          </View>

          {/* Store Settings */}
          <View style={styles.section as ViewStyle}>
            <Text category="h6" style={styles.sectionTitle as TextStyle}>
              {t("store_settings")}
            </Text>
            <Card style={styles.sectionCard as ViewStyle}>
              <SettingItem
                icon="printer-outline"
                title={t("connect_ble_printer")}
                description={t("setup_your_bluetooth_printer")}
                onPress={() => RootNavigation.navigate("PrinterScreen")}
              />
            </Card>
          </View>

          {/* App Settings */}
          <View style={styles.section as ViewStyle}>
            <Text category="h6" style={styles.sectionTitle as TextStyle}>
              {t("app_settings")}
            </Text>
            <Card style={styles.sectionCard as ViewStyle}>
              <SettingItem
                icon="globe-outline"
                title={t("language")}
                description={t("change_application_language")}
                onPress={() => RootNavigation.navigate("LanguageScreen")}
              />
            </Card>
          </View>

          {/* Logout Button */}
          <View style={styles.section as ViewStyle}>
            <Card style={styles.sectionCard as ViewStyle}>
              <SettingItem
                icon="log-out-outline"
                title={t("logout")}
                description={t("sign_out_from_your_account")}
                status="danger"
                onPress={async () => {
                  try {
                    await logout();
                    if (onLoggedOut) {
                      onLoggedOut();
                    }
                  } catch (error) {
                    console.error("Logout error:", error);
                  }
                }}
              />
            </Card>
          </View>
        </View>

        {/* Footer with app version */}
        <View style={styles.footer as ViewStyle}>
          <Text category="c1" style={styles.versionText as TextStyle}>
            {t("version")} 1.0.0
          </Text>
        </View>
      </ScrollView>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    marginRight: 16,
    borderWidth: 2,
    borderColor: "white",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: "white",
    fontWeight: "bold",
    marginBottom: 4,
  },
  profileEmail: {
    color: "rgba(255,255,255,0.8)",
  },
  settingsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    marginLeft: 8,
    fontWeight: "600",
    color: "text-hint-color",
  },
  sectionCard: {
    borderRadius: 12,
    backgroundColor: "background-basic-color-1",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 0,
  },
  settingItemContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(108, 92, 231, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  dangerIconContainer: {
    backgroundColor: "rgba(255, 77, 79, 0.1)",
  } as ViewStyle,
  itemIcon: {
    width: 22,
    height: 22,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: "600",
    marginBottom: 2,
  },
  dangerText: {
    color: "color-danger-500",
  } as ViewStyle,
  itemDescription: {
    color: "text-hint-color",
  },
  arrowIcon: {
    width: 20,
    height: 20,
  },
  itemDivider: {
    marginHorizontal: 16,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  versionText: {
    color: "text-hint-color",
  },
});

export default SettingScreen;
