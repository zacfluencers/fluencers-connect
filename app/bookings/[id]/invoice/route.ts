import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCurrentUser } from "@/lib/session";
import { getBookingDetail, getBookingBrief } from "@/lib/queries";
import { serviceLabel } from "@/lib/services";

/**
 * Auto-generated invoice / receipt for a completed booking (PDF, for the
 * brand's and creator's records). Either party on the booking can download it.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return new Response("Not authorised", { status: 401 });

  // RLS already scopes this to bookings the user is a party on.
  const detail = await getBookingDetail(id);
  if (!detail) return new Response("Not found", { status: 404 });

  const { booking, creator, brand } = detail;
  if (booking.status !== "completed") {
    return new Response("A receipt is available once the booking is completed.", {
      status: 409,
    });
  }

  const brief = await getBookingBrief(id);
  const pdf = await buildInvoice({
    bookingId: booking.id,
    bookingDate: booking.created_at,
    price: Number(booking.price),
    paymentStatus: booking.payment_status,
    service: serviceLabel(booking.service_type),
    campaign: brief?.campaign_name ?? null,
    creatorName: creator?.name ?? "Creator",
    brandName: brand?.email ?? "Brand",
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Fluencers-Connect-Receipt-${booking.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

const INK = rgb(0.11, 0.07, 0.16);
const MUTED = rgb(0.45, 0.42, 0.55);
const ACCENT = rgb(0.518, 0.412, 0.929);
const LINE = rgb(0.86, 0.84, 0.92);

/**
 * The standard Helvetica font uses WinAnsi (Latin-1) encoding and throws on
 * anything it can't encode (smart quotes, em dashes, emoji). Map the common
 * cases to ASCII and drop the rest so user-entered text can never 500 the PDF.
 */
function safe(s: string) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[--]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
}

function money(n: number) {
  return `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function buildInvoice(d: {
  bookingId: string;
  bookingDate: string;
  price: number;
  paymentStatus: string;
  service: string | null;
  campaign: string | null;
  creatorName: string;
  brandName: string;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const M = 56;
  const right = width - M;

  const text = (
    s: string,
    x: number,
    y: number,
    size = 10.5,
    f = font,
    color = INK,
  ) => page.drawText(safe(s), { x, y, size, font: f, color });

  const textRight = (s: string, y: number, size = 10.5, f = font, color = INK) => {
    const clean = safe(s);
    const w = f.widthOfTextAtSize(clean, size);
    page.drawText(clean, { x: right - w, y, size, font: f, color });
  };

  let y = height - M;

  // ---- Header
  text("Fluencers Connect", M, y, 18, bold, INK);
  textRight("RECEIPT", y + 2, 16, bold, ACCENT);
  y -= 18;
  text("The influencer marketplace", M, y, 9, font, MUTED);
  y -= 28;

  page.drawLine({
    start: { x: M, y },
    end: { x: right, y },
    thickness: 1,
    color: LINE,
  });
  y -= 28;

  // ---- Meta (two columns)
  const labelCol = M;
  const metaCol = right - 150;

  // Left: parties
  text("Billed to", labelCol, y, 8.5, bold, MUTED);
  text("Paid to", metaCol, y, 8.5, bold, MUTED);
  y -= 15;
  text(d.brandName, labelCol, y, 11, bold);
  text(d.creatorName, metaCol, y, 11, bold);
  y -= 32;

  // Right-aligned meta block
  const meta: [string, string][] = [
    ["Receipt no.", `INV-${d.bookingId.slice(0, 8).toUpperCase()}`],
    ["Issued", dateLabel(new Date().toISOString())],
    ["Booking date", dateLabel(d.bookingDate)],
    ["Status", "Completed"],
  ];
  let my = y;
  for (const [k, v] of meta) {
    text(k, M, my, 9, font, MUTED);
    text(v, M + 90, my, 9.5, bold);
    my -= 16;
  }
  y = my - 16;

  // ---- Line items table
  page.drawRectangle({
    x: M,
    y: y - 6,
    width: right - M,
    height: 24,
    color: rgb(0.96, 0.95, 0.99),
  });
  text("Description", M + 10, y, 9, bold, MUTED);
  textRight("Amount", y, 9, bold, MUTED);
  y -= 30;

  const desc = [d.service ?? "Creator content", d.campaign ? `· ${d.campaign}` : ""]
    .filter(Boolean)
    .join(" ");
  text(desc, M + 10, y, 11);
  textRight(money(d.price), y, 11);
  y -= 12;
  text(`Created by ${d.creatorName}`, M + 10, y, 9, font, MUTED);
  y -= 26;

  page.drawLine({
    start: { x: M, y },
    end: { x: right, y },
    thickness: 1,
    color: LINE,
  });
  y -= 24;

  // ---- Totals
  const totalLabelX = right - 230;
  text("Subtotal", totalLabelX, y, 10.5, font, MUTED);
  textRight(money(d.price), y, 10.5);
  y -= 20;
  text("Total", totalLabelX, y, 13, bold);
  textRight(money(d.price), y, 13, bold, ACCENT);
  y -= 34;

  // ---- Payment line
  const paid = d.paymentStatus === "released" || d.paymentStatus === "held";
  const payLine = paid
    ? "Paid in full via secure escrow (Stripe). Funds released on completion."
    : "Demo booking - no payment was taken in this environment.";
  text(paid ? "PAID" : "DEMO", M, y, 11, bold, paid ? ACCENT : MUTED);
  y -= 16;
  text(payLine, M, y, 9.5, font, MUTED);

  // ---- Footer
  text(
    "This receipt was generated automatically by Fluencers Connect for your records.",
    M,
    M + 24,
    8.5,
    font,
    MUTED,
  );
  text(`Reference: ${d.bookingId}`, M, M + 10, 8.5, font, MUTED);

  return doc.save();
}
