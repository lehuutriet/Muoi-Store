import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageStyle,
  ViewStyle,
  TextStyle,
} from "react-native";
import {
  Layout,
  Text,
  Card,
  Button,
  Spinner,
  Divider,
  Icon,
  useTheme,
  StyleService,
  useStyleSheet,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { useBLE } from "../hook/BLEContext";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

type RootStackParamList = {
  PrinterScreen: undefined;
};

type PrinterScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "PrinterScreen"
>;

interface Device {
  id: string;
  name: string | null;
  txPowerLevel: number | null | undefined;
}

const PrinterScreen: React.FC<PrinterScreenProps> = ({ navigation, route }) => {
  const {
    devices,
    startScanning,
    isScanning,
    selectDevice,
    connetedDevice,
    disconnectFromDevice,
  } = useBLE();
  const styles = useStyleSheet(styleSheet);
  const theme = useTheme();
  const { t } = useTranslation();
  const [connectingDevice, setConnectingDevice] = useState({ id: "" });

  useEffect(() => {
    startScanning();
    return () => {
      // Dừng quét khi component unmount
    };
  }, []);

  const connectDevice = async (device: any) => {
    setConnectingDevice(device);
    await selectDevice(device.id);
    setConnectingDevice({ id: "" });
  };

  const renderDeviceItem = (item: Device) => {
    const isConnected = connetedDevice.some((dev) => dev.id === item.id);
    const isConnecting = connectingDevice.id === item.id;

    return (
      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        key={item.id}
      >
        <Card style={styles.deviceCard as ViewStyle}>
          <View style={styles.deviceCardContent as ViewStyle}>
            <View style={styles.deviceInfoContainer as ViewStyle}>
              <View style={styles.deviceIconContainer as ViewStyle}>
                <LinearGradient
                  colors={
                    isConnected
                      ? ["#4CAF50", "#2E7D32"]
                      : ["#64B5F6", "#1976D2"]
                  }
                  style={styles.iconGradient as ViewStyle}
                >
                  <Icon
                    style={styles.deviceIcon as ImageStyle}
                    fill="white"
                    name={
                      item.txPowerLevel === 4
                        ? "printer-outline"
                        : "smartphone-outline"
                    }
                  />
                </LinearGradient>
                {isConnected && (
                  <View style={styles.connectedIndicator as ViewStyle} />
                )}
              </View>

              <View style={styles.deviceTextContainer as ViewStyle}>
                <Text category="s1" style={styles.deviceName as TextStyle}>
                  {item.name || t("unknown_device")}
                </Text>
                <Text
                  appearance="hint"
                  category="c1"
                  style={styles.deviceId as TextStyle}
                >
                  {item.id.substring(0, 16)}...
                </Text>
              </View>
            </View>

            <View style={styles.actionContainer as ViewStyle}>
              {isConnecting ? (
                <View style={styles.loadingContainer as ViewStyle}>
                  <Spinner size="small" status="primary" />
                </View>
              ) : (
                <Button
                  size="small"
                  status={isConnected ? "danger" : "primary"}
                  appearance={isConnected ? "filled" : "outline"}
                  style={styles.connectionButton as ViewStyle}
                  onPress={() =>
                    isConnected
                      ? disconnectFromDevice(item.id)
                      : connectDevice(item)
                  }
                >
                  {isConnected ? t("disconnect") : t("connect")}
                </Button>
              )}
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  };

  const availableDevices = devices.filter(
    (device) => !connetedDevice.some((dev) => dev.id === device.id)
  );

  return (
    <Layout style={styles.container as ViewStyle}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent as ViewStyle}
      >
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.headerSection as ViewStyle}
        >
          <Text category="h6" style={styles.headerTitle as TextStyle}>
            {t("printer_setup")}
          </Text>
          <Text appearance="hint" style={styles.headerDescription as TextStyle}>
            {t("printer_decription")}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(300)}
          style={styles.section as ViewStyle}
        >
          <View style={styles.sectionHeader as ViewStyle}>
            <Text
              category="s1"
              status="primary"
              style={styles.sectionTitle as TextStyle}
            >
              {t("connected_device")}
            </Text>
            <TouchableOpacity
              style={styles.refreshButton as ViewStyle}
              onPress={startScanning}
              disabled={isScanning}
            >
              {isScanning ? (
                <Spinner size="small" status="primary" />
              ) : (
                <Icon
                  style={styles.refreshIcon as ImageStyle}
                  fill={theme["color-primary-500"]}
                  name="refresh-outline"
                />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.deviceListContainer as ViewStyle}>
            {connetedDevice.length > 0 ? (
              connetedDevice.map((device) => renderDeviceItem(device))
            ) : (
              <View style={styles.emptyStateContainer as ViewStyle}>
                <Icon
                  style={styles.emptyStateIcon as ImageStyle}
                  fill={theme["color-basic-500"]}
                  name="wifi-off-outline"
                />
                <Text
                  appearance="hint"
                  style={styles.emptyStateText as TextStyle}
                >
                  {t("no_connected_device")}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Divider style={styles.divider as ViewStyle} />

        <Animated.View
          entering={FadeInDown.delay(300).duration(300)}
          style={styles.section as ViewStyle}
        >
          <View style={styles.sectionHeader as ViewStyle}>
            <Text
              category="s1"
              status="primary"
              style={styles.sectionTitle as TextStyle}
            >
              {t("available_devices")}
            </Text>
          </View>

          <View style={styles.deviceListContainer as ViewStyle}>
            {availableDevices.length > 0 ? (
              availableDevices.map((device) => renderDeviceItem(device))
            ) : (
              <View style={styles.emptyStateContainer as ViewStyle}>
                {isScanning ? (
                  <View style={styles.scanningContainer as ViewStyle}>
                    <Spinner status="primary" />
                    <Text style={styles.scanningText as TextStyle}>
                      {t("scanning_for_devices")}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Icon
                      style={styles.emptyStateIcon as ImageStyle}
                      fill={theme["color-basic-500"]}
                      name="search-outline"
                    />
                    <Text
                      appearance="hint"
                      style={styles.emptyStateText as TextStyle}
                    >
                      {t("no_device_found")}
                    </Text>
                    <Button
                      appearance="ghost"
                      status="primary"
                      onPress={startScanning}
                      accessoryLeft={(props) => (
                        <Icon {...props} name="refresh-outline" />
                      )}
                    >
                      {t("scan_again")}
                    </Button>
                  </>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
    backgroundColor: "background-basic-color-1",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerSection: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  headerDescription: {
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontWeight: "bold",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "background-basic-color-2",
  },
  refreshIcon: {
    width: 22,
    height: 22,
  },
  divider: {
    marginVertical: 8,
  },
  deviceListContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  deviceCard: {
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: "background-basic-color-1",
    shadowColor: "text-hint-color",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deviceIconContainer: {
    position: "relative",
    marginRight: 16,
  },
  iconGradient: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceIcon: {
    width: 24,
    height: 24,
  },
  connectedIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "color-success-500",
    borderWidth: 2,
    borderColor: "background-basic-color-1",
  },
  deviceTextContainer: {
    flex: 1,
  },
  deviceName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 11,
  },
  actionContainer: {
    minWidth: 90,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  connectionButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyStateIcon: {
    width: 48,
    height: 48,
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyStateText: {
    textAlign: "center",
    marginBottom: 16,
  },
  scanningContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  scanningText: {
    marginTop: 12,
  },
});

export default PrinterScreen;
