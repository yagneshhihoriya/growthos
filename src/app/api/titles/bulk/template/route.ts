import { NextResponse } from "next/server";

export async function GET() {
  const csv = [
    "product_name,category,price,colors,sizes,fabric,current_title",
    '"Cotton Kurti","Kurti",499,"Red,Blue,Green","S,M,L,XL","Cotton","Women Cotton Kurti"',
    '"boAt Airdopes 141","Headphones",1299,"Black,Blue","","","boAt Airdopes 141 Bluetooth"',
    '"Nivea Face Cream","Face Cream",185,"","","","Nivea Daily Essentials"',
    '"Wooden Dining Chair","Chair",2499,"Brown,Black","","Teak Wood","Modern Dining Chair"',
  ].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="growthOS_title_template.csv"',
    },
  });
}
