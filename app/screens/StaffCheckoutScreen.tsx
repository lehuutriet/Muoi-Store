import { StyleSheet, View } from "react-native";

import CheckoutScreen from "./CheckoutScreen";
import ScanScreen from "./ScanScreen";
import React from "react";
import { useState } from "react";
import { Button, StyleService, useStyleSheet } from "@ui-kitten/components";

const StaffCheckoutScreen = ({ navigation }) => {
  const styles = useStyleSheet(styleSheet);
  const [items, setItems] = useState([]);
  const sampleProducts = {
    8935001810087: {
      name: "Bút Lông Bảng (Xanh)",
      price: 15700,
      icon: "shopping-basket",
      quantity: 1,
    },
    8936009640140: {
      name: "Tăm Bông",
      price: 20000,
      icon: "shopping-basket",
      quantity: 1,
    },
    "001": {
      name: "Product 1",
      price: 10.99,
      icon: "shopping-basket",
      quantity: 1,
    },
    "002": {
      name: "Product 2",
      price: 19.99,
      icon: "shopping-basket",
      quantity: 1,
    },
    "003": {
      name: "Product 3",
      price: 29.99,
      icon: "shopping-basket",
      quantity: 1,
    },
  };

  // const sampleProducts = {
  //   "001": { name: "Product 1", price: 10.99 },
  //   "002": { name: "Product 2", price: 19.99 },
  //   "003": { name: "Product 3", price: 29.99 },
  // };

  const handleBarcodeScanned = (barcode) => {
    console.log(`Barcode is: ${barcode}`);
    if (barcode && sampleProducts[barcode]) {
      setItems((prevItems) => [...prevItems, sampleProducts[barcode]]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.scanContainer}>
        <ScanScreen onBarcodeScanned={handleBarcodeScanned} />
      </View>
      <View style={styles.checkoutContainer}>
        <CheckoutScreen checkoutItems={items} />
      </View>
      <Button onPress={() => navigation.navigate("Print")}>Print</Button>
    </View>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
  },
  scanContainer: {
    flex: 0.3,
  },
  checkoutContainer: {
    flex: 0.7,
  },
});

export default StaffCheckoutScreen;
