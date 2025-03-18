// src/utils/exportWarehouseReport.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import ExcelJS from 'exceljs';
import RNFS from 'react-native-fs';
// Bỏ import ExcelJS và RNFS vì gây lỗi
// import ExcelJS from 'exceljs';
// import RNFS from 'react-native-fs';

interface ProductStock {
  productName: string;
  currentStock: number;
  minStock: number;
  price: number;
  transactions?: any[];
}

// Xóa dòng này vì 'translations' chưa được khai báo
// const t = translations;

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

// Hàm nâng cao: xuất báo cáo chi tiết dạng HTML để hiển thị chuyên nghiệp hơn
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


// Hàm xuất báo cáo thống kê định dạng HTML đẹp
export const exportFormattedStatsReport = async (data:any, translations:any) => {
  try {
    const t = translations;
    const currentDate = new Date();
    
    // Tạo HTML đẹp giống Excel
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${data.reportType}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 20px; color: #333; }
          h2 { color: #3366FF; margin-top: 30px; }
          .period { text-align: center; margin-bottom: 30px; font-style: italic; color: #555; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background-color: #FFD700; color: black; font-weight: bold; text-align: center; } /* Màu vàng đậm */
          tr:nth-child(even) { background-color: #f2f2f2; }
          .number-cell { text-align: right; }
          .total-row { font-weight: bold; background-color: #e6e6e6; }
          .section { margin-top: 30px; padding: 15px; border-radius: 8px; background-color: #f8f9fa; }
          .section-title { color: #3366FF; margin-bottom: 15px; }
          .chart-container { margin-top: 20px; }
          .product-list { list-style-type: none; padding: 0; }
          .product-item { display: flex; justify-content: space-between; padding: 5px 0; }
        </style>
      </head>
      <body>
        <h1>${data.reportType}</h1>
        <p class="period">${data.period}</p>
        
        <div class="section">
          <h2 class="section-title">${t("general_statistics")}</h2>
          <table>
            <tr>
              <th>${t("metric")}</th>
              <th>${t("value")}</th>
            </tr>
            <tr>
              <td>${t("total_revenue")}</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.totalRevenue || 0)}</td>
            </tr>
            <tr>
              <td>${t("total_profit")}</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.totalProfit || 0)}</td>
            </tr>
            <tr>
              <td>${t("total_orders")}</td>
              <td class="number-cell">${data.totalOrders || 0}</td>
            </tr>
            <tr>
              <td>${t("paid_orders")}</td>
              <td class="number-cell">${data.paidOrders || 0}</td>
            </tr>
            <tr>
              <td>${t("unpaid_orders")}</td>
              <td class="number-cell">${data.unpaidOrders || 0}</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <h2 class="section-title">${t("order_statistics")}</h2>
          <table>
            <tr>
              <th>${t("metric")}</th>
              <th>${t("value")}</th>
            </tr>
            <tr>
              <td>${t("avg_order_value")}</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.avgOrderValue || 0)}</td>
            </tr>
            <tr>
              <td>${t("max_order")}</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.maxOrderValue || 0)}</td>
            </tr>
            <tr>
              <td>${t("min_order")}</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.minOrderValue || 0)}</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <h2 class="section-title">${t("revenue_by_time_segment")}</h2>
          <table>
            <tr>
              <th>${t("time_segment")}</th>
              <th>${t("revenue")}</th>
            </tr>
            <tr>
              <td>${t("morning")} (6h-12h)</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.morningRevenue || 0)}</td>
            </tr>
            <tr>
              <td>${t("noon")} (12h-18h)</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.noonRevenue || 0)}</td>
            </tr>
            <tr>
              <td>${t("evening")} (18h-22h)</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.eveningRevenue || 0)}</td>
            </tr>
          </table>
        </div>
        
        <div class="section">
          <h2 class="section-title">${t("revenue_by_location")}</h2>
          <table>
            <tr>
              <th>${t("location")}</th>
              <th>${t("revenue")}</th>
            </tr>
            <tr>
              <td>${t("dine_in")}</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.dineInRevenue || 0)}</td>
            </tr>
            <tr>
              <td>${t("take_away")}</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.takeAwayRevenue || 0)}</td>
            </tr>
            <tr>
              <td>${t("delivery")}</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.deliveryRevenue || 0)}</td>
            </tr>
          </table>
        </div>
    `;
    
    // Thêm danh sách sản phẩm bán chạy nếu có
    if (data.topProducts && data.topProducts.length > 0) {
      htmlContent += `
        <div class="section">
          <h2 class="section-title">${t("top_selling_products")}</h2>
          <table>
            <tr>
              <th>${t("product_name")}</th>
              <th>${t("quantity_sold")}</th>
            </tr>
      `;
      
      data.topProducts.forEach((product: { text: string; value: number }, index: number) => {
        htmlContent += `
          <tr>
            <td>${index + 1}. ${product.text}</td>
            <td class="number-cell">${product.value}</td>
          </tr>
        `;
      });
      
      htmlContent += `
          </table>
        </div>
      `;
    }
    
    // Thêm doanh thu theo ngày nếu có
    if (data.revenueByDate && data.revenueByDate.length > 0) {
      htmlContent += `
        <div class="section">
          <h2 class="section-title">${t("revenue_by_date")}</h2>
          <table>
            <tr>
              <th>${t("date")}</th>
              <th>${t("revenue")}</th>
            </tr>
      `;
      
      data.revenueByDate.forEach((item: { label: string; value: number }) => {
        htmlContent += `
          <tr>
            <td>${item.label}</td>
            <td class="number-cell">${Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(item.value)}</td>
          </tr>
        `;
      });
      
      htmlContent += `
          </table>
        </div>
      `;
    }
    
    // Đóng HTML
    htmlContent += `
      </body>
      </html>
    `;
    
    // Tạo tên file với timestamp
    const timestamp = currentDate.toISOString().replace(/[:.]/g, '-');
    const fileName = `Statistics_Report_${timestamp}.html`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    // Ghi file vào bộ nhớ thiết bị
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
    // Kiểm tra và chia sẻ file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: t("share_statistics_report"),
        UTI: 'public.html'
      });
      return true;
    } else {
      Alert.alert(t("sharing_not_available"), t("sharing_not_supported"));
      return false;
    }
  } catch (error) {
    console.error('Lỗi khi xuất báo cáo thống kê:', error);
    return false;
  }
};

// Hàm xuất báo cáo trả hàng định dạng HTML đẹp
export const exportFormattedReturnReport = async (data:any, translations:any) => {
  try {
    const t = translations;
    const currentDate = new Date();
    
    // Tạo HTML đẹp giống Excel
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${data.reportType}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 20px; color: #333; }
          h2 { color: #FF3D71; margin-top: 30px; }
          .period { text-align: center; margin-bottom: 30px; font-style: italic; color: #555; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background-color: #FFD700; color: black; font-weight: bold; text-align: center; } /* Màu vàng đậm */
          tr:nth-child(even) { background-color: #f2f2f2; }
          .number-cell { text-align: right; }
          .total-row { font-weight: bold; background-color: #e6e6e6; }
          .section { margin-top: 30px; padding: 15px; border-radius: 8px; background-color: #f8f9fa; }
          .return-section { background-color: #FFF3F5; } /* Màu hồng nhạt cho phần trả hàng */
          .section-title { color: #FF3D71; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <h1>${data.reportType}</h1>
        
        <div class="section return-section">
          <h2 class="section-title">${t("return_summary")}</h2>
          <table>
            <tr>
              <th>${t("metric")}</th>
              <th>${t("value")}</th>
            </tr>
            <tr>
              <td>${t("total_returns")}</td>
              <td class="number-cell">${data.totalReturns || 0}</td>
            </tr>
            <tr>
              <td>${t("total_return_value")}</td>
              <td class="number-cell">${Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(data.totalReturnValue || 0)}</td>
            </tr>
          </table>
        </div>
    `;
    
    // Thêm danh sách lý do trả hàng nếu có
    if (data.returnReasons && data.returnReasons.length > 0) {
      htmlContent += `
        <div class="section">
          <h2 class="section-title">${t("return_reasons")}</h2>
          <table>
            <tr>
              <th>${t("reason")}</th>
              <th>${t("count")}</th>
            </tr>
      `;
      data.returnReasons.forEach((reason: { text: string; value: number }) => {
        htmlContent += `
          <tr>
            <td>${reason.text}</td>
            <td class="number-cell">${reason.value}</td>
          </tr>
        `;
      });
      
      htmlContent += `
          </table>
        </div>
      `;
    }
    
    // Thêm danh sách đơn hàng đã trả
    if (data.returnedOrders && data.returnedOrders.length > 0) {
      htmlContent += `
        <div class="section">
          <h2 class="section-title">${t("returned_orders")}</h2>
          <table>
            <tr>
              <th>${t("order_id")}</th>
              <th>${t("date")}</th>
              <th>${t("amount")}</th>
              <th>${t("reason")}</th>
            </tr>
      `;
      
      data.returnedOrders.forEach((order:any) => {
        const orderId = order.$id ? order.$id.slice(-4) : "-";
        const date = order.returnDate 
          ? new Date(order.returnDate).toLocaleDateString() 
          : (order.$createdAt ? new Date(order.$createdAt).toLocaleDateString() : "-");
        const amount = order.totalReturnAmount || order.total || 0;
        
        htmlContent += `
          <tr>
            <td>${orderId}</td>
            <td>${date}</td>
            <td class="number-cell">${Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(amount)}</td>
            <td>${order.returnReason || t("unknown_reason")}</td>
          </tr>
        `;
      });
      
      htmlContent += `
          </table>
        </div>
      `;
    }
    
    // Đóng HTML
    htmlContent += `
      </body>
      </html>
    `;
    
    // Tạo tên file với timestamp
    const timestamp = currentDate.toISOString().replace(/[:.]/g, '-');
    const fileName = `Returns_Report_${timestamp}.html`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    // Ghi file vào bộ nhớ thiết bị
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
    // Kiểm tra và chia sẻ file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: t("share_returns_report"),
        UTI: 'public.html'
      });
      return true;
    } else {
      Alert.alert(t("sharing_not_available"), t("sharing_not_supported"));
      return false;
    }
  } catch (error) {
    console.error('Lỗi khi xuất báo cáo trả hàng:', error);
    return false;
  }
};

// Tạo hàm xuất báo cáo định dạng đẹp dùng HTML thay vì ExcelJS
export const exportFormattedExcelReport = async (productStocks: ProductStock[], translations: any) => {
  try {
    const t = translations;
    const currentDate = new Date();
    
    // Tạo HTML đẹp giống Excel
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${t("warehouse_report")}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #ccc; padding: 8px; }
          th { background-color: #FFD700; color: black; font-weight: bold; text-align: center; } /* Màu vàng đậm như ảnh */
          tr:nth-child(even) { background-color: #f2f2f2; }
          .number-cell { text-align: right; }
          .total-row { font-weight: bold; background-color: #e6e6e6; }
          .summary { margin-top: 20px; }
          .summary h2 { color: #333; }
          .summary table { width: 50%; }
        </style>
      </head>
      <body>
        <h1>${t("warehouse_report")}</h1>
        <p style="text-align:center;">${t("report_date")}: ${currentDate.toLocaleDateString("vi-VN")}</p>
        
        <table>
          <thead>
            <tr>
              <th>${t("product_name")}</th>
              <th>${t("current_stock")}</th>
              <th>${t("min_stock")}</th>
              <th>${t("price")}</th>
              <th>${t("total_value")}</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Thêm dữ liệu sản phẩm
    productStocks.forEach((product) => {
      const value = product.currentStock * product.price;
      
      // Định dạng trạng thái tồn kho với màu sắc
      let stockStyle = '';
      if (product.currentStock === 0) {
        stockStyle = 'color: red; font-weight: bold;';
      } else if (product.currentStock <= product.minStock) {
        stockStyle = 'color: orange; font-weight: bold;';
      }
      
      htmlContent += `
        <tr>
          <td>${product.productName || ""}</td>
          <td class="number-cell" style="${stockStyle}">${product.currentStock || 0}</td>
          <td class="number-cell">${product.minStock || 0}</td>
          <td class="number-cell">${Intl.NumberFormat("vi-VN").format(product.price || 0)} đ</td>
          <td class="number-cell">${Intl.NumberFormat("vi-VN").format(value)} đ</td>
        </tr>
      `;
    });
    
    // Tính tổng giá trị kho
   
    const totalProducts = productStocks.length;
    const lowStockItems = productStocks.filter((p: ProductStock) => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStockItems = productStocks.filter((p: ProductStock) => p.currentStock === 0).length;
    const totalValue = productStocks.reduce((sum: number, p: ProductStock) => sum + ((p.currentStock || 0) * (p.price || 0)), 0);
    
    // Thêm dòng tổng
    htmlContent += `
          <tr class="total-row">
            <td colspan="4" style="text-align:right; font-weight:bold;">${t("inventory_value")}</td>
            <td class="number-cell">${Intl.NumberFormat("vi-VN").format(totalValue)} đ</td>
          </tr>
        </tbody>
      </table>
      
      <div class="summary">
        <h2>${t("summary")}</h2>
        <table>
          <tr>
            <td><strong>${t("total_products")}</strong></td>
            <td class="number-cell">${totalProducts}</td>
          </tr>
          <tr>
            <td><strong>${t("low_stock_items")}</strong></td>
            <td class="number-cell">${lowStockItems}</td>
          </tr>
          <tr>
            <td><strong>${t("out_of_stock_items")}</strong></td>
            <td class="number-cell">${outOfStockItems}</td>
          </tr>
          <tr>
            <td><strong>${t("inventory_value")}</strong></td>
            <td class="number-cell">${Intl.NumberFormat("vi-VN").format(totalValue)} đ</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
    `;
    
    // Lưu file HTML và chia sẻ
    const fileName = `Warehouse_Report_${currentDate.getTime()}.html`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
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
    console.error('Lỗi khi xuất báo cáo:', error);
    return false;
  }
};
