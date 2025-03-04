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
} from "@ui-kitten/components";
import { ScrollView, TextStyle, View, ViewStyle } from "react-native";
import * as RootNavigation from "../navigator/RootNavigation";
import { useAccounts } from "../hook/AppWrite";
interface SettingItemProps {
  icon: string;
  title: string;
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

  const SettingItem = ({
    icon,
    title,
    onPress,
    status = "basic",
  }: SettingItemProps) => (
    <Button
      style={styles.settingItem as ViewStyle}
      appearance="ghost"
      status={status}
      accessoryLeft={(props): IconElement => <Icon {...props} name={icon} />}
      onPress={onPress}
    >
      {title}
    </Button>
  );

  return (
    <ScrollView style={styles.container as ViewStyle}>
      <Divider />

      {/* Account Settings */}
      <Layout style={styles.section as ViewStyle}>
        <Text category="h6" style={styles.sectionTitle as TextStyle}>
          {t("account_settings")}
        </Text>
        <SettingItem
          icon="person"
          title={t("profile_settings")}
          onPress={() => RootNavigation.navigate("ProfileScreen")}
        />
        <SettingItem
          icon="shield"
          title={t("password_change")}
          onPress={() => RootNavigation.navigate("PasswordScreen")}
        />
      </Layout>

      {/* Store Settings */}
      <Layout style={styles.section as ViewStyle}>
        <Text category="h6" style={styles.sectionTitle as TextStyle}>
          {t("store_settings")}
        </Text>
        <SettingItem
          icon="printer"
          title={t("connect_ble_printer")}
          onPress={() => RootNavigation.navigate("PrinterScreen")}
        />
        <SettingItem
          icon="archive"
          title={t("warehouse_management")}
          onPress={() => RootNavigation.navigate("WarehouseScreen")}
        />
      </Layout>

      {/* App Settings */}
      <Layout style={styles.section as ViewStyle}>
        <Text category="h6" style={styles.sectionTitle as TextStyle}>
          {t("app_settings")}
        </Text>
        <SettingItem
          icon="globe"
          title={t("language")}
          onPress={() => RootNavigation.navigate("LanguageScreen")}
        />
        {/* <SettingItem
          icon="bell"
          title={t("notifications")}
          onPress={() => RootNavigation.navigate("NotificationsScreen")}
        /> */}
      </Layout>

      {/* Logout Button */}
      <Layout style={styles.logoutSection as ViewStyle}>
        <SettingItem
          icon="log-out"
          title={t("logout")}
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
      </Layout>
    </ScrollView>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  },
  profileSection: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    color: "text-hint-color",
  },
  settingItem: {
    justifyContent: "flex-start",
    marginVertical: 4,
  },
  logoutSection: {
    padding: 16,
    marginTop: 16,
  },
});

export default SettingScreen;
