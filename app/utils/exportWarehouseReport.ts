// src/utils/exportWarehouseReport.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

interface ProductStock {
  productName: string;
  currentStock: number;
  minStock: number;
  price: number;
  transactions?: any[];
}

export const exportWarehouseReport = async (productStocks: ProductStock[], translations: any) => {
  try {
    const t = translations;
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
    
    // Tạo nội dung CSV với BOM để hỗ trợ Unicode (tiếng Việt)
    const BOM = "\uFEFF";
    let csvContent = BOM;
    
    // Tiêu đề báo cáo
    csvContent += `${t("warehouse_report")}\n\n`;
    
    // Thông tin báo cáo
    csvContent += `${t("report_date")},${formattedDate}\n\n`;
    
    // Tính toán tổng thống kê
    const totalProducts = productStocks.length;
    const lowStockItems = productStocks.filter(p => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStockItems = productStocks.filter(p => p.currentStock === 0).length;
    const totalValue = productStocks.reduce((sum, p) => sum + (p.currentStock * p.price), 0);
    
    // Tiêu đề chi tiết sản phẩm
    csvContent += `${t("product_name")},${t("current_stock")},${t("min_stock")},${t("price")},${t("total_value")}\n`;
    
    // Thêm từng sản phẩm vào báo cáo
    productStocks.forEach(product => {
      const value = product.currentStock * product.price;
      csvContent += `${product.productName},${product.currentStock},${product.minStock},${product.price},${value.toFixed(2)}\n`;
    });
    
    // Thêm dòng trống
    csvContent += '\n';
    
    // Thêm tổng kết
    csvContent += `${t("summary")}\n`;
    csvContent += `${t("total_products")},${totalProducts}\n`;
    csvContent += `${t("low_stock_items")},${lowStockItems}\n`;
    csvContent += `${t("out_of_stock_items")},${outOfStockItems}\n`;
    csvContent += `${t("inventory_value")},${totalValue.toFixed(2)}\n`;
    
    // Tạo tên file với timestamp
    const timestamp = currentDate.toISOString().replace(/[:.]/g, '-');
    const fileName = `Warehouse_Report_${timestamp}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    // Ghi file vào bộ nhớ thiết bị
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
    // Kiểm tra và chia sẻ file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: t("share_warehouse_report"),
        UTI: 'public.comma-separated-values-text'
      });
      return true;
    } else {
      Alert.alert(t("sharing_not_available"), t("sharing_not_supported"));
      return false;
    }
  } catch (error) {
    console.error('Lỗi khi xuất báo cáo kho:', error);
    return false;
  }
};

// Hàm nâng cao: xuất báo cáo chi tiết dạng Excel (HTML) để hiển thị chuyên nghiệp hơn
export const exportDetailedWarehouseReport = async (productStocks: ProductStock[], translations: any) => {
  try {
    const t = translations;
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
    
    // Tính toán tổng thống kê
    const totalProducts = productStocks.length;
    const lowStockItems = productStocks.filter(p => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStockItems = productStocks.filter(p => p.currentStock === 0).length;
    const totalValue = productStocks.reduce((sum, p) => sum + (p.currentStock * p.price), 0);
    
    // Tạo HTML thay vì CSV để định dạng tốt hơn
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
          .subheader { margin-bottom: 10px; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .low-stock { color: orange; }
          .out-of-stock { color: red; }
          .summary { margin-top: 20px; border-top: 2px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">${t("warehouse_report")}</div>
        <div class="subheader">${t("report_date")}: ${formattedDate}</div>
        
        <table>
          <tr>
            <th>${t("product_name")}</th>
            <th>${t("current_stock")}</th>
            <th>${t("min_stock")}</th>
            <th>${t("price")}</th>
            <th>${t("total_value")}</th>
          </tr>
    `;
    
    // Thêm từng sản phẩm vào báo cáo
    productStocks.forEach(product => {
      const value = product.currentStock * product.price;
      const stockClass = 
        product.currentStock === 0 ? 'out-of-stock' : 
        product.currentStock <= product.minStock ? 'low-stock' : '';
      
      htmlContent += `
        <tr>
          <td>${product.productName}</td>
          <td class="${stockClass}">${product.currentStock}</td>
          <td>${product.minStock}</td>
          <td>${Intl.NumberFormat("vi-VN").format(product.price)}</td>
          <td>${Intl.NumberFormat("vi-VN").format(value)}</td>
        </tr>
      `;
    });
    
    // Thêm tổng kết vào bảng
    htmlContent += `
        <tr class="total-row">
          <td colspan="4">${t("inventory_value")}</td>
          <td>${Intl.NumberFormat("vi-VN").format(totalValue)}</td>
        </tr>
      </table>
      
      <div class="summary">
        <h3>${t("summary")}</h3>
        <table>
          <tr>
            <td>${t("total_products")}</td>
            <td>${totalProducts}</td>
          </tr>
          <tr>
            <td>${t("low_stock_items")}</td>
            <td>${lowStockItems}</td>
          </tr>
          <tr>
            <td>${t("out_of_stock_items")}</td>
            <td>${outOfStockItems}</td>
          </tr>
          <tr>
            <td>${t("inventory_value")}</td>
            <td>${Intl.NumberFormat("vi-VN").format(totalValue)}</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
    `;
    
    // Tạo tên file với timestamp
    const timestamp = currentDate.toISOString().replace(/[:.]/g, '-');
    const fileName = `Warehouse_Report_${timestamp}.html`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    // Ghi file vào bộ nhớ thiết bị
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
    // Kiểm tra và chia sẻ file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: t("share_warehouse_report"),
        UTI: 'public.html'
      });
      return true;
    } else {
      Alert.alert(t("sharing_not_available"), t("sharing_not_supported"));
      return false;
    }
  } catch (error) {
    console.error('Lỗi khi xuất báo cáo kho chi tiết:', error);
    return false;
  }
};