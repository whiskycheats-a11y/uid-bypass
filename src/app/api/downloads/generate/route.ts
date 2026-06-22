import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

const generateSchema = z.object({
  brandName: z.string().min(1),
  devName: z.string().min(1),
  method: z.enum(["ALPHA", "OMEGA"]),
});

const PROTECT_SIGN = "VELOCIRA_CHEATS_TEX_SECRET_2026";
const SIGNATURE = "[[zytrone_PAYLOAD_START]]";

// Custom Proprietary Encryption: Bitwise Left Shift + XOR
function encryptPayload(brandName: string, devName: string): Buffer {
  const data = `${brandName}|||${devName}`;
  const buffer = Buffer.from(data, "utf-8");
  const key = Buffer.from(PROTECT_SIGN, "utf-8");
  
  for (let i = 0; i < buffer.length; i++) {
    // 1. XOR with key
    let byte = buffer[i] ^ key[i % key.length];
    // 2. Bitwise left shift by 1, wrapping around the 8th bit
    byte = ((byte << 1) & 0xFF) | (byte >> 7);
    buffer[i] = byte;
  }
  
  return Buffer.concat([Buffer.from(SIGNATURE, "utf-8"), buffer]);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { brandName, devName, method } = generateSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { uidLimit: true }
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    let finalBrand = brandName;
    let finalDev = devName;

    // Security Check: If user has < 25 UID Limit, strictly force global names regardless of request body
    if (user.uidLimit < 25) {
      finalBrand = "UID BYPASS GLOBAL";
      finalDev = "uid-bypass-beryl.vercel.app";
    }

    const payloadBuffer = encryptPayload(finalBrand, finalDev);
    
    const templatePath = path.join(process.cwd(), "backend_data", "bypass_template.exe");
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ message: "Bypass template missing from server" }, { status: 500 });
    }
    
    const exeTemplate = fs.readFileSync(templatePath);

    function bufferToStream(buffer: Buffer) {
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        }
      });
    }

    if (method === "ALPHA") {
      // Embedded Payload Injection
      const finalExe = Buffer.concat([exeTemplate, payloadBuffer]);
      
      return new Response(bufferToStream(finalExe), {
        status: 200,
        headers: {
          "Content-Type": "application/x-msdownload",
          "Content-Disposition": `attachment; filename="${finalBrand}.exe"`,
        },
      });

    } else if (method === "OMEGA") {
      // External Configuration Vector (ZIP)
      const zip = new AdmZip();
      zip.addFile("bypass.exe", exeTemplate);
      zip.addFile("load.zytrone", payloadBuffer);
      
      const zipBuffer = zip.toBuffer();
      
      return new Response(bufferToStream(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${finalBrand}.zip"`,
        },
      });
    }

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0].message }, { status: 400 });
    }
    console.error("Generate Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
