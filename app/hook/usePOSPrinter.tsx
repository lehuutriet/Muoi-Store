import { useState } from "react";
import { useBLE } from "./BLEContext";
import StringManipulator from "./StringManipulator";

const usePOSPrinter = () => {
  const [isPrinting, setIsPrinting] = useState(false);
  const { printContent } = useBLE();

  const printBill = async (items: any) => {
    if (isPrinting) return;
    setIsPrinting(true);

    const stringManipulator = new StringManipulator();

    // stringManipulator.center();
    // stringManipulator.bold(true);
    // stringManipulator.size(1);
    // stringManipulator.add("MUOI STORE\n\n");
    // stringManipulator.bold(false);
    // stringManipulator.size(1);
    // stringManipulator.left();
    // stringManipulator.add("--------------------------------\n");
    // stringManipulator.add("Item               Price   Qty\n");
    // stringManipulator.add("--------------------------------\n");

    // let total = 0;
    // for (const item of items) {
    //   const { name, price, quantity } = item;
    //   const itemPrice = price * quantity;
    //   total += itemPrice;
    //   stringManipulator.text(`${name}          `, "utf8");
    //   stringManipulator.text(`$${price.toFixed(2)}  `, "utf8");
    //   stringManipulator.text(`${quantity}\n`, "utf8");
    // }

    // stringManipulator.add("--------------------------------\n");
    // stringManipulator.right();
    // stringManipulator.text(`Total: $${total.toFixed(2)}\n\n`, "utf8");
    // stringManipulator.barcode("1234567890", "CODE128");
    // stringManipulator.cut();

    // stringManipulator.center();
    // stringManipulator.size(1, 1);
    // stringManipulator.text("Bill Receipt");
    // stringManipulator.size(0, 0);
    // stringManipulator.left();
    // stringManipulator.text("Customer: Lê Văn A");
    // stringManipulator.text("Items:");
    // stringManipulator.text("1. Sữa chua trân châu - 30,000đ");
    // stringManipulator.text("2. Bánh mì thịt nướng - 25,000đ");
    // stringManipulator.text("3. Trà sữa trân châu đường đen - 35,000đ");
    // stringManipulator.text("Total: 90,000đ");
    // stringManipulator.text("Payment: Cash");
    // stringManipulator.text("Thanks for coming!");
    // stringManipulator.cut();

    stringManipulator.center();
    stringManipulator.font("A");
    stringManipulator.size("\x16");
    stringManipulator.text("MUOI STORE\n\n\n");
    stringManipulator.font("B");
    stringManipulator.size("\x10");
    stringManipulator.text("Customer: Pham Chu Minh Minh\n\n");
    stringManipulator.size("\x01");
    stringManipulator.left();
    stringManipulator.text("Items:\n\n");
    stringManipulator.text("1. Sua chua tran chau - 30,000d\n");
    stringManipulator.text("2. Banh mi thit nuong - 25,000d\n");
    stringManipulator.text("3. Tra sua tran chau duong den - 35,000d\n");
    stringManipulator.text("4. Sua chua mat lanh - 75,000d\n");
    stringManipulator.text("Mô tả: Bánh mì thơm ngon");
    stringManipulator.text("=====\n\n\n");
    stringManipulator.right();
    stringManipulator.size("\x11");
    stringManipulator.text("Total: 90,000d\n\n");
    stringManipulator.size("\x00");
    stringManipulator.text("Payment: Cash\n\n");
    stringManipulator.center();
    stringManipulator.text("Thanks for coming!\n\n\n\n");

    try {
      const printingData = stringManipulator.flush();
      console.log("Printing...", printingData);
      await printContent(printingData);
    } catch (error) {
      console.error("Failed to print:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  return { isPrinting, print: printBill };
};

export default usePOSPrinter;
