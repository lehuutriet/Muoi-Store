import { Badge, Button, Icon, ListItem, Text } from "react-native-elements";
import { ScrollView, StyleSheet, View } from "react-native";
import usePOSPrinter from "../hook/usePOSPrinter";
import { useBLE } from "../hook/BLEContext";
import StringManipulator from "../hook/StringManipulator";
import PrinterScannerPicker from "../components/PrinterScannerPicker";
import { useState } from "react";
import { StyleService, useStyleSheet } from "@ui-kitten/components";

const CheckoutScreen = ({ checkoutItems, onScanPress = null }) => {
  const styles = useStyleSheet(styleSheet);
  const [items, setItems] = useState([]);
  const { printService } = useBLE();
  const { isPrinting, print } = usePOSPrinter();

  const onPrintPress = () => {
    if (printService) {
      print([
        {
          name: "Bút Lông Bảng (Xanh)",
          price: 15700,
          icon: "shopping-basket",
          quantity: 2,
        },
        {
          name: "Tăm Bông",
          price: 20000,
          icon: "shopping-basket",
          quantity: 3,
        },
      ]);
    } else {
      console.error("Device, service, or characteristic not available");
    }
  };

  const getTotal = () => {
    return checkoutItems
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2);
  };

  const incrementQuantity = (index) => {
    const updatedItems = [...checkoutItems];
    updatedItems[index].quantity++;
    setItems(updatedItems);
  };

  return (
    <View style={styles.container}>
      {checkoutItems.map((item, index) => (
        <ListItem key={index} bottomDivider>
          <Icon name={item.icon} type="font-awesome" />
          <ListItem.Content>
            <ListItem.Title>{item.name}</ListItem.Title>
            <ListItem.Subtitle>${item.price}</ListItem.Subtitle>
          </ListItem.Content>
          <Badge value={item.quantity} status="primary" />
          <Button
            type="clear"
            icon={<Icon name="plus" type="font-awesome" color="green" />}
            onPress={() => incrementQuantity(index)}
          />
        </ListItem>
      ))}
      <View style={styles.totalContainer}>
        <Text h2>{getTotal()} đ</Text>
      </View>
      <Button title="Checkout" onPress={onScanPress} />
      {/* <View style={styles.totalContainer}>
        <Text h2>{JSON.stringify(device, null, 2)} đ</Text>
      </View> */}
      <Button
        title="Print"
        // title={
        //   `Print using ` + (device.current ? device.current.name : "no device")
        // }
        disabled={isPrinting}
        onPress={onPrintPress}
      />
      <PrinterScannerPicker />
    </View>
  );
};

const styleSheet = StyleService.create({
  container: {
    flex: 1,
  },
  totalContainer: {
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
  },
});

export default CheckoutScreen;
