import React from "react";
import {
  View,
  Button,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { Device } from "react-native-ble-plx";
import { useBLE } from "../hook/BLEContext";

function PrinterScannerPicker() {
  const { devices, startScanning, stopScanning, selectDevice, isScanning } =
    useBLE();

  const toggleScanning = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  const selectScanningDevice = (id: string) => () => {
    stopScanning();
    selectDevice(id);
  };

  const renderItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={selectScanningDevice(item.id)}
    >
      <Text style={styles.itemText}>{item.name || "Unnamed Device"}</Text>
      <Text style={styles.itemText}>{item.id}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Button
        title={isScanning ? "Stop Scanning" : "Start Scanning"}
        onPress={toggleScanning}
      />
      <FlatList<Device>
        data={devices}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  item: {
    backgroundColor: "#f9c2ff",
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  itemText: {
    fontSize: 16,
  },
});

export default PrinterScannerPicker;
