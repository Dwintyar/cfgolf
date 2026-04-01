import { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import html2canvas from "html2canvas";

export interface InvoiceData {
  type: "venue" | "teetime";
  bookingId: string;
  venueName?: string;
  courseName?: string;
  courseLocation?: string;
  organizerClub?: string;
  requesterName?: string;
  bookingNotes?: string;
  assignedCaddies?: string;
  assignedCarts?: string;
  greenFeeAgreed?: number | null;
  bookingDate?: string;
  teeTime?: string;
  playersCount?: number;
  totalPrice?: number | null;
  status: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = { pending:"Pending", confirmed:"Confirmed", ready:"Ready", declined:"Declined", cancelled:"Cancelled" };
const STATUS_COLOR: Record<string, string> = { pending:"#f59e0b", confirmed:"#22c55e", ready:"#16a34a", declined:"#ef4444", cancelled:"#6b7280" };

function parseNotesPairs(notes: string | null): Record<string, string> {
  const r: Record<string, string> = {};
  if (!notes) return r;
  notes.split("|").forEach(seg => {
    const i = seg.indexOf(":");
    if (i > -1) r[seg.slice(0, i).trim()] = seg.slice(i + 1).trim();
  });
  return r;
}

const InvoiceDocument = ({ data }: { data: InvoiceData }) => {
  const pairs = parseNotesPairs(data.bookingNotes ?? null);
  const refNo = data.bookingId.slice(0, 8).toUpperCase();
  const createdDate = new Date(data.createdAt).toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });

  const rows: { label: string; value: string }[] = [];
  if (data.type === "venue") {
    if (pairs["Date"])    rows.push({ label: "Tanggal Main",    value: pairs["Date"] });
    if (pairs["Time"])    rows.push({ label: "Tee Time",        value: pairs["Time"] });
    if (pairs["Players"]) rows.push({ label: "Jumlah Pemain",  value: pairs["Players"] + " orang" });
    if (pairs["Caddies"]) rows.push({ label: "Jumlah Caddy",   value: pairs["Caddies"] + " orang" });
    if (pairs["Carts"])   rows.push({ label: "Jumlah Cart",    value: pairs["Carts"] + " unit" });
    if (data.assignedCaddies) rows.push({ label: "Caddy Assigned", value: data.assignedCaddies });
    if (data.assignedCarts)   rows.push({ label: "Cart Numbers",   value: data.assignedCarts });
    if (pairs["Notes"])   rows.push({ label: "Catatan",         value: pairs["Notes"] });
  } else {
    if (data.bookingDate)   rows.push({ label: "Tanggal Main",   value: data.bookingDate });
    if (data.teeTime)       rows.push({ label: "Tee Time",       value: data.teeTime.slice(0,5) });
    if (data.playersCount)  rows.push({ label: "Jumlah Pemain",  value: data.playersCount + " orang" });
  }

  const col  = STATUS_COLOR[data.status] ?? "#6b7280";
  const total = data.greenFeeAgreed ?? data.totalPrice;

  return (
    <div id="invoice-document" style={{ width:"595px", minHeight:"842px", backgroundColor:"#0f1a12", color:"#e8f0e8", fontFamily:"'Segoe UI',Arial,sans-serif", padding:"48px 40px", boxSizing:"border-box" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"32px" }}>
        <div>
          <div style={{ fontSize:"22px", fontWeight:"800", color:"#4ade80" }}>⛳ GolfBuana</div>
          <div style={{ fontSize:"11px", color:"#6b7f6b", marginTop:"2px" }}>golfbuana.com</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"22px", fontWeight:"700", color:"#fff" }}>INVOICE</div>
          <div style={{ fontSize:"11px", color:"#6b7f6b", marginTop:"2px" }}>#{refNo}</div>
          <div style={{ fontSize:"11px", color:"#6b7f6b" }}>{createdDate}</div>
        </div>
      </div>
      <div style={{ height:"1px", backgroundColor:"#1e3a1e", marginBottom:"28px" }} />

      {/* From / To */}
      <div style={{ display:"flex", gap:"32px", marginBottom:"28px" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"10px", color:"#4ade80", fontWeight:"700", letterSpacing:"1px", marginBottom:"8px" }}>VENUE</div>
          <div style={{ fontSize:"14px", fontWeight:"600" }}>{data.venueName ?? "—"}</div>
          {data.courseName     && <div style={{ fontSize:"12px", color:"#9ab09a", marginTop:"2px" }}>{data.courseName}</div>}
          {data.courseLocation && <div style={{ fontSize:"12px", color:"#9ab09a" }}>{data.courseLocation}</div>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:"10px", color:"#4ade80", fontWeight:"700", letterSpacing:"1px", marginBottom:"8px" }}>
            {data.type === "venue" ? "ORGANIZER" : "GOLFER"}
          </div>
          <div style={{ fontSize:"14px", fontWeight:"600" }}>{data.organizerClub ?? data.requesterName ?? "—"}</div>
          {data.requesterName && data.organizerClub && <div style={{ fontSize:"12px", color:"#9ab09a", marginTop:"2px" }}>{data.requesterName}</div>}
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom:"28px" }}>
        <span style={{ display:"inline-block", padding:"4px 12px", borderRadius:"20px", fontSize:"11px", fontWeight:"700", backgroundColor: col + "22", color: col, border:`1px solid ${col}44`, textTransform:"uppercase", letterSpacing:"0.5px" }}>
          {STATUS_LABEL[data.status] ?? data.status}
        </span>
      </div>

      {/* Detail table */}
      {rows.length > 0 && (
        <div style={{ marginBottom:"28px" }}>
          <div style={{ fontSize:"10px", color:"#4ade80", fontWeight:"700", letterSpacing:"1px", marginBottom:"12px" }}>DETAIL BOOKING</div>
          <div style={{ border:"1px solid #1e3a1e", borderRadius:"8px", overflow:"hidden" }}>
            {rows.map((row, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", backgroundColor: i%2===0 ? "#0f1a12" : "#131f13", borderBottom: i<rows.length-1 ? "1px solid #1e3a1e" : "none" }}>
                <span style={{ fontSize:"12px", color:"#9ab09a" }}>{row.label}</span>
                <span style={{ fontSize:"12px", fontWeight:"600", color:"#e8f0e8", textAlign:"right" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total */}
      {total != null && (
        <div style={{ backgroundColor:"#131f13", border:"1px solid #1e3a1e", borderRadius:"8px", padding:"16px", marginBottom:"28px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"13px", color:"#9ab09a" }}>Total</span>
          <span style={{ fontSize:"20px", fontWeight:"800", color:"#4ade80" }}>Rp {Number(total).toLocaleString("id-ID")}</span>
        </div>
      )}

      <div style={{ height:"1px", backgroundColor:"#1e3a1e", margin:"auto 0 20px" }} />
      <div style={{ fontSize:"10px", color:"#4d5e4d", textAlign:"center" }}>
        Dokumen ini digenerate otomatis oleh GolfBuana Platform · golfbuana.com
      </div>
    </div>
  );
};

const InvoiceModal = ({ open, onOpenChange, data }: { open: boolean; onOpenChange: (v: boolean) => void; data: InvoiceData }) => {
  const downloading = useRef(false);

  const handleDownload = async () => {
    if (downloading.current) return;
    downloading.current = true;
    const el = document.getElementById("invoice-document");
    if (!el) { downloading.current = false; return; }
    try {
      const [{ default: jsPDF }, canvas] = await Promise.all([
        import("jspdf"),
        html2canvas(el, { scale: 2, backgroundColor: "#0f1a12", useCORS: true }),
      ]);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save(`GolfBuana-Invoice-${data.bookingId.slice(0, 8).toUpperCase()}.pdf`);
    } finally {
      downloading.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[660px] p-0 overflow-hidden rounded-2xl bg-[#0f1a12] border-border/30">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-sm font-semibold text-white">Invoice Preview</p>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
            <button onClick={() => onOpenChange(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
              <X className="h-4 w-4 text-white/60" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[80vh]">
          <InvoiceDocument data={data} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
