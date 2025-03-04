// import React from "react";
// import { Alert, View, ViewStyle, TextStyle } from "react-native";
// import { Button, Icon, Text, useTheme } from "@ui-kitten/components";
// import RNBlobUtil from "react-native-blob-util";
// import XLSX from "xlsx";
// import Share from "react-native-share";
// import RNHTMLtoPDF from "react-native-html-to-pdf";
// import { PermissionsAndroid, Platform } from "react-native";
// import { useTranslation } from "react-i18next";

// // Định nghĩa interface cho props
// interface ReportExporterProps {
//   timeFrame: string;
//   data: {
//     totalRevenue: number;
//     totalProfit: number;
//     totalOrders: number;
//     paidOrders: number;
//     unpaidOrders: number;
//     avgOrderValue: number;
//     maxOrderValue: number;
//     minOrderValue: number;
//     morningRevenue: number;
//     noonRevenue: number;
//     eveningRevenue: number;
//     dineInRevenue: number;
//     takeAwayRevenue: number;
//     deliveryRevenue: number;
//     topProducts: Array<{ text: string; value: number; color?: string }>;
//   };
//   onExportStart: () => void;
//   onExportEnd: () => void;
//   style?: ViewStyle;
// }

// const ReportExporter: React.FC<ReportExporterProps> = ({
//   timeFrame,
//   data,
//   onExportStart,
//   onExportEnd,
//   style,
// }) => {
//   const { t } = useTranslation();
//   const theme = useTheme();

//   const requestStoragePermission = async () => {
//     if (Platform.OS === "android") {
//       try {
//         const granted = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//           {
//             title: t("permission_required"),
//             message: t("storage_permission_message"),
//             buttonNeutral: t("ask_later"),
//             buttonNegative: t("deny"),
//             buttonPositive: t("accept"),
//           }
//         );
//         return granted === PermissionsAndroid.RESULTS.GRANTED;
//       } catch (err) {
//         console.error(err);
//         return false;
//       }
//     } else {
//       return true; // iOS không cần xin quyền runtime
//     }
//   };

//   const handleExport = async (format: "excel" | "pdf") => {
//     const hasPermission = await requestStoragePermission();
//     if (hasPermission) {
//       exportReport(format);
//     } else {
//       Alert.alert(t("permission_denied"), t("storage_permission_required"));
//     }
//   };

//   const exportReport = async (format: "excel" | "pdf") => {
//     try {
//       onExportStart();

//       let fileName = "";
//       let timeFrameText = "";

//       // Tạo tên file dựa vào thời gian
//       const now = new Date();
//       if (timeFrame === "day") {
//         fileName = `Báo_cáo_ngày_${now.getDate()}_${
//           now.getMonth() + 1
//         }_${now.getFullYear()}`;
//         timeFrameText = t("day_report", {
//           date: `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
//         });
//       } else if (timeFrame === "week") {
//         fileName = `Báo_cáo_tuần_${now.getDate()}_${
//           now.getMonth() + 1
//         }_${now.getFullYear()}`;
//         timeFrameText = t("week_report", {
//           date: `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
//         });
//       } else {
//         fileName = `Báo_cáo_tháng_${now.getMonth() + 1}_${now.getFullYear()}`;
//         timeFrameText = t("month_report", {
//           month: now.getMonth() + 1,
//           year: now.getFullYear(),
//         });
//       }

//       if (format === "excel") {
//         await exportToExcel(fileName, timeFrameText);
//       } else {
//         await exportToPDF(fileName, timeFrameText);
//       }

//       onExportEnd();
//     } catch (error) {
//       console.error("Lỗi khi xuất báo cáo:", error);
//       onExportEnd();
//       Alert.alert(t("error"), t("export_error_message"));
//     }
//   };

//   const exportToExcel = async (fileName: string, timeFrameText: string) => {
//     // Tạo dữ liệu cho excel
//     const workSheet = XLSX.utils.aoa_to_sheet([
//       [timeFrameText],
//       [""],
//       [t("revenue_overview")],
//       [
//         t("total_revenue") + ":",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.totalRevenue),
//       ],
//       [
//         t("total_profit") + ":",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.totalProfit),
//       ],
//       [t("total_orders") + ":", data.totalOrders],
//       [t("paid_orders") + ":", data.paidOrders],
//       [t("unpaid_orders") + ":", data.unpaidOrders],
//       [
//         t("avg_order_value") + ":",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.avgOrderValue),
//       ],
//       [
//         t("max_order_value") + ":",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.maxOrderValue),
//       ],
//       [
//         t("min_order_value") + ":",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.minOrderValue),
//       ],
//       [""],
//       [t("revenue_by_time")],
//       [
//         t("morning") + " (6h-12h):",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.morningRevenue),
//       ],
//       [
//         t("noon") + " (12h-18h):",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.noonRevenue),
//       ],
//       [
//         t("evening") + " (18h-22h):",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.eveningRevenue),
//       ],
//       [""],
//       [t("revenue_by_location")],
//       [
//         t("dine_in") + ":",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.dineInRevenue),
//       ],
//       [
//         t("take_away") + ":",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.takeAwayRevenue),
//       ],
//       [
//         t("delivery") + ":",
//         Intl.NumberFormat("vi-VN", {
//           style: "currency",
//           currency: "VND",
//         }).format(data.deliveryRevenue),
//       ],
//       [""],
//       [t("top_products")],
//     ]);

//     // Thêm danh sách top sản phẩm
//     data.topProducts.forEach((product, index) => {
//       XLSX.utils.sheet_add_aoa(
//         workSheet,
//         [[`${index + 1}. ${product.text}: ${product.value} ${t("products")}`]],
//         { origin: -1 }
//       );
//     });

//     const workBook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workBook, workSheet, t("revenue_report"));

//     const wbout = XLSX.write(workBook, { type: "binary", bookType: "xlsx" });

//     // Chuyển đổi thành ArrayBuffer
//     const buffer = new ArrayBuffer(wbout.length);
//     const view = new Uint8Array(buffer);
//     for (let i = 0; i < wbout.length; i++) {
//       view[i] = wbout.charCodeAt(i) & 0xff;
//     }

//     // Lưu file
//     const fileDir = RNBlobUtil.fs.dirs.DownloadDir;
//     const filePath = `${fileDir}/${fileName}.xlsx`;
//     const uint8arr = new Uint8Array(buffer);
//     const base64Data = Buffer.from(uint8arr).toString("base64");
//     await RNBlobUtil.fs.writeFile(filePath, base64Data, "base64");

//     // Chia sẻ file
//     await Share.open({
//       title: t("share_report"),
//       url: `file://${filePath}`,
//       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     });

//     Alert.alert(t("success"), t("excel_export_success"));
//   };

//   const exportToPDF = async (fileName: string, timeFrameText: string) => {
//     // Tạo nội dung HTML cho PDF
//     let htmlContent = `
//       <html>
//         <head>
//           <style>
//             body { font-family: 'Helvetica'; padding: 20px; }
//             h1 { color: #3366FF; text-align: center; }
//             h2 { color: #3366FF; margin-top: 20px; }
//             .section { margin-bottom: 20px; }
//             table { width: 100%; border-collapse: collapse; }
//             th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
//             th { background-color: #f2f2f2; }
//           </style>
//         </head>
//         <body>
//           <h1>${timeFrameText}</h1>

//           <div class="section">
//             <h2>${t("revenue_overview")}</h2>
//             <table>
//               <tr><td>${t("total_revenue")}</td><td>${Intl.NumberFormat(
//       "vi-VN",
//       { style: "currency", currency: "VND" }
//     ).format(data.totalRevenue)}</td></tr>
//               <tr><td>${t("total_profit")}</td><td>${Intl.NumberFormat(
//       "vi-VN",
//       { style: "currency", currency: "VND" }
//     ).format(data.totalProfit)}</td></tr>
//               <tr><td>${t("total_orders")}</td><td>${data.totalOrders}</td></tr>
//               <tr><td>${t("paid_orders")}</td><td>${data.paidOrders}</td></tr>
//               <tr><td>${t("unpaid_orders")}</td><td>${
//       data.unpaidOrders
//     }</td></tr>
//               <tr><td>${t("avg_order_value")}</td><td>${Intl.NumberFormat(
//       "vi-VN",
//       { style: "currency", currency: "VND" }
//     ).format(data.avgOrderValue)}</td></tr>
//               <tr><td>${t("max_order_value")}</td><td>${Intl.NumberFormat(
//       "vi-VN",
//       { style: "currency", currency: "VND" }
//     ).format(data.maxOrderValue)}</td></tr>
//               <tr><td>${t("min_order_value")}</td><td>${Intl.NumberFormat(
//       "vi-VN",
//       { style: "currency", currency: "VND" }
//     ).format(data.minOrderValue)}</td></tr>
//             </table>
//           </div>

//           <div class="section">
//             <h2>${t("revenue_by_time")}</h2>
//             <table>
//               <tr><td>${t("morning")} (6h-12h)</td><td>${Intl.NumberFormat(
//       "vi-VN",
//       { style: "currency", currency: "VND" }
//     ).format(data.morningRevenue)}</td></tr>
//               <tr><td>${t("noon")} (12h-18h)</td><td>${Intl.NumberFormat(
//       "vi-VN",
//       { style: "currency", currency: "VND" }
//     ).format(data.noonRevenue)}</td></tr>
//               <tr><td>${t("evening")} (18h-22h)</td><td>${Intl.NumberFormat(
//       "vi-VN",
//       { style: "currency", currency: "VND" }
//     ).format(data.eveningRevenue)}</td></tr>
//             </table>
//           </div>

//           <div class="section">
//             <h2>${t("revenue_by_location")}</h2>
//             <table>
//               <tr><td>${t("dine_in")}</td><td>${Intl.NumberFormat("vi-VN", {
//       style: "currency",
//       currency: "VND",
//     }).format(data.dineInRevenue)}</td></tr>
//               <tr><td>${t("take_away")}</td><td>${Intl.NumberFormat("vi-VN", {
//       style: "currency",
//       currency: "VND",
//     }).format(data.takeAwayRevenue)}</td></tr>
//               <tr><td>${t("delivery")}</td><td>${Intl.NumberFormat("vi-VN", {
//       style: "currency",
//       currency: "VND",
//     }).format(data.deliveryRevenue)}</td></tr>
//             </table>
//           </div>

//           <div class="section">
//             <h2>${t("top_products")}</h2>
//             <table>
//               <tr><th>STT</th><th>${t("product_name")}</th><th>${t(
//       "quantity"
//     )}</th></tr>
//     `;

//     // Thêm danh sách top sản phẩm
//     data.topProducts.forEach((product, index) => {
//       htmlContent += `<tr><td>${index + 1}</td><td>${product.text}</td><td>${
//         product.value
//       }</td></tr>`;
//     });

//     htmlContent += `
//             </table>
//           </div>
//         </body>
//       </html>
//     `;

//     const options = {
//       html: htmlContent,
//       fileName: fileName,
//       directory: "Documents",
//     };

//     const file = await RNHTMLtoPDF.convert(options);

//     // Chia sẻ file PDF
//     await Share.open({
//       title: t("share_report"),
//       url: `file://${file.filePath}`,
//       type: "application/pdf",
//     });

//     Alert.alert(t("success"), t("pdf_export_success"));
//   };

//   return (
//     <View
//       style={[
//         {
//           backgroundColor: theme["background-basic-color-1"],
//           borderRadius: 8,
//           padding: 8,
//           flexDirection: "row",
//           justifyContent: "space-between",
//           marginHorizontal: 16,
//           marginVertical: 8,
//           elevation: 3,
//           shadowColor: "#000",
//           shadowOffset: { width: 0, height: 2 },
//           shadowOpacity: 0.1,
//           shadowRadius: 2,
//         },
//         style,
//       ]}
//     >
//       <Button
//         size="small"
//         status="primary"
//         style={{ flex: 1, marginRight: 4 }}
//         accessoryLeft={(props) => <Icon {...props} name="file-text-outline" />}
//         onPress={() => handleExport("excel")}
//       >
//         Excel
//       </Button>
//       <Button
//         size="small"
//         status="danger"
//         style={{ flex: 1, marginLeft: 4 }}
//         accessoryLeft={(props) => <Icon {...props} name="file-outline" />}
//         onPress={() => handleExport("pdf")}
//       >
//         PDF
//       </Button>
//     </View>
//   );
// };

// export default ReportExporter;
