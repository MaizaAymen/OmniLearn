import { Button, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import dayjs from "dayjs";

export default function Certificate({ user, stats, difficulty, languages, submissions }) {
  const handleDownload = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const GOLD = [201, 169, 97];
    const DARK = [40, 40, 40];
    const GREY = [110, 110, 110];
    const CREAM = [250, 247, 240];

    doc.setFillColor(...CREAM);
    doc.rect(0, 0, W, H, "F");

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(2.5);
    doc.rect(22, 22, W - 44, H - 44);
    doc.setLineWidth(0.6);
    doc.rect(34, 34, W - 68, H - 68);

    const ornament = (cx, cy, sx, sy) => {
      doc.setDrawColor(...GOLD);
      doc.setFillColor(...GOLD);
      doc.setLineWidth(0.7);
      for (let i = 0; i < 6; i++) {
        const len = 32 - i * 4;
        doc.line(cx, cy + i * 4 * sy, cx + len * sx, cy + i * 4 * sy);
      }
      for (let i = 0; i < 5; i++) {
        doc.line(cx + i * 7 * sx, cy, cx + i * 7 * sx, cy + 22 * sy);
      }
      doc.circle(cx + 6 * sx, cy + 6 * sy, 1.6, "F");
      doc.circle(cx + 18 * sx, cy + 14 * sy, 1.2, "F");
      doc.circle(cx + 28 * sx, cy + 4 * sy, 1.2, "F");
    };
    ornament(48, 48, 1, 1);
    ornament(W - 48, 48, -1, 1);
    ornament(48, H - 48, 1, -1);
    ornament(W - 48, H - 48, -1, -1);

    const serial = `SL#${String(Date.now()).slice(-10)}`;
    const serialW = 130;
    doc.setLineWidth(0.8);
    doc.setDrawColor(...GOLD);
    doc.rect(W / 2 - serialW / 2, 58, serialW, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(serial, W / 2, 73, { align: "center" });

    doc.setFont("times", "bolditalic");
    doc.setFontSize(48);
    doc.setTextColor(...GOLD);
    doc.text("Certificate Of Achievement", W / 2, 128, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text("PROUDLY PRESENTED TO", W / 2, 162, { align: "center", charSpace: 4 });

    doc.setFont("times", "bold");
    doc.setFontSize(40);
    doc.setTextColor(...DARK);
    doc.text(`${user.firstname} ${user.lastname}`, W / 2, 208, { align: "center" });

    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.5);
    doc.line(130, 228, W - 130, 228);

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...GREY);
    const body =
      "This certificate is awarded in recognition of outstanding dedication and continuous progress on the OmniLearn coding platform — for commitment to growth, problem-solving, and the pursuit of mastery.";
    const lines = doc.splitTextToSize(body, W - 260);
    doc.text(lines, W / 2, 250, { align: "center" });

    const solved = stats?.solved || 0;
    const attempted = stats?.attempted || 0;
    const total = stats?.total || 0;
    const subs = submissions?.length || 0;
    const easy = difficulty?.Easy || 0;
    const medium = difficulty?.Medium || 0;
    const hard = difficulty?.Hard || 0;
    const langs =
      Object.entries(languages || {})
        .map(([k, v]) => `${k} (${v})`)
        .join("  ·  ") || "—";

    const statsY = 305;
    const items = [
      { v: solved, l: "SOLVED" },
      { v: attempted, l: "ATTEMPTS" },
      { v: subs, l: "SUBMISSIONS" },
      { v: total, l: "TOTAL POOL" },
    ];
    const colW = (W - 200) / items.length;
    items.forEach((it, i) => {
      const cx = 100 + colW * i + colW / 2;
      doc.setFont("times", "bold");
      doc.setFontSize(28);
      doc.setTextColor(...GOLD);
      doc.text(String(it.v), cx, statsY, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(it.l, cx, statsY + 16, { align: "center", charSpace: 1.5 });
    });

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(150, statsY + 30, W - 150, statsY + 30);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(
      `EASY  ${easy}     MEDIUM  ${medium}     HARD  ${hard}`,
      W / 2,
      statsY + 48,
      { align: "center", charSpace: 1 }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text(`Languages: ${langs}`, W / 2, statsY + 64, { align: "center" });

    const baseY = H - 95;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(dayjs().format("DD MMMM YYYY"), 130, baseY);
    doc.setDrawColor(...DARK);
    doc.setLineWidth(0.6);
    doc.line(110, baseY + 8, 280, baseY + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Date", 110, baseY + 24);

    const cx = W / 2;
    const cy = baseY;
    doc.setFillColor(...GOLD);
    doc.circle(cx, cy, 32, "F");
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI * 2) / 20;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(2);
      doc.line(
        cx + Math.cos(a) * 32,
        cy + Math.sin(a) * 32,
        cx + Math.cos(a) * 39,
        cy + Math.sin(a) * 39
      );
    }
    doc.setFillColor(...DARK);
    doc.circle(cx, cy, 25, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.circle(cx, cy, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...GOLD);
    doc.text("TOP", cx, cy - 1, { align: "center" });
    doc.text("AWARD", cx, cy + 11, { align: "center" });

    const sigX = W - 250;
    const sigY = baseY - 4;
    doc.setDrawColor(...DARK);
    doc.setLineWidth(1.3);
    doc.lines(
      [
        [6, -10, 14, -14, 18, 0],
        [4, 10, -14, 9, -14, -2],
        [2, -6, 10, -8, 14, 2],
      ],
      sigX,
      sigY,
      [1, 1],
      "S"
    );
    doc.lines(
      [
        [8, -6, -4, 6, 12, 0],
        [7, -5, -3, 5, 11, -1],
        [9, -4, -3, 4, 13, 0],
        [10, -3, -2, 3, 14, -2],
      ],
      sigX + 22,
      sigY - 1,
      [1, 1],
      "S"
    );
    doc.setLineWidth(1);
    doc.lines(
      [[35, 5, -12, -3, 45, 7]],
      sigX + 4,
      sigY + 9,
      [1, 1],
      "S"
    );

    doc.setLineWidth(0.6);
    doc.setDrawColor(...DARK);
    doc.line(W - 280, baseY + 8, W - 110, baseY + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text("Signature", W - 280, baseY + 24);

    doc.save(`omnilearn-certificate-${user.firstname}-${user.lastname}.pdf`);
    message.success("Certificate downloaded");
  };

  return (
    <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
      Download Certificate
    </Button>
  );
}
