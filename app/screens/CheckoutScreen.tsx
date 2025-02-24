import React, { useState } from "react";
import { View, ViewStyle } from "react-native";
import { Badge, Button, Icon, ListItem, Text } from "react-native-elements";
import { StyleService, useStyleSheet } from "@ui-kitten/components";
import usePOSPrinter from "../hook/usePOSPrinter";
import { useBLE } from "../hook/BLEContext";
import PrinterScannerPicker from "../components/PrinterScannerPicker";

interface CheckoutItem {
  name: string;
  price: number;
  icon: string;
  quantity: number;
}

interface CheckoutScreenProps {
  checkoutItems: CheckoutItem[];
  onScanPress?: () => void;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  checkoutItems = [],
  onScanPress,
}) => {
  const styles = useStyleSheet(styleSheet);
  const [items, setItems] = useState<CheckoutItem[]>(checkoutItems);
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

  const getTotal = (): string => {
    return items
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2);
  };

  const incrementQuantity = (index: number): void => {
    const updatedItems = [...items];
    updatedItems[index].quantity++;
    setItems(updatedItems);
  };

  return (
    <View style={styles.container as ViewStyle}>
      {items.map((item, index) => (
        <ListItem key={index} bottomDivider>
          <Icon name={item.icon} type="font-awesome" />
          <ListItem.Content>
            <ListItem.Title>{item.name}</ListItem.Title>
            <ListItem.Subtitle>{item.price}đ</ListItem.Subtitle>
          </ListItem.Content>
          <Badge value={item.quantity} status="primary" />
          <Button
            type="clear"
            icon={<Icon name="plus" type="font-awesome" color="green" />}
            onPress={() => incrementQuantity(index)}
          />
        </ListItem>
      ))}

      <View style={styles.totalContainer as ViewStyle}>
        <Text h2>{getTotal()}đ</Text>
      </View>

      <Button title="Checkout" onPress={onScanPress} />

      <Button title="Print" disabled={isPrinting} onPress={onPrintPress} />

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
