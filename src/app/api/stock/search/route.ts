import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonResponse, errorResponse } from "@/lib/fetch";
import type { StockSearchResult } from "@/lib/types";

const querySchema = z.object({
  q: z.string().min(1, "Search query is required").max(20),
});

// Popular Vietnamese stock tickers: VN30 + VN100 + notable others
const STOCK_DATABASE: StockSearchResult[] = [
  // VN30 components
  { ticker: "VCB", name: "Ngan hang TMCP Ngoai thuong Viet Nam", exchange: "HOSE" },
  { ticker: "VIC", name: "Tap doan Vingroup", exchange: "HOSE" },
  { ticker: "VHM", name: "CTCP Vinhomes", exchange: "HOSE" },
  { ticker: "VNM", name: "CTCP Sua Viet Nam (Vinamilk)", exchange: "HOSE" },
  { ticker: "VRE", name: "CTCP Vincom Retail", exchange: "HOSE" },
  { ticker: "MSN", name: "CTCP Tap doan Ma San", exchange: "HOSE" },
  { ticker: "FPT", name: "CTCP FPT", exchange: "HOSE" },
  { ticker: "MWG", name: "CTCP Dau tu The gioi Di dong", exchange: "HOSE" },
  { ticker: "HPG", name: "CTCP Tap doan Hoa Phat", exchange: "HOSE" },
  { ticker: "GAS", name: "Tong CTCP Khi Viet Nam (PV Gas)", exchange: "HOSE" },
  { ticker: "PLX", name: "Tap doan Xang dau Viet Nam (Petrolimex)", exchange: "HOSE" },
  { ticker: "SAB", name: "Tong CTCP Bia Ruou Nuoc Giai khat Sai Gon", exchange: "HOSE" },
  { ticker: "BID", name: "Ngan hang TMCP Dau tu va Phat trien Viet Nam", exchange: "HOSE" },
  { ticker: "CTG", name: "Ngan hang TMCP Cong thuong Viet Nam (VietinBank)", exchange: "HOSE" },
  { ticker: "TCB", name: "Ngan hang TMCP Ky Thuong Viet Nam (Techcombank)", exchange: "HOSE" },
  { ticker: "VPB", name: "Ngan hang TMCP Viet Nam Thinh Vuong (VPBank)", exchange: "HOSE" },
  { ticker: "MBB", name: "Ngan hang TMCP Quan doi (MBBank)", exchange: "HOSE" },
  { ticker: "ACB", name: "Ngan hang TMCP A Chau (ACB)", exchange: "HOSE" },
  { ticker: "TPB", name: "Ngan hang TMCP Tien Phong (TPBank)", exchange: "HOSE" },
  { ticker: "HDB", name: "Ngan hang TMCP Phat trien TP.HCM (HDBank)", exchange: "HOSE" },
  { ticker: "STB", name: "Ngan hang TMCP Sai Gon Thuong Tin (Sacombank)", exchange: "HOSE" },
  { ticker: "SSI", name: "CTCP Chung khoan SSI", exchange: "HOSE" },
  { ticker: "VCI", name: "CTCP Chung khoan Viet", exchange: "HOSE" },
  { ticker: "HCM", name: "CTCP Chung khoan TP.HCM (HSC)", exchange: "HOSE" },
  { ticker: "VJC", name: "CTCP Hang khong Vietjet (Vietjet Air)", exchange: "HOSE" },
  { ticker: "VRE", name: "CTCP Vincom Retail", exchange: "HOSE" },
  { ticker: "NVL", name: "CTCP Tap doan Dia oc No Va (Novaland)", exchange: "HOSE" },
  { ticker: "POW", name: "Tong CTCP Dien luc Dau khi Viet Nam", exchange: "HOSE" },
  { ticker: "BVH", name: "Tap doan Bao Viet", exchange: "HOSE" },
  { ticker: "PNJ", name: "CTCP Vang bac Da quy Phu Nhuan", exchange: "HOSE" },

  // HNX notable stocks
  { ticker: "SHB", name: "Ngan hang TMCP Sai Gon - Ha Noi", exchange: "HNX" },
  { ticker: "SHS", name: "CTCP Chung khoan Sai Gon - Ha Noi", exchange: "HNX" },
  { ticker: "VCS", name: "CTCP VICOSTONE", exchange: "HNX" },
  { ticker: "PVS", name: "Tong CTCP Dich vu Ky thuat Dau khi Viet Nam", exchange: "HNX" },
  { ticker: "PVC", name: "Tong CTCP Dung cu Hoa chat Dau khi Viet Nam", exchange: "HNX" },
  { ticker: "PVX", name: "Tong CTCP Xay lap Dau khi Viet Nam", exchange: "HNX" },
  { ticker: "VNR", name: "Tong CTCP Tai bao hiem Quoc gia Viet Nam (Vinare)", exchange: "HNX" },
  { ticker: "BCC", name: "CTCP Xi mang Bim Son", exchange: "HNX" },
  { ticker: "DGC", name: "CTCP Tap doan Hoa Chat Duc Giang", exchange: "HNX" },
  { ticker: "LHC", name: "CTCP Dau tu va Xay dung Long Hiep", exchange: "HNX" },
  { ticker: "IDJ", name: "CTCP Dau tu IDJ", exchange: "HNX" },
  { ticker: "CEO", name: "CTCP Tap doan C.E.O", exchange: "HNX" },
  { ticker: "PVI", name: "CTCP PVI", exchange: "HNX" },
  { ticker: "TNG", name: "CTCP Dau tu va Thuong mai TNG", exchange: "HNX" },

  // UPCOM notable
  { ticker: "VGI", name: "Tong CTCP Dau tu Quoc te Viettel (Viettel Global)", exchange: "UPCOM" },
  { ticker: "BSR", name: "CTCP Loc hoa Dau Binh Son", exchange: "UPCOM" },
  { ticker: "ACV", name: "Tong CTCP Cang Hang khong Viet Nam", exchange: "UPCOM" },
  { ticker: "VTP", name: "Tong CTCP Buu chinh Viettel", exchange: "UPCOM" },
  { ticker: "MCH", name: "CTCP Hang tieu dung Ma San (Masan Consumer)", exchange: "UPCOM" },
  { ticker: "OIL", name: "Tong CTCP Dau Viet Nam (PV Oil)", exchange: "UPCOM" },
  { ticker: "VEA", name: "Tong CTCP May Viet Tien", exchange: "UPCOM" },
  { ticker: "LTG", name: "CTCP Tap doan Loc Troi", exchange: "UPCOM" },

  // Additional popular stocks
  { ticker: "DIG", name: "Tong CTCP Dau tu Phat trien Xay dung (DIC Corp)", exchange: "HOSE" },
  { ticker: "DXG", name: "CTCP Tap doan Dat Xanh", exchange: "HOSE" },
  { ticker: "KDH", name: "CTCP Dau tu va Kinh doanh nha Khang Dien", exchange: "HOSE" },
  { ticker: "NLG", name: "CTCP Dau tu Nam Long", exchange: "HOSE" },
  { ticker: "PDR", name: "CTCP Phat trien Bat dong san Phat Dat", exchange: "HOSE" },
  { ticker: "BCG", name: "CTCP Bamboo Capital", exchange: "HOSE" },
  { ticker: "GEX", name: "CTCP Tap doan Gelex", exchange: "HOSE" },
  { ticker: "REE", name: "CTCP Co dien Lanh REE", exchange: "HOSE" },
  { ticker: "DPM", name: "Tong CTCP Phan bon va Hoa chat Dau khi", exchange: "HOSE" },
  { ticker: "DCM", name: "CTCP Phan bon Dau khi Ca Mau", exchange: "HOSE" },
  { ticker: "DHC", name: "CTCP Dong Hai Ben Tre", exchange: "HOSE" },
  { ticker: "NT2", name: "CTCP Dien luc Dau khi Nhon Trach 2", exchange: "HOSE" },
  { ticker: "VHC", name: "CTCP Vinh Hoan", exchange: "HOSE" },
  { ticker: "MSN", name: "CTCP Tap doan Ma San", exchange: "HOSE" },
  { ticker: "PAN", name: "CTCP Tap doan PAN", exchange: "HOSE" },
  { ticker: "FRT", name: "CTCP Ban le Ky thuat so FPT (FPT Retail)", exchange: "HOSE" },
  { ticker: "CMG", name: "CTCP Tap doan CMC", exchange: "HOSE" },
  { ticker: "ELC", name: "CTCP Dau tu va Phat trien Do thi Long Bien", exchange: "HOSE" },
  { ticker: "FIT", name: "CTCP FIT Group", exchange: "HOSE" },
  { ticker: "HDG", name: "CTCP Tap doan Ha Do", exchange: "HOSE" },
  { ticker: "HAG", name: "CTCP Hoang Anh Gia Lai", exchange: "HOSE" },
  { ticker: "HNG", name: "CTCP Nong nghiep Quoc te Hoang Anh Gia Lai", exchange: "HOSE" },
  { ticker: "QCG", name: "CTCP Quoc Cuong Gia Lai", exchange: "HOSE" },
  { ticker: "SCR", name: "CTCP Dia oc Sai Gon Thuong Tin", exchange: "HOSE" },
  { ticker: "TCH", name: "CTCP Dau tu Dich vu Tai chinh Hoang Huy", exchange: "HOSE" },
  { ticker: "HHS", name: "CTCP Dau tu Dich vu Hoang Huy", exchange: "HOSE" },
  { ticker: "HBC", name: "CTCP Tap doan Xay dung Hoa Binh", exchange: "HOSE" },
  { ticker: "CTD", name: "CTCP Xay dung Coteccons", exchange: "HOSE" },
  { ticker: "VCG", name: "Tong CTCP Xuat nhap khau va Xay dung Viet Nam (Vinaconex)", exchange: "HOSE" },
  { ticker: "VND", name: "CTCP Chung khoan VNDirect", exchange: "HNX" },
  { ticker: "FTS", name: "CTCP Chung khoan FPT", exchange: "HOSE" },
  { ticker: "BVS", name: "CTCP Chung khoan Bao Viet", exchange: "HNX" },
  { ticker: "ORS", name: "CTCP Chung khoan ORS", exchange: "HOSE" },
  { ticker: "TVS", name: "CTCP Chung khoan Thien Viet", exchange: "HOSE" },
  { ticker: "APG", name: "CTCP Chung khoan APG", exchange: "HOSE" },
  { ticker: "DGC", name: "CTCP Tap doan Hoa Chat Duc Giang", exchange: "HNX" },
  { ticker: "HSG", name: "CTCP Tap doan Hoa Sen", exchange: "HOSE" },
  { ticker: "NKG", name: "CTCP Thep Nam Kim", exchange: "HOSE" },
  { ticker: "TLH", name: "CTCP Tap doan Thep Tien Len", exchange: "HOSE" },
  { ticker: "POM", name: "CTCP Thep Pomina", exchange: "HOSE" },
  { ticker: "BMI", name: "Tong CTCP Bao Minh", exchange: "HOSE" },
  { ticker: "PVI", name: "CTCP PVI", exchange: "HNX" },
  { ticker: "VNR", name: "Tong CTCP Tai bao hiem Quoc gia Viet Nam", exchange: "HNX" },
  { ticker: "ABI", name: "CTCP Bao hiem AAA", exchange: "HNX" },
  { ticker: "PGI", name: "Tong CTCP Bao hiem Petrolimex (PJICO)", exchange: "HOSE" },
  { ticker: "VOS", name: "CTCP Van tai Bien Viet Nam (VOSCO)", exchange: "UPCOM" },
  { ticker: "GMD", name: "CTCP Gemadept", exchange: "HOSE" },
  { ticker: "STG", name: "CTCP Kho van Ngoai thuong", exchange: "HOSE" },
  { ticker: "HAH", name: "CTCP Van tai va Xep dỡ Hai An", exchange: "HOSE" },
  { ticker: "VSC", name: "CTCP Container Viet Nam", exchange: "HOSE" },
  { ticker: "SBT", name: "CTCP Thanh Thanh Cong - Bien Hoa", exchange: "HOSE" },
  { ticker: "LSS", name: "CTCP Mia duong Lam Son", exchange: "HOSE" },
  { ticker: "QNS", name: "CTCP Duong Quang Ngai", exchange: "UPCOM" },
  { ticker: "MML", name: "CTCP Masan MEATLife", exchange: "UPCOM" },
  { ticker: "HVN", name: "Tong CTCP Hang khong Viet Nam (Vietnam Airlines)", exchange: "HOSE" },
  { ticker: "PET", name: "Tong CTCP Dich vu Tong hop Dau khi (Petrosetco)", exchange: "HOSE" },
  { ticker: "PVD", name: "Tong CTCP Khoan va Dich vu khoan Dau khi", exchange: "HOSE" },
  { ticker: "PVT", name: "Tong CTCP Van tai Dau khi Viet Nam", exchange: "HOSE" },
  { ticker: "VOS", name: "CTCP Van tai Bien Viet Nam", exchange: "UPCOM" },
  { ticker: "PGD", name: "CTCP Phan phoi Khi thap Dau khi", exchange: "HOSE" },
  { ticker: "GSP", name: "CTCP Van san Gas Petrolimex", exchange: "HOSE" },
  { ticker: "VTO", name: "CTCP Van tai Xang dau VITACO", exchange: "HOSE" },
  { ticker: "DHA", name: "CTCP Hoa An", exchange: "HOSE" },
  { ticker: "KDC", name: "CTCP Tap doan KIDO", exchange: "HOSE" },
  { ticker: "BBC", name: "CTCP Bibica", exchange: "HOSE" },
  { ticker: "NAF", name: "CTCP Nafoods Group", exchange: "HOSE" },
  { ticker: "HAC", name: "CTCP Thuy san Ha Noi", exchange: "UPCOM" },
  { ticker: "ANV", name: "CTCP Nam Viet", exchange: "HOSE" },
  { ticker: "FMC", name: "CTCP Thuc an Thuy san Fimatex", exchange: "HOSE" },
  { ticker: "ABT", name: "CTCP Xuat nhap khau Thuy san Ben Tre", exchange: "HOSE" },
  { ticker: "AGM", name: "CTCP Xuat nhap khau An Giang (AGIMEX)", exchange: "HOSE" },
  { ticker: "VTF", name: "CTCP Thuc an chan nuoi Viet Thang", exchange: "HOSE" },
  { ticker: "SFG", name: "CTCP Phan bon Binh Dien", exchange: "HOSE" },
  { ticker: "LAS", name: "CTCP Su phat lam thao", exchange: "HNX" },
  { ticker: "CSV", name: "CTCP Hoa chat Co ban Mien Nam", exchange: "HOSE" },
  { ticker: "HCD", name: "CTCP Dau tu San xuat va Thuong mai HCD", exchange: "HOSE" },
  { ticker: "TDC", name: "CTCP Kinh doanh va Phat trien Binh Duong", exchange: "HOSE" },
  { ticker: "LGC", name: "CTCP Dau tu Cau duong COTEC", exchange: "HOSE" },
  { ticker: "BMP", name: "CTCP Nhua Binh Minh", exchange: "HOSE" },
  { ticker: "NTP", name: "CTCP Nhua Thieu Nien Tien Phong", exchange: "HNX" },
  { ticker: "AAA", name: "CTCP Nhua An Phat Xanh", exchange: "HOSE" },
  { ticker: "APH", name: "CTCP Tap doan An Phat Holdings", exchange: "HOSE" },
  { ticker: "DPR", name: "CTCP Cao su Dong Phu", exchange: "HOSE" },
  { ticker: "PHR", name: "CTCP Cao su Phuoc Hoa", exchange: "HOSE" },
  { ticker: "TRC", name: "CTCP Cao su Tay Ninh", exchange: "HOSE" },
  { ticker: "BRC", name: "CTCP Cao su Ben Thanh", exchange: "HOSE" },
  { ticker: "CRC", name: "CTCP Create Capital Vietnam", exchange: "HOSE" },
  { ticker: "YEG", name: "CTCP Tap doan Yeah1", exchange: "HOSE" },
  { ticker: "VGC", name: "Tong CTCP Viglacera", exchange: "HOSE" },
  { ticker: "CVT", name: "CTCP CMC", exchange: "HOSE" },
  { ticker: "HT1", name: "CTCP Xi mang Ha Tien 1", exchange: "HOSE" },
  { ticker: "BTS", name: "CTCP Xi mang Bim Son", exchange: "HNX" },
  { ticker: "HOM", name: "CTCP Xi mang Hoang Mai", exchange: "HNX" },
  { ticker: "CLL", name: "CTCP Cang Cat Lai", exchange: "HOSE" },
  { ticker: "CDN", name: "CTCP Cang Da Nang", exchange: "UPCOM" },
  { ticker: "SGN", name: "CTCP Phuc vu Mat dat Sai Gon", exchange: "UPCOM" },
  { ticker: "SAS", name: "CTCP Dich vu Hang khong San bay Tan Son Nhat (SASCO)", exchange: "UPCOM" },
  { ticker: "IPA", name: "CTCP Dau tu Phan An", exchange: "UPCOM" },
  { ticker: "VTP", name: "Tong CTCP Buu chinh Viettel", exchange: "UPCOM" },
];

// Deduplicate by ticker (keep first occurrence)
const UNIQUE_STOCKS: StockSearchResult[] = [];
const seenTickers = new Set<string>();
for (const stock of STOCK_DATABASE) {
  if (!seenTickers.has(stock.ticker)) {
    seenTickers.add(stock.ticker);
    UNIQUE_STOCKS.push(stock);
  }
}

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = querySchema.safeParse(params);

    if (!parsed.success) {
      return errorResponse(
        parsed.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const query = parsed.data.q.toUpperCase().trim();

    // Prefix match first, then substring match
    const prefixMatches = UNIQUE_STOCKS.filter((s) =>
      s.ticker.startsWith(query)
    );
    const substringMatches = UNIQUE_STOCKS.filter(
      (s) => !s.ticker.startsWith(query) && s.ticker.includes(query)
    );

    // Also search by name
    const nameMatches = UNIQUE_STOCKS.filter(
      (s) =>
        !s.ticker.includes(query) &&
        s.name.toLowerCase().includes(query.toLowerCase())
    );

    const results = [...prefixMatches, ...substringMatches, ...nameMatches].slice(
      0,
      20
    );

    return jsonResponse({ results });
  } catch (error) {
    console.error("[stock/search] Error:", error);
    return errorResponse("Internal server error during search", 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
