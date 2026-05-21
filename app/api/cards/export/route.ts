import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq, and, like, inArray, sql } from "drizzle-orm";

const CSV_HEADERS = [
  "name", "year", "setName", "cardNumber", "variant", "sportGenre",
  "gradeCompany", "gradeValue", "condition", "purchasePrice", "notes", "status",
];

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = req.nextUrl;
  const genre = searchParams.get("genre") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const grade = searchParams.get("grade") ?? undefined;
  const status = searchParams.get("status") ?? "owned";
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined;

  const conditions = [
    eq(cards.userId, userId),
    eq(cards.status, status),
  ] as ReturnType<typeof eq>[];

  if (ids?.length) {
    conditions.push(inArray(cards.id, ids) as unknown as ReturnType<typeof eq>);
  } else {
    if (genre && genre !== "all") conditions.push(eq(cards.sportGenre, genre));
    if (q) conditions.push(like(cards.name, `%${q}%`));
    if (grade && grade !== "all") {
      if (grade === "raw") {
        conditions.push(sql`(${cards.gradeCompany} IS NULL OR ${cards.gradeCompany} = '')` as unknown as ReturnType<typeof eq>);
      } else {
        conditions.push(eq(cards.gradeCompany, grade));
      }
    }
  }

  const rows = await db
    .select()
    .from(cards)
    .where(and(...conditions))
    .all();

  const csvLines = [
    CSV_HEADERS.join(","),
    ...rows.map((c) =>
      [
        escapeCell(c.name),
        escapeCell(c.year),
        escapeCell(c.setName),
        escapeCell(c.cardNumber),
        escapeCell(c.variant),
        escapeCell(c.sportGenre),
        escapeCell(c.gradeCompany),
        escapeCell(c.gradeValue),
        escapeCell(c.condition),
        escapeCell(c.purchasePrice),
        escapeCell(c.notes),
        escapeCell(c.status),
      ].join(",")
    ),
  ];

  const today = new Date().toISOString().slice(0, 10);
  const filename = ids?.length ? `cards-export-${today}.csv` : `cards-${today}.csv`;

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
