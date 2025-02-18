import React, { useState, useEffect, useRef } from "react";
import {
  List,
  Card,
  Button,
  Icon,
  Layout,
  StyleService,
  useStyleSheet,
  Spinner,
  Text,
} from "@ui-kitten/components";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useBLE } from "../hook/BLEContext";

const PrinterScreen = ({ route, navigation }) => {
  const {
    manager,
    device,
    printService,
    devices,
    startScanning,
    stopScanning,
    isScanning,
    selectDevice,
    connetedDevice,
    disconnectFromDevice,
    printContent,
  } = useBLE();
  const styles = useStyleSheet(styleSheet);
  const { t } = useTranslation();
  const [connectingDevice, setConnectingDevice] = useState({ id: "" });

  useEffect(() => {
    startScanning();
  }, []);

  const connectDevice = async (device) => {
    setConnectingDevice(device);
    await selectDevice(device.id);
    setConnectingDevice({ id: "" });
  };

  const renderItem = (info, isSelectedDevice): React.ReactElement => (
    <Card style={styles.card}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Icon
            style={[styles.btnIcon]}
            fill="blue"
            name={info.item.txPowerLevel === 4 ? "printer" : "smartphone"}
          />
          <View style={{ paddingLeft: 20 }}>
            <Text>{info.item.name || "Unknown Device"}</Text>
            <Text>{info.item.id}</Text>
          </View>
        </View>
        <View>
          {!isSelectedDevice ? (
            connectingDevice.id === info.item.id ? (
              <Spinner />
            ) : (
              <Button size="small" onPress={() => connectDevice(info.item)}>
                {t("connect")}
              </Button>
            )
          ) : (
            <Button
              size="small"
              status="danger"
              onPress={() => disconnectFromDevice(info.item.id)}
            >
              {t("disconnect")}
            </Button>
          )}
        </View>
      </View>
    </Card>
  );
  return (
    <Layout level="1" style={styles.mainLayout}>
      <View style={{ paddingTop: 16, paddingLeft: 16, paddingRight: 16 }}>
        <Text>{t("printer_decription")}</Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          width: "100%",
          paddingTop: 16,
          paddingLeft: 16,
          paddingRight: 16,
          justifyContent: "space-between",
          alignItems: "center",
          height: 70,
        }}
      >
        <Text category="s1" status="primary" style={{ fontWeight: "bold" }}>
          {t("connected_device")}
        </Text>
        {isScanning ? (
          <Spinner size="small" />
        ) : (
          <Button
            style={{ backgroundColor: "transparent", borderWidth: 0 }}
            appearance="outline"
            accessoryRight={() => (
              <Icon style={styles.btnIcon} fill="blue" name="sync" />
            )}
            onPress={startScanning}
          />
        )}
      </View>
      <Layout level="1" style={styles.listLayout}>
        {connetedDevice.length > 0 ? (
          <List
            style={{ backgroundColor: "transparent" }}
            data={connetedDevice}
            renderItem={(props) => renderItem(props, true)}
            keyExtractor={(item) => item.id}
            numColumns={1}
          />
        ) : (
          <Text>{t("no_connected_device")}</Text>
        )}
      </Layout>
      <View
        style={{
          flexDirection: "row",
          width: "100%",
          padding: 16,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text category="s1" status="primary" style={{ fontWeight: "bold" }}>
          {t("device")}
        </Text>
      </View>
      <Layout level="1" style={styles.listLayout}>
        {devices.length > 0 ? (
          <List
            style={{ backgroundColor: "transparent" }}
            // contentContainerStyle={styles.listContainer}
            data={devices.filter(
              (device) =>
                connetedDevice.findIndex((item) => device.id === item.id) < 0
            )}
            renderItem={(props) => renderItem(props, false)}
            keyExtractor={(item) => item.id}
            numColumns={1}
          />
        ) : (
          <Text>{t("no_device_found")}</Text>
        )}
      </Layout>
    </Layout>
  );
};

const styleSheet = StyleService.create({
  mainLayout: {
    flex: 1,
  },
  listLayout: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  card: {
    backgroundColor: "transparent",
    marginTop: 5,
    marginBottom: 5,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    // justifyContent: "space-between",
  },
  btnIcon: {
    width: 20,
    height: 20,
  },
});

export default PrinterScreen;
